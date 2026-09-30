import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
// First, so the mailer is swapped out before anything that sends email loads
// (a successful change sends a "password changed" email). Also preloaded by
// `bun run test:integration`; this covers running this file on its own.
import "../support/capture-emails";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { login } from "@/services/auth/login.service";
import { apiErrorResponseSchema } from "@repo/types";
import {
  clientIp,
  cookieHeader,
  startTestServer,
  type TestServer,
} from "./support/test-server";

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";

// The service-level tests (../change-password.integration.test.ts) cover
// what a change does. These cover what only the HTTP route adds: the
// session check, validation before the limit, the per-account limit, and
// the new session cookie actually reaching the browser.
describe("POST /api/v1/auth/change-password over HTTP", () => {
  let server: TestServer;
  let email: string;
  let userId: string;
  // Each test is its own client IP, so the per-IP limit never mixes tests.
  let ip: string;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    email = `http-change-${randomUUID()}@integration-test.invalid`;
    const created = await auth.api.createUser({
      body: { email, password: OLD_PASSWORD, name: "HTTP Change Owner" },
    });
    userId = created.user.id;
    ip = clientIp();
  });

  afterEach(async () => {
    // Sessions cascade from users.
    await db.delete(users).where(eq(users.id, userId));
  });

  async function signIn(): Promise<string> {
    const result = await login(
      { email, password: OLD_PASSWORD },
      new Headers(),
    );
    if (!result.success) {
      throw new Error(`Sign-in failed: ${result.message}`);
    }
    return cookieHeader(result.cookies);
  }

  function post(path: string, body: unknown, cookie?: string) {
    return fetch(`${server.url}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  function changePassword(body: unknown, cookie?: string) {
    return post("/api/v1/auth/change-password", body, cookie);
  }

  async function isSignedIn(cookie: string): Promise<boolean> {
    const response = await fetch(`${server.url}/api/v1/auth/me`, {
      headers: { cookie, "x-forwarded-for": ip },
    });
    return response.status === 200;
  }

  test("the response's cookie keeps this browser signed in; the other device is signed out", async () => {
    const thisBrowser = await signIn();
    const otherDevice = await signIn();

    const response = await changePassword(
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      thisBrowser,
    );

    expect(response.status).toBe(200);
    const newCookie = cookieHeader(response.headers.getSetCookie());
    expect(newCookie).not.toBe("");
    expect(await isSignedIn(newCookie)).toBe(true);
    expect(await isSignedIn(thisBrowser)).toBe(false);
    expect(await isSignedIn(otherDevice)).toBe(false);
  });

  test("a wrong current password is a 400 on that field, not a 401", async () => {
    const browser = await signIn();

    const response = await changePassword(
      { currentPassword: "not-my-password", newPassword: NEW_PASSWORD },
      browser,
    );
    // Parsed with the shared schema, so this also checks the error has the
    // documented shape.
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors?.[0]?.field).toBe("currentPassword");
    expect(await isSignedIn(browser)).toBe(true);
  });

  test("the 6th wrong attempt is rate-limited; malformed requests aren't counted", async () => {
    const browser = await signIn();

    // Refused by validation, before the limit counts anything.
    for (let i = 0; i < 3; i++) {
      const malformed = await changePassword({}, browser);
      expect(malformed.status).toBe(400);
    }

    // The limit is 5 per account: these five are counted and refused.
    for (let i = 0; i < 5; i++) {
      const wrong = await changePassword(
        { currentPassword: `wrong-password-${i}`, newPassword: NEW_PASSWORD },
        browser,
      );
      expect(wrong.status).toBe(400);
    }

    const limited = await changePassword(
      { currentPassword: "wrong-password-6", newPassword: NEW_PASSWORD },
      browser,
    );
    const body = apiErrorResponseSchema.parse(await limited.json());

    expect(limited.status).toBe(429);
    expect(body.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("without a session it's a 401, before validation or the limit", async () => {
    const response = await changePassword({});
    expect(response.status).toBe(401);
  });

  // Better Auth's own routes for these are switched off (lib/auth.ts
  // disabledPaths), so the v1 route above is the only way in.
  test("Better Auth's raw change-password and verify-password routes are closed", async () => {
    const browser = await signIn();

    const rawChange = await post(
      "/api/auth/change-password",
      { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
      browser,
    );
    const rawVerify = await post(
      "/api/auth/verify-password",
      { password: OLD_PASSWORD },
      browser,
    );

    expect(rawChange.status).toBe(404);
    expect(rawVerify.status).toBe(404);
    expect(await isSignedIn(browser)).toBe(true);
  });
});
