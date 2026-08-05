import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  index,
  uuid,
  integer,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { queues } from "./queues";
import { ticketStatusEnum } from "./enums";

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => queues.id, { onDelete: "cascade" }),

    tokenNumber: integer("token_number").notNull(),

    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),

    status: ticketStatusEnum("status")
      .notNull()
      .default("pending_verification"),

    // soft signal for abuse prevention, not the primary defense
    deviceToken: text("device_token"),

    // set once, prevents duplicate "near your turn" emails
    turnAlertSentAt: timestamp("turn_alert_sent_at"),

    // optional linkage if a no-show customer rejoins
    requeuedFromTicketId: uuid("requeued_from_ticket_id").references(
      (): AnyPgColumn => tickets.id,
      { onDelete: "set null" },
    ),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    verifiedAt: timestamp("verified_at"),
    calledAt: timestamp("called_at"),
    resolvedAt: timestamp("resolved_at"), // done / no_show / cancelled / expired
  },
  (table) => [
    uniqueIndex("tickets_queue_token_idx").on(table.queueId, table.tokenNumber),
    // one active ticket per email per queue, enforced by the database
    uniqueIndex("tickets_queue_email_active_idx")
      .on(table.queueId, table.customerEmail)
      .where(
        sql`${table.status} IN ('pending_verification', 'waiting', 'serving')`,
      ),
    index("tickets_queue_status_idx").on(table.queueId, table.status),
  ],
);

export const ticketVerifications = pgTable(
  "ticket_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),

    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ticket_verifications_token_idx").on(table.token)],
);
