import type { ApiErrorResponse, ApiSuccessResponse, Shop } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getShopBySlug } from "@/services/shops/get-shop-by-slug";
import { toApiShop } from "@/services/shops/map-shop";
import { logEvent } from "@/lib/system-logs/log-event";

export type GetPublicShopResponse = ApiSuccessResponse<{ shop: Shop }>;

// The shop info shown on the public join page ("/s/<slug>"). Same shape the
// owner sees (toApiShop already leaves out ownerId), just reached without a
// session.
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

    return {
      success: true,
      message: "Shop retrieved successfully",
      data: { shop: toApiShop(shop) },
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
