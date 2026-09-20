import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { queues, shops, tickets, users } from "@/db/schema";
import type { AdminShopListResponse, ApiErrorResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { logEvent } from "@/lib/system-logs/log-event";

// A page of shops on the platform, newest first, with its owner and a
// lifetime ticket count — enough for an admin to spot an unused or abusive
// shop without opening each one individually.
export async function listShops(
  page: number,
  limit: number,
): Promise<AdminShopListResponse | ApiErrorResponse> {
  try {
    const [totalRow] = await db.select({ total: count() }).from(shops);
    const total = totalRow?.total ?? 0;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: shops.id,
        name: shops.name,
        slug: shops.slug,
        city: shops.city,
        status: shops.status,
        createdAt: shops.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
        ticketCount: sql<number>`count(${tickets.id})`.mapWith(Number),
      })
      .from(shops)
      .innerJoin(users, eq(users.id, shops.ownerId))
      .leftJoin(queues, eq(queues.shopId, shops.id))
      .leftJoin(tickets, eq(tickets.queueId, queues.id))
      .groupBy(shops.id, users.name, users.email)
      .orderBy(desc(shops.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      message: "Shops retrieved successfully",
      data: {
        shops: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      meta: {
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        page,
        limit,
        offset,
      },
    };
  } catch (error) {
    console.error("listShops failed:", error);
    logEvent(
      "error",
      "admin-list-shops",
      "listShops threw an unexpected error",
      {
        error: String(error),
      },
    );
    return {
      success: false,
      message: "Failed to retrieve shops",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
