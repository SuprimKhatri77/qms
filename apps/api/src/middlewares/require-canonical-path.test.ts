import { describe, expect, mock, test } from "bun:test";
import type { Request, Response } from "express";
import { requireCanonicalPath } from "./require-canonical-path";

// Runs the middleware on a URL and reports whether it let the request on.
function isAllowed(url: string): boolean {
  const req = { url } as Request;
  const res = {
    status: mock(() => res),
    json: mock(() => res),
  } as unknown as Response;
  const next = mock(() => {});

  requireCanonicalPath(req, res, next);

  return next.mock.calls.length === 1;
}

describe("requireCanonicalPath", () => {
  test("lets a normal path through", () => {
    expect(isAllowed("/api/auth/sign-in/email")).toBe(true);
  });

  test("ignores dots in the query string, which don't affect routing", () => {
    expect(isAllowed("/api/auth/reset-password?callbackURL=./home")).toBe(true);
  });

  test.each([
    "/api/auth/./sign-in/email",
    "/api/auth/%2e/sign-in/email",
    "/api/auth/x/../sign-in/email",
    "/api/auth/x/%2e%2e/sign-in/email",
  ])("refuses %s, which Better Auth would treat as sign-in", (url) => {
    expect(isAllowed(url)).toBe(false);
  });
});
