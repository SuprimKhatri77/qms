import {
  pgTable,
  timestamp,
  uuid,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { shops } from "./shops";
import { queueStatusEnum } from "./enums";

export const queues = pgTable(
  "queues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),

    // shop-local calendar day (from shops.timezone), not server/UTC midnight
    date: date("date").notNull(),
    currentServingNumber: integer("current_serving_number")
      .notNull()
      .default(0),
    status: queueStatusEnum("status").notNull().default("active"),
    // Set by the expiry sweeper (see expire-finished-queues.service.ts) when
    // the queue's hours run out or its day ends. Null means it hasn't
    // expired yet, so the sweeper never expires the same queue twice.
    // Reopening the queue (set-queue-status.service.ts, only allowed before
    // the closing time) clears it, so the sweeper closes it again later.
    expiredAt: timestamp("expired_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // one queue per shop per day
    uniqueIndex("queues_shop_date_idx").on(table.shopId, table.date),
  ],
);
