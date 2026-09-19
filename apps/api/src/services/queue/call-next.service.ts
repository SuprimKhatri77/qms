import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

/**
 * "Call next": moves the queue's single counter forward to the next waiting
 * customer and marks that ticket as serving.
 *
 * The write to the queue is one UPDATE of `current_serving_number`, no matter
 * how many people are waiting. No per-customer position is stored anywhere:
 * each customer's position is derived on read (token - current serving).
 */
export async function callNext(
  ownerId: string,
): Promise<QueueSnapshotResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    if (!shop) {
      return {
        success: false,
        message: "Set up your shop first",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const todaysQueue = await findOrCreateTodaysQueue(shop);

    // Runs as one transaction and locks the queue row first. If the owner
    // double-clicks (or has two tabs open), the second request waits here and
    // then sees the first one's result instead of racing it.
    const failure = await db.transaction(
      async (tx): Promise<ApiErrorResponse | null> => {
        const [queue] = await tx
          .select()
          .from(queues)
          .where(eq(queues.id, todaysQueue.id))
          .for("update");

        if (!queue || queue.status !== "active") {
          return {
            success: false,
            message: "Today's queue is closed",
            code: ErrorCode.CONFLICT,
          };
        }

        // One customer at a time (single counter): finish the current one first.
        const [alreadyServing] = await tx
          .select({ id: tickets.id })
          .from(tickets)
          .where(
            and(eq(tickets.queueId, queue.id), eq(tickets.status, "serving")),
          )
          .limit(1);

        if (alreadyServing) {
          return {
            success: false,
            message: "Finish the current customer before calling the next one",
            code: ErrorCode.CONFLICT,
          };
        }

        // Token numbers can have gaps (a ticket that was never verified, or was
        // cancelled while waiting). Jump to the next token that really is
        // waiting, so the owner never calls a number nobody holds.
        const [next] = await tx
          .select()
          .from(tickets)
          .where(
            and(
              eq(tickets.queueId, queue.id),
              eq(tickets.status, "waiting"),
              gt(tickets.tokenNumber, queue.currentServingNumber),
            ),
          )
          .orderBy(asc(tickets.tokenNumber))
          .limit(1);

        if (!next) {
          return {
            success: false,
            message: "No customers are waiting",
            code: ErrorCode.CONFLICT,
          };
        }

        await tx
          .update(queues)
          .set({ currentServingNumber: next.tokenNumber })
          .where(eq(queues.id, queue.id));

        await tx
          .update(tickets)
          .set({ status: "serving", calledAt: new Date() })
          .where(eq(tickets.id, next.id));

        return null;
      },
    );

    if (failure) {
      return failure;
    }

    return await getQueueSnapshotResponse(
      todaysQueue.id,
      "Called next customer",
    );
  } catch (error) {
    console.error("callNext failed:", error);
    return {
      success: false,
      message: "Failed to call next customer",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
