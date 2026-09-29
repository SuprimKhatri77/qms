import { describe, expect, test } from "bun:test";
import { getRequiredRoles, isUnauthenticatedOnlyRoute } from "./routes";

describe("isUnauthenticatedOnlyRoute", () => {
  test("login and signup are for signed-out visitors only", () => {
    expect(isUnauthenticatedOnlyRoute("/auth/login")).toBe(true);
    expect(isUnauthenticatedOnlyRoute("/auth/signup")).toBe(true);
  });

  test("the forgot and reset password pages are open even when signed in", () => {
    expect(isUnauthenticatedOnlyRoute("/auth/forgot-password")).toBe(false);
    expect(isUnauthenticatedOnlyRoute("/auth/reset-password")).toBe(false);
  });

  test("pages outside /auth aren't affected", () => {
    expect(isUnauthenticatedOnlyRoute("/shop")).toBe(false);
  });
});

describe("getRequiredRoles", () => {
  test("shop pages need an owner, admin pages an admin", () => {
    expect(getRequiredRoles("/shop/queue")).toEqual(["owner"]);
    expect(getRequiredRoles("/admin/logs")).toEqual(["admin", "superadmin"]);
    expect(getRequiredRoles("/explore")).toBeUndefined();
  });
});
