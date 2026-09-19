import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets } from "@/db/schema";
import type {
  AnalyticsDay,
  AnalyticsHour,
  ApiErrorResponse,
  PlatformAnalyticsResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";
import { addDays, getShopLocalDate } from "@/services/queue/local-date";
import {
  enteredQueue,
  toAvgMinutes,
  waitSeconds,
} from "@/services/queue/ticket-sql";

// Shops can each have their own timezone; there's no single "today" across
// all of them. Days and hours here are bucketed against this one reference
// timezone instead, the same default new shops get, rather than the
// server's UTC day. A known simplification for a platform-wide view.
const REFERENCE_TIMEZONE = "Asia/Kathmandu";

export async function getPlatformAnalytics(
  days: number,
): Promise<PlatformAnalyticsResponse | ApiErrorResponse> {
  try {
    const to = getShopLocalDate(REFERENCE_TIMEZONE);
    const from = addDays(to, -(days - 1));

    const inRange = and(gte(queues.date, from), lte(queues.date, to));

    const dailyRows = await db
      .select({
        date: queues.date,
        customers: sql<number>`count(*) filter (where ${enteredQueue})`.mapWith(
          Number,
        ),
        served:
          sql<number>`count(*) filter (where ${tickets.status} = 'done')`.mapWith(
            Number,
          ),
        noShows:
          sql<number>`count(*) filter (where ${tickets.status} = 'no_show')`.mapWith(
            Number,
          ),
      })
      .from(tickets)
      .innerJoin(queues, eq(tickets.queueId, queues.id))
      .where(inRange)
      .groupBy(queues.date);

    const [waitRow] = await db
      .select({ avgSeconds: sql<string | null>`avg(${waitSeconds})` })
      .from(tickets)
      .innerJoin(queues, eq(tickets.queueId, queues.id))
      .where(and(inRange, isNotNull(tickets.calledAt)));

    const hourlyRows = await db
      .select({
        hour: sql<number>`extract(hour from ((${tickets.createdAt} at time zone 'UTC') at time zone ${REFERENCE_TIMEZONE}))`.mapWith(
          Number,
        ),
        customers: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tickets)
      .innerJoin(queues, eq(tickets.queueId, queues.id))
      .where(and(inRange, enteredQueue))
      .groupBy(sql`1`);

    const [shopCounts] = await db
      .select({
        totalShops: sql<number>`count(*)`.mapWith(Number),
        activeShops:
          sql<number>`count(*) filter (where ${shops.status} = 'active')`.mapWith(
            Number,
          ),
      })
      .from(shops);

    const daily: AnalyticsDay[] = [];
    for (let offset = 0; offset < days; offset++) {
      const date = addDays(from, offset);
      const row = dailyRows.find((r) => r.date === date);
      daily.push({
        date,
        customers: row?.customers ?? 0,
        served: row?.served ?? 0,
        noShows: row?.noShows ?? 0,
      });
    }

    const hourly: AnalyticsHour[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      customers: hourlyRows.find((r) => r.hour === hour)?.customers ?? 0,
    }));

    const customers = daily.reduce((sum, day) => sum + day.customers, 0);
    const served = daily.reduce((sum, day) => sum + day.served, 0);
    const noShows = daily.reduce((sum, day) => sum + day.noShows, 0);

    return {
      success: true,
      message: "Platform analytics retrieved successfully",
      data: {
        days,
        from,
        to,
        summary: {
          customers,
          served,
          noShows,
          noShowRate:
            served + noShows === 0 ? null : noShows / (served + noShows),
          avgWaitMinutes: toAvgMinutes(waitRow?.avgSeconds ?? null),
          totalShops: shopCounts?.totalShops ?? 0,
          activeShops: shopCounts?.activeShops ?? 0,
        },
        daily,
        hourly,
      },
    };
  } catch (error) {
    console.error("getPlatformAnalytics failed:", error);
    logEvent(
      "error",
      "admin-platform-analytics",
      "getPlatformAnalytics threw an unexpected error",
      { error: String(error) },
    );
    return {
      success: false,
      message: "Failed to retrieve platform analytics",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
