import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { queues } from "@/db/schema";
import type { ApiErrorResponse, GetPublicShopResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getShopBySlug } from "@/services/shops/get-shop-by-slug";
import { toApiShop } from "@/services/shops/map-shop";
import { getShopLocalDate } from "@/services/queue/local-date";
import { logEvent } from "@/lib/system-logs/log-event";

// The shop info shown on the public join page ("/s/<slug>"). Same shape the
// owner sees (toApiShop already leaves out ownerId), just reached without a
// session, plus whether today's queue is taking new customers.
export async function getPublicShop(
  slug: string,
): Promise<GetPublicShopResponse | ApiErrorResponse> {
  try {
    const shop = await getShopBySlug(slug);

    if (!shop) {
      return {
        success: false,
        message: "Shop not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Only reads today's queue, never creates it: a page view shouldn't
    // write to the database. No row yet means nobody has joined or opened
    // the dashboard today, and a new queue starts open.
    const [todaysQueue] = await db
      .select({ status: queues.status })
      .from(queues)
      .where(
        and(
          eq(queues.shopId, shop.id),
          eq(queues.date, getShopLocalDate(shop.timezone)),
        ),
      )
      .limit(1);

    return {
      success: true,
      message: "Shop retrieved successfully",
      data: {
        shop: toApiShop(shop),
        queueOpen: !todaysQueue || todaysQueue.status === "active",
      },
    };
  } catch (error) {
    console.error("getPublicShop failed:", error);
    logEvent(
      "error",
      "get-public-shop",
      "getPublicShop threw an unexpected error",
      { slug, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to retrieve shop",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
