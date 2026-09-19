import { cookies } from "next/headers";
import type { MeResponse, User } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

/**
 * Loads the signed-in user for a public page (the marketing navbar), where an
 * anonymous visitor is the normal case, not an error. This differs from
 * dashboard's getCurrentUserFromApi, which redirects to /auth/login on 401
 * because every dashboard route requires a session.
 */
export async function getOptionalCurrentUserFromApi(): Promise<User | null> {
  const cookieStore = await cookies();

  const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load user (status ${res.status})`);
  }

  const body = (await res.json()) as MeResponse;
  return body.data.user;
}
