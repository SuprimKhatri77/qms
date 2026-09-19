import type { Request, Response } from "express";
import { ErrorCode, historyDateParamSchema } from "@repo/types";
import type { ApiErrorResponse, HistoryDayResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { getHistoryDay } from "@/services/history/get-history-day.service";

export async function getHistoryDayController(
  req: Request<{ date: string }>,
  res: Response<HistoryDayResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const date = historyDateParamSchema.safeParse(req.params.date);

  if (!date.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid date, use the format YYYY-MM-DD",
      code: ErrorCode.INVALID_REQUEST_PARAMS,
    });
  }

  const result = await getHistoryDay(req.user.id, date.data);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
