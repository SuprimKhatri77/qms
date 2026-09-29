import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  JoinQueueRequest,
  JoinQueueResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import {
  DEVICE_COOKIE_NAME,
  deviceCookieOptions,
  newDeviceToken,
  readDeviceToken,
} from "@/lib/device-token";
import { joinQueue } from "@/services/tickets/join-queue.service";

export async function joinQueueController(
  req: Request<{ slug: string }, {}, JoinQueueRequest>,
  res: Response<JoinQueueResponse | ApiErrorResponse>,
) {
  // A missing or malformed cookie gets a brand-new token. The service will
  // find no tickets for it yet, which is right: a first visit is never
  // capped. But the ticket is still stored under it, so if the browser
  // keeps the cookie, this ticket counts toward its next joins.
  const deviceToken = readDeviceToken(req.headers.cookie) ?? newDeviceToken();

  // Always (re)set the cookie: a first-time visitor gets one to bring back
  // next time, and a returning one gets its expiry pushed out another year.
  res.cookie(DEVICE_COOKIE_NAME, deviceToken, deviceCookieOptions);

  const result = await joinQueue(req.params.slug, req.body, deviceToken);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
