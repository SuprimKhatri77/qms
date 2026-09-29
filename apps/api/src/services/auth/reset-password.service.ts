import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import { logEvent } from "@/lib/system-logs/log-event";
import type {
  ApiErrorResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";

/**
 * Sets a new password using the token from a reset email.
 *
 * Better Auth checks the token and deletes it as it's used, so a link works
 * once. It reports an unknown, already-used or expired token all the same
 * way (INVALID_TOKEN), and the owner can do the same thing about all
 * three: ask for a new link. Every existing session is signed out
 * (revokeSessionsOnPasswordReset in lib/auth.ts); the owner then logs in
 * with the new password.
 */
export async function resetPassword(
  data: ResetPasswordRequest,
): Promise<ResetPasswordResponse | ApiErrorResponse> {
  try {
    await auth.api.resetPassword({
      body: { token: data.token, newPassword: data.password },
    });

    return {
      success: true,
      message: "Password updated. Log in with your new password.",
    };
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_TOKEN") {
      return {
        success: false,
        message: "This reset link is invalid or has expired",
        code: ErrorCode.INVALID_TOKEN,
      };
    }

    console.error("resetPassword failed:", error);
    logEvent("error", "reset-password", "Password reset failed", {
      error: String(error),
    });

    return {
      success: false,
      // Better Auth deletes the token before it saves the password, so after
      // a failure the same link may no longer work: say what to do then.
      message:
        "Couldn't reset the password. Try again, and if the link no longer works, request a new one.",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
