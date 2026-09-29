import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { logEvent } from "@/lib/system-logs/log-event";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";
import { claimTurnAlerts, sendTurnAlerts } from "./turn-alerts";

/**
 * The owner taking a waiting customer off the list, e.g. when the customer
 * tells staff they're leaving. Recorded as "cancelled", the same status a
 * customer gets when they leave from their own ticket page.
 *
 * Only this ticket's status changes. The people behind it move up on their
 * own, because positions are derived on read from who is still waiting, and
 * call-next already skips cancelled tokens. The one other write is the
 * "emailed" flag on anyone who has just reached the front (at most two).
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

    // Only today's queue: it's the one the owner's dashboard shows. It's
    // also this owner's own queue, found through their own shop, which is
    // what keeps another shop's ticket out of reach (tenant isolation).
    const todaysQueue = await findOrCreateTodaysQueue(shop);

    const alerts = await db.transaction(async (tx) => {
      // Lock the queue row before changing the ticket: the same lock join
      // and call-next take (see cancel-ticket.service.ts for the race this
      // prevents: a ticket removed while call-next is picking it must not
      // end up "serving").
      await tx
        .select({ id: queues.id })
        .from(queues)
        .where(eq(queues.id, todaysQueue.id))
        .for("update");

      // Only a customer still "waiting" in this queue can be removed. One
      // being served is finished with done/no-show instead, and an
      // unconfirmed ticket never shows on the dashboard. Checked in the
      // WHERE clause, after the lock, so a double-click can't remove twice.
      const [removed] = await tx
        .update(tickets)
        .set({ status: "cancelled", resolvedAt: new Date() })
        .where(
          and(
            eq(tickets.id, ticketId),
            eq(tickets.queueId, todaysQueue.id),
            eq(tickets.status, "waiting"),
          ),
        )
        .returning({ id: tickets.id });

      if (!removed) {
        return null;
      }

      // Everyone behind just moved up one place, so someone may now be
      // near the front without having been emailed yet.
      return await claimTurnAlerts(tx, todaysQueue.id);
    });

    if (!alerts) {
      return {
        success: false,
        message: "That customer is no longer waiting",
        code: ErrorCode.NOT_FOUND,
      };
    }

    sendTurnAlerts(alerts, shop);

    return await getQueueSnapshotResponse(
      todaysQueue.id,
      "Removed from the queue",
    );
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
