import { z } from "zod";
import type { ApiSuccessResponse } from "../base";

// "?days=7|30|90"; anything else is rejected, missing means 30.
export const analyticsQuerySchema = z.object({
  days: z
    .enum(["7", "30", "90"], { error: "days must be 7, 30 or 90" })
    .default("30")
    .transform(Number),
});

export type AnalyticsQuery = z.output<typeof analyticsQuerySchema>;

// A "customer" is someone who actually entered the queue: their ticket was
// verified (unverified tickets never count toward the live queue).
export type AnalyticsSummary = {
  customers: number;
  served: number;
  noShows: number;
  // noShows / (served + noShows), from 0 to 1. null when nobody was resolved yet.
  noShowRate: number | null;
  // Average minutes between joining the queue and being called. null when no data.
  avgWaitMinutes: number | null;
};

export type AnalyticsDay = {
  // Shop-local day, "YYYY-MM-DD"
  date: string;
  customers: number;
  served: number;
  noShows: number;
};

export type AnalyticsHour = {
  // Hour of the day in the shop's timezone, 0-23
  hour: number;
  customers: number;
};

export type Analytics = {
  days: number;
  // First and last day covered, inclusive
  from: string;
  to: string;
  summary: AnalyticsSummary;
  // One entry per day in the range, zero-filled so charts have no gaps
  daily: AnalyticsDay[];
  // Always 24 entries (hours 0-23), zero-filled
  hourly: AnalyticsHour[];
};

export type AnalyticsResponse = ApiSuccessResponse<Analytics>;
