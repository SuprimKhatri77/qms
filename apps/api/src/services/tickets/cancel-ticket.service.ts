import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import type { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";
import { getPublicTicket } from "./get-public-ticket.service";

// A customer can only leave while they're still in line. Once they're being
// served (or the ticket is finished), it's the owner's call, not theirs.
const CANCELLABLE_STATUSES = ["pending_verification", "waiting"] as const;

/**
 * The customer leaving the queue from their ticket page.
 *
 * Like viewing the ticket, the ticket's own id (a random UUID only the
 * customer was given) is the access control: customers have no accounts.
 *
 * Nobody else's position changes: positions are derived from token numbers
 * on read, so a cancelled token is simply skipped by call-next.
 */
export async function cancelTicket(
  ticketId: string,
): Promise<PublicTicketResponse | ApiErrorResponse> {
  try {
    // The status rule lives in the WHERE clause, so checking and changing
    // happen in one statement: a double tap, or the owner calling this
    // ticket at the same moment, can't produce a cancelled-while-serving
    // ticket.
    const [cancelled] = await db
      .update(tickets)
      .set({ status: "cancelled", resolvedAt: new Date() })
      .where(
        and(
          eq(tickets.id, ticketId),
          inArray(tickets.status, CANCELLABLE_STATUSES),
        ),
      )
      .returning({ id: tickets.id });

    if (!cancelled) {
      return await explainWhyNotCancelled(ticketId);
    }

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
