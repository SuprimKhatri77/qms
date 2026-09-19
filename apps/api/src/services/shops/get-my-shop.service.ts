import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import type { ApiErrorResponse, GetMyShopResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { toApiShop } from "./map-shop";

export async function getMyShop(
  ownerId: string,
): Promise<GetMyShopResponse | ApiErrorResponse> {
  try {
    // Tenant isolation: the owner id always comes from the session, never from
    // the request, so an owner can only ever read their own shop.
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.ownerId, ownerId))
      .limit(1);

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
