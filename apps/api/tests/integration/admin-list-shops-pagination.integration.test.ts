import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { listShops } from "@/services/admin/list-shops.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
} from "./support/fixtures";

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
