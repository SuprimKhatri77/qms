import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import type {
  QueueSnapshot,
  QueueSnapshotResponse,
  QueueTicket,
} from "@repo/types";
import { getOpeningHoursStatus } from "./local-date";

export function toQueueTicket(row: typeof tickets.$inferSelect): QueueTicket {
  return {
    id: row.id,
    tokenNumber: row.tokenNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    calledAt: row.calledAt ? row.calledAt.toISOString() : null,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

// Reads the queue fresh from the database and shapes it for the dashboard.
// Only "waiting" tickets are listed: unverified tickets don't count toward
// the live queue.
export async function buildQueueSnapshot(
  queueId: string,
): Promise<QueueSnapshot> {
  // The queue's shop comes along for its opening hours.
  const [row] = await db
    .select({ queue: queues, shop: shops })
    .from(queues)
    .innerJoin(shops, eq(shops.id, queues.shopId))
    .where(eq(queues.id, queueId))
    .limit(1);

  if (!row) {
    throw new Error(`Queue ${queueId} not found`);
  }

  const { queue, shop } = row;

  const activeTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.queueId, queueId),
        inArray(tickets.status, ["waiting", "serving"]),
      ),
    )
    .orderBy(asc(tickets.tokenNumber));

  const finishedCounts = await db
    .select({ status: tickets.status, total: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.queueId, queueId),
        inArray(tickets.status, ["done", "no_show"]),
      ),
    )
    .groupBy(tickets.status);

  const totalFor = (status: "done" | "no_show") =>
    finishedCounts.find((row) => row.status === status)?.total ?? 0;

  const serving = activeTickets.find((ticket) => ticket.status === "serving");

  return {
    queue: {
      id: queue.id,
      date: queue.date,
      status: queue.status,
      currentServingNumber: queue.currentServingNumber,
    },
    serving: serving ? toQueueTicket(serving) : null,
    waiting: activeTickets
      .filter((ticket) => ticket.status === "waiting")
      .map(toQueueTicket),
    // The status and the times it's based on come from the same read, so
    // the dashboard can never show one without the other.
    hoursStatus: getOpeningHoursStatus(shop),
    openingTime: shop.openingTime ? shop.openingTime.slice(0, 5) : null,
    closingTime: shop.closingTime ? shop.closingTime.slice(0, 5) : null,
    stats: {
      done: totalFor("done"),
      noShow: totalFor("no_show"),
    },
  };
}

export async function getQueueSnapshotResponse(
  queueId: string,
  message: string,
): Promise<QueueSnapshotResponse> {
  return {
    success: true,
    message,
    data: await buildQueueSnapshot(queueId),
  };
}
