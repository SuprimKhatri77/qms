import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ticketVerifications, users } from "@/db/schema";
import type { CreateShopRequest, Shop } from "@repo/types";
import { createShop } from "@/services/shops/create-shop.service";
import { joinQueue } from "@/services/tickets/join-queue.service";
import { verifyTicket } from "@/services/tickets/verify-ticket.service";

// Every fixture is tagged so a stray row is unmistakably test data, not a
// real account, if cleanup is ever interrupted mid-run.
const EMAIL_DOMAIN = "integration-test.invalid";

// Inserted directly rather than going through Better Auth: these tests
// exercise the queue/ticket services (which only ever take an ownerId
// string), not the auth flow itself.
export async function createTestOwner(): Promise<string> {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    name: "Integration Test Owner",
    email: `owner-${id}@${EMAIL_DOMAIN}`,
  });
  return id;
}

// Deletes the owner row. `shops.ownerId`, `queues.shopId`,
// `tickets.queueId` and `ticket_verifications.ticketId` all reference their
// parent with `onDelete: "cascade"`, so this one delete is enough to remove
// every shop/queue/ticket/verification the owner's test data created.
export async function deleteTestOwner(ownerId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, ownerId));
}

const baseShopData: CreateShopRequest = {
  name: "Integration Test Shop",
  category: "barber",
  city: "Kathmandu",
  avgServiceMinutes: 10,
  queueExpiryHours: 24,
};

// Creates the one shop `createShop` allows per owner. Goes through the real
// service (not a raw insert) so slug generation stays covered too.
export async function createTestShop(
  ownerId: string,
  overrides: Partial<CreateShopRequest> = {},
): Promise<Shop> {
  const result = await createShop(ownerId, { ...baseShopData, ...overrides });

  if (!result.success) {
    throw new Error(`createTestShop failed: ${result.message}`);
  }

  return result.data.shop;
}

export function testCustomerEmail(label: string): string {
  return `${label}-${randomUUID().slice(0, 8)}@${EMAIL_DOMAIN}`;
}

// join-queue.service never returns the verification token (it only emails
// it), so tests that need to "click the link" read it straight from the
// table the service already wrote it to.
export async function getVerificationToken(ticketId: string): Promise<string> {
  const [row] = await db
    .select({ token: ticketVerifications.token })
    .from(ticketVerifications)
    .where(eq(ticketVerifications.ticketId, ticketId))
    .limit(1);

  if (!row) {
    throw new Error(`No verification row for ticket ${ticketId}`);
  }

  return row.token;
}

// Runs the real join -> verify flow end to end and hands back the ticket id,
// for tests whose real interest is what happens after a customer is already
// waiting (call-next, resolve, tenant isolation, ...).
export async function joinAndVerify(
  slug: string,
  customerName: string,
  customerEmail: string,
): Promise<string> {
  const joinResult = await joinQueue(slug, {
    name: customerName,
    email: customerEmail,
  });

  if (!joinResult.success) {
    throw new Error(`joinAndVerify: join failed: ${joinResult.message}`);
  }

  const token = await getVerificationToken(joinResult.data.ticketId);
  const verifyResult = await verifyTicket(token);

  if (!verifyResult.success) {
    throw new Error(`joinAndVerify: verify failed: ${verifyResult.message}`);
  }

  return joinResult.data.ticketId;
}
