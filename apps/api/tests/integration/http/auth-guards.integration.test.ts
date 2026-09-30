import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { login } from "@/services/auth/login.service";
import { buildOpenApiDocument } from "@/openapi/document";
import { SESSION_COOKIE_AUTH } from "@/openapi/registry";
import {
  clientIp,
  cookieHeader,
  startTestServer,
  type TestServer,
} from "./support/test-server";

type Operation = { method: string; path: string };

// Every documented operation that says it needs the session cookie. Driven
// by the OpenAPI document, so a route added to the docs is covered here
// without anyone remembering to add it.
function operationsNeedingASession(): Operation[] {
  const document = buildOpenApiDocument();
  const operations: Operation[] = [];

  for (const [path, methods] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods ?? {})) {
      const security: Record<string, unknown>[] =
        (operation as { security?: Record<string, unknown>[] }).security ?? [];
      if (security.some((scheme) => SESSION_COOKIE_AUTH in scheme)) {
        operations.push({ method: method.toUpperCase(), path });
      }
    }
  }
  return operations;
}

// Fills in path params like {ticketId} with something well-formed, so the
// request reaches the guards rather than failing on the URL.
function concretePath(path: string): string {
  return path
    .replace("{date}", "2026-01-01")
    .replace(/\{[^}]+\}/g, () => randomUUID());
}

const OPERATIONS = operationsNeedingASession();
const ADMIN_OPERATIONS = OPERATIONS.filter((op) =>
  op.path.startsWith("/api/v1/admin/"),
);
const OWNER_OPERATIONS = OPERATIONS.filter((op) =>
  op.path.startsWith("/api/v1/shops"),
);

async function send(
  server: TestServer,
  { method, path }: Operation,
  cookie?: string,
): Promise<Response> {
  return fetch(`${server.url}${concretePath(path)}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": clientIp(),
      ...(cookie ? { cookie } : {}),
    },
    // An empty JSON body: the guards must answer before validation does.
    body: method === "GET" ? undefined : "{}",
  });
}

// Express answers a URL no route matches with its own HTML "Cannot GET …"
// page. Every answer from one of our routes is JSON, even an error.
function isFromARealRoute(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes(
    "application/json",
  );
}

async function signedInAs(email: string, password: string): Promise<string> {
  const result = await login({ email, password }, new Headers());
  if (!result.success) {
    throw new Error(`Couldn't sign in as ${email}: ${result.message}`);
  }
  return cookieHeader(result.cookies);
}

describe("every documented route that needs a session refuses without the right one", () => {
  const PASSWORD = "guard-test-pass-1";
  const ownerEmail = `guard-owner-${randomUUID()}@integration-test.invalid`;
  const adminEmail = `guard-admin-${randomUUID()}@integration-test.invalid`;
  let server: TestServer;
  let ownerCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    server = await startTestServer();
    await auth.api.createUser({
      body: { email: ownerEmail, password: PASSWORD, name: "Guard Owner" },
    });
    await auth.api.createUser({
      body: {
        email: adminEmail,
        password: PASSWORD,
        name: "Guard Admin",
        role: "admin",
      },
    });
    ownerCookie = await signedInAs(ownerEmail, PASSWORD);
    adminCookie = await signedInAs(adminEmail, PASSWORD);
  });

  afterAll(async () => {
    try {
      // Sessions cascade from users.
      await db
        .delete(users)
        .where(inArray(users.email, [ownerEmail, adminEmail]));
    } finally {
      await server?.close();
    }
  });

  test("the document lists the protected routes (a broken document can't pass silently)", () => {
    // 18 today: /auth/me, change-password, the owner's shop, queue and
    // history routes, and the admin routes. More is fine.
    expect(OPERATIONS.length).toBeGreaterThanOrEqual(18);
    expect(ADMIN_OPERATIONS.length).toBeGreaterThan(0);
    expect(OWNER_OPERATIONS.length).toBeGreaterThan(0);
  });

  test.each(OPERATIONS.map((op) => [`${op.method} ${op.path}`, op] as const))(
    "%s without a session is 401",
    async (_name, operation) => {
      expect((await send(server, operation)).status).toBe(401);
    },
  );

  test.each(
    ADMIN_OPERATIONS.map((op) => [`${op.method} ${op.path}`, op] as const),
  )("%s as an owner is 403", async (_name, operation) => {
    expect((await send(server, operation, ownerCookie)).status).toBe(403);
  });

  test.each(
    OWNER_OPERATIONS.map((op) => [`${op.method} ${op.path}`, op] as const),
  )("%s as an admin is 403", async (_name, operation) => {
    expect((await send(server, operation, adminCookie)).status).toBe(403);
  });

  // The other side of the checks above: with the right role, each documented
  // route is answered by a real route. Without this, a documented route that
  // no longer exists would still "pass" as 401/403, because the guards sit
  // on the whole /shops and /admin routers, in front of any URL under them.
  // The empty body keeps these harmless: validation or "set up your shop
  // first" answers before anything changes.
  test.each(OPERATIONS.map((op) => [`${op.method} ${op.path}`, op] as const))(
    "%s with the right role reaches a real route",
    async (_name, operation) => {
      const cookie = ADMIN_OPERATIONS.includes(operation)
        ? adminCookie
        : ownerCookie;
      const response = await send(server, operation, cookie);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(isFromARealRoute(response)).toBe(true);
    },
  );
});

// Better Auth's own /api/auth/* routes aren't in our OpenAPI document, so the
// sweep above doesn't cover them. These are the ones that need a session
// (and, for admin/*, an admin). The bodies are well-formed, because Better
// Auth checks the body before the session and would otherwise answer 400.
// No request here succeeds, so nothing is changed.
const TARGET_USER = randomUUID();
const RAW_SESSION_ROUTES: [method: string, path: string, body?: unknown][] = [
  ["GET", "/api/auth/list-sessions"],
  ["GET", "/api/auth/list-accounts"],
  ["POST", "/api/auth/update-user", { name: "Someone Else" }],
  ["POST", "/api/auth/revoke-sessions", {}],
  ["POST", "/api/auth/revoke-other-sessions", {}],
];
const RAW_ADMIN_ROUTES: [method: string, path: string, body?: unknown][] = [
  ["GET", "/api/auth/admin/list-users"],
  ["GET", `/api/auth/admin/get-user?id=${TARGET_USER}`],
  [
    "POST",
    "/api/auth/admin/create-user",
    {
      email: `raw-${TARGET_USER}@integration-test.invalid`,
      password: "raw-route-pass-1",
      name: "Raw Route",
    },
  ],
  ["POST", "/api/auth/admin/set-role", { userId: TARGET_USER, role: "admin" }],
  [
    "POST",
    "/api/auth/admin/set-user-password",
    {
      userId: TARGET_USER,
      newPassword: "raw-route-pass-1",
    },
  ],
  ["POST", "/api/auth/admin/impersonate-user", { userId: TARGET_USER }],
  ["POST", "/api/auth/admin/ban-user", { userId: TARGET_USER }],
  ["POST", "/api/auth/admin/unban-user", { userId: TARGET_USER }],
  ["POST", "/api/auth/admin/remove-user", { userId: TARGET_USER }],
  ["POST", "/api/auth/admin/list-user-sessions", { userId: TARGET_USER }],
  ["POST", "/api/auth/admin/revoke-user-sessions", { userId: TARGET_USER }],
];

describe("Better Auth's own routes refuse without the right session", () => {
  const PASSWORD = "guard-test-pass-1";
  const ownerEmail = `raw-owner-${randomUUID()}@integration-test.invalid`;
  let server: TestServer;
  let ownerCookie: string;

  beforeAll(async () => {
    server = await startTestServer();
    await auth.api.createUser({
      body: { email: ownerEmail, password: PASSWORD, name: "Raw Owner" },
    });
    ownerCookie = await signedInAs(ownerEmail, PASSWORD);
  });

  afterAll(async () => {
    try {
      await db.delete(users).where(inArray(users.email, [ownerEmail]));
    } finally {
      await server?.close();
    }
  });

  function sendRaw(
    [method, path, body]: [string, string, unknown?],
    cookie?: string,
  ): Promise<Response> {
    return fetch(`${server.url}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        // Better Auth checks the Origin of cookie-carrying requests.
        origin: "http://localhost:3000",
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  test.each(
    [...RAW_SESSION_ROUTES, ...RAW_ADMIN_ROUTES].map(
      (route) => [`${route[0]} ${route[1].split("?")[0]}`, route] as const,
    ),
  )("%s without a session is 401", async (_name, route) => {
    expect((await sendRaw(route)).status).toBe(401);
  });

  test.each(
    RAW_ADMIN_ROUTES.map(
      (route) => [`${route[0]} ${route[1].split("?")[0]}`, route] as const,
    ),
  )("%s as an owner is 403", async (_name, route) => {
    expect((await sendRaw(route, ownerCookie)).status).toBe(403);
  });
});
