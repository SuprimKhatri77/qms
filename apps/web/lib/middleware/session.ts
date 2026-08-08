import type { NextRequest } from "next/server";
import type { MeResponse, User } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

/**
 * Forwards the browser cookies from the Next request to the API.
 * Works when the session cookie is visible on the web host (localhost, or
 * COOKIE_DOMAIN shared across web/api subdomains). Separate sites without a
 * shared Domain will not send the API session cookie to this proxy.
 */
export async function getSessionFromApi(
  req: NextRequest,
): Promise<User | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as MeResponse;
    if (!body.success) return null;

    return body.data.user;
  } catch {
    return null;
  }
}
