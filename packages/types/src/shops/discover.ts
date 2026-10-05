import { z } from "zod";
import type { ApiSuccessResponse } from "../base";
import {
  shopCategorySchema,
  type OpeningHoursStatus,
  type ShopCategory,
} from "./shop";

// Query-string values arrive as text, and an empty one ("?city=") means
// "not given" rather than "the empty string" (or, for numbers, 0).
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const DEFAULT_DISCOVERY_RADIUS_KM = 10;

// GET /public/shops: every filter is optional. lat/lng switch on "near me".
export const discoverShopsQuerySchema = z
  .object({
    city: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(60, { error: "City must be at most 60 characters" })
        .optional(),
    ),
    category: z.preprocess(emptyToUndefined, shopCategorySchema.optional()),
    lat: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "lat must be a number" })
        .min(-90, { error: "lat must be between -90 and 90" })
        .max(90, { error: "lat must be between -90 and 90" })
        .optional(),
    ),
    lng: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "lng must be a number" })
        .min(-180, { error: "lng must be between -180 and 180" })
        .max(180, { error: "lng must be between -180 and 180" })
        .optional(),
    ),
    radiusKm: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "radiusKm must be a number" })
        .min(1, { error: "radiusKm must be at least 1" })
        .max(50, { error: "radiusKm must be at most 50" })
        .default(DEFAULT_DISCOVERY_RADIUS_KM),
    ),
  })
  // A location is a pair: half of one can't be searched around.
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), {
    error: "Send lat and lng together, or neither",
    path: ["lat"],
  });

export type DiscoverShopsQuery = z.output<typeof discoverShopsQuerySchema>;

// One shop in the public discovery list. Only what a customer choosing a
// shop needs: no owner, contact or queue-config fields.
export type DiscoveredShop = {
  id: string;
  name: string;
  slug: string;
  category: ShopCategory;
  city: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  // Straight-line distance from the searched location; null without one.
  distanceKm: number | null;
  // Today's queue, read without creating it: open unless the owner (or the
  // expiry sweep) closed it, and how many verified customers are waiting.
  queueOpen: boolean;
  waitingCount: number;
  // Whether it's within the shop's hours right now, and when it opens, so
  // the card can say "Opens at 09:00".
  hoursStatus: OpeningHoursStatus;
  openingTime: string | null;
};

export type DiscoverShopsResponse = ApiSuccessResponse<{
  shops: DiscoveredShop[];
  // Every city with at least one active shop, for the filter dropdown.
  cities: string[];
}>;
