import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  CreateShopRequest,
  CreateShopResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { createShop } from "@/services/shops/create-shop.service";

export async function createShopController(
  req: Request<{}, {}, CreateShopRequest>,
  res: Response<CreateShopResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await createShop(req.user.id, req.body);

  if (!result.success) {
    const status =
      result.code === ErrorCode.DUPLICATE_ENTRY
        ? 409
        : result.code === ErrorCode.INTERNAL_SERVER_ERROR
          ? 500
          : 400;

    return res.status(status).json(result);
  }

  return res.status(201).json(result);
}
