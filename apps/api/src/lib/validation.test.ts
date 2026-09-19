import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { ErrorCode } from "@repo/types";
import { parseQuery, toValidationErrors } from "./validation";

describe("toValidationErrors", () => {
  test("turns each zod issue into a field/message/code entry", () => {
    const schema = z.object({ name: z.string().min(2) });
    const result = schema.safeParse({ name: "A" });

    if (result.success) throw new Error("expected parse to fail");

    const errors = toValidationErrors(result.error);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("name");
    expect(typeof errors[0]?.message).toBe("string");
    expect(typeof errors[0]?.code).toBe("string");
  });

  test("joins a nested path with dots", () => {
    const schema = z.object({ address: z.object({ city: z.string().min(2) }) });
    const result = schema.safeParse({ address: { city: "A" } });

    if (result.success) throw new Error("expected parse to fail");

    const errors = toValidationErrors(result.error);
    expect(errors[0]?.field).toBe("address.city");
  });

  test("falls back to 'root' when the issue has no path", () => {
    const schema = z.string().min(2);
    const result = schema.safeParse("A");

    if (result.success) throw new Error("expected parse to fail");

    const errors = toValidationErrors(result.error);
    expect(errors[0]?.field).toBe("root");
  });
});

describe("parseQuery", () => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).default(20),
  });

  test("returns the parsed data on success", () => {
    const result = parseQuery(schema, { limit: "5" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(5);
    }
  });

  test("returns an INVALID_QUERY_PARAM error response on failure", () => {
    const result = parseQuery(schema, { limit: "0" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.INVALID_QUERY_PARAM);
      expect(result.error.errors?.length).toBeGreaterThan(0);
    }
  });
});
