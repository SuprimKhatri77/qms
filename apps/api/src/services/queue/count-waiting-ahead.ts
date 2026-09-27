import { and, count, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";

type TicketInLine = {
  queueId: string;
  tokenNumber: number;
  status: string;
};

// How many customers are still waiting in front of this ticket: verified
// tickets in the same queue with a lower token. One indexed count
// (tickets_queue_status_idx covers queue_id + status), run only when the
// customer's page asks, and only for a ticket that is itself waiting.
export async function countWaitingAhead(ticket: TicketInLine): Promise<number> {
  if (ticket.status !== "waiting") {
    return 0;
  }

  const [row] = await db
    .select({ total: count() })
    .from(tickets)
    .where(
      and(
        eq(tickets.queueId, ticket.queueId),
        eq(tickets.status, "waiting"),
        lt(tickets.tokenNumber, ticket.tokenNumber),
      ),
    );

  return row?.total ?? 0;
}
