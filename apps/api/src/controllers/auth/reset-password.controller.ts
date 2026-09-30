import type { Response } from "express";
import type {
  ApiErrorResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { resetPassword } from "@/services/auth/reset-password.service";
import type { RequestWithBody } from "@/types";

export async function resetPasswordController(
  req: RequestWithBody<ResetPasswordRequest>,
  res: Response<ResetPasswordResponse | ApiErrorResponse>,
) {
  const result = await resetPassword(req.body);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
