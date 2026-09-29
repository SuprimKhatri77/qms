import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, ticketVerifications, tickets, users } from "@/db/schema";
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

// Moves a ticket's confirmation link into the past, as if 15 minutes had gone by.
export async function expireVerificationLink(ticketId: string): Promise<void> {
  await db
    .update(ticketVerifications)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(ticketVerifications.ticketId, ticketId));
}

// Runs the real join -> verify flow end to end and hands back the ticket id,
// for tests whose real interest is what happens after a customer is already
// waiting (call-next, resolve, tenant isolation, ...). No device token by
// default, so the per-device cap never gets in the way of those tests.
export async function joinAndVerify(
  slug: string,
  customerName: string,
  customerEmail: string,
  deviceToken: string | null = null,
): Promise<string> {
  const joinResult = await joinQueue(
    slug,
    {
      name: customerName,
      email: customerEmail,
    },
    deviceToken,
  );

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

// Plays call-next's side of a race. Inside one transaction it takes the
// ticket's queue row lock (exactly as callNext does), starts
// `competingAction` (e.g. a cancel or remove of the same ticket), waits a
// moment, then calls the ticket ("serving") and commits. A correct
// competing action has to wait for the lock, so it can't have finished
// while the lock was held, and it then sees the ticket already serving.
export async function raceAgainstCallingTicket<T>(
  ticketId: string,
  competingAction: () => Promise<T>,
): Promise<{ result: T; finishedWhileLocked: boolean }> {
  let finished = false;
  let finishedWhileLocked = false;
  let competing: Promise<T> | undefined;

  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select({ queueId: tickets.queueId })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      throw new Error(`raceAgainstCallingTicket: no ticket ${ticketId}`);
    }

    await tx
      .select({ id: queues.id })
      .from(queues)
      .where(eq(queues.id, ticket.queueId))
      .for("update");

    competing = competingAction().finally(() => {
      finished = true;
    });
    // Long enough for an unlocked update to finish on another connection.
    await Bun.sleep(300);
    finishedWhileLocked = finished;

    await tx
      .update(tickets)
      .set({ status: "serving", calledAt: new Date() })
      .where(eq(tickets.id, ticketId));
  });

  if (!competing) {
    throw new Error("raceAgainstCallingTicket: competing action never started");
  }

  return { result: await competing, finishedWhileLocked };
}
