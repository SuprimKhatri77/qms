import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import type {
  ApiErrorResponse,
  UpdateShopRequest,
  UpdateShopResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "./get-owner-shop";
import { toApiShop } from "./map-shop";

export async function updateShop(
  ownerId: string,
  data: UpdateShopRequest,
): Promise<UpdateShopResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    if (!shop) {
      return {
        success: false,
        message: "Set up your shop first",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // The slug is left out on purpose: the public link (and any QR code
    // printed from it) must keep working after a rename.
    const [updated] = await db
      .update(shops)
      .set({
        name: data.name,
        category: data.category,
        city: data.city,
        area: data.area ?? null,
        address: data.address ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        avgServiceMinutes: data.avgServiceMinutes,
        queueExpiryHours: data.queueExpiryHours,
      })
      .where(eq(shops.id, shop.id))
      .returning();

    if (!updated) {
      throw new Error(`Shop ${shop.id} disappeared during update`);
    }

    return {
      success: true,
      message: "Settings saved",
      data: { shop: toApiShop(updated) },
    };
  } catch (error) {
    console.error("updateShop failed:", error);
    return {
      success: false,
      message: "Failed to save settings",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
