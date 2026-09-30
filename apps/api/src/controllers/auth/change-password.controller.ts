import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type {
  ApiErrorResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { assertAuthenticated } from "@/types";
import { changePassword } from "@/services/auth/change-password.service";

export async function changePasswordController(
  req: Request<{}, {}, ChangePasswordRequest>,
  res: Response<ChangePasswordResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);
  const result = await changePassword(
    req.user.id,
    req.body,
    fromNodeHeaders(req.headers),
  );

  if (!result.success) {
    return res.status(statusForErrorCode(result.code)).json(result);
  }

  // Every session was just revoked and this browser was given a new one;
  // without passing its cookie on, the owner would be signed out here too.
  if (result.cookies.length > 0) {
    res.setHeader("set-cookie", result.cookies);
  }

  const { cookies: _, ...body } = result;
  return res.status(200).json(body);
}
