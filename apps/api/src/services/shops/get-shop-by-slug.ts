import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";

// Looks up a shop by its public slug (the "/s/<slug>" link customers scan).
// Used by every customer-facing endpoint, none of which know the shop's id.
export async function getShopBySlug(slug: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);

  return shop;
}
