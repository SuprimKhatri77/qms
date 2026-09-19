import type { Request, Response } from "express";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { getShopQueue } from "@/services/queue/get-shop-queue.service";

export async function getShopQueueController(
  req: Request,
  res: Response<QueueSnapshotResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await getShopQueue(req.user.id);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
