import type { Request, Response } from "express";
import { adminShopsQuerySchema } from "@repo/types";
import type { AdminShopListResponse, ApiErrorResponse } from "@repo/types";
import { parseQuery } from "@/lib/validation";
import { statusForErrorCode } from "@/lib/http-status";
import { listShops } from "@/services/admin/list-shops.service";

export async function listShopsController(
  req: Request,
  res: Response<AdminShopListResponse | ApiErrorResponse>,
) {
  const query = parseQuery(adminShopsQuerySchema, req.query);

  if (!query.success) {
    return res.status(400).json(query.error);
  }

  const result = await listShops(query.data.page, query.data.limit);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
