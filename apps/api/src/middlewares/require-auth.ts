import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/lib/auth";
import type { ApiErrorResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";

export async function requireAuth(
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  req.session = session;
  req.user = session.user;
  next();
}

export function requireRole(...roles: string[]) {
  return (
    req: Request,
    res: Response<ApiErrorResponse>,
    next: NextFunction,
  ) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
        code: ErrorCode.FORBIDDEN,
      });
    }

    next();
  };
}
