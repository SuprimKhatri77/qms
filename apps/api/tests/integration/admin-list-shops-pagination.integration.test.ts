import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { listShops } from "@/services/admin/list-shops.service";
import { callNext } from "@/services/queue/call-next.service";
import { resolveTicket } from "@/services/queue/resolve-ticket.service";
import { cancelTicket } from "@/services/tickets/cancel-ticket.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// The dev database this suite runs against already has other shops in it
// (real ones, and rows other test files create in parallel-ish runs), so
// these tests check the pagination *mechanics* against shops known to exist
// rather than asserting an exact total count.
describe("admin listShops pagination", () => {
  const ownerIds: string[] = [];

  beforeEach(async () => {
    ownerIds.length = 0;
    for (let i = 0; i < 3; i++) {
      const ownerId = await createTestOwner();
      await createTestShop(ownerId);
      ownerIds.push(ownerId);
    }
  });

  afterEach(async () => {
    await Promise.all(ownerIds.map(deleteTestOwner));
  });

  test("respects the limit and reports pagination meta", async () => {
    const result = await listShops(1, 1);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.shops.length).toBe(1);
    expect(result.meta.limit).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.offset).toBe(0);
    // At least the 3 shops this test just created.
    expect(result.meta.total).toBeGreaterThanOrEqual(3);
    expect(result.meta.totalPages).toBeGreaterThanOrEqual(3);
  });

  test("paging through with a small limit eventually surfaces every shop this test created, with no duplicates", async () => {
    const first = await listShops(1, 100);
    expect(first.success).toBe(true);
    if (!first.success) return;

    // A page big enough to cover every shop in this small dev database in
    // one request is the simplest way to prove all 3 new shops are
    // reachable and each appears exactly once.
    const seenIds = first.data.shops.map((shop) => shop.id);
    expect(new Set(seenIds).size).toBe(seenIds.length);

    for (const ownerId of ownerIds) {
      const matches = first.data.shops.filter(
        (shop) =>
          shop.ownerEmail === `owner-${ownerId}@integration-test.invalid`,
      );
      expect(matches.length).toBe(1);
    }
  });

  test("a page past the end returns no rows without erroring", async () => {
    const result = await listShops(1, 1000000);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const farPage = await listShops(result.meta.totalPages + 1, 1000000);
    expect(farPage.success).toBe(true);
    if (!farPage.success) return;
    expect(farPage.data.shops).toEqual([]);
  });
});

describe("admin listShops served count", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  async function servedCountOf(shopId: string) {
    const result = await listShops(1, 1000000);
    if (!result.success) throw new Error(result.message);
    return result.data.shops.find((row) => row.id === shopId)?.servedCount;
  }

  async function serveNext(outcome: "done" | "no_show") {
    const called = await callNext(ownerId);
    if (!called.success) throw new Error(called.message);
    const servingId = called.data.serving?.id;
    if (!servingId) throw new Error("nobody is being served");
    await resolveTicket(ownerId, servingId, outcome);
  }

  test("a shop with no tickets has served 0", async () => {
    expect(await servedCountOf(shop.id)).toBe(0);
  });

  test("only tickets marked done count, not no-shows, cancelled, expired, waiting or unconfirmed ones", async () => {
    await joinAndVerify(shop.slug, "Served 1", testCustomerEmail("served1"));
    await joinAndVerify(shop.slug, "No-show", testCustomerEmail("noshow"));
    await joinAndVerify(shop.slug, "Served 2", testCustomerEmail("served2"));
    await serveNext("done");
    await serveNext("no_show");
    await serveNext("done");

    const leaver = await joinAndVerify(
      shop.slug,
      "Leaver",
      testCustomerEmail("leaver"),
    );
    await cancelTicket(leaver);
    await joinAndVerify(shop.slug, "Waiting", testCustomerEmail("waiting"));
    const unconfirmed = await joinQueue(
      shop.slug,
      { name: "Unconfirmed", email: testCustomerEmail("unconfirmed") },
      null,
    );
    if (!unconfirmed.success) throw new Error(unconfirmed.message);
    // Expired the way the sweep leaves it (the sweep itself is covered in
    // queue-expiry.integration.test.ts).
    const expired = await joinAndVerify(
      shop.slug,
      "Expired",
      testCustomerEmail("expired"),
    );
    await db
      .update(tickets)
      .set({ status: "expired" })
      .where(eq(tickets.id, expired));

    expect(await servedCountOf(shop.id)).toBe(2);
  });
});
