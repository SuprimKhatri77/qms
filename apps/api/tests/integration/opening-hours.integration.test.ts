import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { queues } from "@/db/schema";
import { getShopQueue } from "@/services/queue/get-shop-queue.service";
import { setQueueStatus } from "@/services/queue/set-queue-status.service";
import { discoverShops } from "@/services/shops/discover-shops.service";
import { getPublicShop } from "@/services/tickets/get-public-shop.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  testCustomerEmail,
} from "./support/fixtures";
import type { CreateShopRequest, Shop } from "@repo/types";

// Times chosen so the result doesn't depend on when the tests run: "00:00"
// has always passed today, "23:59" hasn't yet (except during the day's last
// minute). Same idea as queue-expiry.integration.test.ts.
const ALREADY_PASSED = "00:00";
const NOT_YET = "23:59";

describe("opening hours", () => {
  let ownerId: string;
  // Discovery lists shops from the whole platform, so each test's shop gets
  // its own made-up city to find it by.
  let city: string;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    city = `Hoursville ${randomUUID().slice(0, 8)}`;
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  function makeShop(hours: Partial<CreateShopRequest>): Promise<Shop> {
    return createTestShop(ownerId, { city, ...hours });
  }

  function join(shop: Shop) {
    return joinQueue(
      shop.slug,
      { name: "Early Bird", email: testCustomerEmail("early") },
      null,
    );
  }

  async function hoursStatusOnJoinPage(shop: Shop) {
    const result = await getPublicShop(shop.slug);
    if (!result.success) throw new Error(result.message);
    return result.data.hoursStatus;
  }

  async function shopOnExplore(shop: Shop) {
    const result = await discoverShops({ city, radiusKm: 10 });
    if (!result.success) throw new Error(result.message);
    const found = result.data.shops.find((row) => row.id === shop.id);
    if (!found) throw new Error("shop not listed");
    return found;
  }

  test("before the opening time, joining is refused with the opening time, and no queue is created", async () => {
    const shop = await makeShop({ openingTime: NOT_YET });

    const result = await join(shop);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
    expect(result.message).toBe(`This queue opens at ${NOT_YET}`);
    const rows = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, shop.id));
    expect(rows).toHaveLength(0);
  });

  test("from the opening time, customers can join", async () => {
    const shop = await makeShop({ openingTime: ALREADY_PASSED });

    const result = await join(shop);

    expect(result.success).toBe(true);
  });

  test("the join page knows whether it's before, within or after the hours", async () => {
    const early = await makeShop({ openingTime: NOT_YET });
    expect(await hoursStatusOnJoinPage(early)).toBe("before_opening");

    const otherOwner = await createTestOwner();
    try {
      const open = await createTestShop(otherOwner, {
        city,
        openingTime: ALREADY_PASSED,
        closingTime: NOT_YET,
      });
      expect(await hoursStatusOnJoinPage(open)).toBe("open");
    } finally {
      await deleteTestOwner(otherOwner);
    }
  });

  test("past the closing time the join page says after_closing", async () => {
    const shop = await makeShop({ closingTime: ALREADY_PASSED });
    expect(await hoursStatusOnJoinPage(shop)).toBe("after_closing");
  });

  test("explore shows when a shop opens, and listing it creates no queue", async () => {
    const shop = await makeShop({ openingTime: NOT_YET });

    const listed = await shopOnExplore(shop);

    expect(listed.hoursStatus).toBe("before_opening");
    expect(listed.openingTime).toBe(NOT_YET);
    const rows = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, shop.id));
    expect(rows).toHaveLength(0);
  });

  test("a shop with no hours is open on explore", async () => {
    const shop = await makeShop({});

    const listed = await shopOnExplore(shop);

    expect(listed.hoursStatus).toBe("open");
    expect(listed.openingTime).toBeNull();
  });

  test("the owner's dashboard snapshot says the queue isn't open yet, with the hours", async () => {
    await makeShop({ openingTime: NOT_YET });

    const result = await getShopQueue(ownerId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.hoursStatus).toBe("before_opening");
    expect(result.data.openingTime).toBe(NOT_YET);
    expect(result.data.closingTime).toBeNull();
    // The owner's switch is untouched: hours and the switch are separate.
    expect(result.data.queue.status).toBe("active");
  });

  test("a queue the owner closed before opening time isn't promised to open", async () => {
    const shop = await makeShop({ openingTime: NOT_YET });
    await setQueueStatus(ownerId, "closed");

    const joinPage = await getPublicShop(shop.slug);
    if (!joinPage.success) throw new Error(joinPage.message);
    expect(joinPage.data.queueOpen).toBe(false);
    expect((await shopOnExplore(shop)).queueOpen).toBe(false);

    const result = await join(shop);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.message).toBe(
      "This queue isn't accepting customers right now",
    );
  });
});
