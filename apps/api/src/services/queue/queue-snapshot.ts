import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type {
  QueueSnapshot,
  QueueSnapshotResponse,
  QueueTicket,
} from "@repo/types";

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
  const [queue] = await db
    .select()
    .from(queues)
    .where(eq(queues.id, queueId))
    .limit(1);

  if (!queue) {
    throw new Error(`Queue ${queueId} not found`);
  }

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
