import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { GetMyShopResponse, Shop } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

/**
 * Loads the signed-in owner's shop from the API while rendering a server page.
 * Returns null when the owner hasn't finished onboarding yet.
 *
 * Like the proxy, this forwards the browser's cookies to the API, so it relies
 * on the session cookie being visible to the web host.
 */
export async function getMyShopFromApi(): Promise<Shop | null> {
  const cookieStore = await cookies();

  const res = await fetch(`${getApiUrl()}/api/v1/shops/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/auth/login");
  }

  // Throw instead of returning null: "the API is down" must not be mistaken
  // for "this owner has no shop", or they would be sent to onboarding by mistake.
  if (!res.ok) {
    throw new Error(`Failed to load shop (status ${res.status})`);
  }

  const body = (await res.json()) as GetMyShopResponse;
  return body.data.shop;
}
