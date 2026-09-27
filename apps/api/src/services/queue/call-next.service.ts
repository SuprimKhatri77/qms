import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { sendTurnAlertEmail } from "@/services/tickets/send-turn-alert-email";
import { logEvent } from "@/lib/system-logs/log-event";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

// A ticket gets one "you're almost up" email once it's this close to the
// front: among the first TURN_ALERT_THRESHOLD customers still waiting.
// `turnAlertSentAt` is the guard against sending it twice as the line moves.
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

        // Everyone else still waiting just moved one step closer. The first
        // TURN_ALERT_THRESHOLD customers still waiting are now "almost up";
        // any of them not yet alerted gets emailed once. Their position is
        // simply their place in this short list (1 = next), counting only
        // real waiting customers, so it matches their ticket page. Claimed
        // here, inside the transaction, so a race between two calls can
        // never double-send it.
        const frontOfLine = await tx
          .select({
            id: tickets.id,
            customerName: tickets.customerName,
            customerEmail: tickets.customerEmail,
            turnAlertSentAt: tickets.turnAlertSentAt,
          })
          .from(tickets)
          .where(
            and(eq(tickets.queueId, queue.id), eq(tickets.status, "waiting")),
          )
          .orderBy(asc(tickets.tokenNumber))
          .limit(TURN_ALERT_THRESHOLD);

        const alerts: TurnAlertCandidate[] = [];
        frontOfLine.forEach((ticket, index) => {
          if (ticket.turnAlertSentAt === null) {
            alerts.push({
              id: ticket.id,
              customerName: ticket.customerName,
              customerEmail: ticket.customerEmail,
              position: index + 1,
            });
          }
        });

        if (alerts.length > 0) {
          await tx
            .update(tickets)
            .set({ turnAlertSentAt: new Date() })
            .where(
              inArray(
                tickets.id,
                alerts.map((ticket) => ticket.id),
              ),
            );
        }

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
