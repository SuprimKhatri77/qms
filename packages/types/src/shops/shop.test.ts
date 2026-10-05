import { describe, expect, test } from "bun:test";
import { createShopSchema } from "./shop";

// A complete, valid shop payload — each test tweaks one field off this base
// rather than repeating every required field every time.
const validShop = {
  name: "Downtown Barber",
  category: "barber",
  city: "Kathmandu",
  avgServiceMinutes: 15,
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

  test("accepts a closing time like 19:00", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      closingTime: "19:00",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.closingTime).toBe("19:00");
  });

  test("an empty closing time means none (open until midnight)", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      closingTime: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.closingTime).toBeUndefined();
  });

  test("rejects closing times that aren't HH:MM", () => {
    for (const closingTime of ["7pm", "24:00", "19:60", "9:00"]) {
      expect(
        createShopSchema.safeParse({ ...validShop, closingTime }).success,
      ).toBe(false);
    }
  });

  test("accepts an opening time like 09:00, on its own or before the closing time", () => {
    const openingOnly = createShopSchema.safeParse({
      ...validShop,
      openingTime: "09:00",
    });
    expect(openingOnly.success).toBe(true);
    if (!openingOnly.success) return;
    expect(openingOnly.data.openingTime).toBe("09:00");

    const both = createShopSchema.safeParse({
      ...validShop,
      openingTime: "09:00",
      closingTime: "17:00",
    });
    expect(both.success).toBe(true);
  });

  test("an empty opening time means none (open from midnight)", () => {
    const result = createShopSchema.safeParse({
      ...validShop,
      openingTime: "",
      closingTime: "17:00",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.openingTime).toBeUndefined();
  });

  test("rejects opening times that aren't HH:MM", () => {
    for (const openingTime of ["9am", "24:00", "09:60", "9:00"]) {
      expect(
        createShopSchema.safeParse({ ...validShop, openingTime }).success,
      ).toBe(false);
    }
  });

  test("the closing time must be after the opening time", () => {
    for (const [openingTime, closingTime] of [
      ["17:00", "09:00"],
      ["09:00", "09:00"],
      ["09:00", "00:00"],
    ]) {
      const result = createShopSchema.safeParse({
        ...validShop,
        openingTime,
        closingTime,
      });
      expect(result.success).toBe(false);
      if (result.success) continue;
      // Shown under the closing-time field.
      expect(result.error.issues[0]?.path).toEqual(["closingTime"]);
      expect(result.error.issues[0]?.message).toBe(
        "Closing time must be after the opening time",
      );
    }
  });
});
