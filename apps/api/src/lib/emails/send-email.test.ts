import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { sendMail, transporter } from "./send-email";

const email = {
  to: "customer@example.com",
  subject: "Confirm your place",
  text: "Click the link",
  html: "<p>Click the link</p>",
};

// sendMail picks how to send from these settings on every call, so each
// test sets exactly the ones it needs and puts the originals back after.
const MAIL_SETTINGS = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_USER",
  "EMAIL_PASS",
] as const;

describe("sendMail picks how to send", () => {
  const saved: Record<string, string | undefined> = {};
  const realFetch = globalThis.fetch;
  let fetchedUrls: string[];
  let smtpSend: ReturnType<typeof spyOn>;

  beforeEach(() => {
    for (const key of MAIL_SETTINGS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    // Nothing in these tests reaches the network or a mail server.
    fetchedUrls = [];
    globalThis.fetch = (async (url: string) => {
      fetchedUrls.push(url);
      return new Response(JSON.stringify({ id: "email-id" }));
    }) as unknown as typeof fetch;
    smtpSend = spyOn(transporter, "sendMail").mockResolvedValue({} as never);
  });

  afterEach(() => {
    for (const key of MAIL_SETTINGS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    globalThis.fetch = realFetch;
    smtpSend.mockRestore();
  });

  test("with RESEND_API_KEY it sends through Resend, not SMTP", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Queueup <noreply@qms.example.com>";
    // Gmail settings left over in production are ignored.
    process.env.EMAIL_USER = "someone@gmail.com";
    process.env.EMAIL_PASS = "app-password";

    await sendMail(email);

    expect(fetchedUrls).toEqual(["https://api.resend.com/emails"]);
    expect(smtpSend).not.toHaveBeenCalled();
  });

  test("with RESEND_API_KEY but no EMAIL_FROM it fails with a clear reason", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    await expect(sendMail(email)).rejects.toThrow(/EMAIL_FROM must be set/);
    expect(fetchedUrls).toEqual([]);
  });

  test("without RESEND_API_KEY it uses Gmail SMTP, as in local development", async () => {
    process.env.EMAIL_USER = "someone@gmail.com";
    process.env.EMAIL_PASS = "app-password";

    await sendMail(email);

    expect(smtpSend).toHaveBeenCalledTimes(1);
    expect(fetchedUrls).toEqual([]);
  });

  test("with no mail settings at all it skips the email", async () => {
    await sendMail(email);

    expect(smtpSend).not.toHaveBeenCalled();
    expect(fetchedUrls).toEqual([]);
  });
});
