// Sends one email through Resend's HTTP API (https://resend.com/docs).
//
// Production uses this instead of SMTP because the API's host (Render's
// free tier) blocks outgoing traffic on the SMTP ports 25, 465 and 587:
// Gmail SMTP there only ever ends in "Connection timeout". Resend is a
// plain HTTPS request on port 443, which isn't blocked.

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

// Give up on a request that hangs, so a stuck send can't pile up. Every
// email is sent fire-and-forget, so nobody is waiting on this.
const RESEND_TIMEOUT_MS = 10_000;

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type ResendSettings = {
  apiKey: string;
  // Must be an address on a domain verified in Resend,
  // e.g. "Queueup <noreply@qms.example.com>".
  from: string;
};

export async function sendViaResend(
  email: OutgoingEmail,
  { apiKey, from }: ResendSettings,
  // Passed in so the unit test can check the request without the network.
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchFn(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Resend explains what's wrong in the body (e.g. an unverified "from"
    // domain). It goes into the error so the system log shows the reason,
    // cut short in case the body is unexpectedly large.
    const reason = (await response.text()).slice(0, 300);
    throw new Error(
      `Resend refused the email (HTTP ${response.status}): ${reason}`,
    );
  }
}
