import { describe, expect, test } from "bun:test";
import { analyticsQuerySchema } from "./analytics";

describe("analyticsQuerySchema", () => {
  test("defaults to 30 days when omitted", () => {
    const result = analyticsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(30);
    }
  });

  test("accepts 7, 30 and 90, coercing to a number", () => {
    for (const days of ["7", "30", "90"]) {
      const result = analyticsQuerySchema.safeParse({ days });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toBe(Number(days));
      }
    }
  });

  test("rejects any other value", () => {
    const result = analyticsQuerySchema.safeParse({ days: "14" });
    expect(result.success).toBe(false);
  });
});
