import type { ApiErrorResponse, GetMyShopResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "./get-owner-shop";
import { toApiShop } from "./map-shop";

export async function getMyShop(
  ownerId: string,
): Promise<GetMyShopResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    return {
      success: true,
      message: shop ? "Shop retrieved successfully" : "No shop set up yet",
      data: { shop: shop ? toApiShop(shop) : null },
    };
  } catch (error) {
    console.error("getMyShop failed:", error);
    return {
      success: false,
      message: "Failed to retrieve shop",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
