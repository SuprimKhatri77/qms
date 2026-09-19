import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MeResponse, User } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

/**
 * Loads the signed-in user while rendering a server page or layout, by
 * forwarding the browser's cookies to the API (same approach as the proxy).
 */
export async function getCurrentUserFromApi(): Promise<User> {
  const cookieStore = await cookies();

  const res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/auth/login");
  }

  if (!res.ok) {
    throw new Error(`Failed to load user (status ${res.status})`);
  }

  const body = (await res.json()) as MeResponse;
  return body.data.user;
}
