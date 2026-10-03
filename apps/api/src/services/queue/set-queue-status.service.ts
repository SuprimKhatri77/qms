import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues } from "@/db/schema";
import type {
  ApiErrorResponse,
  QueueSnapshotResponse,
  QueueStatus,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { logEvent } from "@/lib/system-logs/log-event";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { isPastClosingTime } from "./local-date";
import { getQueueSnapshotResponse } from "./queue-snapshot";

/**
 * Opens or closes the owner's queue for today.
 *
 * Closing only stops new customers joining (joinQueue checks it). The owner
 * can still call and serve everyone already in line, the same way a shop
 * turns its sign to "closed" but finishes with the people inside.
 */
export async function setQueueStatus(
  ownerId: string,
  status: QueueStatus,
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

    // Past the closing time joinQueue turns everyone away whatever the
    // queue's status, so reopening would only make the dashboard say "Open"
    // while nobody can join. The owner moves the closing time first.
    const closingTime = shop.closingTime;
    if (
      status === "active" &&
      closingTime &&
      isPastClosingTime(closingTime, shop.timezone)
    ) {
      return {
        success: false,
        message: `It's past your closing time (${closingTime.slice(0, 5)}). Change it in Settings to reopen the queue.`,
        code: ErrorCode.CONFLICT,
      };
    }

    const todaysQueue = await findOrCreateTodaysQueue(shop);

    // Reopening also clears expired_at. The expiry sweep only closes queues
    // that haven't expired yet, so a queue reopened after the sweep closed
    // it would otherwise never be closed again: its customers would stay
    // "waiting" past midnight and keep their device tokens.
    const changes =
      status === "active" ? { status, expiredAt: null } : { status };

    // Scoped by shop as well as queue id, so this can only ever touch the
    // owner's own queue. Setting the status it already has is harmless.
    await db
      .update(queues)
      .set(changes)
      .where(and(eq(queues.id, todaysQueue.id), eq(queues.shopId, shop.id)));

    return await getQueueSnapshotResponse(
      todaysQueue.id,
      status === "closed" ? "Queue closed" : "Queue reopened",
    );
  } catch (error) {
    console.error("setQueueStatus failed:", error);
    logEvent(
      "error",
      "set-queue-status",
      "setQueueStatus threw an unexpected error",
      { ownerId, status, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to update the queue",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
