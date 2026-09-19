// Small display helpers shared by the dashboard pages.

export function formatMinutes(minutes: number | null): string {
  return minutes === null ? "—" : `${minutes} min`;
}

// 0.1666 -> "17%"
export function formatPercent(fraction: number | null): string {
  return fraction === null ? "—" : `${Math.round(fraction * 100)}%`;
}

// "2026-09-18" -> "Sep 18". Built from the parts, so the browser's own
// timezone can never shift the day.
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year!, month! - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// "2026-09-18" -> "Friday, September 18, 2026"
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year!, month! - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 9 -> "9 am", 13 -> "1 pm", 0 -> "12 am"
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${suffix}`;
}

// Clock time in the shop's own timezone, e.g. "10:15 AM".
export function formatTime(isoTimestamp: string | null, timeZone: string) {
  if (!isoTimestamp) return "—";

  return new Date(isoTimestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}
