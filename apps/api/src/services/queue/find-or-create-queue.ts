import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues } from "@/db/schema";
import type { shops } from "@/db/schema";
import { getShopLocalDate } from "./local-date";

// Returns today's queue for the shop, creating it if this is the first visit
// of the day. Owners never have to "start" a queue each morning.
//
// Insert-then-select (rather than select-then-insert) so two requests arriving
// at the same moment can't create two queues: the unique index on
// (shop_id, date) makes the second insert do nothing.
export async function findOrCreateTodaysQueue(shop: typeof shops.$inferSelect) {
  const date = getShopLocalDate(shop.timezone);

  await db
    .insert(queues)
    .values({ shopId: shop.id, date })
    .onConflictDoNothing({ target: [queues.shopId, queues.date] });

  const [queue] = await db
    .select()
    .from(queues)
    .where(and(eq(queues.shopId, shop.id), eq(queues.date, date)))
    .limit(1);

  if (!queue) {
    throw new Error(`Queue for shop ${shop.id} on ${date} not found`);
  }

  return queue;
}
