import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { expireFinishedQueues } from "@/services/queue/expire-finished-queues.service";
import { addDays, getShopLocalDate } from "@/services/queue/local-date";
import { getPublicTicket } from "@/services/tickets/get-public-ticket.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// The sweeper works across every shop, so these tests look only at the
// rows they created, never at totals.
describe("queue expiry sweep", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId, { queueExpiryHours: 8 });
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  // Pretends the shop's queue opened `hours` ago.
  async function openedHoursAgo(hours: number) {
    await db
      .update(queues)
      .set({ createdAt: sql`now() - make_interval(hours => ${hours})` })
      .where(eq(queues.shopId, shop.id));
  }

  async function queueOf() {
    const [queue] = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, shop.id));
    return queue!;
  }

  async function statusOf(ticketId: string) {
    const [ticket] = await db
      .select({ status: tickets.status, resolvedAt: tickets.resolvedAt })
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    return ticket!;
  }

  test("once its hours are up, the queue closes and people still in line expire", async () => {
    const serving = await joinAndVerify(
      shop.slug,
      "Served",
      testCustomerEmail("served"),
    );
    const waiting = await joinAndVerify(
      shop.slug,
      "Waiting",
      testCustomerEmail("waiting"),
    );
    const pending = await joinQueue(shop.slug, {
      name: "Pending",
      email: testCustomerEmail("pending"),
    });
    if (!pending.success) throw new Error("join failed");
    await callNext(ownerId);

    await openedHoursAgo(9);
    await expireFinishedQueues();

    const queue = await queueOf();
    expect(queue.status).toBe("closed");
    expect(queue.expiredAt).not.toBeNull();

    expect((await statusOf(waiting)).status).toBe("expired");
    expect((await statusOf(waiting)).resolvedAt).not.toBeNull();
    expect((await statusOf(pending.data.ticketId)).status).toBe("expired");
    // Only the owner knows how the current visit ended.
    expect((await statusOf(serving)).status).toBe("serving");
  });

  test("a queue within its hours is left alone", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "Early",
      testCustomerEmail("early"),
    );

    await openedHoursAgo(7);
    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("active");
    expect((await queueOf()).expiredAt).toBeNull();
    expect((await statusOf(waiting)).status).toBe("waiting");
  });

  test("yesterday's queue expires even if its hours aren't up", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "Overnight",
      testCustomerEmail("overnight"),
    );

    const yesterday = addDays(getShopLocalDate(shop.timezone), -1);
    await db
      .update(queues)
      .set({ date: yesterday })
      .where(eq(queues.shopId, shop.id));

    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("closed");
    expect((await statusOf(waiting)).status).toBe("expired");
  });

  test("another shop's queue is untouched", async () => {
    const otherOwnerId = await createTestOwner();
    try {
      const otherShop = await createTestShop(otherOwnerId, {
        queueExpiryHours: 8,
      });
      const otherTicket = await joinAndVerify(
        otherShop.slug,
        "Elsewhere",
        testCustomerEmail("elsewhere"),
      );
      await joinAndVerify(shop.slug, "Here", testCustomerEmail("here"));

      await openedHoursAgo(9);
      await expireFinishedQueues();

      expect((await statusOf(otherTicket)).status).toBe("waiting");
    } finally {
      await deleteTestOwner(otherOwnerId);
    }
  });

  test("a queue is only expired once, even if the owner reopens it", async () => {
    await joinAndVerify(shop.slug, "First", testCustomerEmail("first"));
    await openedHoursAgo(9);
    await expireFinishedQueues();
    const firstExpiry = (await queueOf()).expiredAt;

    // The owner deliberately reopens it (what the open/close switch does).
    await db
      .update(queues)
      .set({ status: "active" })
      .where(eq(queues.shopId, shop.id));
    await expireFinishedQueues();

    const queue = await queueOf();
    expect(queue.status).toBe("active");
    expect(queue.expiredAt?.getTime()).toBe(firstExpiry?.getTime());
  });

  test("after expiry, joining is refused and the customer sees 'expired'", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "Late",
      testCustomerEmail("late"),
    );
    await openedHoursAgo(9);
    await expireFinishedQueues();

    const rejoin = await joinQueue(shop.slug, {
      name: "Newcomer",
      email: testCustomerEmail("newcomer"),
    });
    expect(rejoin.success).toBe(false);
    if (rejoin.success) return;
    expect(rejoin.code).toBe("CONFLICT");

    const ticket = await getPublicTicket(waiting);
    expect(ticket.success).toBe(true);
    if (!ticket.success) return;
    expect(ticket.data.ticket.status).toBe("expired");
    expect(ticket.data.ticket.position).toBeNull();
  });

  test("the shop's own expiry hours are used", async () => {
    await db
      .update(shops)
      .set({ queueExpiryHours: 2 })
      .where(eq(shops.id, shop.id));
    await joinAndVerify(shop.slug, "Short", testCustomerEmail("short"));

    await openedHoursAgo(3);
    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("closed");
  });
});
