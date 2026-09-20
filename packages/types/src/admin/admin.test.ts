import { describe, expect, test } from "bun:test";
import { systemLogsQuerySchema, updateShopStatusSchema } from "./admin";

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

describe("systemLogsQuerySchema", () => {
  test("defaults limit to 50 with no level filter", () => {
    const result = systemLogsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.level).toBeUndefined();
    }
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
