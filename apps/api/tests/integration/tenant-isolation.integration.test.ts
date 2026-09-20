import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { callNext } from "@/services/queue/call-next.service";
import { getShopQueue } from "@/services/queue/get-shop-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// Every owner-facing service looks the shop up from `ownerId`, never from a
// shop id in the request — these tests exist to prove that actually holds:
// calling an action on your own queue can never see or move another shop's.
describe("tenant isolation", () => {
  let ownerA: string;
  let shopA: Shop;
  let ownerB: string;
  let shopB: Shop;

  beforeEach(async () => {
    ownerA = await createTestOwner();
    shopA = await createTestShop(ownerA);
    ownerB = await createTestOwner();
    shopB = await createTestShop(ownerB);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerA);
    await deleteTestOwner(ownerB);
  });

  test("calling next for owner A never touches owner B's queue", async () => {
    const ticketA = await joinAndVerify(
      shopA.slug,
      "A1",
      testCustomerEmail("a1"),
    );
    const ticketB = await joinAndVerify(
      shopB.slug,
      "B1",
      testCustomerEmail("b1"),
    );

    const result = await callNext(ownerA);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serving?.id).toBe(ticketA);
    }

    const shopBQueue = await getShopQueue(ownerB);
    expect(shopBQueue.success).toBe(true);
    if (shopBQueue.success) {
      // Shop B's counter never moved, and its ticket is still waiting.
      expect(shopBQueue.data.queue.currentServingNumber).toBe(0);
      expect(shopBQueue.data.serving).toBeNull();
      expect(shopBQueue.data.waiting.map((t) => t.id)).toEqual([ticketB]);
    }
  });

  test("getShopQueue only ever returns the caller's own shop", async () => {
    const ticketA = await joinAndVerify(
      shopA.slug,
      "A1",
      testCustomerEmail("a1"),
    );
    const ticketB = await joinAndVerify(
      shopB.slug,
      "B1",
      testCustomerEmail("b1"),
    );

    const queueA = await getShopQueue(ownerA);
    const queueB = await getShopQueue(ownerB);

    expect(queueA.success && queueA.data.waiting.map((t) => t.id)).toEqual([
      ticketA,
    ]);
    expect(queueB.success && queueB.data.waiting.map((t) => t.id)).toEqual([
      ticketB,
    ]);
  });

  test("an owner with no shop gets NOT_FOUND, never another owner's data", async () => {
    const bareOwnerId = await createTestOwner();

    try {
      const result = await getShopQueue(bareOwnerId);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe("NOT_FOUND");
    } finally {
      await deleteTestOwner(bareOwnerId);
    }
  });
});
