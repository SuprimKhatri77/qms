import type { Response } from "express";
import type {
  ApiErrorResponse,
  QueueSnapshotResponse,
  UpdateQueueStatusRequest,
} from "@repo/types";
import { assertAuthenticated, type RequestWithBody } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import { setQueueStatus } from "@/services/queue/set-queue-status.service";

export async function setQueueStatusController(
  req: RequestWithBody<UpdateQueueStatusRequest>,
  res: Response<QueueSnapshotResponse | ApiErrorResponse>,
) {
  assertAuthenticated(req);

  const result = await setQueueStatus(req.user.id, req.body.status);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
