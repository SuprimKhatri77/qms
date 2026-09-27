import { describe, expect, test } from "bun:test";
import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@repo/types";
import { getRetryAfterSeconds } from "./rate-limit";

// Only the parts getRetryAfterSeconds reads.
function fakeError(
  status: number,
  data: Partial<ApiErrorResponse>,
): AxiosError<ApiErrorResponse> {
  return { response: { status, data } } as AxiosError<ApiErrorResponse>;
}

describe("getRetryAfterSeconds", () => {
  test("returns the wait from a 429", () => {
    expect(
      getRetryAfterSeconds(
        fakeError(429, { code: "RATE_LIMITED", retryAfterSeconds: 900 }),
      ),
    ).toBe(900);
  });

  test("returns null for any other error", () => {
    expect(
      getRetryAfterSeconds(fakeError(401, { code: "UNAUTHORIZED" })),
    ).toBeNull();
  });

  test("returns null for a 429 that doesn't say how long to wait", () => {
    expect(getRetryAfterSeconds(fakeError(429, {}))).toBeNull();
  });

  test("returns null when there was no response at all (network error)", () => {
    expect(getRetryAfterSeconds({} as AxiosError<ApiErrorResponse>)).toBeNull();
  });
});
