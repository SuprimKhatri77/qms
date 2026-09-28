import { describe, expect, test } from "bun:test";
import {
  adminShopsQuerySchema,
  systemLogsQuerySchema,
  updateShopStatusSchema,
} from "./admin";

describe("updateShopStatusSchema", () => {
  test("accepts active and suspended", () => {
    expect(updateShopStatusSchema.safeParse({ status: "active" }).success).toBe(
      true,
    );
    expect(
      updateShopStatusSchema.safeParse({ status: "suspended" }).success,
    ).toBe(true);
  });

  test("rejects any other status", () => {
    const result = updateShopStatusSchema.safeParse({ status: "banned" });
    expect(result.success).toBe(false);
  });
});

describe("adminShopsQuerySchema", () => {
  test("defaults page to 1 and limit to 20", () => {
    const result = adminShopsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  test("coerces string page/limit query params to numbers", () => {
    const result = adminShopsQuerySchema.safeParse({ page: "3", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });

  test("rejects a limit over 100", () => {
    const result = adminShopsQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  test("rejects a page under 1", () => {
    const result = adminShopsQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });
});

describe("systemLogsQuerySchema", () => {
  test("defaults page to 1, limit to 50, with no level filter", () => {
    const result = systemLogsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.level).toBeUndefined();
    }
  });

  test("coerces a string page to a number", () => {
    const result = systemLogsQuerySchema.safeParse({ page: "2" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
    }
  });

  test("rejects a page under 1", () => {
    const result = systemLogsQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  test("coerces a string limit to a number", () => {
    const result = systemLogsQuerySchema.safeParse({ limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  test("rejects a limit over 200", () => {
    const result = systemLogsQuerySchema.safeParse({ limit: "201" });
    expect(result.success).toBe(false);
  });

  test("rejects an unknown level", () => {
    const result = systemLogsQuerySchema.safeParse({ level: "critical" });
    expect(result.success).toBe(false);
  });
});
