import type { RedisClient } from "bun";

export type RateLimitResult = {
  allowed: boolean;
  // How long until the window resets. Only meaningful when blocked.
  retryAfterSeconds: number;
};

// Fixed-window counter: counts hits on `key`, and the count resets when the
// key expires `windowSeconds` after its first hit. Known trade-off: someone
// can fit up to 2x `limit` into a short burst straddling a window boundary.
// Fine for the limits we use; a sliding window would cost more complexity
// than it buys here.
export async function hitRateLimit(
  redis: RedisClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // INCR creates the key at 1 if it doesn't exist.
  const count = await redis.incr(key);

  // NX: only set an expiry if the key has none, so later hits never push
  // the window's end back. Running it on every hit (not only when count is
  // 1) means a key can never be left without an expiry — if the process
  // died between these two commands, the next hit would repair it —
  // which would otherwise block that person forever. Needs Redis 7+.
  // Sent raw because Bun's typed expire() has no NX option.
  await redis.send("EXPIRE", [key, String(windowSeconds), "NX"]);

  if (count <= limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const ttl = await redis.ttl(key);

  // TTL is negative only if the key expired in between these calls, i.e.
  // the window is already over, so a retry can happen right away.
  return { allowed: false, retryAfterSeconds: Math.max(ttl, 1) };
}
