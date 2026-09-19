import type { Request, Response } from "express";
import { systemLogsQuerySchema } from "@repo/types";
import type { ApiErrorResponse, SystemLogListResponse } from "@repo/types";
import { parseQuery } from "@/lib/validation";
import { statusForErrorCode } from "@/lib/http-status";
import { listSystemLogs } from "@/services/admin/list-system-logs.service";

export async function listSystemLogsController(
  req: Request,
  res: Response<SystemLogListResponse | ApiErrorResponse>,
) {
  const query = parseQuery(systemLogsQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await listSystemLogs(query.data.level, query.data.limit);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
