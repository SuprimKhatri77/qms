import { describe, expect, test } from "bun:test";
import { joinQueueSchema, verifyTicketSchema } from "./ticket";

describe("joinQueueSchema", () => {
  const validEntry = { name: "Asha Rai", email: "asha@example.com" };

  test("accepts a name and email with no phone", () => {
    const result = joinQueueSchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  test("rejects a name under 2 characters", () => {
    const result = joinQueueSchema.safeParse({ ...validEntry, name: "A" });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid email", () => {
    const result = joinQueueSchema.safeParse({
      ...validEntry,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("lowercases and trims the email", () => {
    const result = joinQueueSchema.safeParse({
      ...validEntry,
      email: "  Asha@Example.com  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("asha@example.com");
    }
  });

  test("treats an empty phone as not provided", () => {
    const result = joinQueueSchema.safeParse({ ...validEntry, phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  test("rejects a phone number over 20 characters", () => {
    const result = joinQueueSchema.safeParse({
      ...validEntry,
      phone: "1".repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

describe("verifyTicketSchema", () => {
  test("accepts a non-empty token", () => {
    const result = verifyTicketSchema.safeParse({ token: "abc123" });
    expect(result.success).toBe(true);
  });

  test("rejects an empty token", () => {
    const result = verifyTicketSchema.safeParse({ token: "" });
    expect(result.success).toBe(false);
  });

  test("rejects a missing token", () => {
    const result = verifyTicketSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
