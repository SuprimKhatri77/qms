import type { Request, Response } from "express";
import type { AdminShopListResponse, ApiErrorResponse } from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { listShops } from "@/services/admin/list-shops.service";

export async function listShopsController(
  req: Request,
  res: Response<AdminShopListResponse | ApiErrorResponse>,
) {
  const result = await listShops();

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
