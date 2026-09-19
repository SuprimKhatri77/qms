import { z } from "zod";
import type { ApiSuccessResponse } from "../base";
import type { Analytics, AnalyticsSummary } from "../analytics/analytics";
import { SHOP_STATUSES, type ShopStatus } from "../shops/shop";

// One row in the admin shop list: enough to identify a shop, see who owns
// it, and gauge how much it's used, without a second request per shop.
export type AdminShopSummary = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: ShopStatus;
  ownerName: string;
  ownerEmail: string;
  // Lifetime ticket count, not scoped to any date range — just a quick
  // "is this shop actually being used" signal.
  ticketCount: number;
  createdAt: string;
};

export type AdminShopListResponse = ApiSuccessResponse<{
  shops: AdminShopSummary[];
}>;

export const updateShopStatusSchema = z.object({
  status: z.enum(SHOP_STATUSES, { error: "Invalid status" }),
});

export type UpdateShopStatusRequest = z.infer<typeof updateShopStatusSchema>;

export type UpdateShopStatusResponse = ApiSuccessResponse<{
  shopId: string;
  status: ShopStatus;
}>;

// Same shape the per-shop analytics page uses, plus two platform-only
// numbers. Reusing `Analytics`'s `daily`/`hourly` means the existing chart
// components work here unchanged.
export type PlatformAnalyticsSummary = AnalyticsSummary & {
  totalShops: number;
  activeShops: number;
};

export type PlatformAnalytics = Omit<Analytics, "summary"> & {
  summary: PlatformAnalyticsSummary;
};

export type PlatformAnalyticsResponse = ApiSuccessResponse<PlatformAnalytics>;

export const LOG_LEVELS = ["info", "warning", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
};

export type SystemLog = {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export const systemLogsQuerySchema = z.object({
  level: z.enum(LOG_LEVELS).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type SystemLogsQuery = z.output<typeof systemLogsQuerySchema>;

export type SystemLogListResponse = ApiSuccessResponse<{ logs: SystemLog[] }>;
