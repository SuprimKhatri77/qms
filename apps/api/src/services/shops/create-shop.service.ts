import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import type {
  ApiErrorResponse,
  CreateShopRequest,
  CreateShopResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { toApiShop } from "./map-shop";
import { slugify, withRandomSuffix } from "./slug";

const MAX_SLUG_ATTEMPTS = 5;

export async function createShop(
  ownerId: string,
  data: CreateShopRequest,
): Promise<CreateShopResponse | ApiErrorResponse> {
  try {
    // MVP rule: one shop per owner. The table itself would allow several
    // (owner_id is not unique), so the rule lives here and is easy to lift later.
    const [existingShop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.ownerId, ownerId))
      .limit(1);

    if (existingShop) {
      return {
        success: false,
        message: "You already have a shop",
        code: ErrorCode.DUPLICATE_ENTRY,
      };
    }

    // The slug becomes the public URL (/s/<slug>) and must be unique.
    // Instead of "check, then insert" (two people could pass the check at the
    // same time), we insert and let the unique index reject a taken slug:
    // onConflictDoNothing returns no row in that case, so we retry with a suffix.
    const baseSlug = slugify(data.name);

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      const slug = attempt === 0 ? baseSlug : withRandomSuffix(baseSlug);

      const [shop] = await db
        .insert(shops)
        .values({
          ownerId,
          name: data.name,
          slug,
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
        .onConflictDoNothing({ target: shops.slug })
        .returning();

      if (shop) {
        return {
          success: true,
          message: "Shop created successfully",
          data: { shop: toApiShop(shop) },
        };
      }
    }

    return {
      success: false,
      message: "Could not generate a unique shop URL, please try again",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  } catch (error) {
    console.error("createShop failed:", error);
    return {
      success: false,
      message: "Failed to create shop",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
