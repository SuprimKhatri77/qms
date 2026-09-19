import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type {
  ApiErrorResponse,
  HistoryQuery,
  HistoryResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import {
  enteredQueue,
  toAvgMinutes,
  waitSeconds,
} from "@/services/queue/ticket-sql";

// One row per past day that had at least one ticket, newest first.
export async function getHistory(
  ownerId: string,
  query: HistoryQuery,
): Promise<HistoryResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    if (!shop) {
      return {
        success: false,
        message: "Set up your shop first",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Days the owner only looked at (a queue is created just by opening the
    // dashboard) have no tickets and would be noise, so they are left out.
    const matchingQueues = and(
      eq(queues.shopId, shop.id),
      sql`exists (select 1 from tickets where tickets.queue_id = ${queues.id})`,
      query.from ? gte(queues.date, query.from) : undefined,
      query.to ? lte(queues.date, query.to) : undefined,
    );

    const [totalRow] = await db
      .select({ total: count() })
      .from(queues)
      .where(matchingQueues);

    const total = totalRow?.total ?? 0;
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        queueId: queues.id,
        date: queues.date,
        status: queues.status,
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
        avgSeconds: sql<
          string | null
        >`avg(${waitSeconds}) filter (where ${tickets.calledAt} is not null)`,
      })
      .from(queues)
      .innerJoin(tickets, eq(tickets.queueId, queues.id))
      .where(matchingQueues)
      .groupBy(queues.id)
      .orderBy(desc(queues.date))
      .limit(query.limit)
      .offset(offset);

    return {
      success: true,
      message: "History retrieved successfully",
      data: {
        days: rows.map(({ avgSeconds, ...row }) => ({
          ...row,
          avgWaitMinutes: toAvgMinutes(avgSeconds),
        })),
      },
      meta: {
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        page: query.page,
        limit: query.limit,
        offset,
      },
    };
  } catch (error) {
    console.error("getHistory failed:", error);
    return {
      success: false,
      message: "Failed to retrieve history",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
