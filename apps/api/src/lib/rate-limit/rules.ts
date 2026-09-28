import type { Request } from "express";
import type { RateLimitRule } from "@/middlewares/rate-limit";

// Every limit in the API lives here, so they're easy to review and tune.
//
// Why several rules per route instead of one "N requests per IP": many real
// users can share one IP — everyone on a shop's Wi-Fi, or everyone behind a
// mobile carrier's CGNAT. So per-IP limits are kept generous, and the tight
// limits go on things a crowd doesn't share: an email, or an email + IP pair.
// Each rule targets one specific abuse pattern.

const MINUTE = 60;
const HOUR = 60 * MINUTE;

// The longest a valid email address can be (RFC 5321). Anything longer isn't
// counted per-email, so a junk multi-KB "email" can't become a huge Redis
// key. The IP rules still count that request.
const MAX_EMAIL_LENGTH = 254;

// req.ip honours X-Forwarded-For only as far as `trust proxy` allows (see
// index.ts), so a client can't dodge IP limits by sending a fake header.
function clientIp(req: Request): string | null {
  return req.ip ?? null;
}

// Lowercased so "Owner@x.com" and "owner@x.com" share one counter. Read
// defensively because on the raw Better Auth routes the body hasn't been
// through our Zod validation.
function bodyEmail(req: Request): string | null {
  const email: unknown = req.body?.email;

  if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}

function emailAndIp(req: Request): string | null {
  const email = bodyEmail(req);
  const ip = clientIp(req);

  return email && ip ? `${ip}|${email}` : null;
}

function shopSlugAndIp(req: Request): string | null {
  const slug = req.params.slug;
  const ip = clientIp(req);

  return typeof slug === "string" && ip ? `${ip}|${slug.toLowerCase()}` : null;
}

export const loginRules: RateLimitRule[] = [
  // Password guessing against one account from one place.
  {
    name: "login-email-ip",
    limit: 5,
    windowSeconds: 15 * MINUTE,
    identify: emailAndIp,
  },
  // The same guessing spread across many IPs.
  {
    name: "login-email",
    limit: 20,
    windowSeconds: 15 * MINUTE,
    identify: bodyEmail,
  },
  // One IP trying many accounts. Generous, because IPs are shared.
  {
    name: "login-ip",
    limit: 50,
    windowSeconds: 15 * MINUTE,
    identify: clientIp,
  },
];

// Mass creation of fake owner accounts.
export const signupRules: RateLimitRule[] = [
  {
    name: "signup-ip",
    limit: 10,
    windowSeconds: HOUR,
    identify: clientIp,
  },
];

// Better Auth's own endpoints that send an email (password reset, email
// verification). Stops them being used to flood someone's inbox.
export const authEmailRules: RateLimitRule[] = [
  {
    name: "auth-email-send-email",
    limit: 5,
    windowSeconds: HOUR,
    identify: bodyEmail,
  },
  {
    name: "auth-email-send-ip",
    limit: 10,
    windowSeconds: HOUR,
    identify: clientIp,
  },
];

// Joining a queue from the shop's QR code. Every join sends an email.
export const joinRules: RateLimitRule[] = [
  // Flooding one person's inbox by joining many shops with their email.
  // Counted across all shops.
  {
    name: "join-email",
    limit: 5,
    windowSeconds: HOUR,
    identify: bodyEmail,
  },
  // A script filling one shop's queue with fake tickets. A busy shop's
  // customers may all be on its Wi-Fi, so this still leaves room for a rush.
  {
    name: "join-ip-shop",
    limit: 30,
    windowSeconds: 10 * MINUTE,
    identify: shopSlugAndIp,
  },
  // One machine spraying tickets across many shops.
  {
    name: "join-ip",
    limit: 60,
    windowSeconds: HOUR,
    identify: clientIp,
  },
];

// Verification tokens are 64 random hex characters, so guessing one is
// already infeasible. This just stops anyone hammering the endpoint.
export const verifyRules: RateLimitRule[] = [
  {
    name: "verify-ip",
    limit: 30,
    windowSeconds: 10 * MINUTE,
    identify: clientIp,
  },
];

// Leaving the queue. Ticket ids are random UUIDs, so guessing someone
// else's is already infeasible. Like verifyRules, this only stops anyone
// hammering the endpoint.
export const cancelRules: RateLimitRule[] = [
  {
    name: "cancel-ip",
    limit: 30,
    windowSeconds: 10 * MINUTE,
    identify: clientIp,
  },
];
