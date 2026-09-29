import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq, like, ne } from "drizzle-orm";
import { db } from "@/db";
import { session, users, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { forgotPassword } from "@/services/auth/forgot-password.service";
import { resetPassword } from "@/services/auth/reset-password.service";
import { login } from "@/services/auth/login.service";
import { ErrorCode } from "@repo/types";

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";

// Better Auth keeps a reset token as a verification row whose identifier is
// "reset-password:<token>" and whose value is the user's id. The test reads
// it straight from the database, where the email would normally carry it.
async function getResetToken(userId: string): Promise<string> {
  const [row] = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(
      and(
        eq(verification.value, userId),
        like(verification.identifier, "reset-password:%"),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("No reset token was stored for this user");
  }
  return row.identifier.slice("reset-password:".length);
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

    const token = await getResetToken(userId);
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
    const token = await getResetToken(userId);

    await resetPassword({ token, password: NEW_PASSWORD });
    const second = await resetPassword({ token, password: "third-password" });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("resetting with one link kills the account's other reset links", async () => {
    await forgotPassword({ email });
    const firstToken = await getResetToken(userId);
    await forgotPassword({ email });
    const [secondRow] = await db
      .select({ identifier: verification.identifier })
      .from(verification)
      .where(
        and(
          eq(verification.value, userId),
          like(verification.identifier, "reset-password:%"),
          ne(verification.identifier, `reset-password:${firstToken}`),
        ),
      );
    if (!secondRow) {
      throw new Error("The second request stored no token");
    }
    const secondToken = secondRow.identifier.slice("reset-password:".length);

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
      token: await getResetToken(userId),
      password: NEW_PASSWORD,
    });

    const after = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, userId));
    expect(after.length).toBe(0);
  });
});
