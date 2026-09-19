import { randomBytes } from "node:crypto";

const MAX_BASE_LENGTH = 40;

/**
 * Turns a shop name into a URL-safe slug: "Ram's Café & Salon" -> "rams-cafe-salon".
 * Falls back to "shop" when nothing usable is left (e.g. a name in another script).
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accent marks: é -> e
    .toLowerCase()
    .replace(/['’]/g, "") // "ram's" -> "rams", not "ram-s"
    .replace(/[^a-z0-9]+/g, "-") // anything else becomes a single hyphen
    .replace(/^-+|-+$/g, "") // no leading/trailing hyphens
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/, ""); // slicing may have left a trailing hyphen

  return slug || "shop";
}

/** Used when the plain slug is already taken: "rams-salon" -> "rams-salon-a3f9c1". */
export function withRandomSuffix(slug: string): string {
  return `${slug}-${randomBytes(3).toString("hex")}`;
}
