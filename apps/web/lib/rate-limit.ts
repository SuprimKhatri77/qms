import type { AxiosError } from "axios";
import type { ApiErrorResponse } from "@repo/types";

// How long the API asked us to wait, if this error is a rate-limit block
// (429). null for every other error, so callers can tell them apart.
export function getRetryAfterSeconds(
  error: AxiosError<ApiErrorResponse>,
): number | null {
  if (error.response?.status !== 429) {
    return null;
  }

  return error.response.data?.retryAfterSeconds ?? null;
}
