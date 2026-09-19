import type { Request, Response } from "express";
import { historyQuerySchema } from "@repo/types";
import type { ApiErrorResponse, HistoryResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { parseQuery } from "@/lib/validation";
import { getHistory } from "@/services/history/get-history.service";

export async function getHistoryController(
  req: Request,
  res: Response<HistoryResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const query = parseQuery(historyQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await getHistory(req.user.id, query.data);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
