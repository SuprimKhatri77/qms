import type { Request, Response } from "express";
import type { ApiErrorResponse, GetMyShopResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { getMyShop } from "@/services/shops/get-my-shop.service";

export async function getMyShopController(
  req: Request,
  res: Response<GetMyShopResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await getMyShop(req.user.id);

  return res.status(result.success ? 200 : 500).json(result);
}
