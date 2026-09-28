import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { callNext } from "@/services/queue/call-next.service";
import { setQueueStatus } from "@/services/queue/set-queue-status.service";
import { getShopQueue } from "@/services/queue/get-shop-queue.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import { getPublicShop } from "@/services/tickets/get-public-shop.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

describe("open / close today's queue", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  test("closing stops new joins, and reopening allows them again", async () => {
    const closed = await setQueueStatus(ownerId, "closed");
    expect(closed.success).toBe(true);
    if (!closed.success) return;
    expect(closed.data.queue.status).toBe("closed");

    const refused = await joinQueue(shop.slug, {
      name: "Late",
      email: testCustomerEmail("late"),
    });
    expect(refused.success).toBe(false);
    if (refused.success) return;
    expect(refused.code).toBe("CONFLICT");

    const reopened = await setQueueStatus(ownerId, "active");
    expect(reopened.success).toBe(true);

    const accepted = await joinQueue(shop.slug, {
      name: "Late",
      email: testCustomerEmail("late"),
    });
    expect(accepted.success).toBe(true);
  });

  test("the owner can still call customers who were already waiting", async () => {
    const waitingTicket = await joinAndVerify(
      shop.slug,
      "Early",
      testCustomerEmail("early"),
    );

    await setQueueStatus(ownerId, "closed");

    const result = await callNext(ownerId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.serving?.id).toBe(waitingTicket);
    expect(result.data.queue.status).toBe("closed");
  });

  test("the public shop reports whether today's queue is open", async () => {
    // No queue row exists yet today: a brand-new queue starts open, and
    // reading the public shop must not create one.
    const before = await getPublicShop(shop.slug);
    expect(before.success).toBe(true);
    if (!before.success) return;
    expect(before.data.queueOpen).toBe(true);

    await setQueueStatus(ownerId, "closed");

    const after = await getPublicShop(shop.slug);
    expect(after.success).toBe(true);
    if (!after.success) return;
    expect(after.data.queueOpen).toBe(false);
  });

  test("closing one owner's queue leaves another owner's queue open", async () => {
    const otherOwnerId = await createTestOwner();
    try {
      await createTestShop(otherOwnerId);
      await setQueueStatus(ownerId, "closed");

      const otherQueue = await getShopQueue(otherOwnerId);
      expect(otherQueue.success).toBe(true);
      if (!otherQueue.success) return;
      expect(otherQueue.data.queue.status).toBe("active");
    } finally {
      await deleteTestOwner(otherOwnerId);
    }
  });

  test("an owner with no shop gets NOT_FOUND", async () => {
    const shoplessOwnerId = await createTestOwner();
    try {
      const result = await setQueueStatus(shoplessOwnerId, "closed");
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.code).toBe("NOT_FOUND");
    } finally {
      await deleteTestOwner(shoplessOwnerId);
    }
  });
});
