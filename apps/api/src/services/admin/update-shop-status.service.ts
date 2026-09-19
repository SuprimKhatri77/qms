import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import type {
  ApiErrorResponse,
  ShopStatus,
  UpdateShopStatusResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";

export async function updateShopStatus(
  shopId: string,
  status: ShopStatus,
): Promise<UpdateShopStatusResponse | ApiErrorResponse> {
  try {
    const [shop] = await db
      .update(shops)
      .set({ status })
      .where(eq(shops.id, shopId))
      .returning({ id: shops.id, status: shops.status });

    if (!shop) {
      return {
        success: false,
        message: "Shop not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    return {
      success: true,
      message: status === "suspended" ? "Shop suspended" : "Shop reactivated",
      data: { shopId: shop.id, status: shop.status },
    };
  } catch (error) {
    console.error("updateShopStatus failed:", error);
    logEvent(
      "error",
      "admin-update-shop-status",
      "updateShopStatus threw an unexpected error",
      { shopId, status, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to update shop",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
