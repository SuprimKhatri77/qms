import { APIError } from "better-auth";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { sendPasswordChangedEmail } from "@/lib/emails/password-emails";
import { deleteResetLinks } from "@/lib/reset-links";
import { logEvent } from "@/lib/system-logs/log-event";
import type { HeadersType } from "@/types";
import type {
  ApiErrorResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getSetCookies } from "./map-user";

type ChangePasswordSuccess = ChangePasswordResponse & { cookies: string[] };

/**
 * A signed-in owner or admin changing their password from the account page.
 *
 * Better Auth checks the current password and saves the new one. With
 * revokeOtherSessions it then signs out every session on the account and
 * gives this browser a fresh one (the returned Set-Cookie), so whoever
 * might have had a copy of the old session loses it, the same as after a
 * reset, while the owner stays signed in here.
 *
 * Two things Better Auth doesn't do, done here once the password is saved:
 * outstanding reset links are deleted (an old reset email could otherwise
 * set a new password again), and the owner is emailed that it changed.
 *
 * `userId` is the signed-in user (from requireAuth); it only names the lock.
 * Better Auth itself changes the password of whoever the session belongs to.
 */
export async function changePassword(
  userId: string,
  data: ChangePasswordRequest,
  headers: HeadersType,
): Promise<ChangePasswordSuccess | ApiErrorResponse> {
  let result;
  try {
    result = await db.transaction(async (tx) => {
      // One change at a time per account. Better Auth checks the current
      // password, saves the new one and signs sessions out as separate
      // steps, so two changes sent at the same moment (say the owner and
      // someone who phished the password) would both pass the check, both
      // report "other devices signed out", and both keep a session.
      //
      // A Postgres advisory lock is a named lock that isn't tied to any
      // table row: the second request waits here until the first one's
      // transaction ends. By then the first has signed out every other
      // session, the second one's included, so the second is refused
      // (and even with a session left, its "current password" would be
      // checked against the password the first one just set).
      // Better Auth never takes this lock, so it can't deadlock with it.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`change-password:${userId}`}))`,
      );

      return auth.api.changePassword({
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
        headers,
        returnHeaders: true,
      });
    });
  } catch (error) {
    return explainChangePasswordError(error);
  }

  const user = result.response.user;
  sendPasswordChangedEmail(user);

  try {
    await deleteResetLinks(user.id);
  } catch (error) {
    // The password is already changed, so this isn't reported as a failed
    // change. The leftover links still expire within 15 minutes.
    console.error("changePassword: deleting reset links failed:", error);
    logEvent(
      "error",
      "change-password",
      "Couldn't delete the account's reset links after a password change",
      { userId: user.id, error: String(error) },
    );
  }

  return {
    success: true,
    message: "Password changed. Your other devices were signed out.",
    cookies: getSetCookies(result.headers),
  };
}

function explainChangePasswordError(error: unknown): ApiErrorResponse {
  // A wrong current password is a mistake in the form, not a lost session,
  // so it's reported on that field (400), never as 401: the web app treats
  // a 401 as "session expired" and sends the owner to the login page.
  if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
    return {
      success: false,
      message: "That's not your current password",
      code: ErrorCode.VALIDATION_FAILED,
      errors: [
        {
          field: "currentPassword",
          message: "That's not your current password",
          code: "INVALID_PASSWORD",
        },
      ],
    };
  }

  // An account with no password to change (e.g. one created by an admin
  // without a password). Not a server fault, so not logged as an error.
  if (
    error instanceof APIError &&
    error.body?.code === "CREDENTIAL_ACCOUNT_NOT_FOUND"
  ) {
    return {
      success: false,
      message:
        'This account has no password to change yet. Use "Forgot password" on the login page to set one.',
      code: ErrorCode.CONFLICT,
    };
  }

  // The session ended between requireAuth and here (signed out elsewhere).
  if (error instanceof APIError && error.body?.code === "UNAUTHORIZED") {
    return {
      success: false,
      message: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
    };
  }

  console.error("changePassword failed:", error);
  logEvent("error", "change-password", "Password change failed", {
    error: String(error),
  });

  // Better Auth saves the new password before it signs sessions out, and
  // those steps aren't one transaction, so a failure here doesn't prove the
  // password is unchanged. The message says so instead of promising it.
  return {
    success: false,
    message:
      "Something went wrong while changing your password. It may already have changed: if your current password stops working, log in with the new one or reset it.",
    code: ErrorCode.INTERNAL_SERVER_ERROR,
  };
}
