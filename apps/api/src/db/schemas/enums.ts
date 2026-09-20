import { pgEnum } from "drizzle-orm/pg-core";

export const shopCategoryEnum = pgEnum("shop_category", [
  "barber",
  "clinic",
  "bank",
  "govt_office",
  "restaurant",
  "repair_shop",
  "other",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "pending_verification",
  "waiting",
  "serving",
  "done",
  "no_show",
  "cancelled",
  "expired",
]);

export const queueStatusEnum = pgEnum("queue_status", ["active", "closed"]);

// A suspended shop keeps its history and settings but can't accept new
// customers, until an admin reactivates it.
export const shopStatusEnum = pgEnum("shop_status", ["active", "suspended"]);

// Severity for rows in system_logs. Kept small on purpose: this is for
// admins scanning for trouble, not a full structured-logging pipeline.
export const logLevelEnum = pgEnum("log_level", ["info", "warning", "error"]);
