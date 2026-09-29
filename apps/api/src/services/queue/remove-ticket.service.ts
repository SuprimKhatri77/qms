import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { logEvent } from "@/lib/system-logs/log-event";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

/**
 * The owner taking a waiting customer off the list, e.g. when the customer
 * tells staff they're leaving. Recorded as "cancelled", the same status a
 * customer gets when they leave from their own ticket page.
 *
 * Only this one ticket's row changes. The people behind it move up on their
 * own, because positions are derived on read from who is still waiting, and
 * call-next already skips cancelled tokens.
 */
export async function removeTicket(
  ownerId: string,
  ticketId: string,
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

    // Same single guarded UPDATE as resolveTicket:
    //  - the ticket must belong to one of THIS shop's queues (tenant isolation),
    //  - and it must currently be "waiting". A customer being served is
    //    finished with done/no-show instead, and an unconfirmed ticket never
    //    shows on the dashboard, so neither can be removed here.
    // Check and change in one statement, so a double-click (or call-next
    // picking this customer at the same moment) can't slip in between.
    const [removed] = await db
      .update(tickets)
      .set({ status: "cancelled", resolvedAt: new Date() })
      .where(
        and(
          eq(tickets.id, ticketId),
          eq(tickets.status, "waiting"),
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

    if (!removed) {
      return {
        success: false,
        message: "That customer is no longer waiting",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const queue = await findOrCreateTodaysQueue(shop);

    return await getQueueSnapshotResponse(queue.id, "Removed from the queue");
  } catch (error) {
    console.error("removeTicket failed:", error);
    logEvent(
      "error",
      "remove-ticket",
      "removeTicket threw an unexpected error",
      { ticketId, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to remove customer",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
