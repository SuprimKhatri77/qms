import type { OpeningHoursStatus } from "@repo/types";

// A shop's "today" is its own calendar day, not the server's (UTC) day.
// Otherwise a queue in Kathmandu (UTC+5:45) would roll over at 5:45am local time.
export function getShopLocalDate(timezone: string, now = new Date()): string {
  // The "en-CA" locale formats dates as YYYY-MM-DD, which is what the
  // queues.date column stores.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Moves a "YYYY-MM-DD" date forward or backward by whole days.
export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

// The shop's own wall-clock time as "HH:MM" (24-hour), e.g. "19:05".
export function getShopLocalTime(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

// True once the shop's local time has reached its closing time. "HH:MM"
// strings compare correctly as text ("09:30" < "19:00"). No closing time
// means the queue only ends at midnight, which the new day handles.
export function isPastClosingTime(
  closingTime: string | null,
  timezone: string,
  now = new Date(),
): boolean {
  if (!closingTime) {
    return false;
  }
  return getShopLocalTime(timezone, now) >= closingTime.slice(0, 5);
}

// True until the shop's local time reaches its opening time. No opening
// time means customers can join from midnight.
export function isBeforeOpeningTime(
  openingTime: string | null,
  timezone: string,
  now = new Date(),
): boolean {
  if (!openingTime) {
    return false;
  }
  return getShopLocalTime(timezone, now) < openingTime.slice(0, 5);
}

// Where the shop's local time is right now relative to its opening hours.
// The one place this is decided: joining, the join page, /explore and the
// owner's dashboard all ask here, so they can never disagree.
export function getOpeningHoursStatus(
  shop: {
    openingTime: string | null;
    closingTime: string | null;
    timezone: string;
  },
  now = new Date(),
): OpeningHoursStatus {
  if (isBeforeOpeningTime(shop.openingTime, shop.timezone, now)) {
    return "before_opening";
  }
  if (isPastClosingTime(shop.closingTime, shop.timezone, now)) {
    return "after_closing";
  }
  return "open";
}
