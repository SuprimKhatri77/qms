import type { Response } from "express";
import type {
  ApiErrorResponse,
  UpdateShopStatusRequest,
  UpdateShopStatusResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { updateShopStatus } from "@/services/admin/update-shop-status.service";
import type { RequestWithBody } from "@/types";

export async function updateShopStatusController(
  req: RequestWithBody<UpdateShopStatusRequest, { shopId: string }>,
  res: Response<UpdateShopStatusResponse | ApiErrorResponse>,
) {
  const result = await updateShopStatus(req.params.shopId, req.body.status);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
