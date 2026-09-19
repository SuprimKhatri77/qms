import type { Request, Response } from "express";
import { analyticsQuerySchema } from "@repo/types";
import type { ApiErrorResponse, PlatformAnalyticsResponse } from "@repo/types";
import { parseQuery } from "@/lib/validation";
import { statusForErrorCode } from "@/lib/http-status";
import { getPlatformAnalytics } from "@/services/admin/get-platform-analytics.service";

export async function getPlatformAnalyticsController(
  req: Request,
  res: Response<PlatformAnalyticsResponse | ApiErrorResponse>,
) {
  const query = parseQuery(analyticsQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await getPlatformAnalytics(query.data.days);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
