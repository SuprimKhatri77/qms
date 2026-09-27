import type { NextFunction, Request, Response } from "express";
import { ErrorCode, type ApiErrorResponse } from "@repo/types";

// Rejects a URL whose path isn't already in its clean form, like
// "/api/auth/./sign-in/email" or "/api/auth/%2e/sign-in/email".
//
// Why: Express matches routes on the path exactly as sent, but Better Auth
// cleans the path up (resolving "." and ".." segments) before deciding which
// endpoint to run. So "/api/auth/./sign-in/email" slipped past the sign-in
// rate limit (no Express match) while Better Auth still ran sign-in on it —
// unlimited password guessing. Real clients never send such paths, so they
// are refused, which guarantees the path our rate limits match on is the
// same path Better Auth acts on.
export function requireCanonicalPath(
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
) {
  const sentPath = req.url.split("?")[0];

  if (sentPath !== cleanedPath(req.url)) {
    return res.status(404).json({
      success: false,
      message: "Not found",
      code: ErrorCode.NOT_FOUND,
    });
  }

  next();
}

// The path the way a URL parser (and so Better Auth) sees it. null if it
// can't be parsed at all, which never matches, so such a request is refused.
function cleanedPath(url: string): string | null {
  try {
    return new URL(`http://localhost${url}`).pathname;
  } catch {
    return null;
  }
}
