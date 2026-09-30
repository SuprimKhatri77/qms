import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { getRedis } from "@/lib/redis";
import {
  clientIp,
  startTestServer,
  type TestServer,
} from "./support/test-server";

// The rate limits count per client IP. Which IP that is depends on how many
// proxies the API trusts (AppOptions.trustProxyHops): with none, the
// production default, X-Forwarded-For must be ignored, or anyone could send
// a made-up one with every request and never be limited.
//
// A made-up verify token is counted by the per-IP rule on /tickets/verify
// (verify-ip) and then refused, so the request changes nothing.
async function sendVerify(server: TestServer, forwardedFor: string) {
  const response = await fetch(`${server.url}/api/v1/public/tickets/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
    },
    body: JSON.stringify({ token: randomUUID() }),
  });
  // Unknown token: refused, after the limit has counted the request.
  expect(response.status).toBe(404);
}

// Whether the verify-ip rule has a counter for this IP.
async function countedAgainst(ip: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) {
    throw new Error("These tests need a reachable Redis (REDIS_URL)");
  }
  return await redis.exists(`rl:verify-ip:${ip}`);
}

describe("which client IP the rate limits count", () => {
  let server: TestServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  test("trusting no proxy (the default), a made-up X-Forwarded-For is ignored", async () => {
    server = await startTestServer({ trustProxyHops: 0 });
    const spoofed = clientIp();

    await sendVerify(server, spoofed);

    expect(await countedAgainst(spoofed)).toBe(false);
  });

  test("trusting one proxy, the address it forwards is the client's", async () => {
    server = await startTestServer({ trustProxyHops: 1 });
    const forwarded = clientIp();

    await sendVerify(server, forwarded);

    expect(await countedAgainst(forwarded)).toBe(true);
  });
});
