import type { PublicTicket } from "@repo/types";
import type { queues, tickets } from "@/db/schema";
import {
  derivePosition,
  deriveEtaMinutes,
} from "@/services/queue/ticket-position";

// Terminal states: the ticket is no longer moving through the queue, so a
// "turns away" position no longer means anything.
const RESOLVED_STATUSES = new Set(["done", "no_show", "cancelled", "expired"]);

// Converts a ticket row into what the customer's own status page shows.
// `avgServiceMinutes` comes from the shop (tickets/queues don't carry it).
export function toPublicTicket(
  ticket: typeof tickets.$inferSelect,
  queue: typeof queues.$inferSelect,
  avgServiceMinutes: number,
): PublicTicket {
  const showsPosition =
    ticket.status !== "pending_verification" &&
    !RESOLVED_STATUSES.has(ticket.status);

  const position = showsPosition
    ? derivePosition(ticket.tokenNumber, queue.currentServingNumber)
    : null;

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
