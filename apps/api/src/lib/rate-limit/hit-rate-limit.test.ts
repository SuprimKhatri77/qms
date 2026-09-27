import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { randomUUID } from "node:crypto";
import { withTimeout } from "@/lib/with-timeout";
import { hitRateLimit } from "./hit-rate-limit";

// Runs against a real Redis (REDIS_URL, or localhost:6379), because what's
// being tested is exactly how the Redis commands behave together: expiry,
// NX, and TTL. Skipped, not failed, when there's no Redis to talk to.
const redis = new RedisClient(
  process.env.REDIS_URL || "redis://localhost:6379",
  { autoReconnect: false, enableOfflineQueue: false },
);
const redisAvailable = await withTimeout(redis.connect(), 1000, "connect")
  .then(() => true)
  .catch(() => false);

if (!redisAvailable) {
  console.warn("Skipping hitRateLimit tests: no Redis reachable at REDIS_URL");
}

// Unique per test run, so these never touch real rate-limit keys (or
// anything else in a shared local Redis).
const prefix = `rl-test:${randomUUID()}`;
let keyCount = 0;
function freshKey() {
  keyCount += 1;
  return `${prefix}:${keyCount}`;
}

describe.skipIf(!redisAvailable)("hitRateLimit", () => {
  afterEach(async () => {
    for (let i = 1; i <= keyCount; i++) {
      await redis.del(`${prefix}:${i}`);
    }
  });

  afterAll(() => {
    redis.close();
  });

  test("allows hits up to the limit, then blocks", async () => {
    const key = freshKey();

    for (let i = 0; i < 3; i++) {
      const result = await hitRateLimit(redis, key, 3, 60);
      expect(result.allowed).toBe(true);
    }

    const blocked = await hitRateLimit(redis, key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  test("gives the counter an expiry on the first hit", async () => {
    const key = freshKey();

    await hitRateLimit(redis, key, 3, 60);

    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  test("later hits don't push the window's end back", async () => {
    const key = freshKey();

    await hitRateLimit(redis, key, 10, 5);
    await Bun.sleep(1100);
    await hitRateLimit(redis, key, 10, 5);

    // Had the second hit reset the expiry, this would be 5 again.
    expect(await redis.ttl(key)).toBeLessThanOrEqual(4);
  });

  test("the count resets once the window is over", async () => {
    const key = freshKey();

    await hitRateLimit(redis, key, 1, 1);
    expect((await hitRateLimit(redis, key, 1, 1)).allowed).toBe(false);

    await Bun.sleep(1100);

    expect((await hitRateLimit(redis, key, 1, 1)).allowed).toBe(true);
  });

  test("repairs a counter that was left without an expiry", async () => {
    const key = freshKey();
    // What a crash between INCR and EXPIRE would leave behind.
    await redis.set(key, "7");

    await hitRateLimit(redis, key, 3, 60);

    expect(await redis.ttl(key)).toBeGreaterThan(0);
  });
});
