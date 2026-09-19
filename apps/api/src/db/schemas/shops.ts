import {
  pgTable,
  text,
  timestamp,
  index,
  uuid,
  integer,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { shopCategoryEnum } from "./enums";

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: shopCategoryEnum("category").notNull().default("other"),

    // location
    city: text("city").notNull(),
    area: text("area"),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    // IANA timezone used to derive queues.date (shop-local business day)
    timezone: text("timezone").notNull().default("Asia/Kathmandu"),

    // contact info, shown on the shop's public page and (later) landing-page map pins
    email: text("email"),
    phone: text("phone"),

    // queue behavior config, owner-controlled
    avgServiceMinutes: integer("avg_service_minutes").notNull().default(10),
    queueExpiryHours: integer("queue_expiry_hours").notNull().default(24),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("shops_slug_idx").on(table.slug),
    index("shops_city_idx").on(table.city),
    index("shops_category_idx").on(table.category),
    index("shops_owner_idx").on(table.ownerId),
  ],
);
