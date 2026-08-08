import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { ApiErrorResponse, LogoutResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logout } from "@/services/auth/logout.service";

export async function logoutController(
  req: Request,
  res: Response<LogoutResponse | ApiErrorResponse>,
) {
  try {
    const result = await logout(fromNodeHeaders(req.headers));

    if (result.cookies.length > 0) {
      res.setHeader("set-cookie", result.cookies);
    }

    const { cookies: _, ...body } = result;
    return res.status(200).json(body);
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    });
  }
}
