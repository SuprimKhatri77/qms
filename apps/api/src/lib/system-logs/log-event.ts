import { db } from "@/db";
import { systemLogs } from "@/db/schema";

type LogLevel = "info" | "warning" | "error";

// Fire-and-forget: logging a failure must never become the reason a request
// also fails. If the write to system_logs itself fails, there's nowhere
// further to report it than the console.
export function logEvent(
  level: LogLevel,
  source: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  db.insert(systemLogs)
    .values({ level, source, message, meta })
    .catch((error) => {
      console.error("logEvent: failed to write system log:", error);
    });
}
