import { describe, expect, test } from "bun:test";
import { getHomePath } from "./home-path";

describe("getHomePath", () => {
  test("sends owners to /shop", () => {
    expect(getHomePath("owner")).toBe("/shop");
  });

  test("sends admins to /admin", () => {
    expect(getHomePath("admin")).toBe("/admin");
  });

  test("sends superadmins to /admin", () => {
    expect(getHomePath("superadmin")).toBe("/admin");
  });
});
