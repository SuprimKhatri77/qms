import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomInt } from "node:crypto";
import { createApp } from "@/app";
import { getRedis } from "@/lib/redis";

export type TestServer = {
  url: string;
  close: () => Promise<void>;
};

/**
 * Starts the real app (createApp) on a free port on 127.0.0.1.
 *
 * It trusts one proxy hop by default, as behind a real load balancer, so each
 * test can say which client IP it is with X-Forwarded-For (see clientIp()).
 * Otherwise every request would share 127.0.0.1's per-IP counters, and
 * running the suite a few times in 15 minutes would start hitting them.
 */
export async function startTestServer({
  trustProxyHops = 1,
}: { trustProxyHops?: number } = {}): Promise<TestServer> {
  await requireRedis();

  const server: Server = await new Promise((resolve, reject) => {
    const listening = createApp({ trustProxyHops })
      .listen(0, "127.0.0.1", () => resolve(listening))
      .once("error", reject);
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

// These tests go through the real HTTP stack, rate limits included, so they
// need a Redis that's actually there. Without one the API lets every request
// through (rate limiting off), and a test expecting a 429 would fail with a
// confusing "expected 429, got 400" instead of this message.
async function requireRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error(
      "The HTTP tests need REDIS_URL (they exercise the rate limits). Point it at a Redis the tests may write rl:* keys to.",
    );
  }
  if (!(await getRedis())) {
    throw new Error(`REDIS_URL is set but its Redis can't be reached`);
  }
}

// A made-up client IP from 198.18.0.0/15, a range reserved for testing, so
// one test's per-IP rate-limit counters don't touch another's. It's large
// enough (tens of thousands of addresses) that repeated runs rarely pick the
// same one within a rate-limit window.
export function clientIp(): string {
  return `198.18.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

// Turns Set-Cookie lines into the Cookie header a browser would send back.
export function cookieHeader(setCookies: string[]): string {
  return setCookies.map((line) => line.split(";")[0]).join("; ");
}
