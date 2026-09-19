import { describe, expect, test } from "bun:test";
import { toApiShop } from "./map-shop";

// A stand-in for a row `db.select().from(shops)` would return — enough
// fields to exercise the mapping, typed loosely since the real row type
// pulls in the whole drizzle schema.
const shopRow = {
  id: "11111111-1111-1111-1111-111111111111",
  ownerId: "owner-1",
  name: "Downtown Barber",
  slug: "downtown-barber",
  category: "barber" as const,
  status: "active" as const,
  city: "Kathmandu",
  area: null,
  address: null,
  lat: null,
  lng: null,
  timezone: "Asia/Kathmandu",
  email: null,
  phone: null,
  avgServiceMinutes: 15,
  queueExpiryHours: 12,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-02T00:00:00.000Z"),
};

describe("toApiShop", () => {
  test("carries every client-facing field through", () => {
    const shop = toApiShop(shopRow);

    expect(shop.id).toBe(shopRow.id);
    expect(shop.name).toBe(shopRow.name);
    expect(shop.slug).toBe(shopRow.slug);
    expect(shop.category).toBe(shopRow.category);
    expect(shop.status).toBe(shopRow.status);
    expect(shop.city).toBe(shopRow.city);
    expect(shop.timezone).toBe(shopRow.timezone);
    expect(shop.avgServiceMinutes).toBe(shopRow.avgServiceMinutes);
    expect(shop.queueExpiryHours).toBe(shopRow.queueExpiryHours);
  });

  test("leaves ownerId out of the result", () => {
    const shop = toApiShop(shopRow);
    expect(shop).not.toHaveProperty("ownerId");
  });

  test("stringifies createdAt and updatedAt as ISO timestamps", () => {
    const shop = toApiShop(shopRow);
    expect(shop.createdAt).toBe(shopRow.createdAt.toISOString());
    expect(shop.updatedAt).toBe(shopRow.updatedAt.toISOString());
  });
});
