import { RedisClient } from "bun";
import { logEvent } from "@/lib/system-logs/log-event";
import { withTimeout } from "@/lib/with-timeout";

// Bun's built-in client is used rather than a package like ioredis, so Redis
// adds no dependency. Redis only holds rate-limit counters, so everything
// here is built so that Redis being down makes the API skip rate limiting,
// never hang or fail a request.

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CONNECT_TIMEOUT_MS = 1000;
// After a failed connect, wait this long before trying again, so an outage
// costs one connect attempt every few seconds instead of one per request.
const RETRY_COOLDOWN_MS = 5000;

let client: RedisClient | null = null;
let connecting: Promise<RedisClient | null> | null = null;
let retryAllowedAt = 0;
let isDown = false;

// Returns a connected client, or null if Redis is unavailable right now.
export async function getRedis(): Promise<RedisClient | null> {
  if (client?.connected) {
    return client;
  }

  if (Date.now() < retryAllowedAt) {
    return null;
  }

  // Requests that arrive while a connect is in progress share it, rather
  // than each opening (and leaking) their own connection.
  if (!connecting) {
    connecting = connectFreshClient().finally(() => {
      connecting = null;
    });
  }

  return connecting;
}

// Drops a client so the next getRedis() opens a fresh one. Called when a
// command fails or hangs on a client that still reports itself as connected,
// which would otherwise keep being reused.
//
// Takes the client that failed, and only drops it if it's still the current
// one: a slow request failing late must not close a newer, healthy client
// that another request has opened in the meantime.
export function resetRedisConnection(failed: RedisClient) {
  if (client !== failed) {
    return;
  }

  client.close();
  client = null;
}

// A new client every time, on purpose: a Bun RedisClient that has lost its
// connection can't be revived — calling connect() on it again never settles,
// even once Redis is back up. Bun's own auto-reconnect is off for the same
// reason, and because while it's retrying, commands wait for its whole retry
// loop (tens of seconds) instead of failing.
async function connectFreshClient(): Promise<RedisClient | null> {
  client?.close();
  client = null;

  const fresh = new RedisClient(REDIS_URL, {
    autoReconnect: false,
    // Without this, commands sent while disconnected are held in memory
    // until Redis returns, so requests would hang instead of moving on.
    enableOfflineQueue: false,
  });

  try {
    await withTimeout(fresh.connect(), CONNECT_TIMEOUT_MS, "Redis connect");
  } catch (error) {
    fresh.close();
    retryAllowedAt = Date.now() + RETRY_COOLDOWN_MS;
    reportDown(error);
    return null;
  }

  client = fresh;
  reportRecovered();
  return fresh;
}

// Only the change from up to down (and back) is logged. Logging every
// request that skipped rate limiting would flood system_logs during an outage.
function reportDown(error: unknown) {
  if (isDown) {
    return;
  }

  isDown = true;
  console.error("Redis unavailable, rate limiting is off:", error);
  logEvent("error", "redis", "Redis unavailable, rate limiting is off", {
    error: String(error),
  });
}

function reportRecovered() {
  if (!isDown) {
    return;
  }

  isDown = false;
  console.log("Redis reconnected, rate limiting is back on");
  logEvent("info", "redis", "Redis reconnected, rate limiting is back on");
}
