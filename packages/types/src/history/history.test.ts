import { describe, expect, test } from "bun:test";
import { historyDateParamSchema, historyQuerySchema } from "./history";

describe("historyQuerySchema", () => {
  test("defaults page to 1 and limit to 20", () => {
    const result = historyQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  test("coerces string page/limit query params to numbers", () => {
    const result = historyQuerySchema.safeParse({ page: "2", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  test("rejects a limit over 50", () => {
    const result = historyQuerySchema.safeParse({ limit: "51" });
    expect(result.success).toBe(false);
  });

  test("rejects a page under 1", () => {
    const result = historyQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  test("accepts from/to dates in YYYY-MM-DD", () => {
    const result = historyQuerySchema.safeParse({
      from: "2026-09-01",
      to: "2026-09-19",
    });
    expect(result.success).toBe(true);
  });

  test("rejects a malformed date", () => {
    const result = historyQuerySchema.safeParse({ from: "09/01/2026" });
    expect(result.success).toBe(false);
  });
});

describe("historyDateParamSchema", () => {
  test("accepts YYYY-MM-DD", () => {
    expect(historyDateParamSchema.safeParse("2026-09-19").success).toBe(true);
  });

  test("rejects other date formats", () => {
    expect(historyDateParamSchema.safeParse("19-09-2026").success).toBe(false);
  });
});
