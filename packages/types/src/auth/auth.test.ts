import { describe, expect, test } from "bun:test";
import { loginSchema, signupFormSchema, signupSchema } from "./auth";

describe("loginSchema", () => {
  test("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "owner@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects a password under 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "owner@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  test("rejects a password over 50 characters", () => {
    const result = loginSchema.safeParse({
      email: "owner@example.com",
      password: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const validSignup = {
    email: "owner@example.com",
    password: "password123",
    name: "Asha Rai",
  };

  test("accepts a valid name", () => {
    const result = signupSchema.safeParse(validSignup);
    expect(result.success).toBe(true);
  });

  test("accepts a hyphenated name", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      name: "Mary-Jane O'Connor",
    });
    expect(result.success).toBe(true);
  });

  test("rejects a name containing digits", () => {
    const result = signupSchema.safeParse({ ...validSignup, name: "Asha1" });
    expect(result.success).toBe(false);
  });

  test("rejects an empty name", () => {
    const result = signupSchema.safeParse({ ...validSignup, name: "" });
    expect(result.success).toBe(false);
  });
});

describe("signupFormSchema", () => {
  const validForm = {
    email: "owner@example.com",
    password: "password123",
    confirmPassword: "password123",
    name: "Asha Rai",
  };

  test("accepts matching passwords", () => {
    const result = signupFormSchema.safeParse(validForm);
    expect(result.success).toBe(true);
  });

  test("rejects mismatched passwords", () => {
    const result = signupFormSchema.safeParse({
      ...validForm,
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
  });
});
