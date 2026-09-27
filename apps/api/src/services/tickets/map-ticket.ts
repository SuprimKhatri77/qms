import type { PublicTicket } from "@repo/types";
import type { tickets } from "@/db/schema";
import {
  deriveEtaMinutes,
  positionFor,
} from "@/services/queue/ticket-position";

// Converts a ticket row into what the customer's own status page shows.
// `waitingAhead` comes from countWaitingAhead, and `avgServiceMinutes` from
// the shop (tickets don't carry it). Kept free of database calls, so it's a
// plain mapping.
export function toPublicTicket(
  ticket: typeof tickets.$inferSelect,
  waitingAhead: number,
  avgServiceMinutes: number,
): PublicTicket {
  const position = positionFor(ticket.status, waitingAhead);

  return {
    id: ticket.id,
    tokenNumber: ticket.tokenNumber,
    customerName: ticket.customerName,
    status: ticket.status,
    position,
    etaMinutes:
      position === null ? null : deriveEtaMinutes(position, avgServiceMinutes),
    createdAt: ticket.createdAt.toISOString(),
  };
}
