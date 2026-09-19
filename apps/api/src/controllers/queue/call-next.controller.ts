import type { Request, Response } from "express";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { callNext } from "@/services/queue/call-next.service";

export async function callNextController(
  req: Request,
  res: Response<QueueSnapshotResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await callNext(req.user.id);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
