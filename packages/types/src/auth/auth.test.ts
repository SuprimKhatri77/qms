import { describe, expect, test } from "bun:test";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordFormSchema,
  resetPasswordSchema,
  signupFormSchema,
  signupSchema,
} from "./auth";

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

describe("forgotPasswordSchema", () => {
  test("accepts a valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "owner@example.com",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  test("accepts a token and a valid password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "newpassword1",
    });
    expect(result.success).toBe(false);
  });

  test("uses the same password bounds as signup", () => {
    const tooShort = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "short",
    });
    const tooLong = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "a".repeat(51),
    });
    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });
});

describe("resetPasswordFormSchema", () => {
  test("rejects passwords that don't match, on confirmPassword", () => {
    const result = resetPasswordFormSchema.safeParse({
      token: "abc123",
      password: "newpassword1",
      confirmPassword: "different12",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
