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
