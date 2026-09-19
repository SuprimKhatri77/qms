import { sql } from "drizzle-orm";
import { tickets } from "@/db/schema";

// SQL fragments shared by analytics and history, so both define a "customer"
// and a "wait" the same way.

// A ticket counts as a customer once it entered the real queue: it was verified,
// or it reached a status that is only possible after verification.
export const enteredQueue = sql`(${tickets.verifiedAt} IS NOT NULL OR ${tickets.status} IN ('waiting', 'serving', 'done', 'no_show'))`;

// Seconds a customer waited: from joining the queue (verification) until called.
// Tickets that were never called have no wait.
export const waitSeconds = sql`extract(epoch from (${tickets.calledAt} - coalesce(${tickets.verifiedAt}, ${tickets.createdAt})))`;

// Postgres returns AVG() as text (or null); this makes it minutes with 1 decimal.
export function toAvgMinutes(avgSeconds: string | null): number | null {
  if (avgSeconds === null) return null;
  return Math.round((Number(avgSeconds) / 60) * 10) / 10;
}
