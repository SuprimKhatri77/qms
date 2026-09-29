import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { getPublicTicket } from "@/services/tickets/get-public-ticket.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import { verifyTicket } from "@/services/tickets/verify-ticket.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  getVerificationToken,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// Position counts only customers still waiting ahead, so gaps left by
// unconfirmed, cancelled or expired tickets never count as people.
describe("people ahead", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  async function positionOf(ticketId: string) {
    const result = await getPublicTicket(ticketId);
    if (!result.success) throw new Error(result.message);
    return result.data.ticket.position;
  }

  // Tokens 1-6: #1 waiting, #2 never confirmed, #3 cancelled, #4 expired,
  // #5 and #6 waiting. By token numbers #6 looks 6th; really it's 3rd.
  async function queueWithGaps() {
    const one = await joinAndVerify(shop.slug, "One", testCustomerEmail("one"));
    const two = await joinQueue(
      shop.slug,
      {
        name: "Two",
        email: testCustomerEmail("two"),
      },
      null,
    );
    if (!two.success) throw new Error("join failed");
    const three = await joinAndVerify(
      shop.slug,
      "Three",
      testCustomerEmail("three"),
    );
    const four = await joinAndVerify(
      shop.slug,
      "Four",
      testCustomerEmail("four"),
    );
    const five = await joinAndVerify(
      shop.slug,
      "Five",
      testCustomerEmail("five"),
    );
    const six = await joinAndVerify(shop.slug, "Six", testCustomerEmail("six"));

    await db
      .update(tickets)
      .set({ status: "cancelled", resolvedAt: new Date() })
      .where(eq(tickets.id, three));
    await db
      .update(tickets)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(eq(tickets.id, four));

    return { one, two: two.data.ticketId, five, six };
  }

  test("skips unconfirmed, cancelled and expired tokens", async () => {
    const { one, two, five, six } = await queueWithGaps();

    expect(await positionOf(one)).toBe(1);
    expect(await positionOf(five)).toBe(2);
    // The old formula (token - counter) said 6.
    expect(await positionOf(six)).toBe(3);
    // Not confirmed yet, so not in line.
    expect(await positionOf(two)).toBeNull();
  });

  test("after call-next, the served ticket is 0 and the rest move up", async () => {
    const { one, five, six } = await queueWithGaps();

    await callNext(ownerId);

    expect(await positionOf(one)).toBe(0);
    expect(await positionOf(five)).toBe(1);
    // The old formula said 5.
    expect(await positionOf(six)).toBe(2);
  });

  test("the turn-alert goes to the first two customers really waiting", async () => {
    const { two, five, six } = await queueWithGaps();

    // Serves #1. The next two tokens (#2, #3) aren't waiting, so the old
    // rule would have alerted nobody useful; the new one alerts #5 and #6.
    await callNext(ownerId);

    const rows = await db
      .select({ id: tickets.id, turnAlertSentAt: tickets.turnAlertSentAt })
      .from(tickets)
      .where(inArray(tickets.id, [two, five, six]));
    const alertedIds = rows
      .filter((row) => row.turnAlertSentAt !== null)
      .map((row) => row.id)
      .sort();

    expect(alertedIds).toEqual([five, six].sort());
  });

  test("verifying returns the same position the ticket page shows", async () => {
    const { six } = await queueWithGaps();
    const late = await joinQueue(
      shop.slug,
      {
        name: "Late",
        email: testCustomerEmail("late"),
      },
      null,
    );
    if (!late.success) throw new Error("join failed");

    const verified = await verifyTicket(
      await getVerificationToken(late.data.ticketId),
    );
    expect(verified.success).toBe(true);
    if (!verified.success) return;

    // Waiting ahead: #1, #5, #6.
    expect(verified.data.ticket.position).toBe(4);
    expect(await positionOf(late.data.ticketId)).toBe(4);
    expect(await positionOf(six)).toBe(3);
  });
});
