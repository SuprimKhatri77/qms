import type { Response } from "express";
import type {
  ApiErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { forgotPassword } from "@/services/auth/forgot-password.service";
import type { RequestWithBody } from "@/types";

export async function forgotPasswordController(
  req: RequestWithBody<ForgotPasswordRequest>,
  res: Response<ForgotPasswordResponse | ApiErrorResponse>,
) {
  const result = await forgotPassword(req.body);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
