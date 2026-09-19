import { describe, expect, test } from "bun:test";
import { ErrorCode } from "@repo/types";
import { statusForErrorCode } from "./http-status";

describe("statusForErrorCode", () => {
  test.each([
    [ErrorCode.UNAUTHORIZED, 401],
    [ErrorCode.FORBIDDEN, 403],
    [ErrorCode.NOT_FOUND, 404],
    [ErrorCode.CONFLICT, 409],
    [ErrorCode.DUPLICATE_ENTRY, 409],
    [ErrorCode.INTERNAL_SERVER_ERROR, 500],
  ])("maps %s to %i", (code, status) => {
    expect(statusForErrorCode(code)).toBe(status);
  });

  test("falls back to 400 for a validation-style code", () => {
    expect(statusForErrorCode(ErrorCode.VALIDATION_FAILED)).toBe(400);
  });

  test("falls back to 400 for an unrecognized code", () => {
    expect(statusForErrorCode("SOMETHING_NEW")).toBe(400);
  });
});
