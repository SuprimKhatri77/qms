import { z } from "zod";
import type { ApiSuccessResponse } from "../base";

// Must stay in sync with `shopCategoryEnum` in apps/api/src/db/schemas/enums.ts.
// If a value here is missing from the DB enum, the API's type-check fails.
export const SHOP_CATEGORIES = [
  "barber",
  "clinic",
  "bank",
  "govt_office",
  "restaurant",
  "repair_shop",
  "other",
] as const;

export const shopCategorySchema = z.enum(SHOP_CATEGORIES, {
  error: "Please choose a category",
});

export type ShopCategory = z.infer<typeof shopCategorySchema>;

// Labels shown in the onboarding form's category dropdown.
export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  barber: "Barbershop / salon",
  clinic: "Clinic",
  bank: "Bank",
  govt_office: "Government office",
  restaurant: "Restaurant",
  repair_shop: "Repair shop",
  other: "Other",
};

// Reused by email/phone/address below: all three are optional free text, and an
// empty input means "not provided" rather than a value to save.
function optionalTrimmedString(maxLength: number, fieldLabel: string) {
  return z
    .string()
    .trim()
    .max(maxLength, {
      error: `${fieldLabel} must be at most ${maxLength} characters`,
    })
    .transform((value) => (value === "" ? undefined : value))
    .optional();
}

export const createShopSchema = z
  .object({
    name: z
      .string({ error: "Shop name is required" })
      .trim()
      .min(2, { error: "Shop name must be at least 2 characters" })
      .max(60, { error: "Shop name must be at most 60 characters" }),
    category: shopCategorySchema,
    city: z
      .string({ error: "City is required" })
      .trim()
      .min(2, { error: "City must be at least 2 characters" })
      .max(60, { error: "City must be at most 60 characters" }),
    // Optional neighbourhood. An empty input is treated as "not provided".
    area: z
      .string()
      .trim()
      .max(60, { error: "Area must be at most 60 characters" })
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    // Street address, shown alongside the map pin on the (future) landing page.
    address: optionalTrimmedString(120, "Address"),
    // Contact details for customers, also shown on the map pin later.
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: "Email must be at most 254 characters" })
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        error: "Enter a valid email address",
      })
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    phone: optionalTrimmedString(20, "Phone number"),
    // Where the owner pinned their shop on the map. Both come together or not
    // at all — a lone lat or lng is meaningless — enforced by the refine below.
    lat: z
      .number({ error: "Latitude must be a number" })
      .min(-90, { error: "Latitude must be between -90 and 90" })
      .max(90, { error: "Latitude must be between -90 and 90" })
      .optional(),
    lng: z
      .number({ error: "Longitude must be a number" })
      .min(-180, { error: "Longitude must be between -180 and 180" })
      .max(180, { error: "Longitude must be between -180 and 180" })
      .optional(),
    // Used to estimate wait time: position × avgServiceMinutes.
    avgServiceMinutes: z
      .number({ error: "Average service time must be a number" })
      .int({ error: "Average service time must be a whole number" })
      .min(1, { error: "Average service time must be at least 1 minute" })
      .max(180, { error: "Average service time must be at most 180 minutes" }),
    // How long after opening a day's queue stays open before it auto-closes.
    queueExpiryHours: z
      .number({ error: "Queue expiry must be a number" })
      .int({ error: "Queue expiry must be a whole number" })
      .min(1, { error: "Queue expiry must be at least 1 hour" })
      .max(48, { error: "Queue expiry must be at most 48 hours" }),
  })
  .refine((data) => (data.lat === undefined) === (data.lng === undefined), {
    error: "Pick a location on the map, or leave it blank",
    path: ["lat"],
  });

export type CreateShopRequest = z.infer<typeof createShopSchema>;

// The settings page edits the same fields onboarding collects, and sends all of
// them every time (a full replace). The slug is never changed: the shop's public
// link may already be printed on a QR code.
export const updateShopSchema = createShopSchema;

export type UpdateShopRequest = z.infer<typeof updateShopSchema>;

// What the onboarding form holds while the owner is typing. Numbers come from
// <input> elements, so they are kept as numbers in the form state too.
export type CreateShopFormValues = z.input<typeof createShopSchema>;

export type Shop = {
  id: string;
  name: string;
  slug: string;
  category: ShopCategory;
  city: string;
  area: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string;
  avgServiceMinutes: number;
  queueExpiryHours: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateShopResponse = ApiSuccessResponse<{ shop: Shop }>;

export type UpdateShopResponse = ApiSuccessResponse<{ shop: Shop }>;

// `shop` is null while the owner hasn't finished onboarding yet.
export type GetMyShopResponse = ApiSuccessResponse<{ shop: Shop | null }>;
