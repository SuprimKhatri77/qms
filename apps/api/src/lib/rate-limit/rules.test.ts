import { describe, expect, test } from "bun:test";
import type { Request } from "express";
import { joinRules, loginRules } from "./rules";

// Only the fields the rules read. Cast because a full Express Request is
// far bigger than what identify() looks at.
function fakeRequest(fields: {
  ip?: string;
  body?: unknown;
  params?: Record<string, string>;
}): Request {
  return { params: {}, ...fields } as unknown as Request;
}

function ruleNamed(rules: typeof loginRules, name: string) {
  const rule = rules.find((r) => r.name === name);
  if (!rule) {
    throw new Error(`No rule named ${name}`);
  }
  return rule;
}

describe("rate limit rules", () => {
  const loginEmail = ruleNamed(loginRules, "login-email");
  const loginEmailIp = ruleNamed(loginRules, "login-email-ip");
  const joinIpShop = ruleNamed(joinRules, "join-ip-shop");

  test("email case and whitespace don't create separate counters", () => {
    const a = loginEmail.identify(
      fakeRequest({ body: { email: " Owner@Example.com " } }),
    );
    const b = loginEmail.identify(
      fakeRequest({ body: { email: "owner@example.com" } }),
    );

    expect(a).toBe("owner@example.com");
    expect(a).toBe(b);
  });

  test("skips the email rule when there's no usable email", () => {
    expect(loginEmail.identify(fakeRequest({ body: {} }))).toBeNull();
    expect(loginEmail.identify(fakeRequest({}))).toBeNull();
    expect(
      loginEmail.identify(fakeRequest({ body: { email: 123 } })),
    ).toBeNull();
    expect(
      loginEmail.identify(fakeRequest({ body: { email: "   " } })),
    ).toBeNull();
  });

  test("ignores an 'email' too long to be real", () => {
    const junk = `${"a".repeat(300)}@example.com`;
    expect(
      loginEmail.identify(fakeRequest({ body: { email: junk } })),
    ).toBeNull();
  });

  test("email + IP counts each pair separately", () => {
    const fromHome = loginEmailIp.identify(
      fakeRequest({ ip: "1.1.1.1", body: { email: "a@x.com" } }),
    );
    const fromWork = loginEmailIp.identify(
      fakeRequest({ ip: "2.2.2.2", body: { email: "a@x.com" } }),
    );

    expect(fromHome).not.toBe(fromWork);
  });

  test("join counts per shop, so one shop's rush doesn't block another", () => {
    const shopA = joinIpShop.identify(
      fakeRequest({ ip: "1.1.1.1", params: { slug: "barber-a" } }),
    );
    const shopB = joinIpShop.identify(
      fakeRequest({ ip: "1.1.1.1", params: { slug: "barber-b" } }),
    );

    expect(shopA).not.toBe(shopB);
  });
});
