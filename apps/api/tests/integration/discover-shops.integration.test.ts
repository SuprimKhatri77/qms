import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops } from "@/db/schema";
import { discoverShops } from "@/services/shops/discover-shops.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { CreateShopRequest, DiscoverShopsQuery } from "@repo/types";

// Discovery lists shops from the whole platform, so every test uses its own
// made-up city, and "near me" searches around a remote spot in the ocean,
// far from any real dev data.
const REMOTE_LAT = -40;
const REMOTE_LNG = -140;

describe("public shop discovery", () => {
  const ownerIds: string[] = [];
  let city: string;

  beforeEach(() => {
    city = `Testville ${randomUUID().slice(0, 8)}`;
  });

  afterEach(async () => {
    for (const ownerId of ownerIds.splice(0)) {
      await deleteTestOwner(ownerId);
    }
  });

  // createShop allows one shop per owner, so each shop gets its own owner.
  async function makeShop(overrides: Partial<CreateShopRequest>) {
    const ownerId = await createTestOwner();
    ownerIds.push(ownerId);
    return createTestShop(ownerId, { city, ...overrides });
  }

  async function discover(query: Partial<DiscoverShopsQuery>) {
    const result = await discoverShops({ radiusKm: 10, ...query });
    if (!result.success) throw new Error(result.message);
    return result.data;
  }

  test("filters by city (any capitalisation) and category", async () => {
    const barber = await makeShop({ name: "Cut Above", category: "barber" });
    const clinic = await makeShop({ name: "Care Clinic", category: "clinic" });

    const byCity = await discover({ city: city.toUpperCase() });
    expect(byCity.shops.map((s) => s.id).sort()).toEqual(
      [barber.id, clinic.id].sort(),
    );
    expect(byCity.cities).toContain(city);

    const byCategory = await discover({ city, category: "clinic" });
    expect(byCategory.shops.map((s) => s.id)).toEqual([clinic.id]);
  });

  test("never lists a suspended shop, or its city", async () => {
    const shop = await makeShop({ name: "Hidden" });
    await db
      .update(shops)
      .set({ status: "suspended" })
      .where(eq(shops.id, shop.id));

    const result = await discover({ city });
    expect(result.shops).toHaveLength(0);
    expect(result.cities).not.toContain(city);
  });

  test("near me: nearest first, within the radius, only shops with a pin", async () => {
    // ~1.1 km and ~5.6 km north of the search point, then ~30 km (outside
    // a 10 km radius), then one with no pin at all.
    const near = await makeShop({
      name: "Near",
      lat: REMOTE_LAT + 0.01,
      lng: REMOTE_LNG,
    });
    const mid = await makeShop({
      name: "Mid",
      lat: REMOTE_LAT + 0.05,
      lng: REMOTE_LNG,
    });
    const far = await makeShop({
      name: "Far",
      lat: REMOTE_LAT + 0.27,
      lng: REMOTE_LNG,
    });
    const unpinned = await makeShop({ name: "No pin" });

    const result = await discover({
      lat: REMOTE_LAT,
      lng: REMOTE_LNG,
      radiusKm: 10,
    });
    const ids = result.shops.map((s) => s.id);

    expect(ids).toEqual([near.id, mid.id]);
    expect(ids).not.toContain(far.id);
    expect(ids).not.toContain(unpinned.id);
    expect(result.shops[0]?.distanceKm).toBeCloseTo(1.11, 1);
    expect(result.shops[1]?.distanceKm).toBeCloseTo(5.56, 1);

    // A wider radius reaches the far one too.
    const wider = await discover({
      lat: REMOTE_LAT,
      lng: REMOTE_LNG,
      radiusKm: 50,
    });
    expect(wider.shops.map((s) => s.id)).toContain(far.id);
  });

  test("without a location, distance is null and results are by name", async () => {
    await makeShop({ name: "Zebra Cuts", lat: REMOTE_LAT, lng: REMOTE_LNG });
    await makeShop({ name: "Alpha Cuts" });

    const result = await discover({ city });
    expect(result.shops.map((s) => s.name)).toEqual([
      "Alpha Cuts",
      "Zebra Cuts",
    ]);
    expect(result.shops.every((s) => s.distanceKm === null)).toBe(true);
  });

  test("shows today's waiting count and whether the queue is open, without creating queues", async () => {
    const busy = await makeShop({ name: "Busy" });
    const quiet = await makeShop({ name: "Quiet" });

    await joinAndVerify(busy.slug, "One", testCustomerEmail("one"));
    await joinAndVerify(busy.slug, "Two", testCustomerEmail("two"));

    const result = await discover({ city });
    const busyRow = result.shops.find((s) => s.id === busy.id);
    const quietRow = result.shops.find((s) => s.id === quiet.id);

    expect(busyRow?.waitingCount).toBe(2);
    expect(busyRow?.queueOpen).toBe(true);
    expect(quietRow?.waitingCount).toBe(0);
    expect(quietRow?.queueOpen).toBe(true);

    // Listing didn't create a queue for the shop nobody has used today.
    const quietQueues = await db
      .select()
      .from(queues)
      .where(eq(queues.shopId, quiet.id));
    expect(quietQueues).toHaveLength(0);

    // A closed queue shows as closed.
    await db
      .update(queues)
      .set({ status: "closed" })
      .where(inArray(queues.shopId, [busy.id]));
    const afterClose = await discover({ city });
    expect(afterClose.shops.find((s) => s.id === busy.id)?.queueOpen).toBe(
      false,
    );
  });
});
