import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  VerifyTicketRequest,
  VerifyTicketResponse,
} from "@repo/types";
import { statusForErrorCode } from "@/lib/http-status";
import { verifyTicket } from "@/services/tickets/verify-ticket.service";

export async function verifyTicketController(
  req: Request<{}, {}, VerifyTicketRequest>,
  res: Response<VerifyTicketResponse | ApiErrorResponse>,
) {
  const result = await verifyTicket(req.body.token);

  return res
    .status(result.success ? 200 : statusForErrorCode(result.code))
    .json(result);
}
