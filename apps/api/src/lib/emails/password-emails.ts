import { sendMail } from "@/lib/emails/send-email";
import { logEvent } from "@/lib/system-logs/log-event";

type AccountHolder = { id: string; email: string };

/**
 * The emailed reset link. Our own page, not Better Auth's `url` (which
 * points at the API): the web app shows the form and posts the token to
 * /api/v1/auth/reset-password.
 *
 * Not awaited, like the queue emails. Waiting on the mail server would make
 * a request for a real account slower than one for an unknown email (which
 * sends nothing), and a failed send would turn into an error only real
 * accounts can trigger. Either would reveal which emails are signed up. A
 * failure is logged for the admin instead.
 */
export function sendResetPasswordEmail(user: AccountHolder, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;

  sendMail({
    to: user.email,
    subject: "Reset your Queueup password",
    text: `Someone asked to reset the password for this account. If it was you, open this link within 15 minutes: ${resetUrl}\n\nIf it wasn't you, ignore this email; your password hasn't changed.`,
    html: `<p>Someone asked to reset the password for this account. If it was you, open this link within 15 minutes:</p><p><a href="${resetUrl}">Reset my password</a></p><p>If it wasn't you, ignore this email; your password hasn't changed.</p>`,
  }).catch((error) => {
    console.error("sendResetPasswordEmail failed:", error);
    logEvent(
      "error",
      "password-reset-email",
      "Failed to send password reset email",
      { userId: user.id, error: String(error) },
    );
  });
}

/**
 * Tells the account holder their password has just changed, by a reset link
 * or from the account page. If it wasn't them, this is how they find out,
 * and the email says what to do about it.
 *
 * Not awaited: the new password is already saved by the time this runs, so
 * a slow or failing mail server must not turn a finished change into an
 * error. A failure is logged for the admin instead.
 */
export function sendPasswordChangedEmail(user: AccountHolder) {
  const forgotUrl = `${process.env.FRONTEND_URL}/auth/forgot-password`;

  sendMail({
    to: user.email,
    subject: "Your Queueup password was changed",
    text: `The password for this account was just changed, and every other device was signed out.\n\nIf this was you, there's nothing to do. If it wasn't, reset your password now: ${forgotUrl}`,
    html: `<p>The password for this account was just changed, and every other device was signed out.</p><p>If this was you, there's nothing to do. If it wasn't, <a href="${forgotUrl}">reset your password now</a>.</p>`,
  }).catch((error) => {
    console.error("sendPasswordChangedEmail failed:", error);
    logEvent(
      "error",
      "password-changed-email",
      "Failed to send password changed email",
      { userId: user.id, error: String(error) },
    );
  });
}
