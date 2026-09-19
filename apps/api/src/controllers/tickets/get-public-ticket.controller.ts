import type { Request, Response } from "express";
import { z } from "zod";
import type { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { ErrorCode } from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { getPublicTicket } from "@/services/tickets/get-public-ticket.service";

export async function getPublicTicketController(
  req: Request<{ ticketId: string }>,
  res: Response<PublicTicketResponse | ApiErrorResponse>,
) {
  const ticketId = z.uuid().safeParse(req.params.ticketId);

  if (!ticketId.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid ticket id",
      code: ErrorCode.INVALID_ID_FORMAT,
    });
  }

  const result = await getPublicTicket(ticketId.data);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
