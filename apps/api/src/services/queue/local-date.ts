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
