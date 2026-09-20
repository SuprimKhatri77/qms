import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops, ticketVerifications, tickets } from "@/db/schema";
import { joinQueue } from "@/services/tickets/join-queue.service";
import { verifyTicket } from "@/services/tickets/verify-ticket.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  getVerificationToken,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// Runs against the local dev Postgres (apps/api/.env.test) — every row this
// file creates is deleted in afterEach via deleteTestOwner's cascade.
describe("join -> verify", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  test("creates a pending ticket that becomes waiting once verified", async () => {
    const email = testCustomerEmail("alice");
    const joinResult = await joinQueue(shop.slug, {
      name: "Alice",
      email,
    });

    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    const [pending] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, joinResult.data.ticketId));
    expect(pending?.status).toBe("pending_verification");

    const token = await getVerificationToken(joinResult.data.ticketId);
    const verifyResult = await verifyTicket(token);

    expect(verifyResult.success).toBe(true);
    if (!verifyResult.success) return;
    expect(verifyResult.data.ticket.status).toBe("waiting");
    // First ticket of a fresh queue: token 1, counter still at 0 -> 1 away.
    expect(verifyResult.data.ticket.position).toBe(1);
  });

  test("rejects a second join from the same email while the first is still active", async () => {
    const email = testCustomerEmail("bob");
    const first = await joinQueue(shop.slug, { name: "Bob", email });
    expect(first.success).toBe(true);

    const second = await joinQueue(shop.slug, { name: "Bob Again", email });
    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.code).toBe("DUPLICATE_ENTRY");
  });

  test("rejects joining a suspended shop", async () => {
    await db
      .update(shops)
      .set({ status: "suspended" })
      .where(eq(shops.id, shop.id));

    const result = await joinQueue(shop.slug, {
      name: "Cara",
      email: testCustomerEmail("cara"),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
  });

  test("rejects an expired verification link", async () => {
    const joinResult = await joinQueue(shop.slug, {
      name: "Dev",
      email: testCustomerEmail("dev"),
    });
    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    await db
      .update(ticketVerifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(ticketVerifications.ticketId, joinResult.data.ticketId));

    const token = await getVerificationToken(joinResult.data.ticketId);
    const result = await verifyTicket(token);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
  });

  test("verifying an already-verified ticket is idempotent", async () => {
    const joinResult = await joinQueue(shop.slug, {
      name: "Eve",
      email: testCustomerEmail("eve"),
    });
    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    const token = await getVerificationToken(joinResult.data.ticketId);

    const firstVerify = await verifyTicket(token);
    const secondVerify = await verifyTicket(token);

    expect(firstVerify.success).toBe(true);
    expect(secondVerify.success).toBe(true);
    if (!secondVerify.success) return;
    expect(secondVerify.data.ticket.status).toBe("waiting");
  });
});
