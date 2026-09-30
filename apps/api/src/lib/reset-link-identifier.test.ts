import { describe, expect, test } from "bun:test";
import { hashResetIdentifier } from "./reset-link-identifier";

describe("hashResetIdentifier", () => {
  test("replaces the token with its SHA-256 under its own prefix", async () => {
    const stored = await hashResetIdentifier("reset-password:abc123");
    expect(stored).toMatch(/^reset-password-hash:[0-9a-f]{64}$/);
    expect(stored).not.toContain("abc123");
  });

  // Better Auth's plain fallback looks up "reset-password:<submitted>", so a
  // stored row must never have that shape, or its hash would work as a token.
  test("never produces an identifier the plain lookup could match", async () => {
    const stored = await hashResetIdentifier("reset-password:abc123");
    expect(stored.startsWith("reset-password:")).toBe(false);
  });

  test("the same link always hashes to the same row", async () => {
    expect(await hashResetIdentifier("reset-password:abc123")).toBe(
      await hashResetIdentifier("reset-password:abc123"),
    );
  });

  test("different tokens get different rows", async () => {
    expect(await hashResetIdentifier("reset-password:abc123")).not.toBe(
      await hashResetIdentifier("reset-password:abc124"),
    );
  });
});
