import { and, eq } from "drizzle-orm";
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

    const removed = await db.transaction(async (tx) => {
      // Only a ticket in one of THIS shop's queues is looked at (tenant
      // isolation), so another shop's ticket id finds nothing and never
      // touches that shop's queue.
      const [ticket] = await tx
        .select({ queueId: tickets.queueId })
        .from(tickets)
        .innerJoin(queues, eq(queues.id, tickets.queueId))
        .where(and(eq(tickets.id, ticketId), eq(queues.shopId, shop.id)))
        .limit(1);

      if (!ticket) {
        return false;
      }

      // Lock the queue row before changing the ticket: the same lock join
      // and call-next take (see cancel-ticket.service.ts for the race this
      // prevents: a ticket removed while call-next is picking it must not
      // end up "serving"). A ticket never moves between queues, so reading
      // its queue id first, unlocked, is safe.
      await tx
        .select({ id: queues.id })
        .from(queues)
        .where(eq(queues.id, ticket.queueId))
        .for("update");

      // Only a customer still "waiting" can be removed. One being served is
      // finished with done/no-show instead, and an unconfirmed ticket never
      // shows on the dashboard. Checked in the WHERE clause, after the lock,
      // so a double-click can't remove twice.
      const [updated] = await tx
        .update(tickets)
        .set({ status: "cancelled", resolvedAt: new Date() })
        .where(and(eq(tickets.id, ticketId), eq(tickets.status, "waiting")))
        .returning({ id: tickets.id });

      return Boolean(updated);
    });

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
