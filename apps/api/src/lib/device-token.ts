import { randomBytes } from "node:crypto";
import type { CookieOptions } from "express";

// A random id the browser keeps in a cookie so the join flow can tell "the
// same phone joining again" apart from a new customer. Customers have no
// accounts, so this is the only notion of "device" we have.
//
// It's a soft signal only: clearing cookies or opening a private window gets
// a fresh token. Email verification, one active ticket per email and the
// Redis rate limits are the real defenses; this just stops one browser from
// casually filling a queue with made-up emails.
export const DEVICE_COOKIE_NAME = "palo_device";

// The exact shape newDeviceToken() mints: 16 random bytes as hex.
const DEVICE_TOKEN_FORMAT = /^[0-9a-f]{32}$/;

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const deviceCookieOptions: CookieOptions = {
  // Only the API reads it; page scripts never need to see it.
  httpOnly: true,
  // Same setting as the Better Auth cookies: sent on the web app's own
  // requests to the API, not on requests started by other sites.
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  // Only the customer-facing routes care about it, so the browser doesn't
  // attach it to every owner/admin request too.
  path: "/api/v1/public",
  // Express takes maxAge in milliseconds (it converts to seconds itself).
  maxAge: ONE_YEAR_MS,
};

export function newDeviceToken(): string {
  return randomBytes(16).toString("hex");
}

// Reads our cookie out of the raw Cookie header ("a=1; palo_device=abc").
// Anything that isn't a token we could have minted is treated as missing,
// so a client can't get a huge or junk value stored on its ticket.
export function readDeviceToken(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(";")) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = pair.slice(0, separatorIndex).trim();
    if (name !== DEVICE_COOKIE_NAME) {
      continue;
    }

    const value = pair.slice(separatorIndex + 1).trim();
    return DEVICE_TOKEN_FORMAT.test(value) ? value : null;
  }

  return null;
}
