import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { expireFinishedQueues } from "@/services/queue/expire-finished-queues.service";
import { findOrCreateTodaysQueue } from "@/services/queue/find-or-create-queue";
import { setQueueStatus } from "@/services/queue/set-queue-status.service";
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

// Closing times used here are chosen so the result doesn't depend on when
// the tests run: "00:00" has always passed today, "23:59" hasn't yet (except
// during the day's last minute).
const ALREADY_CLOSED = "00:00";
const NOT_CLOSED_YET = "23:59";

// The sweeper works across every shop, so these tests look only at the
// rows they created, never at totals.
describe("queue expiry sweep", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    // Created without a closing time, so customers can join; each test
    // then sets the closing time it needs.
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  async function setClosingTime(shopId: string, closingTime: string | null) {
    await db.update(shops).set({ closingTime }).where(eq(shops.id, shopId));
  }

  async function queueOf() {
    const [queue] = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, shop.id));
    return queue!;
  }

  async function shopRow() {
    const [row] = await db.select().from(shops).where(eq(shops.id, shop.id));
    return row;
  }

  async function statusOf(ticketId: string) {
    const [ticket] = await db
      .select({ status: tickets.status, resolvedAt: tickets.resolvedAt })
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    return ticket!;
  }

  test("past closing time, the queue closes and people still in line expire", async () => {
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
    const pending = await joinQueue(
      shop.slug,
      {
        name: "Pending",
        email: testCustomerEmail("pending"),
      },
      null,
    );
    if (!pending.success) throw new Error("join failed");
    await callNext(ownerId);

    await setClosingTime(shop.id, ALREADY_CLOSED);
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

  test("before closing time the queue is left alone", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "Early",
      testCustomerEmail("early"),
    );

    await setClosingTime(shop.id, NOT_CLOSED_YET);
    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("active");
    expect((await queueOf()).expiredAt).toBeNull();
    expect((await statusOf(waiting)).status).toBe("waiting");
  });

  test("with no closing time, today's queue stays open", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "AllDay",
      testCustomerEmail("allday"),
    );

    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("active");
    expect((await statusOf(waiting)).status).toBe("waiting");
  });

  test("yesterday's queue expires even with no closing time", async () => {
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

  test("a finished queue's device tokens are wiped", async () => {
    const device = "0123456789abcdef0123456789abcdef";
    const ticketId = await joinAndVerify(
      shop.slug,
      "Phone owner",
      testCustomerEmail("phone"),
      device,
    );

    const yesterday = addDays(getShopLocalDate(shop.timezone), -1);
    await db
      .update(queues)
      .set({ date: yesterday })
      .where(eq(queues.shopId, shop.id));

    await expireFinishedQueues();

    const [row] = await db
      .select({ deviceToken: tickets.deviceToken })
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    expect(row?.deviceToken).toBeNull();
  });

  test("another shop's queue is untouched", async () => {
    const otherOwnerId = await createTestOwner();
    try {
      const otherShop = await createTestShop(otherOwnerId);
      const otherTicket = await joinAndVerify(
        otherShop.slug,
        "Elsewhere",
        testCustomerEmail("elsewhere"),
      );
      await joinAndVerify(shop.slug, "Here", testCustomerEmail("here"));

      await setClosingTime(shop.id, ALREADY_CLOSED);
      await expireFinishedQueues();

      expect((await statusOf(otherTicket)).status).toBe("waiting");
    } finally {
      await deleteTestOwner(otherOwnerId);
    }
  });

  test("running the sweep again doesn't expire a queue twice", async () => {
    await joinAndVerify(shop.slug, "First", testCustomerEmail("first"));
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await expireFinishedQueues();
    const firstExpiry = (await queueOf()).expiredAt;

    const again = await expireFinishedQueues();

    expect(again.expiredQueues).toBe(0);
    expect((await queueOf()).expiredAt?.getTime()).toBe(firstExpiry?.getTime());
  });

  test("reopening is refused while it's still past closing time", async () => {
    await joinAndVerify(shop.slug, "First", testCustomerEmail("first"));
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await expireFinishedQueues();
    const firstExpiry = (await queueOf()).expiredAt;

    const result = await setQueueStatus(ownerId, "active");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
    expect(result.message).toContain("00:00");
    // Nothing changed: still closed, still expired.
    const queue = await queueOf();
    expect(queue.status).toBe("closed");
    expect(queue.expiredAt?.getTime()).toBe(firstExpiry?.getTime());
  });

  test("closing the queue is still allowed past closing time", async () => {
    await joinAndVerify(shop.slug, "First", testCustomerEmail("first"));
    await setClosingTime(shop.id, ALREADY_CLOSED);

    const result = await setQueueStatus(ownerId, "closed");

    expect(result.success).toBe(true);
    expect((await queueOf()).status).toBe("closed");
  });

  test("a queue reopened after expiry still expires when its day ends", async () => {
    const before = await joinAndVerify(
      shop.slug,
      "Before",
      testCustomerEmail("before"),
    );
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await expireFinishedQueues();
    const firstResolvedAt = (await statusOf(before)).resolvedAt;

    // The owner stays open later: moves the closing time, then reopens.
    await setClosingTime(shop.id, NOT_CLOSED_YET);
    const reopened = await setQueueStatus(ownerId, "active");
    expect(reopened.success).toBe(true);

    const device = "fedcba9876543210fedcba9876543210";
    const lateJoiner = await joinAndVerify(
      shop.slug,
      "After",
      testCustomerEmail("after"),
      device,
    );

    // Midnight passes.
    const yesterday = addDays(getShopLocalDate(shop.timezone), -1);
    await db
      .update(queues)
      .set({ date: yesterday })
      .where(eq(queues.shopId, shop.id));
    await expireFinishedQueues();

    expect((await queueOf()).status).toBe("closed");
    expect((await statusOf(lateJoiner)).status).toBe("expired");
    // The second sweep leaves the first one's work alone.
    expect((await statusOf(before)).status).toBe("expired");
    expect((await statusOf(before)).resolvedAt?.getTime()).toBe(
      firstResolvedAt?.getTime(),
    );
    const [row] = await db
      .select({ deviceToken: tickets.deviceToken })
      .from(tickets)
      .where(eq(tickets.id, lateJoiner));
    expect(row?.deviceToken).toBeNull();
  });

  test("a queue reopened after expiry expires again at the new closing time", async () => {
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await findOrCreateTodaysQueue((await shopRow())!);
    await expireFinishedQueues();
    const firstExpiry = (await queueOf()).expiredAt;
    expect(firstExpiry).not.toBeNull();

    await setClosingTime(shop.id, NOT_CLOSED_YET);
    await setQueueStatus(ownerId, "active");
    expect((await queueOf()).expiredAt).toBeNull();

    const lateJoiner = await joinAndVerify(
      shop.slug,
      "After",
      testCustomerEmail("after"),
    );

    // The new closing time comes round too.
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await expireFinishedQueues();

    const queue = await queueOf();
    expect(queue.status).toBe("closed");
    expect(queue.expiredAt).not.toBeNull();
    expect((await statusOf(lateJoiner)).status).toBe("expired");
  });

  test("past closing time, joining is refused at once, before any sweep", async () => {
    await setClosingTime(shop.id, ALREADY_CLOSED);

    const result = await joinQueue(
      shop.slug,
      {
        name: "Late",
        email: testCustomerEmail("late"),
      },
      null,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");

    // Refused before today's queue was even created.
    const rows = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, shop.id));
    expect(rows).toHaveLength(0);
  });

  test("after expiry, the customer sees 'expired' with no position", async () => {
    const waiting = await joinAndVerify(
      shop.slug,
      "Late",
      testCustomerEmail("late"),
    );
    await setClosingTime(shop.id, ALREADY_CLOSED);
    await expireFinishedQueues();

    const ticket = await getPublicTicket(waiting);
    expect(ticket.success).toBe(true);
    if (!ticket.success) return;
    expect(ticket.data.ticket.status).toBe("expired");
    expect(ticket.data.ticket.position).toBeNull();
  });
});
