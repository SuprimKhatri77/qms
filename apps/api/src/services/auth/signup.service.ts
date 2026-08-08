import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import type { HeadersType } from "@/types";
import type {
  ApiErrorResponse,
  SignupRequest,
  SignupResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getSetCookies, toApiUser } from "./map-user";

type SignupSuccess = SignupResponse & { cookies: string[] };

export async function signup(
  data: SignupRequest,
  headers: HeadersType,
): Promise<SignupSuccess | ApiErrorResponse> {
  try {
    const { headers: responseHeaders, response } = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
      returnHeaders: true,
      headers,
    });

    return {
      success: true,
      message: "Signed up successfully",
      data: { user: toApiUser(response.user) },
      cookies: getSetCookies(responseHeaders),
    };
  } catch (error) {
    if (error instanceof APIError) {
      const isDuplicate =
        error.statusCode === 422 ||
        error.statusCode === 409 ||
        /already exists|already registered/i.test(error.message);

      return {
        success: false,
        message: error.message,
        code: isDuplicate
          ? ErrorCode.DUPLICATE_ENTRY
          : ErrorCode.INVALID_REQUEST_PARAMS,
      };
    }

    return {
      success: false,
      message: "Failed to signup",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
