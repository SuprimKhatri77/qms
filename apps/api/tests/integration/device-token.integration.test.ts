import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { newDeviceToken } from "@/lib/device-token";
import { cancelTicket } from "@/services/tickets/cancel-ticket.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import {
  createTestOwner,
  createTestShop,
  deleteTestOwner,
  expireVerificationLink,
  joinAndVerify,
  testCustomerEmail,
} from "./support/fixtures";
import type { Shop } from "@repo/types";

// The device cap: one browser (palo_device cookie) may hold at most 2
// active places in the same queue. Services are called directly, with the
// token the controller would have read from the cookie.
describe("per-device cap on joining", () => {
  let ownerId: string;
  let shop: Shop;

  beforeEach(async () => {
    ownerId = await createTestOwner();
    shop = await createTestShop(ownerId);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerId);
  });

  // Each call uses a fresh email, so only the device rule can refuse it
  // (never the one-ticket-per-email rule).
  function joinFromDevice(slug: string, deviceToken: string | null) {
    return joinQueue(
      slug,
      { name: "Device User", email: testCustomerEmail("device") },
      deviceToken,
    );
  }

  async function ticketsForDevice(deviceToken: string) {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.deviceToken, deviceToken));
  }

  test("allows 2 places from one device and refuses the 3rd", async () => {
    const device = newDeviceToken();

    expect((await joinFromDevice(shop.slug, device)).success).toBe(true);
    expect((await joinFromDevice(shop.slug, device)).success).toBe(true);

    const third = await joinFromDevice(shop.slug, device);
    expect(third.success).toBe(false);
    if (third.success) return;
    expect(third.code).toBe("CONFLICT");
    expect(third.message).toContain(
      "This device already holds 2 places in this queue",
    );

    // The refused join created nothing.
    expect(await ticketsForDevice(device)).toHaveLength(2);
  });

  test("stores the device token on the ticket", async () => {
    const device = newDeviceToken();
    const result = await joinFromDevice(shop.slug, device);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const [row] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, result.data.ticketId));
    expect(row?.deviceToken).toBe(device);
  });

  test("confirmed (waiting) places count toward the cap too", async () => {
    const device = newDeviceToken();
    await joinAndVerify(shop.slug, "One", testCustomerEmail("one"), device);
    await joinAndVerify(shop.slug, "Two", testCustomerEmail("two"), device);

    const third = await joinFromDevice(shop.slug, device);
    expect(third.success).toBe(false);
    if (third.success) return;
    expect(third.code).toBe("CONFLICT");
  });

  test("leaving the queue frees a place for that device", async () => {
    const device = newDeviceToken();
    const first = await joinFromDevice(shop.slug, device);
    await joinFromDevice(shop.slug, device);
    if (!first.success) throw new Error("join failed");

    expect((await joinFromDevice(shop.slug, device)).success).toBe(false);

    expect((await cancelTicket(first.data.ticketId)).success).toBe(true);

    expect((await joinFromDevice(shop.slug, device)).success).toBe(true);
  });

  test("a different device isn't affected by another device's places", async () => {
    const deviceA = newDeviceToken();
    const deviceB = newDeviceToken();
    await joinFromDevice(shop.slug, deviceA);
    await joinFromDevice(shop.slug, deviceA);

    expect((await joinFromDevice(shop.slug, deviceB)).success).toBe(true);
  });

  test("a join with no device token is never capped", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await joinFromDevice(shop.slug, null)).success).toBe(true);
    }
  });

  test("a pending place whose link has expired doesn't count", async () => {
    const device = newDeviceToken();
    const stale = await joinFromDevice(shop.slug, device);
    const live = await joinFromDevice(shop.slug, device);
    if (!stale.success || !live.success) throw new Error("join failed");

    await expireVerificationLink(stale.data.ticketId);

    // A different email from the same device: the stale ticket can never
    // become "waiting", so it shouldn't use up one of the two places.
    expect((await joinFromDevice(shop.slug, device)).success).toBe(true);

    const [staleRow] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, stale.data.ticketId));
    expect(staleRow?.status).toBe("expired");

    // Only the dead ticket was retired; the one with a live link is untouched.
    const [liveRow] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, live.data.ticketId));
    expect(liveRow?.status).toBe("pending_verification");
  });
});

describe("per-device cap across shops", () => {
  let ownerA: string;
  let shopA: Shop;
  let ownerB: string;
  let shopB: Shop;

  beforeEach(async () => {
    ownerA = await createTestOwner();
    shopA = await createTestShop(ownerA);
    ownerB = await createTestOwner();
    shopB = await createTestShop(ownerB);
  });

  afterEach(async () => {
    await deleteTestOwner(ownerA);
    await deleteTestOwner(ownerB);
  });

  test("the cap is per queue: a full device can still join another shop", async () => {
    const device = newDeviceToken();
    const join = (slug: string) =>
      joinQueue(
        slug,
        { name: "Device User", email: testCustomerEmail("device") },
        device,
      );

    await join(shopA.slug);
    await join(shopA.slug);
    expect((await join(shopA.slug)).success).toBe(false);

    expect((await join(shopB.slug)).success).toBe(true);
  });
});
