import { afterEach, beforeEach, describe, expect, test } from "bun:test";
// First, so the mailer is swapped out before anything that sends email loads
// (also preloaded by `bun run test:integration`).
import { emailsTo, latestResetToken } from "./support/capture-emails";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { session, users, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { forgotPassword } from "@/services/auth/forgot-password.service";
import { resetPassword } from "@/services/auth/reset-password.service";
import { login } from "@/services/auth/login.service";
import { ErrorCode } from "@repo/types";

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";

// The reset rows this account has in the database right now, hashed
// ("reset-password-hash:…") or plain ("reset-password:…").
async function storedResetIdentifiers(userId: string): Promise<string[]> {
  const rows = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(
      and(
        eq(verification.value, userId),
        like(verification.identifier, "reset-password%"),
      ),
    );
  return rows.map((row) => row.identifier);
}

// Unlike the queue fixtures, this goes through Better Auth, because the
// password hash and the credential account are exactly what's under test.
describe("forgot password -> reset password", () => {
  let userId: string;
  let email: string;

  beforeEach(async () => {
    email = `reset-${randomUUID()}@integration-test.invalid`;
    const created = await auth.api.createUser({
      body: { email, password: OLD_PASSWORD, name: "Reset Test Owner" },
    });
    userId = created.user.id;
  });

  afterEach(async () => {
    // Sessions and accounts cascade from users; reset tokens aren't linked.
    await db.delete(verification).where(eq(verification.value, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  test("a reset link sets the new password and the old one stops working", async () => {
    const requested = await forgotPassword({ email });
    expect(requested.success).toBe(true);

    const token = latestResetToken(email);
    const reset = await resetPassword({ token, password: NEW_PASSWORD });
    expect(reset.success).toBe(true);

    const withOld = await login(
      { email, password: OLD_PASSWORD },
      new Headers(),
    );
    const withNew = await login(
      { email, password: NEW_PASSWORD },
      new Headers(),
    );
    expect(withOld.success).toBe(false);
    expect(withNew.success).toBe(true);
  });

  test("an unknown email gets the same answer as a real one", async () => {
    const real = await forgotPassword({ email });
    const unknown = await forgotPassword({
      email: `nobody-${randomUUID()}@integration-test.invalid`,
    });

    expect(unknown).toEqual(real);
  });

  test("a link only works once", async () => {
    await forgotPassword({ email });
    const token = latestResetToken(email);

    await resetPassword({ token, password: NEW_PASSWORD });
    const second = await resetPassword({ token, password: "third-password" });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("resetting with one link kills the account's other reset links", async () => {
    await forgotPassword({ email });
    const firstToken = latestResetToken(email);
    await forgotPassword({ email });
    const secondToken = latestResetToken(email);
    expect(secondToken).not.toBe(firstToken);

    const used = await resetPassword({
      token: secondToken,
      password: NEW_PASSWORD,
    });
    const older = await resetPassword({
      token: firstToken,
      password: "attacker-password",
    });

    expect(used.success).toBe(true);
    expect(older.success).toBe(false);
    if (!older.success) {
      expect(older.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("a made-up token is refused as INVALID_TOKEN", async () => {
    const result = await resetPassword({
      token: "not-a-real-token",
      password: NEW_PASSWORD,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("resetting signs out every existing session", async () => {
    await login({ email, password: OLD_PASSWORD }, new Headers());
    const before = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, userId));
    expect(before.length).toBe(1);

    await forgotPassword({ email });
    await resetPassword({
      token: latestResetToken(email),
      password: NEW_PASSWORD,
    });

    const after = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, userId));
    expect(after.length).toBe(0);
  });

  test("the database only holds a hash of the reset token", async () => {
    await forgotPassword({ email });
    const token = latestResetToken(email);

    const identifiers = await storedResetIdentifiers(userId);
    expect(identifiers.length).toBe(1);
    expect(identifiers[0]).toMatch(/^reset-password-hash:[0-9a-f]{64}$/);
    expect(identifiers[0]).not.toContain(token);
  });

  test("a reset emails the owner that their password changed", async () => {
    await forgotPassword({ email });
    await resetPassword({
      token: latestResetToken(email),
      password: NEW_PASSWORD,
    });

    const subjects = emailsTo(email).map((sent) => sent.subject);
    expect(subjects).toContain("Your Queueup password was changed");
  });

  test("the stored hash can't be used as a reset token", async () => {
    await forgotPassword({ email });
    const [stored] = await storedResetIdentifiers(userId);
    if (!stored) {
      throw new Error("No reset row was stored");
    }

    // Someone who can read the database tries the row itself as a token.
    const hashPart = stored.slice(stored.indexOf(":") + 1);
    const result = await resetPassword({
      token: hashPart,
      password: "attacker-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("a plain link stored before hashing was switched on still works", async () => {
    // What Better Auth stored for a link emailed before this deploy.
    const legacyToken = "legacyPlainToken12345678";
    await db.insert(verification).values({
      id: randomUUID(),
      identifier: `reset-password:${legacyToken}`,
      value: userId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const result = await resetPassword({
      token: legacyToken,
      password: NEW_PASSWORD,
    });
    expect(result.success).toBe(true);
  });
});
