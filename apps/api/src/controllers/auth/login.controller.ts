import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type {
  ApiErrorResponse,
  LoginRequest,
  LoginResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { login } from "@/services/auth/login.service";

export async function loginController(
  req: Request<{}, {}, LoginRequest>,
  res: Response<LoginResponse | ApiErrorResponse>,
) {
  const result = await login(req.body, fromNodeHeaders(req.headers));

  if (!result.success) {
    const status =
      result.code === ErrorCode.UNAUTHORIZED
        ? 401
        : result.code === ErrorCode.INTERNAL_SERVER_ERROR
          ? 500
          : 400;

    return res.status(status).json(result);
  }

  if (result.cookies.length > 0) {
    res.setHeader("set-cookie", result.cookies);
  }

  const { cookies: _, ...body } = result;
  return res.status(200).json(body);
}
