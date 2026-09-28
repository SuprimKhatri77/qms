import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DISCOVERY_RADIUS_KM,
  discoverShopsQuerySchema,
} from "./discover";

// Query strings arrive as text, so every value here is a string, exactly as
// Express hands req.query to the controller.
describe("discoverShopsQuerySchema", () => {
  test("no filters at all is valid, with the default radius", () => {
    const result = discoverShopsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.radiusKm).toBe(DEFAULT_DISCOVERY_RADIUS_KM);
    expect(result.data.lat).toBeUndefined();
  });

  test("turns lat/lng/radius text into numbers", () => {
    const result = discoverShopsQuerySchema.safeParse({
      lat: "27.7172",
      lng: "85.324",
      radiusKm: "5",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.lat).toBe(27.7172);
    expect(result.data.lng).toBe(85.324);
    expect(result.data.radiusKm).toBe(5);
  });

  test("treats empty values as not given, not as 0", () => {
    const result = discoverShopsQuerySchema.safeParse({
      city: "",
      category: "",
      lat: "",
      lng: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.city).toBeUndefined();
    expect(result.data.category).toBeUndefined();
    expect(result.data.lat).toBeUndefined();
  });

  test("rejects lat without lng", () => {
    const result = discoverShopsQuerySchema.safeParse({ lat: "27.7" });
    expect(result.success).toBe(false);
  });

  test("rejects out-of-range coordinates", () => {
    expect(
      discoverShopsQuerySchema.safeParse({ lat: "91", lng: "85" }).success,
    ).toBe(false);
    expect(
      discoverShopsQuerySchema.safeParse({ lat: "27", lng: "181" }).success,
    ).toBe(false);
  });

  test("rejects a radius over 50 km", () => {
    const result = discoverShopsQuerySchema.safeParse({
      lat: "27",
      lng: "85",
      radiusKm: "51",
    });
    expect(result.success).toBe(false);
  });

  test("rejects an unknown category", () => {
    const result = discoverShopsQuerySchema.safeParse({ category: "casino" });
    expect(result.success).toBe(false);
  });
});
