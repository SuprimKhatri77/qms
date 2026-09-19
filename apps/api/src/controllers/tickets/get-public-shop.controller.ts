import type { Request, Response } from "express";
import type { ApiErrorResponse } from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import {
  getPublicShop,
  type GetPublicShopResponse,
} from "@/services/tickets/get-public-shop.service";

export async function getPublicShopController(
  req: Request<{ slug: string }>,
  res: Response<GetPublicShopResponse | ApiErrorResponse>,
) {
  const result = await getPublicShop(req.params.slug);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
