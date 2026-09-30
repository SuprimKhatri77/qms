import { mock } from "bun:test";

export type SentEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// Every email the API "sends" while the tests run, newest last.
export const sentEmails: SentEmail[] = [];

// Replaces the real mailer for the whole test run, so no test can reach a
// mail server and a test can read what would have been sent.
// `bun run test:integration` preloads this file, so the swap happens before
// any test file loads. The tests that read emails also import it, so running
// one of them on its own is covered too.
mock.module("@/lib/emails/send-email", () => ({
  sendMail: async (email: SentEmail) => {
    sentEmails.push(email);
  },
}));

export function emailsTo(to: string): SentEmail[] {
  return sentEmails.filter((email) => email.to === to);
}

// The token from the newest reset email sent to `to`, read out of the link
// exactly as the owner would click it.
export function latestResetToken(to: string): string {
  const resetEmail = emailsTo(to)
    .filter((email) => email.subject === "Reset your Queueup password")
    .at(-1);
  const link = resetEmail?.text.match(/https?:\/\/\S+/)?.[0];
  const token = link ? new URL(link).searchParams.get("token") : null;

  if (!token) {
    throw new Error(`No reset email with a token was sent to ${to}`);
  }
  return token;
}
