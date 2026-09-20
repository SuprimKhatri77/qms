import { eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, ticketVerifications, tickets } from "@/db/schema";
import type { ApiErrorResponse, VerifyTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";
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

    if (verification.expiresAt.getTime() < Date.now()) {
      return {
        success: false,
        message: "This link has expired. Please join the queue again.",
        code: ErrorCode.CONFLICT,
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

    // Clicking an already-used link (e.g. an email client's link-preview
    // scanner, or the customer tapping it twice) just shows the current
    // state instead of erroring — verification only ever moves one way.
    if (row.ticket.status === "pending_verification") {
      await db.transaction(async (tx) => {
        await tx
          .update(ticketVerifications)
          .set({ usedAt: new Date() })
          .where(eq(ticketVerifications.id, verification.id));

        await tx
          .update(tickets)
          .set({ status: "waiting", verifiedAt: new Date() })
          .where(eq(tickets.id, row.ticket.id));
      });

      row.ticket.status = "waiting";
    }

    return {
      success: true,
      message: "You're confirmed in the queue",
      data: {
        ticket: toPublicTicket(
          row.ticket,
          row.queue,
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
