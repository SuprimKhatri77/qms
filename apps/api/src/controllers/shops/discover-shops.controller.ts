import type { Request, Response } from "express";
import { discoverShopsQuerySchema } from "@repo/types";
import type { ApiErrorResponse, DiscoverShopsResponse } from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { parseQuery } from "@/lib/validation";
import { discoverShops } from "@/services/shops/discover-shops.service";

export async function discoverShopsController(
  req: Request,
  res: Response<DiscoverShopsResponse | ApiErrorResponse>,
) {
  const query = parseQuery(discoverShopsQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await discoverShops(query.data);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
