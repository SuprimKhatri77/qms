import nodemailer from "nodemailer";
import { sendViaResend, type OutgoingEmail } from "./send-via-resend";

// Two ways to send, picked by which settings are present:
//  - RESEND_API_KEY set (production): Resend's HTTPS API. The production
//    host blocks SMTP, see send-via-resend.ts.
//  - EMAIL_USER/EMAIL_PASS set (local development): Gmail over SMTP.
//  - neither: the email is skipped with a warning, so the app still runs
//    locally without any mail setup.

function hasEmailCredentials() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMail(email: OutgoingEmail) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    const from = process.env.EMAIL_FROM;

    // Resend only sends from a verified domain, so there's no sensible
    // default (the Gmail address used locally would be refused).
    if (!from) {
      throw new Error(
        "EMAIL_FROM must be set to an address on your Resend-verified domain",
      );
    }

    await sendViaResend(email, { apiKey: resendApiKey, from });
    return;
  }

  if (!hasEmailCredentials()) {
    console.warn(
      `[email] Skipping "${email.subject}" to ${email.to} — no RESEND_API_KEY or EMAIL_USER/EMAIL_PASS set`,
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}
