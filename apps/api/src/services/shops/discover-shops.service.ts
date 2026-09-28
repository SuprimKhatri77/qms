import { and, asc, between, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import type {
  ApiErrorResponse,
  DiscoverShopsQuery,
  DiscoverShopsResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { boundingBox, EARTH_RADIUS_KM } from "@/lib/geo";
import { logEvent } from "@/lib/system-logs/log-event";

// Enough for one screen of results; the filters narrow it further.
const MAX_RESULTS = 50;

// The shop's own "today" (its timezone, not the server's), the same day
// getShopLocalDate works out in JS.
//
// The subqueries below refer to the outer shop row by its full name,
// "shops"."id". Drizzle writes a single-table query's columns without the
// table name, so ${shops.id} would come out as a bare "id" and clash with
// the subquery's own q.id.
const shopToday = sql`(now() AT TIME ZONE "shops"."timezone")::date`;

// Today's queue is only read here, never created: listing shops must not
// write to the database. A shop nobody has used today has no queue row yet,
// and a new queue always starts open with nobody waiting.
const queueOpenToday = sql<boolean>`coalesce((
  select q.status = 'active' from queues q
  where q.shop_id = "shops"."id" and q.date = ${shopToday}
), true)`;

const waitingCountToday = sql<number>`(
  select count(*) from tickets t
  join queues q on q.id = t.queue_id
  where q.shop_id = "shops"."id" and q.date = ${shopToday} and t.status = 'waiting'
)`.mapWith(Number);

/**
 * Straight-line distance in km from (lat, lng) to each shop, using the
 * Haversine formula: the standard way to measure distance over a sphere
 * from two latitude/longitude pairs.
 */
function distanceKmFrom(lat: number, lng: number): SQL<number> {
  return sql<number>`${EARTH_RADIUS_KM} * 2 * asin(sqrt(
    power(sin(radians(${shops.lat} - ${lat}::double precision) / 2), 2) +
    cos(radians(${lat}::double precision)) * cos(radians(${shops.lat})) *
    power(sin(radians(${shops.lng} - ${lng}::double precision) / 2), 2)
  ))`.mapWith(Number);
}

/**
 * The public shop list behind /explore: filter by city and category, or by
 * "near me". Suspended shops never appear.
 *
 * Near me works in two steps, so the trigonometry only runs on shops that
 * could possibly be close enough:
 *  1. a bounding box around the point (plain BETWEEN comparisons),
 *  2. the exact Haversine distance on what's left: keep those within the
 *     radius, nearest first.
 */
export async function discoverShops(
  query: DiscoverShopsQuery,
): Promise<DiscoverShopsResponse | ApiErrorResponse> {
  try {
    const conditions: SQL[] = [eq(shops.status, "active")];

    if (query.city) {
      conditions.push(sql`lower(${shops.city}) = lower(${query.city})`);
    }
    if (query.category) {
      conditions.push(eq(shops.category, query.category));
    }

    let distanceKm: SQL<number> | null = null;

    if (query.lat !== undefined && query.lng !== undefined) {
      const box = boundingBox(query.lat, query.lng, query.radiusKm);
      distanceKm = distanceKmFrom(query.lat, query.lng);

      conditions.push(
        isNotNull(shops.lat),
        isNotNull(shops.lng),
        between(shops.lat, box.minLat, box.maxLat),
        between(shops.lng, box.minLng, box.maxLng),
        sql`${distanceKm} <= ${query.radiusKm}`,
      );
    }

    const rows = await db
      .select({
        id: shops.id,
        name: shops.name,
        slug: shops.slug,
        category: shops.category,
        city: shops.city,
        area: shops.area,
        lat: shops.lat,
        lng: shops.lng,
        distanceKm: distanceKm ?? sql<null>`null`,
        queueOpen: queueOpenToday,
        waitingCount: waitingCountToday,
      })
      .from(shops)
      .where(and(...conditions))
      .orderBy(distanceKm ? asc(distanceKm) : asc(shops.name))
      .limit(MAX_RESULTS);

    // One entry per city, however it was capitalised when shops typed it
    // in (the city filter is case-insensitive anyway).
    const cityRows = await db
      .select({ city: sql<string>`min(${shops.city})` })
      .from(shops)
      .where(eq(shops.status, "active"))
      .groupBy(sql`lower(${shops.city})`)
      .orderBy(sql`lower(${shops.city})`);

    return {
      success: true,
      message: "Shops retrieved successfully",
      data: {
        shops: rows,
        cities: cityRows.map((row) => row.city),
      },
    };
  } catch (error) {
    console.error("discoverShops failed:", error);
    logEvent(
      "error",
      "discover-shops",
      "discoverShops threw an unexpected error",
      { query, error: String(error) },
    );
    return {
      success: false,
      message: "Failed to load shops",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
