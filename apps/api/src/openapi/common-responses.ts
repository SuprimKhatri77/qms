import { apiErrorResponseSchema } from "@repo/types";

// Every failure response uses the same { success: false, message, code,
// errors? } shape (see ErrorCode in @repo/types), so one schema covers all
// of them — only the description changes per status code.
function errorResponse(description: string) {
  return {
    description,
    content: { "application/json": { schema: apiErrorResponseSchema } },
  };
}

export const badRequest = errorResponse(
  "Validation failed (VALIDATION_FAILED / INVALID_QUERY_PARAM / INVALID_REQUEST_PARAMS / INVALID_ID_FORMAT), or an emailed link's token is unknown, used or expired (INVALID_TOKEN).",
);
export const unauthorized = errorResponse(
  "No session, or the session cookie is missing/expired (UNAUTHORIZED).",
);
export const forbidden = errorResponse(
  "Signed in, but the account's role can't do this (FORBIDDEN).",
);
export const notFound = errorResponse(
  "The resource doesn't exist (NOT_FOUND).",
);
export const conflict = errorResponse(
  "The request is valid, but the current state doesn't allow it (CONFLICT).",
);
export const duplicateEntry = errorResponse(
  "Already exists (DUPLICATE_ENTRY).",
);
export const tooManyRequests = {
  ...errorResponse(
    "Too many attempts in a short time (RATE_LIMITED). Limits are counted per email, per IP, or per a combination (e.g. shop + IP), depending on the route. The body's retryAfterSeconds repeats the Retry-After header, for browsers that can't read it cross-origin. Wait and retry.",
  ),
  headers: {
    "Retry-After": {
      description: "Seconds until the limit resets.",
      schema: { type: "integer" as const },
    },
  },
};
export const serverError = errorResponse(
  "Unexpected server error (INTERNAL_SERVER_ERROR).",
);
