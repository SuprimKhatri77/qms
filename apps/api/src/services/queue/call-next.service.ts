import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { logEvent } from "@/lib/system-logs/log-event";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";
import { claimTurnAlerts, sendTurnAlerts, type TurnAlert } from "./turn-alerts";

/**
 * "Call next": sets the queue's single counter to the next waiting
 * customer's token (the lowest one still waiting) and marks that ticket as
 * serving.
 *
 * The write to the queue is one UPDATE of `current_serving_number`, no matter
 * how many people are waiting. No per-customer position is stored anywhere:
 * each customer's position is derived on read, by counting the customers
 * still waiting ahead of them (see count-waiting-ahead.ts).
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
    const result = await db.transaction(
      async (
        tx,
      ): Promise<
        | { failure: ApiErrorResponse; alerts: never[] }
        | { failure: null; alerts: TurnAlert[] }
      > => {
        const [queue] = await tx
          .select()
          .from(queues)
          .where(eq(queues.id, todaysQueue.id))
          .for("update");

        // Deliberately no "is the queue closed?" check: closing only stops
        // new customers joining. Everyone already in line still gets served.
        if (!queue) {
          throw new Error(`Queue ${todaysQueue.id} not found`);
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
            failure: {
              success: false,
              message:
                "Finish the current customer before calling the next one",
              code: ErrorCode.CONFLICT,
            },
            alerts: [],
          };
        }

        // The lowest token that is really waiting: the same order a
        // customer's position is counted in (count-waiting-ahead.ts), so
        // whoever their page says is next is who gets called. Gaps (tickets
        // never confirmed, cancelled or expired) are simply skipped.
        //
        // Deliberately not "the next token above the counter": a customer
        // can confirm their email after a later token has already been
        // called, and would then sit below the counter, told "You're next"
        // but never called.
        const [next] = await tx
          .select()
          .from(tickets)
          .where(
            and(eq(tickets.queueId, queue.id), eq(tickets.status, "waiting")),
          )
          .orderBy(asc(tickets.tokenNumber))
          .limit(1);

        if (!next) {
          return {
            failure: {
              success: false,
              message: "No customers are waiting",
              code: ErrorCode.CONFLICT,
            },
            alerts: [],
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

        // Everyone else still waiting just moved one step closer, so anyone
        // now at the front who hasn't been emailed yet is claimed here,
        // inside the transaction, so a race between two calls can never
        // double-send it.
        const alerts = await claimTurnAlerts(tx, queue.id);

        return { failure: null, alerts };
      },
    );

    if (result.failure) {
      return result.failure;
    }

    sendTurnAlerts(result.alerts, shop);

    return await getQueueSnapshotResponse(
      todaysQueue.id,
      "Called next customer",
    );
  } catch (error) {
    console.error("callNext failed:", error);
    logEvent("error", "call-next", "callNext threw an unexpected error", {
      ownerId,
      error: String(error),
    });
    return {
      success: false,
      message: "Failed to call next customer",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
