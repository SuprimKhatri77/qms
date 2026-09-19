import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type {
  AnalyticsDay,
  AnalyticsHour,
  AnalyticsResponse,
  ApiErrorResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { addDays, getShopLocalDate } from "@/services/queue/local-date";
import {
  enteredQueue,
  toAvgMinutes,
  waitSeconds,
} from "@/services/queue/ticket-sql";

export async function getAnalytics(
  ownerId: string,
  days: number,
): Promise<AnalyticsResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    if (!shop) {
      return {
        success: false,
        message: "Set up your shop first",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // The range ends today (shop-local) and covers `days` days including today.
    const to = getShopLocalDate(shop.timezone);
    const from = addDays(to, -(days - 1));

    // Only this shop's tickets, inside the date range.
    const inRange = and(
      eq(queues.shopId, shop.id),
      gte(queues.date, from),
      lte(queues.date, to),
    );

    // 1) Counts per day
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

    // 2) Average wait across the whole range
    const [waitRow] = await db
      .select({ avgSeconds: sql<string | null>`avg(${waitSeconds})` })
      .from(tickets)
      .innerJoin(queues, eq(tickets.queueId, queues.id))
      .where(and(inRange, isNotNull(tickets.calledAt)));

    // 3) When customers arrive: their join time converted to the shop's local
    // hour. created_at is stored as UTC, so tell Postgres that first, then
    // convert to the shop's timezone. GROUP BY 1 means "the first selected column".
    const hourlyRows = await db
      .select({
        hour: sql<number>`extract(hour from ((${tickets.createdAt} at time zone 'UTC') at time zone ${shop.timezone}))`.mapWith(
          Number,
        ),
        customers: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tickets)
      .innerJoin(queues, eq(tickets.queueId, queues.id))
      .where(and(inRange, enteredQueue))
      .groupBy(sql`1`);

    // Fill in days and hours with no tickets, so charts have no gaps.
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
      message: "Analytics retrieved successfully",
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
        },
        daily,
        hourly,
      },
    };
  } catch (error) {
    console.error("getAnalytics failed:", error);
    return {
      success: false,
      message: "Failed to retrieve analytics",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
