import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { findOrCreateTodaysQueue } from "./find-or-create-queue";
import { getQueueSnapshotResponse } from "./queue-snapshot";

export async function getShopQueue(
  ownerId: string,
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

    const queue = await findOrCreateTodaysQueue(shop);

    return await getQueueSnapshotResponse(
      queue.id,
      "Queue retrieved successfully",
    );
  } catch (error) {
    console.error("getShopQueue failed:", error);
    return {
      success: false,
      message: "Failed to retrieve queue",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
