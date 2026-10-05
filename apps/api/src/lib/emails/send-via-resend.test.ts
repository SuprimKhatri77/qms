import { describe, expect, test } from "bun:test";
import { sendViaResend } from "./send-via-resend";

const email = {
  to: "customer@example.com",
  subject: "Confirm your place",
  text: "Click the link",
  html: "<p>Click the link</p>",
};
const settings = {
  apiKey: "re_test_key",
  from: "Queueup <noreply@qms.example.com>",
};

// Records the request instead of sending it, and answers with `response`.
function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response;
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}

describe("sendViaResend", () => {
  test("POSTs the email to Resend with the API key", async () => {
    const { calls, fetchFn } = fakeFetch(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );

    await sendViaResend(email, settings, fetchFn);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.resend.com/emails");
    expect(call?.init.method).toBe("POST");
    expect(call?.init.headers).toEqual({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(call?.init.body))).toEqual({
      from: "Queueup <noreply@qms.example.com>",
      to: "customer@example.com",
      subject: "Confirm your place",
      text: "Click the link",
      html: "<p>Click the link</p>",
    });
    // A hung request gives up instead of waiting forever.
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
  });

  test("a refusal throws with Resend's reason, so it reaches the system log", async () => {
    const { fetchFn } = fakeFetch(
      new Response(
        JSON.stringify({
          statusCode: 403,
          name: "validation_error",
          message: "The qms.example.com domain is not verified.",
        }),
        { status: 403 },
      ),
    );

    await expect(sendViaResend(email, settings, fetchFn)).rejects.toThrow(
      /HTTP 403.*domain is not verified/,
    );
  });
});
