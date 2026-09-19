import type { Request, Response } from "express";
import { z } from "zod";
import type { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { statusForErrorCode } from "@/lib/http-status";
import {
  resolveTicket,
  type TicketOutcome,
} from "@/services/queue/resolve-ticket.service";

// One controller for both "done" and "no-show": they differ only in the
// outcome, so the route picks which one it wants.
export function resolveTicketController(outcome: TicketOutcome) {
  return async (
    req: Request<{ ticketId: string }>,
    res: Response<QueueSnapshotResponse | ApiErrorResponse>,
  ) => {
    assertAuthenticated(req);

    const ticketId = z.uuid().safeParse(req.params.ticketId);

    if (!ticketId.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket id",
        code: ErrorCode.INVALID_ID_FORMAT,
      });
    }

    const result = await resolveTicket(req.user.id, ticketId.data, outcome);

    return res
      .status(result.success ? 200 : statusForErrorCode(result.code))
      .json(result);
  };
}
