import type { Shop } from "@repo/types";
import type { shops } from "@/db/schema";

// Converts a database row into the shape the API returns.
// `ownerId` is deliberately left out: clients never need it.
export function toApiShop(shop: typeof shops.$inferSelect): Shop {
  return {
    id: shop.id,
    name: shop.name,
    slug: shop.slug,
    category: shop.category,
    city: shop.city,
    area: shop.area,
    timezone: shop.timezone,
    avgServiceMinutes: shop.avgServiceMinutes,
    queueExpiryHours: shop.queueExpiryHours,
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
  };
}
