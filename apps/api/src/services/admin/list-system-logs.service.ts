import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { systemLogs } from "@/db/schema";
import type {
  ApiErrorResponse,
  LogLevel,
  SystemLogListResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";

export async function listSystemLogs(
  level: LogLevel | undefined,
  page: number,
  limit: number,
): Promise<SystemLogListResponse | ApiErrorResponse> {
  try {
    const matchingLevel = level ? eq(systemLogs.level, level) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(systemLogs)
      .where(matchingLevel);
    const total = totalRow?.total ?? 0;
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(systemLogs)
      .where(matchingLevel)
      .orderBy(desc(systemLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      message: "Logs retrieved successfully",
      data: {
        logs: rows.map((row) => ({
          id: row.id,
          level: row.level,
          source: row.source,
          message: row.message,
          meta: row.meta as Record<string, unknown> | null,
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
    // Deliberately not logged via logEvent: a failure to read the logs table
    // logging itself would just be a second row nobody can see either.
    console.error("listSystemLogs failed:", error);
    return {
      success: false,
      message: "Failed to retrieve logs",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
