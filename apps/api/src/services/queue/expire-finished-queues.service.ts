import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import { logEvent } from "@/lib/system-logs/log-event";

// Tickets that are still "in line". When their queue finishes, nobody is
// going to call them any more, so they become "expired". A ticket already
// "serving" is left alone: only the owner knows how that visit ended.
const STILL_IN_LINE = ["pending_verification", "waiting"] as const;

export type ExpirySweepResult = {
  expiredQueues: number;
  expiredTickets: number;
};

/**
 * Closes every queue that has finished, and expires the tickets still
 * waiting in it. A queue is finished at whichever comes first:
 *
 *  1. the shop's closing time (e.g. 19:00, shop-local), if it has one, or
 *  2. the end of its day, in the shop's own timezone. The owner's dashboard
 *     only ever shows today's queue, so yesterday's leftovers can never be
 *     called.
 *
 * Runs on a timer (see index.ts), because it has to happen even when nobody
 * touches the shop: a customer's ticket page should stop showing a frozen
 * position. Safe to run any number of times, or from two servers at once:
 * `expired_at IS NULL` means each queue is only ever expired once.
 */
export async function expireFinishedQueues(): Promise<ExpirySweepResult> {
  return db.transaction(async (tx) => {
    const now = new Date();

    // `now() AT TIME ZONE <tz>` is the wall-clock date and time in the
    // shop's city, so both rules use the shop's own "today" and "now".
    const shopNow = sql`(now() AT TIME ZONE ${shops.timezone})`;
    const dayIsOver = sql`${queues.date} < ${shopNow}::date`;
    // Only today's queue can be past today's closing time (an older queue is
    // already caught by dayIsOver).
    const pastClosingTime = sql`${shops.closingTime} IS NOT NULL
      AND ${queues.date} = ${shopNow}::date
      AND ${shopNow}::time >= ${shops.closingTime}`;

    const finished = await tx
      .update(queues)
      .set({ status: "closed", expiredAt: now })
      .from(shops)
      .where(
        and(
          eq(shops.id, queues.shopId),
          isNull(queues.expiredAt),
          or(pastClosingTime, dayIsOver),
        ),
      )
      .returning({ id: queues.id });

    if (finished.length === 0) {
      return { expiredQueues: 0, expiredTickets: 0 };
    }

    const expired = await tx
      .update(tickets)
      .set({ status: "expired", resolvedAt: now })
      .where(
        and(
          inArray(
            tickets.queueId,
            finished.map((queue) => queue.id),
          ),
          inArray(tickets.status, STILL_IN_LINE),
        ),
      )
      .returning({ id: tickets.id });

    // The per-device join cap only ever looks at today's queue, so once a
    // queue is finished its tickets' device tokens have no use left. Wiping
    // them means the database never keeps a history of which tickets came
    // from the same phone.
    await tx
      .update(tickets)
      .set({ deviceToken: null })
      .where(
        inArray(
          tickets.queueId,
          finished.map((queue) => queue.id),
        ),
      );

    return { expiredQueues: finished.length, expiredTickets: expired.length };
  });
}

// How often the API checks for finished queues. A customer may see their
// ticket as "waiting" for up to this long after the queue ends; five
// minutes is plenty for a walk-in queue, and the query is cheap.
export const EXPIRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// The timer's entry point: never throws, so a database hiccup can't crash
// the server, and only writes a system log when something actually expired.
export async function runExpirySweep(): Promise<void> {
  try {
    const result = await expireFinishedQueues();

    if (result.expiredQueues > 0) {
      logEvent("info", "queue-expiry", "Expired finished queues", result);
    }
  } catch (error) {
    console.error("runExpirySweep failed:", error);
    logEvent("error", "queue-expiry", "The queue expiry sweep failed", {
      error: String(error),
    });
  }
}
