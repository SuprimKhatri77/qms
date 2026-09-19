import { z } from "zod";
import { paginationMetaSchema } from "@repo/types";

// Response bodies aren't validated with zod at runtime (only request bodies
// and query strings are) — the types in @repo/types are plain TypeScript.
// These schemas mirror those types field-for-field, for docs generation
// only. If a response type in @repo/types changes, update the matching
// schema here too.

// Wraps a data schema in the { success, message, data, meta? } envelope
// every endpoint returns, matching `ApiSuccessResponse<TData, TMeta>`.
export function apiSuccessSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  metaSchema?: z.ZodTypeAny,
) {
  const shape = {
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  };

  return metaSchema
    ? z.object({ ...shape, meta: metaSchema })
    : z.object(shape);
}

export const shopSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.enum([
    "barber",
    "clinic",
    "bank",
    "govt_office",
    "restaurant",
    "repair_shop",
    "other",
  ]),
  status: z.enum(["active", "suspended"]),
  city: z.string(),
  area: z.string().nullable(),
  address: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  timezone: z.string(),
  avgServiceMinutes: z.number(),
  queueExpiryHours: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const ticketStatusSchema = z.enum([
  "pending_verification",
  "waiting",
  "serving",
  "done",
  "no_show",
  "cancelled",
  "expired",
]);

export const queueTicketSchema = z.object({
  id: z.uuid(),
  tokenNumber: z.number(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  status: ticketStatusSchema,
  createdAt: z.iso.datetime(),
  calledAt: z.iso.datetime().nullable(),
  resolvedAt: z.iso.datetime().nullable(),
});

export const shopQueueSchema = z.object({
  id: z.uuid(),
  date: z.iso.date(),
  status: z.enum(["active", "closed"]),
  currentServingNumber: z.number(),
});

export const queueSnapshotSchema = z.object({
  queue: shopQueueSchema,
  serving: queueTicketSchema.nullable(),
  waiting: z.array(queueTicketSchema),
  stats: z.object({
    done: z.number(),
    noShow: z.number(),
  }),
});

export const publicTicketSchema = z.object({
  id: z.uuid(),
  tokenNumber: z.number(),
  customerName: z.string(),
  status: ticketStatusSchema,
  position: z.number().nullable(),
  etaMinutes: z.number().nullable(),
  createdAt: z.iso.datetime(),
});

export const analyticsSummarySchema = z.object({
  customers: z.number(),
  served: z.number(),
  noShows: z.number(),
  noShowRate: z.number().nullable(),
  avgWaitMinutes: z.number().nullable(),
});

export const analyticsDaySchema = z.object({
  date: z.iso.date(),
  customers: z.number(),
  served: z.number(),
  noShows: z.number(),
});

export const analyticsHourSchema = z.object({
  hour: z.number().min(0).max(23),
  customers: z.number(),
});

export const analyticsSchema = z.object({
  days: z.number(),
  from: z.iso.date(),
  to: z.iso.date(),
  summary: analyticsSummarySchema,
  daily: z.array(analyticsDaySchema),
  hourly: z.array(analyticsHourSchema),
});

export const historyDaySchema = z.object({
  queueId: z.uuid(),
  date: z.iso.date(),
  status: z.enum(["active", "closed"]),
  customers: z.number(),
  served: z.number(),
  noShows: z.number(),
  avgWaitMinutes: z.number().nullable(),
});

export const historyDayDetailSchema = z.object({
  queue: shopQueueSchema,
  tickets: z.array(queueTicketSchema),
});

export const adminShopSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  city: z.string(),
  status: z.enum(["active", "suspended"]),
  ownerName: z.string(),
  ownerEmail: z.string(),
  ticketCount: z.number(),
  createdAt: z.iso.datetime(),
});

export const platformAnalyticsSchema = analyticsSchema.extend({
  summary: analyticsSummarySchema.extend({
    totalShops: z.number(),
    activeShops: z.number(),
  }),
});

export const systemLogSchema = z.object({
  id: z.uuid(),
  level: z.enum(["info", "warning", "error"]),
  source: z.string(),
  message: z.string(),
  meta: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.iso.datetime(),
});

export { paginationMetaSchema };
