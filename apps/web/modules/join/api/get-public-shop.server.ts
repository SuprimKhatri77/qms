import { notFound } from "next/navigation";
import type { GetPublicShopResponse } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

// Loads a shop's public info while rendering the join page. No cookies to
// forward here — customers never have a session — so unlike the owner-side
// server helpers this is a plain, unauthenticated fetch.
export async function getPublicShopFromApi(
  slug: string,
): Promise<GetPublicShopResponse["data"]> {
  const res = await fetch(`${getApiUrl()}/api/v1/public/shops/${slug}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load shop (status ${res.status})`);
  }

  const body = (await res.json()) as GetPublicShopResponse;

  return body.data;
}
