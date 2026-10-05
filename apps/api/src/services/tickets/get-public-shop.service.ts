import type { ApiErrorResponse, GetPublicShopResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getShopBySlug } from "@/services/shops/get-shop-by-slug";
import { toApiShop } from "@/services/shops/map-shop";
import { findTodaysQueue } from "@/services/queue/find-or-create-queue";
import { getOpeningHoursStatus } from "@/services/queue/local-date";
import { logEvent } from "@/lib/system-logs/log-event";

// The shop info shown on the public join page ("/s/<slug>"). Same shape the
// owner sees (toApiShop already leaves out ownerId), just reached without a
// session, plus whether today's queue is taking new customers: the owner's
// open/close switch, and whether it's within the shop's opening hours.
export async function getPublicShop(
  slug: string,
): Promise<GetPublicShopResponse | ApiErrorResponse> {
  try {
    const shop = await getShopBySlug(slug);

    if (!shop) {
      return {
        success: false,
        message: "Shop not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Only reads today's queue, never creates it.
    const todaysQueue = await findTodaysQueue(shop);

    return {
      success: true,
      message: "Shop retrieved successfully",
      data: {
        shop: toApiShop(shop),
        queueOpen: !todaysQueue || todaysQueue.status === "active",
        hoursStatus: getOpeningHoursStatus(shop),
      },
    };
  } catch (error) {
    console.error("getPublicShop failed:", error);
    logEvent(
      "error",
      "get-public-shop",
      "getPublicShop threw an unexpected error",
      { slug, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to retrieve shop",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
