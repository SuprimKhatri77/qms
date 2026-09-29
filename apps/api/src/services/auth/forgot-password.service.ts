import { auth } from "@/lib/auth";
import { logEvent } from "@/lib/system-logs/log-event";
import type {
  ApiErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";

// Worded so it's true whether or not the email has an account.
const SENT_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password. It works for 15 minutes.";

/**
 * Emails a password-reset link to the owner, if the email has an account.
 *
 * The response is the same either way, so this can't be used to find out
 * which emails are signed up. Better Auth does the same on its side: for an
 * unknown email it runs a dummy lookup instead of returning early, and the
 * email itself is sent without being waited on (see sendResetPassword in
 * lib/auth.ts), so a real account doesn't answer noticeably slower.
 */
export async function forgotPassword(
  data: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse | ApiErrorResponse> {
  try {
    await auth.api.requestPasswordReset({ body: { email: data.email } });

    return { success: true, message: SENT_MESSAGE };
  } catch (error) {
    console.error("forgotPassword failed:", error);
    logEvent("error", "forgot-password", "Password reset request failed", {
      error: String(error),
    });

    return {
      success: false,
      message: "Couldn't send the reset link. Please try again.",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
