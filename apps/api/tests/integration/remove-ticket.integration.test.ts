import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { removeTicket } from "@/services/queue/remove-ticket.service";
import { resolveTicket } from "@/services/queue/resolve-ticket.service";
import { getPublicTicket } from "@/services/tickets/get-public-ticket.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  raceAgainstCallingTicket,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

async function readTicketStatus(ticketId: string) {
  const [row] = await db
    .select({ status: tickets.status, resolvedAt: tickets.resolvedAt })
    .from(tickets)
    .where(eq(tickets.id, ticketId));
  return row;
}

async function turnAlertSent(ticketId: string) {
  const [row] = await db
    .select({ turnAlertSentAt: tickets.turnAlertSentAt })
    .from(tickets)
    .where(eq(tickets.id, ticketId));
  return row?.turnAlertSentAt !== null;
}

describe("owner removes a waiting customer", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  test("removing a waiting customer moves the person behind them up one place", async () => {
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

    const before = await getPublicTicket(second);
    expect(before.success && before.data.ticket.position).toBe(2);

    const result = await removeTicket(ownerId, first);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.waiting.map((t) => t.id)).toEqual([second]);

    const removedRow = await readTicketStatus(first);
    expect(removedRow?.status).toBe("cancelled");
    expect(removedRow?.resolvedAt).not.toBeNull();

    // Nothing was written to the second ticket: its position is simply
    // derived again from who is still waiting in front of it.
    const after = await getPublicTicket(second);
    expect(after.success && after.data.ticket.position).toBe(1);

    const removedPublic = await getPublicTicket(first);
    expect(removedPublic.success && removedPublic.data.ticket.status).toBe(
      "cancelled",
    );
  });

  test("call-next skips a removed customer", async () => {
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

    await removeTicket(ownerId, first);

    const called = await callNext(ownerId);
    expect(called.success).toBe(true);
    if (!called.success) return;
    expect(called.data.serving?.id).toBe(second);
  });

  test("the customer being served can't be removed", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Served",
      testCustomerEmail("served"),
    );
    await callNext(ownerId);

    const result = await removeTicket(ownerId, ticketId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");

    expect((await readTicketStatus(ticketId))?.status).toBe("serving");
  });

  test("a finished ticket can't be removed", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Finished",
      testCustomerEmail("finished"),
    );
    await callNext(ownerId);
    await resolveTicket(ownerId, ticketId, "done");

    const result = await removeTicket(ownerId, ticketId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");

    expect((await readTicketStatus(ticketId))?.status).toBe("done");
  });

  test("removing twice is refused the second time", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Twice",
      testCustomerEmail("twice"),
    );

    expect((await removeTicket(ownerId, ticketId)).success).toBe(true);

    const second = await removeTicket(ownerId, ticketId);
    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.code).toBe("NOT_FOUND");
  });

  test("a remove racing call-next waits for it, and the called customer stays served", async () => {
    const ticketId = await joinAndVerify(
      shop.slug,
      "Racer",
      testCustomerEmail("racer"),
    );

    const { result, finishedWhileLocked } = await raceAgainstCallingTicket(
      ticketId,
      () => removeTicket(ownerId, ticketId),
    );

    expect(finishedWhileLocked).toBe(false);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NOT_FOUND");
    }
    expect((await readTicketStatus(ticketId))?.status).toBe("serving");
  });

  test("removing someone emails the customer who just reached the front", async () => {
    // A is called; B and C are then the first two waiting and get their
    // "almost up" email. D is third, so not yet.
    const ids = [];
    for (const name of ["A", "B", "C", "D"]) {
      ids.push(await joinAndVerify(shop.slug, name, testCustomerEmail(name)));
    }
    const [, b, , d] = ids as [string, string, string, string];
    await callNext(ownerId);
    expect(await turnAlertSent(d)).toBe(false);

    await removeTicket(ownerId, b);

    // D is now second in line, so it's D's turn to be told.
    expect(await turnAlertSent(d)).toBe(true);
  });

  test("an unknown ticket id is NOT_FOUND", async () => {
    const result = await removeTicket(ownerId, randomUUID());
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});

// The ticket id comes from the request, so the only thing stopping owner A
// from removing owner B's customer is that the UPDATE only matches tickets
// in owner A's own queue, found through owner A's own shop.
describe("removing a customer is scoped to the owner's own shop", () => {
  let ownerA: string;
  let ownerB: string;
  let shopB: Shop;

  beforeEach(async () => {
    ownerA = await createTestOwner();
    await createTestShop(ownerA);
    ownerB = await createTestOwner();
    shopB = await createTestShop(ownerB);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerA);
    await deleteTestOwner(ownerB);
  });

  test("owner A can't remove owner B's waiting customer", async () => {
    const ticketB = await joinAndVerify(
      shopB.slug,
      "B1",
      testCustomerEmail("b1"),
    );

    const result = await removeTicket(ownerA, ticketB);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");

    expect((await readTicketStatus(ticketB))?.status).toBe("waiting");
  });
});
