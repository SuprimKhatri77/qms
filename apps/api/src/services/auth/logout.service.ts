import { APIError } from "better-auth";
import { auth } from "@/lib/auth";
import type { HeadersType } from "@/types";
import type { LogoutResponse } from "@repo/types";
import { getSetCookies } from "./map-user";

type LogoutSuccess = LogoutResponse & { cookies: string[] };

export async function logout(headers: HeadersType): Promise<LogoutSuccess> {
  try {
    const { headers: responseHeaders } = await auth.api.signOut({
      headers,
      returnHeaders: true,
    });

    return {
      success: true,
      message: "Logged out successfully",
      cookies: getSetCookies(responseHeaders),
    };
  } catch (error) {
    // Idempotent: missing/invalid session still counts as logged out
    if (error instanceof APIError) {
      return {
        success: true,
        message: "Logged out successfully",
        cookies: [],
      };
    }

    console.error("logout failed:", error);
    throw error;
  }
}
