import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, ticketVerifications, tickets } from "@/db/schema";
import type { ApiErrorResponse, VerifyTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";
import { countWaitingAhead } from "@/services/queue/count-waiting-ahead";
import { toPublicTicket } from "./map-ticket";

export async function verifyTicket(
  token: string,
): Promise<VerifyTicketResponse | ApiErrorResponse> {
  try {
    const [verification] = await db
      .select()
      .from(ticketVerifications)
      .where(eq(ticketVerifications.token, token))
      .limit(1);

    if (!verification) {
      return {
        success: false,
        message: "This link is invalid",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const [row] = await db
      .select({ ticket: tickets, queue: queues, shop: shops })
      .from(tickets)
      .innerJoin(queues, eq(queues.id, tickets.queueId))
      .innerJoin(shops, eq(shops.id, queues.shopId))
      .where(eq(tickets.id, verification.ticketId))
      .limit(1);

    if (!row) {
      return {
        success: false,
        message: "This ticket no longer exists",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const isPending = row.ticket.status === "pending_verification";

    // Expiry only matters while the ticket is still waiting to be confirmed.
    // An already-confirmed customer re-opening their old email link should
    // see their ticket, not be told to join again (which would fail, since
    // they already hold an active ticket).
    if (isPending && verification.expiresAt.getTime() < Date.now()) {
      // Record it, so the ticket page says "expired" and the ticket stops
      // counting as this email's active one.
      await db
        .update(tickets)
        .set({ status: "expired", resolvedAt: new Date() })
        .where(
          and(
            eq(tickets.id, row.ticket.id),
            eq(tickets.status, "pending_verification"),
          ),
        );

      return {
        success: false,
        message: "This link has expired. Please join the queue again.",
        code: ErrorCode.CONFLICT,
      };
    }

    // Clicking an already-used link (e.g. an email client's link-preview
    // scanner, or the customer tapping it twice) just shows the current
    // state instead of erroring — verification only ever moves one way.
    if (isPending) {
      const confirmed = await db.transaction(async (tx) => {
        // Only moves a ticket that is still pending. If a rejoin expired it a
        // moment ago, this matches nothing instead of reviving it next to
        // the customer's new ticket.
        const [updated] = await tx
          .update(tickets)
          .set({ status: "waiting", verifiedAt: new Date() })
          .where(
            and(
              eq(tickets.id, row.ticket.id),
              eq(tickets.status, "pending_verification"),
            ),
          )
          .returning({ id: tickets.id });

        if (!updated) {
          return false;
        }

        await tx
          .update(ticketVerifications)
          .set({ usedAt: new Date() })
          .where(eq(ticketVerifications.id, verification.id));

        return true;
      });

      if (confirmed) {
        row.ticket.status = "waiting";
      } else {
        // Someone else changed the ticket between our read and our write:
        // either a second click confirmed it, or a rejoin expired it.
        // Re-read it and report whichever actually happened.
        const [current] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.id, row.ticket.id))
          .limit(1);

        if (!current || current.status === "expired") {
          return {
            success: false,
            message: "This link has expired. Please join the queue again.",
            code: ErrorCode.CONFLICT,
          };
        }

        row.ticket = current;
      }
    }

    return {
      success: true,
      message: "You're confirmed in the queue",
      data: {
        ticket: toPublicTicket(
          row.ticket,
          await countWaitingAhead(row.ticket),
          row.shop.avgServiceMinutes,
        ),
      },
    };
  } catch (error) {
    console.error("verifyTicket failed:", error);
    logEvent(
      "error",
      "verify-ticket",
      "verifyTicket threw an unexpected error",
      {
        error: String(error),
      },
    );
    return {
      success: false,
      message: "Failed to verify ticket",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
