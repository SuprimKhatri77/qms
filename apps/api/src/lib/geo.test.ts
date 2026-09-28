import { describe, expect, test } from "bun:test";
import { boundingBox } from "./geo";

describe("boundingBox", () => {
  test("10 km around Kathmandu is about ±0.09° lat and ±0.10° lng", () => {
    const box = boundingBox(27.7172, 85.324, 10);

    expect(box.maxLat - 27.7172).toBeCloseTo(0.0898, 3);
    expect(27.7172 - box.minLat).toBeCloseTo(0.0898, 3);
    // Longitude degrees are narrower away from the equator, so the box is
    // wider in degrees east-west than north-south.
    expect(box.maxLng - 85.324).toBeCloseTo(0.1015, 3);
    expect(box.maxLng - 85.324).toBeGreaterThan(box.maxLat - 27.7172);
  });

  test("at the equator, both directions are the same width", () => {
    const box = boundingBox(0, 0, 10);
    expect(box.maxLat).toBeCloseTo(box.maxLng, 6);
  });

  test("a zero radius is just the point itself", () => {
    const box = boundingBox(27.7, 85.3, 0);
    expect(box).toEqual({
      minLat: 27.7,
      maxLat: 27.7,
      minLng: 85.3,
      maxLng: 85.3,
    });
  });

  test("stays within valid coordinates near a pole", () => {
    const box = boundingBox(89.99, 10, 50);
    expect(box.maxLat).toBe(90);
    expect(box.minLng).toBe(-180);
    expect(box.maxLng).toBe(180);
  });
});
