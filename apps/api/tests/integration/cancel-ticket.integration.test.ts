import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { cancelTicket } from "@/services/tickets/cancel-ticket.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  raceAgainstCallingTicket,
  testCustomerEmail,
} from "./support/fixtures";
import { ErrorCode, type Shop } from "@repo/types";

describe("customer leaves the queue", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  test("a waiting customer can leave, and the same email can join again", async () => {
    const email = testCustomerEmail("leaver");
    const ticketId = await joinAndVerify(shop.slug, "Leaver", email);

    const result = await cancelTicket(ticketId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ticket.status).toBe("cancelled");
    // A finished ticket has no position any more.
    expect(result.data.ticket.position).toBeNull();

    const [row] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    expect(row?.resolvedAt).not.toBeNull();

    const rejoin = await joinQueue(shop.slug, { name: "Leaver", email });
    expect(rejoin.success).toBe(true);
  });

  test("a customer who hasn't confirmed yet can also leave", async () => {
    const joinResult = await joinQueue(shop.slug, {
      name: "Unsure",
      email: testCustomerEmail("unsure"),
    });
    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    const result = await cancelTicket(joinResult.data.ticketId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ticket.status).toBe("cancelled");
  });

  test("call-next skips a cancelled ticket", async () => {
    const first = await joinAndVerify(
      shop.slug,
      "First",
      testCustomerEmail("first"),
    );
    const second = await joinAndVerify(
      shop.slug,
      "Second",
      testCustomerEmail("second"),
    );

    await cancelTicket(first);

    const called = await callNext(ownerId);
    expect(called.success).toBe(true);
    if (!called.success) return;
    expect(called.data.serving?.id).toBe(second);
  });

  test("a customer being served can't leave", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Served",
      testCustomerEmail("served"),
    );
    await callNext(ownerId);

    const result = await cancelTicket(ticketId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");

    const [row] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    expect(row?.status).toBe("serving");
  });

  test("leaving twice is refused the second time", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Twice",
      testCustomerEmail("twice"),
    );

    expect((await cancelTicket(ticketId)).success).toBe(true);

    const second = await cancelTicket(ticketId);
    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.code).toBe("CONFLICT");
  });

  test("a cancel racing call-next waits for it, and the called customer stays served", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Racer",
      testCustomerEmail("racer"),
    );

    const { result, finishedWhileLocked } = await raceAgainstCallingTicket(
      ticketId,
      () => cancelTicket(ticketId),
    );

    expect(finishedWhileLocked).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.CONFLICT);
    }

    const [row] = await db
      .select({ status: tickets.status })
      .from(tickets)
      .where(eq(tickets.id, ticketId));
    expect(row?.status).toBe("serving");
  });

  test("leaving emails the customer who just reached the front", async () => {
    const ids = [];
    for (const name of ["A", "B", "C", "D"]) {
      ids.push(await joinAndVerify(shop.slug, name, testCustomerEmail(name)));
    }
    const [, b, , d] = ids as [string, string, string, string];
    await callNext(ownerId);

    const alertedBefore = await db
      .select({ turnAlertSentAt: tickets.turnAlertSentAt })
      .from(tickets)
      .where(eq(tickets.id, d));
    expect(alertedBefore[0]?.turnAlertSentAt).toBeNull();

    await cancelTicket(b);

    const alertedAfter = await db
      .select({ turnAlertSentAt: tickets.turnAlertSentAt })
      .from(tickets)
      .where(eq(tickets.id, d));
    expect(alertedAfter[0]?.turnAlertSentAt).not.toBeNull();
  });

  test("an unknown ticket id is NOT_FOUND", async () => {
    const result = await cancelTicket(randomUUID());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});
