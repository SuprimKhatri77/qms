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

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // one queue per shop per day
    uniqueIndex("queues_shop_date_idx").on(table.shopId, table.date),
  ],
);
