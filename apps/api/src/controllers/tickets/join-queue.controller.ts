import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  JoinQueueRequest,
  JoinQueueResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { joinQueue } from "@/services/tickets/join-queue.service";

export async function joinQueueController(
  req: Request<{ slug: string }, {}, JoinQueueRequest>,
  res: Response<JoinQueueResponse | ApiErrorResponse>,
) {
  const result = await joinQueue(req.params.slug, req.body);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
