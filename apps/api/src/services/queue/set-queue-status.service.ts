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

    const todaysQueue = await findOrCreateTodaysQueue(shop);

    // Scoped by shop as well as queue id, so this can only ever touch the
    // owner's own queue. Setting the status it already has is harmless.
    await db
      .update(queues)
      .set({ status })
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
