// The customer-facing site's own base URL (this Next app), used to build the
// public link a shop's customers open — not the API's URL.
export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
