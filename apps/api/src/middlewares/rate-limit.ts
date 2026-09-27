import type { NextFunction, Request, Response } from "express";
import type { RedisClient } from "bun";
import { ErrorCode, type ApiErrorResponse } from "@repo/types";
import { getRedis, resetRedisConnection } from "@/lib/redis";
import {
  hitRateLimit,
  type RateLimitResult,
} from "@/lib/rate-limit/hit-rate-limit";
import { logEvent } from "@/lib/system-logs/log-event";
import { withTimeout } from "@/lib/with-timeout";

export type RateLimitRule = {
  // Part of the Redis key, so each rule counts separately.
  name: string;
  limit: number;
  windowSeconds: number;
  // What this rule counts by: an IP, an email, an IP + shop, etc. Returning
  // null skips the rule for this request (e.g. there's no email to count).
  identify: (req: Request) => string | null;
};

// A healthy Redis answers in about a millisecond. This is only a ceiling for
// when it's connected but stalled, so a request never waits on it for long.
const CHECK_TIMEOUT_MS = 1000;

// Blocks the request with a 429 if any rule is over its limit.
//
// If Redis is down or erroring, the request is let through ("fail open"):
// rate limiting is a protection layer, and losing it for a while is better
// than a Redis outage locking every owner out or stopping every queue. The
// checks behind it (email verification, one active ticket per email, the
// password itself) still apply.
export function rateLimit(rules: RateLimitRule[]) {
  return async (
    req: Request,
    res: Response<ApiErrorResponse>,
    next: NextFunction,
  ) => {
    // Never throws: redis.ts handles its own connect errors and timeout.
    const redis = await getRedis();

    // Redis is down: fail open (redis.ts has already logged the outage).
    if (!redis) {
      return next();
    }

    let blocked: RateLimitResult | null;

    try {
      blocked = await withTimeout(
        findBlockingRule(redis, req, rules),
        CHECK_TIMEOUT_MS,
        "Rate limit check",
      );
    } catch (error) {
      console.error("rateLimit: check failed, letting request through:", error);
      logEvent("error", "rate-limit", "Rate limit check failed", {
        path: req.path,
        error: String(error),
      });
      // The connection may be stuck; make the next request start a new one.
      resetRedisConnection(redis);
      return next();
    }

    if (!blocked) {
      return next();
    }

    res.setHeader("Retry-After", String(blocked.retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Too many attempts. Please try again in ${describeWait(blocked.retryAfterSeconds)}.`,
      code: ErrorCode.RATE_LIMITED,
      retryAfterSeconds: blocked.retryAfterSeconds,
    });
  };
}

// Counts this request against each rule in order, and stops at the first one
// that's over its limit. Returns null if the request is allowed.
async function findBlockingRule(
  redis: RedisClient,
  req: Request,
  rules: RateLimitRule[],
): Promise<RateLimitResult | null> {
  for (const rule of rules) {
    const identifier = rule.identify(req);

    if (identifier === null) {
      continue;
    }

    const result = await hitRateLimit(
      redis,
      `rl:${rule.name}:${identifier}`,
      rule.limit,
      rule.windowSeconds,
    );

    if (!result.allowed) {
      return result;
    }
  }

  return null;
}

function describeWait(seconds: number): string {
  if (seconds < 60) {
    return seconds === 1 ? "1 second" : `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
