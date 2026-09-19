// Base URL for calls made by the Next.js server (the proxy and server pages).
//
// The browser reaches the API at NEXT_PUBLIC_API_URL (http://localhost:5000).
// Inside Docker, "localhost" is the web container itself, so the server needs a
// separate address for the API container. API_INTERNAL_URL is that address
// (http://api:5000); when it isn't set we fall back to the public URL.
export function getApiUrl() {
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  );
}
