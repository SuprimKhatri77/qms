import { describe, expect, test } from "bun:test";
import { createShopSchema } from "./shop";

// A complete, valid shop payload — each test tweaks one field off this base
// rather than repeating every required field every time.
const validShop = {
  name: "Downtown Barber",
  category: "barber",
  city: "Kathmandu",
  avgServiceMinutes: 15,
  queueExpiryHours: 12,
};

describe("createShopSchema", () => {
  test("accepts a minimal valid shop", () => {
    const result = createShopSchema.safeParse(validShop);
    expect(result.success).toBe(true);
  });

  test("rejects a name under 2 characters", () => {
    const result = createShopSchema.safeParse({ ...validShop, name: "A" });
    expect(result.success).toBe(false);
  });

  test("rejects an unknown category", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      category: "spaceport",
    });
    expect(result.success).toBe(false);
  });

  test("treats an empty optional field as not provided", () => {
    const result = createShopSchema.safeParse({ ...validShop, area: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.area).toBeUndefined();
    }
  });

  test("rejects an invalid email in the optional email field", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("accepts an empty email as not provided", () => {
    const result = createShopSchema.safeParse({ ...validShop, email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
    }
  });

  test("accepts lat and lng together", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      lat: 27.7,
      lng: 85.3,
    });
    expect(result.success).toBe(true);
  });

  test("rejects lat without lng", () => {
    const result = createShopSchema.safeParse({ ...validShop, lat: 27.7 });
    expect(result.success).toBe(false);
  });

  test("rejects lng without lat", () => {
    const result = createShopSchema.safeParse({ ...validShop, lng: 85.3 });
    expect(result.success).toBe(false);
  });

  test("rejects a latitude outside -90..90", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      lat: 200,
      lng: 85.3,
    });
    expect(result.success).toBe(false);
  });

  test("rejects avgServiceMinutes above 180", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      avgServiceMinutes: 181,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a non-integer avgServiceMinutes", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      avgServiceMinutes: 10.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects queueExpiryHours above 48", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      queueExpiryHours: 49,
    });
    expect(result.success).toBe(false);
  });
});
