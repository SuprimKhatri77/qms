import type { Request, Response } from "express";
import { analyticsQuerySchema } from "@repo/types";
import type { AnalyticsResponse, ApiErrorResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { parseQuery } from "@/lib/validation";
import { getAnalytics } from "@/services/analytics/get-analytics.service";

export async function getAnalyticsController(
  req: Request,
  res: Response<AnalyticsResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const query = parseQuery(analyticsQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await getAnalytics(req.user.id, query.data.days);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
