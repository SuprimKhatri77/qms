import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

export type TicketOutcome = "done" | "no_show";

/**
 * Finishes the customer currently being served, as "done" or "no_show".
 * Both are terminal: a no-show who comes back simply joins again.
 */
export async function resolveTicket(
  ownerId: string,
  ticketId: string,
  outcome: TicketOutcome,
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

    // A single UPDATE with every rule in its WHERE clause:
    //  - the ticket must belong to one of THIS shop's queues (tenant isolation),
    //  - and it must currently be "serving".
    // Because the check and the change are one statement, a double-click can't
    // resolve the same ticket twice. If nothing matches, no row comes back.
    const [resolved] = await db
      .update(tickets)
      .set({ status: outcome, resolvedAt: new Date() })
      .where(
        and(
          eq(tickets.id, ticketId),
          eq(tickets.status, "serving"),
          inArray(
            tickets.queueId,
            db
              .select({ id: queues.id })
              .from(queues)
              .where(eq(queues.shopId, shop.id)),
          ),
        ),
      )
      .returning({ id: tickets.id });

    if (!resolved) {
      return {
        success: false,
        message: "That customer is not currently being served",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const queue = await findOrCreateTodaysQueue(shop);

    return await getQueueSnapshotResponse(
      queue.id,
      outcome === "done" ? "Marked as done" : "Marked as no-show",
    );
  } catch (error) {
    console.error("resolveTicket failed:", error);
    return {
      success: false,
      message: "Failed to update ticket",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
