import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { logLevelEnum } from "./enums";

// A general-purpose place to record things that go wrong (or are worth
// noting) outside of a request a user is waiting on — e.g. a fire-and-forget
// email that failed to send. Not a replacement for console logs, just the
// slice of them an admin can see without shell access to the container.
export const systemLogs = pgTable(
  "system_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    level: logLevelEnum("level").notNull(),
    // Which flow this came from, e.g. "join-queue-email", "call-next".
    source: text("source").notNull(),
    message: text("message").notNull(),
    // Free-form context to help trace an entry back to what it was about
    // (shopId, ticketId, email, ...) — shape varies by source on purpose.
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("system_logs_created_at_idx").on(table.createdAt),
    index("system_logs_level_idx").on(table.level),
  ],
);
