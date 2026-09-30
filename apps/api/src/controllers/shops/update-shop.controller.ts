import type { Response } from "express";
import type {
  ApiErrorResponse,
  UpdateShopRequest,
  UpdateShopResponse,
} from "@repo/types";
import { assertAuthenticated, type RequestWithBody } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { updateShop } from "@/services/shops/update-shop.service";

export async function updateShopController(
  req: RequestWithBody<UpdateShopRequest>,
  res: Response<UpdateShopResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await updateShop(req.user.id, req.body);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
