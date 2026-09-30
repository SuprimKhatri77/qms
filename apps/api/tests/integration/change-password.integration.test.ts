import { afterEach, beforeEach, describe, expect, test } from "bun:test";
// First, so the mailer is swapped out before anything that sends email loads
// (also preloaded by `bun run test:integration`).
import { emailsTo, latestResetToken } from "./support/capture-emails";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { session, users, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { changePassword } from "@/services/auth/change-password.service";
import { forgotPassword } from "@/services/auth/forgot-password.service";
import { login } from "@/services/auth/login.service";
import { resetPassword } from "@/services/auth/reset-password.service";
import { ErrorCode } from "@repo/types";

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";

// Turns the Set-Cookie lines of a response into the Cookie header a browser
// would send back ("name=value; name2=value2").
function cookieHeader(setCookies: string[]): Headers {
  const pairs = setCookies.map((line) => line.split(";")[0]);
  return new Headers({ cookie: pairs.join("; ") });
}

// Signs in like a browser would and returns that browser's cookies.
async function signIn(email: string, password: string): Promise<Headers> {
  const result = await login({ email, password }, new Headers());
  if (!result.success) {
    throw new Error(`Sign-in failed: ${result.message}`);
  }
  return cookieHeader(result.cookies);
}

async function isSignedIn(headers: Headers): Promise<boolean> {
  const current = await auth.api.getSession({ headers });
  return current !== null;
}

// Goes through Better Auth like password-reset.integration.test.ts, because
// the password hash and the sessions are exactly what's under test.
describe("changing the password while signed in", () => {
  let userId: string;
  let email: string;

  beforeEach(async () => {
    email = `change-${randomUUID()}@integration-test.invalid`;
    const created = await auth.api.createUser({
      body: { email, password: OLD_PASSWORD, name: "Change Test Owner" },
    });
    userId = created.user.id;
  });

  afterEach(async () => {
    // Sessions and accounts cascade from users; reset tokens aren't linked.
    await db.delete(verification).where(eq(verification.value, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  test("the new password works and the old one stops working", async () => {
    const browser = await signIn(email, OLD_PASSWORD);

    const result = await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      browser,
    );
    expect(result.success).toBe(true);

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

  test("a wrong current password is refused on that field and changes nothing", async () => {
    const browser = await signIn(email, OLD_PASSWORD);

    const result = await changePassword(
      userId,
      { currentPassword: "not-my-password", newPassword: NEW_PASSWORD },
      browser,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      // Not UNAUTHORIZED: the web app would treat that as a lost session.
      expect(result.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(result.errors?.[0]?.field).toBe("currentPassword");
    }
    expect(await isSignedIn(browser)).toBe(true);
    const withOld = await login(
      { email, password: OLD_PASSWORD },
      new Headers(),
    );
    expect(withOld.success).toBe(true);
  });

  test("other devices are signed out; this one gets a new working session", async () => {
    const thisBrowser = await signIn(email, OLD_PASSWORD);
    const otherDevice = await signIn(email, OLD_PASSWORD);

    const result = await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      thisBrowser,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(await isSignedIn(otherDevice)).toBe(false);
    // The old cookie of this browser is revoked too, and replaced by the
    // one in the response, which the controller passes on as Set-Cookie.
    expect(await isSignedIn(thisBrowser)).toBe(false);
    expect(await isSignedIn(cookieHeader(result.cookies))).toBe(true);
  });

  test("a reset link requested before the change stops working", async () => {
    await forgotPassword({ email });
    const token = latestResetToken(email);
    const browser = await signIn(email, OLD_PASSWORD);

    await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      browser,
    );
    const reset = await resetPassword({ token, password: "attacker-pass-3" });

    expect(reset.success).toBe(false);
    if (!reset.success) {
      expect(reset.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  test("a plain reset link from before hashing is deleted too", async () => {
    await db.insert(verification).values({
      id: randomUUID(),
      identifier: "reset-password:legacyPlainToken12345678",
      value: userId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    const browser = await signIn(email, OLD_PASSWORD);

    await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      browser,
    );

    const left = await db
      .select({ id: verification.id })
      .from(verification)
      .where(
        and(
          eq(verification.value, userId),
          like(verification.identifier, "reset-password%"),
        ),
      );
    expect(left.length).toBe(0);
  });

  test("the owner is emailed that their password changed", async () => {
    const browser = await signIn(email, OLD_PASSWORD);

    await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      browser,
    );

    const subjects = emailsTo(email).map((sent) => sent.subject);
    expect(subjects).toContain("Your Queueup password was changed");
  });

  test("two changes at the same moment: one wins, the other is refused", async () => {
    const owner = await signIn(email, OLD_PASSWORD);
    const phisher = await signIn(email, OLD_PASSWORD);

    const [first, second] = await Promise.all([
      changePassword(
        userId,
        { currentPassword: OLD_PASSWORD, newPassword: "owner-password-1" },
        owner,
      ),
      changePassword(
        userId,
        { currentPassword: OLD_PASSWORD, newPassword: "phisher-password-1" },
        phisher,
      ),
    ]);

    // By the time the second one gets the lock, the first has signed out
    // every other session, the second one's included, so it's refused.
    const outcomes = [first, second].map((result) => result.success);
    expect(outcomes.filter(Boolean).length).toBe(1);
    const loser = first.success ? second : first;
    if (!loser.success) {
      expect(loser.code).toBe(ErrorCode.UNAUTHORIZED);
    }

    // Only the winner's fresh session is left.
    const sessions = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, userId));
    expect(sessions.length).toBe(1);
  });

  test("without a session it's UNAUTHORIZED", async () => {
    const result = await changePassword(
      userId,
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      new Headers(),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(ErrorCode.UNAUTHORIZED);
    }
  });
});
