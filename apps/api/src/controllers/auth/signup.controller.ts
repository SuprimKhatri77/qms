import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type {
  ApiErrorResponse,
  SignupRequest,
  SignupResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { signup } from "@/services/auth/signup.service";

export async function signupController(
  req: Request<{}, {}, SignupRequest>,
  res: Response<SignupResponse | ApiErrorResponse>,
) {
  const result = await signup(req.body, fromNodeHeaders(req.headers));

  if (!result.success) {
    const status =
      result.code === ErrorCode.DUPLICATE_ENTRY
        ? 409
        : result.code === ErrorCode.INTERNAL_SERVER_ERROR
          ? 500
          : 400;

    return res.status(status).json(result);
  }

  if (result.cookies.length > 0) {
    res.setHeader("set-cookie", result.cookies);
  }

  const { cookies: _, ...body } = result;
  return res.status(201).json(body);
}
