import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops, tickets } from "@/db/schema";
import { joinQueue } from "@/services/tickets/join-queue.service";
import { verifyTicket } from "@/services/tickets/verify-ticket.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  expireVerificationLink,
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
    const joinResult = await joinQueue(
      shop.slug,
      {
        name: "Alice",
        email,
      },
      null,
    );

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
    const first = await joinQueue(shop.slug, { name: "Bob", email }, null);
    expect(first.success).toBe(true);

    const second = await joinQueue(
      shop.slug,
      { name: "Bob Again", email },
      null,
    );
    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.code).toBe("DUPLICATE_ENTRY");
  });

  test("rejects joining a suspended shop", async () => {
    await db
      .update(shops)
      .set({ status: "suspended" })
      .where(eq(shops.id, shop.id));

    const result = await joinQueue(
      shop.slug,
      {
        name: "Cara",
        email: testCustomerEmail("cara"),
      },
      null,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");
  });

  test("rejects an expired verification link", async () => {
    const joinResult = await joinQueue(
      shop.slug,
      {
        name: "Dev",
        email: testCustomerEmail("dev"),
      },
      null,
    );
    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    await expireVerificationLink(joinResult.data.ticketId);

    const token = await getVerificationToken(joinResult.data.ticketId);
    const result = await verifyTicket(token);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("CONFLICT");

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, joinResult.data.ticketId));
    expect(ticket?.status).toBe("expired");
  });

  test("lets a customer rejoin once their confirmation link has expired", async () => {
    const email = testCustomerEmail("fay");
    const first = await joinQueue(shop.slug, { name: "Fay", email }, null);
    expect(first.success).toBe(true);
    if (!first.success) return;

    await expireVerificationLink(first.data.ticketId);

    const second = await joinQueue(shop.slug, { name: "Fay", email }, null);
    expect(second.success).toBe(true);
    if (!second.success) return;

    const [oldTicket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, first.data.ticketId));
    expect(oldTicket?.status).toBe("expired");
    expect(oldTicket?.resolvedAt).not.toBeNull();

    // The new ticket confirms normally.
    const token = await getVerificationToken(second.data.ticketId);
    const verifyResult = await verifyTicket(token);
    expect(verifyResult.success).toBe(true);
  });

  test("an already-confirmed customer opening their old, expired link still sees their ticket", async () => {
    const joinResult = await joinQueue(
      shop.slug,
      {
        name: "Gus",
        email: testCustomerEmail("gus"),
      },
      null,
    );
    expect(joinResult.success).toBe(true);
    if (!joinResult.success) return;

    const token = await getVerificationToken(joinResult.data.ticketId);
    expect((await verifyTicket(token)).success).toBe(true);

    await expireVerificationLink(joinResult.data.ticketId);

    const again = await verifyTicket(token);
    expect(again.success).toBe(true);
    if (!again.success) return;
    expect(again.data.ticket.status).toBe("waiting");
  });

  test("verifying an already-verified ticket is idempotent", async () => {
    const joinResult = await joinQueue(
      shop.slug,
      {
        name: "Eve",
        email: testCustomerEmail("eve"),
      },
      null,
    );
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
