import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import type { HeadersType } from "@/types";
import type {
  ApiErrorResponse,
  LoginRequest,
  LoginResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getSetCookies, toApiUser } from "./map-user";

type LoginSuccess = LoginResponse & { cookies: string[] };

export async function login(
  data: LoginRequest,
  headers: HeadersType,
): Promise<LoginSuccess | ApiErrorResponse> {
  try {
    const { headers: responseHeaders, response } = await auth.api.signInEmail({
      body: data,
      returnHeaders: true,
      headers,
    });

    return {
      success: true,
      message: "Logged in successfully",
      data: { user: toApiUser(response.user) },
      cookies: getSetCookies(responseHeaders),
    };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message,
        code: ErrorCode.UNAUTHORIZED,
      };
    }

    return {
      success: false,
      message: "Failed to login",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
