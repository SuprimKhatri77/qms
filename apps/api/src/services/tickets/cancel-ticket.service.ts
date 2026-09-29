import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import type { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";
import { getPublicTicket } from "./get-public-ticket.service";
import { claimTurnAlerts, sendTurnAlerts } from "@/services/queue/turn-alerts";

// A customer can only leave while they're still in line. Once they're being
// served (or the ticket is finished), it's the owner's call, not theirs.
const CANCELLABLE_STATUSES = ["pending_verification", "waiting"] as const;

/**
 * The customer leaving the queue from their ticket page.
 *
 * Like viewing the ticket, the ticket's own id (a random UUID only the
 * customer was given) is the access control: customers have no accounts.
 *
 * Nobody else's row is rewritten to move them up: positions are derived on
 * read from who is still waiting, so a cancelled token is simply skipped by
 * call-next. The one other write is the "emailed" flag on anyone who has
 * just reached the front.
 */
export async function cancelTicket(
  ticketId: string,
): Promise<PublicTicketResponse | ApiErrorResponse> {
  try {
    const outcome = await db.transaction(async (tx) => {
      // Lock this ticket's queue row first, the same lock join and call-next
      // take. Without it, call-next could pick this ticket as "next waiting",
      // then this cancel could commit, and call-next's update would still
      // turn the now-cancelled ticket into "serving". With it, one of the two
      // waits for the other to finish, and the loser sees the real status.
      // A ticket never moves between queues, so reading its queue id first,
      // unlocked, is safe. The shop's name and slug come along for the
      // turn-alert emails sent after the commit.
      const [ticket] = await tx
        .select({
          queueId: tickets.queueId,
          shopName: shops.name,
          shopSlug: shops.slug,
        })
        .from(tickets)
        .innerJoin(queues, eq(queues.id, tickets.queueId))
        .innerJoin(shops, eq(shops.id, queues.shopId))
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        return null;
      }

      await tx
        .select({ id: queues.id })
        .from(queues)
        .where(eq(queues.id, ticket.queueId))
        .for("update");

      // The status rule lives in the WHERE clause, so a double tap can't
      // cancel twice, and a ticket the owner has just called stays served.
      const [updated] = await tx
        .update(tickets)
        .set({ status: "cancelled", resolvedAt: new Date() })
        .where(
          and(
            eq(tickets.id, ticketId),
            inArray(tickets.status, CANCELLABLE_STATUSES),
          ),
        )
        .returning({ id: tickets.id });

      if (!updated) {
        return null;
      }

      // If they were waiting, everyone behind them just moved up one place,
      // so someone may now be near the front without having been emailed.
      const alerts = await claimTurnAlerts(tx, ticket.queueId);
      return {
        alerts,
        shop: { name: ticket.shopName, slug: ticket.shopSlug },
      };
    });

    if (!outcome) {
      return await explainWhyNotCancelled(ticketId);
    }

    sendTurnAlerts(outcome.alerts, outcome.shop);

    const result = await getPublicTicket(ticketId);

    if (!result.success) {
      return result;
    }

    return { ...result, message: "You've left the queue" };
  } catch (error) {
    console.error("cancelTicket failed:", error);
    logEvent(
      "error",
      "cancel-ticket",
      "cancelTicket threw an unexpected error",
      {
        ticketId,
        error: String(error),
      },
    );
    return {
      success: false,
      message: "Failed to leave the queue",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

// Nothing was updated: either the ticket doesn't exist, or it's past the
// point where the customer can leave. Tell them which.
async function explainWhyNotCancelled(
  ticketId: string,
): Promise<ApiErrorResponse> {
  const [ticket] = await db
    .select({ status: tickets.status })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) {
    return {
      success: false,
      message: "Ticket not found",
      code: ErrorCode.NOT_FOUND,
    };
  }

  return {
    success: false,
    message:
      ticket.status === "serving"
        ? "You're already being served, so you can't leave the queue now"
        : "This ticket is no longer in the queue",
    code: ErrorCode.CONFLICT,
  };
}
