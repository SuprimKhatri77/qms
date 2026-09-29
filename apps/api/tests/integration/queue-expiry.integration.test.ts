import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
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

  test("a queue is only expired once, even if the owner reopens it", async () => {
    await joinAndVerify(shop.slug, "First", testCustomerEmail("first"));
    await setClosingTime(shop.id, ALREADY_CLOSED);
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
