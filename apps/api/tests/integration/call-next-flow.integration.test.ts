import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { callNext } from "@/services/queue/call-next.service";
import { resolveTicket } from "@/services/queue/resolve-ticket.service";
import { getPublicTicket } from "@/services/tickets/get-public-ticket.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

describe("call-next flow", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  test("serves the lowest waiting token and derives the rest's position from it", async () => {
    const ticket1 = await joinAndVerify(
      shop.slug,
      "One",
      testCustomerEmail("one"),
    );
    const ticket2 = await joinAndVerify(
      shop.slug,
      "Two",
      testCustomerEmail("two"),
    );
    const ticket3 = await joinAndVerify(
      shop.slug,
      "Three",
      testCustomerEmail("three"),
    );

    const result = await callNext(ownerId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.queue.currentServingNumber).toBe(1);
    expect(result.data.serving?.id).toBe(ticket1);
    expect(result.data.waiting.map((t) => t.id)).toEqual([ticket2, ticket3]);

    // Position is never stored — re-read each ticket and check it's derived
    // fresh against the now-updated counter (token 2 -> 1 away, token 3 -> 2 away).
    const publicTwo = await getPublicTicket(ticket2);
    const publicThree = await getPublicTicket(ticket3);
    expect(publicTwo.success && publicTwo.data.ticket.position).toBe(1);
    expect(publicThree.success && publicThree.data.ticket.position).toBe(2);
  });

  test("sets turnAlertSentAt on tickets now within range of being called", async () => {
    const ticket1 = await joinAndVerify(
      shop.slug,
      "One",
      testCustomerEmail("one"),
    );
    const ticket2 = await joinAndVerify(
      shop.slug,
      "Two",
      testCustomerEmail("two"),
    );
    const ticket3 = await joinAndVerify(
      shop.slug,
      "Three",
      testCustomerEmail("three"),
    );
    const ticket4 = await joinAndVerify(
      shop.slug,
      "Four",
      testCustomerEmail("four"),
    );

    await callNext(ownerId);

    const [row1, row2, row3, row4] = await Promise.all(
      [ticket1, ticket2, ticket3, ticket4].map(async (id) => {
        const [row] = await db
          .select({ turnAlertSentAt: tickets.turnAlertSentAt })
          .from(tickets)
          .where(eq(tickets.id, id));
        return row;
      }),
    );

    // Threshold is 2: token 2 (1 away) and token 3 (2 away) get alerted;
    // token 1 is being served (not "waiting"), token 4 (3 away) is not yet.
    expect(row1?.turnAlertSentAt).toBeNull();
    expect(row2?.turnAlertSentAt).not.toBeNull();
    expect(row3?.turnAlertSentAt).not.toBeNull();
    expect(row4?.turnAlertSentAt).toBeNull();
  });

  test("rejects calling next while someone is already being served", async () => {
    await joinAndVerify(shop.slug, "One", testCustomerEmail("one"));
    await joinAndVerify(shop.slug, "Two", testCustomerEmail("two"));

    const first = await callNext(ownerId);
    expect(first.success).toBe(true);

    const second = await callNext(ownerId);
    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.code).toBe("CONFLICT");
  });

  test("rejects calling next when nobody is waiting", async () => {
    const result = await callNext(ownerId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
  });

  test("resolving the served ticket unblocks the next call-next", async () => {
    const ticket1 = await joinAndVerify(
      shop.slug,
      "One",
      testCustomerEmail("one"),
    );
    const ticket2 = await joinAndVerify(
      shop.slug,
      "Two",
      testCustomerEmail("two"),
    );

    await callNext(ownerId);

    const resolved = await resolveTicket(ownerId, ticket1, "done");
    expect(resolved.success).toBe(true);
    if (resolved.success) {
      expect(resolved.data.stats.done).toBe(1);
    }

    const next = await callNext(ownerId);
    expect(next.success).toBe(true);
    if (next.success) {
      expect(next.data.serving?.id).toBe(ticket2);
    }
  });

  test("rejects resolving a ticket that isn't currently being served", async () => {
    const ticket1 = await joinAndVerify(
      shop.slug,
      "One",
      testCustomerEmail("one"),
    );

    const result = await resolveTicket(ownerId, ticket1, "done");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOT_FOUND");
  });
});
