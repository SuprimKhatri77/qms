import { eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import type { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { toPublicTicket } from "./map-ticket";

// Polled every ~10s by the customer's ticket page. There's no session to
// scope this by, so the ticket's own id (a UUID, not guessable) is the
// access control — same trade-off the project's "no customer accounts"
// design already accepts for the email verification link.
export async function getPublicTicket(
  ticketId: string,
): Promise<PublicTicketResponse | ApiErrorResponse> {
  try {
    const [row] = await db
      .select({ ticket: tickets, queue: queues, shop: shops })
      .from(tickets)
      .innerJoin(queues, eq(queues.id, tickets.queueId))
      .innerJoin(shops, eq(shops.id, queues.shopId))
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!row) {
      return {
        success: false,
        message: "Ticket not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    return {
      success: true,
      message: "Ticket retrieved successfully",
      data: {
        ticket: toPublicTicket(
          row.ticket,
          row.queue,
          row.shop.avgServiceMinutes,
        ),
        shop: { name: row.shop.name, slug: row.shop.slug },
      },
    };
  } catch (error) {
    console.error("getPublicTicket failed:", error);
    return {
      success: false,
      message: "Failed to retrieve ticket",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
