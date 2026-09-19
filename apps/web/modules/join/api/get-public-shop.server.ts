import { notFound } from "next/navigation";
// The response shape is identical to the owner-side "get my shop" response
// (a shop, or in that case possibly null) — reused here rather than adding a
// near-duplicate type for the public endpoint.
import type { GetMyShopResponse, Shop } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

// Loads a shop's public info while rendering the join page. No cookies to
// forward here — customers never have a session — so unlike the owner-side
// server helpers this is a plain, unauthenticated fetch.
export async function getPublicShopFromApi(slug: string): Promise<Shop> {
  const res = await fetch(`${getApiUrl()}/api/v1/public/shops/${slug}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load shop (status ${res.status})`);
  }

  const body = (await res.json()) as GetMyShopResponse;

  // Only null for the owner-side "no shop yet" case; a 404 above already
  // covers "no shop at this slug" for the public endpoint.
  if (!body.data.shop) {
    notFound();
  }

  return body.data.shop;
}
