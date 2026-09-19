import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { sendTurnAlertEmail } from "@/services/tickets/send-turn-alert-email";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

// A ticket gets one "you're almost up" email once its position (token number
// minus the queue's counter) is this close or closer. `turnAlertSentAt` is
// the guard against sending it twice as the counter keeps moving forward.
const TURN_ALERT_THRESHOLD = 2;

type TurnAlertCandidate = {
  id: string;
  customerName: string;
  customerEmail: string;
  position: number;
};

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
    const result = await db.transaction(
      async (
        tx,
      ): Promise<
        | { failure: ApiErrorResponse; alerts: never[] }
        | { failure: null; alerts: TurnAlertCandidate[] }
      > => {
        const [queue] = await tx
          .select()
          .from(queues)
          .where(eq(queues.id, todaysQueue.id))
          .for("update");

        if (!queue || queue.status !== "active") {
          return {
            failure: {
              success: false,
              message: "Today's queue is closed",
              code: ErrorCode.CONFLICT,
            },
            alerts: [],
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
            failure: {
              success: false,
              message:
                "Finish the current customer before calling the next one",
              code: ErrorCode.CONFLICT,
            },
            alerts: [],
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

        // Everyone else still waiting just moved one step closer. Anyone now
        // within TURN_ALERT_THRESHOLD of the counter, who hasn't already been
        // alerted, gets emailed once — claimed here, inside the transaction,
        // so a race between two calls can never double-send it.
        const candidates = await tx
          .select({
            id: tickets.id,
            tokenNumber: tickets.tokenNumber,
            customerName: tickets.customerName,
            customerEmail: tickets.customerEmail,
          })
          .from(tickets)
          .where(
            and(
              eq(tickets.queueId, queue.id),
              eq(tickets.status, "waiting"),
              isNull(tickets.turnAlertSentAt),
              sql`${tickets.tokenNumber} - ${next.tokenNumber} <= ${TURN_ALERT_THRESHOLD}`,
            ),
          );

        if (candidates.length > 0) {
          await tx
            .update(tickets)
            .set({ turnAlertSentAt: new Date() })
            .where(
              inArray(
                tickets.id,
                candidates.map((ticket) => ticket.id),
              ),
            );
        }

        const alerts: TurnAlertCandidate[] = candidates.map((ticket) => ({
          id: ticket.id,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          position: ticket.tokenNumber - next.tokenNumber,
        }));

        return { failure: null, alerts };
      },
    );

    if (result.failure) {
      return result.failure;
    }

    // Fire-and-forget, same as the join confirmation email: the ticket state
    // (turnAlertSentAt already set above) is correct regardless of whether
    // the email itself lands.
    for (const ticket of result.alerts) {
      sendTurnAlertEmail(
        ticket,
        shop.name,
        ticket.position,
        `${process.env.FRONTEND_URL}/s/${shop.slug}/ticket/${ticket.id}`,
      );
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
