import { cookies } from "next/headers";
import type { MeResponse, User } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

/**
 * Loads the signed-in user for a public page (the marketing navbar), where an
 * anonymous visitor is the normal case, not an error. This differs from
 * dashboard's getCurrentUserFromApi, which redirects to /auth/login on 401
 * because every dashboard route requires a session.
 *
 * It runs in the root layout, which wraps every page. So if the API is down
 * or answers with an error, this returns null (the signed-out navbar) instead
 * of throwing: otherwise one optional lookup would take down every page,
 * including the landing page. The failure is still logged on the server.
 * Pages that really need the API fail on their own and show app/error.tsx.
 */
export async function getOptionalCurrentUserFromApi(): Promise<User | null> {
  const cookieStore = await cookies();

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
  } catch (error) {
    // Couldn't reach the API at all (down, restarting, network problem).
    console.error(
      "getOptionalCurrentUserFromApi: API unreachable, showing the signed-out navbar:",
      error,
    );
    return null;
  }

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    console.error(
      `getOptionalCurrentUserFromApi: API answered ${res.status}, showing the signed-out navbar`,
    );
    return null;
  }

  const body = (await res.json()) as MeResponse;
  return body.data.user;
}
