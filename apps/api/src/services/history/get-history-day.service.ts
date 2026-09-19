import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues, tickets } from "@/db/schema";
import type { ApiErrorResponse, HistoryDayResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { toQueueTicket } from "@/services/queue/queue-snapshot";

// Every ticket of one past day, in token order.
export async function getHistoryDay(
  ownerId: string,
  date: string,
): Promise<HistoryDayResponse | ApiErrorResponse> {
  try {
    const shop = await getOwnerShop(ownerId);

    if (!shop) {
      return {
        success: false,
        message: "Set up your shop first",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Looking up by (shop, date) also enforces tenant isolation: another
    // shop's queue for the same date is never matched.
    const [queue] = await db
      .select()
      .from(queues)
      .where(and(eq(queues.shopId, shop.id), eq(queues.date, date)))
      .limit(1);

    if (!queue) {
      return {
        success: false,
        message: "No queue found for that day",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const dayTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.queueId, queue.id))
      .orderBy(asc(tickets.tokenNumber));

    return {
      success: true,
      message: "Day retrieved successfully",
      data: {
        queue: {
          id: queue.id,
          date: queue.date,
          status: queue.status,
          currentServingNumber: queue.currentServingNumber,
        },
        tickets: dayTickets.map(toQueueTicket),
      },
    };
  } catch (error) {
    console.error("getHistoryDay failed:", error);
    return {
      success: false,
      message: "Failed to retrieve day",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
