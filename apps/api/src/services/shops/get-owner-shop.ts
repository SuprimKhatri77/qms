import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";

// Finds the shop that belongs to this owner (undefined if they haven't set one up).
// Every owner-facing feature starts here: the owner id comes from the session,
// never from the request, so an owner can only ever reach their own shop.
export async function getOwnerShop(ownerId: string) {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, ownerId))
    .limit(1);

  return shop;
}
