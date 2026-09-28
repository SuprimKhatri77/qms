import type { TicketStatus } from "@repo/types";

// A ticket's position is never stored. It's worked out fresh on every read
// from how many people are still waiting in front of it (see
// count-waiting-ahead.ts), so tickets that expired, were cancelled or were
// never confirmed don't count as people.
//
//   serving  -> 0  (it's this ticket's turn)
//   waiting  -> 1 + people waiting ahead (1 = "you're next")
//   anything else -> null (not in line, so no position)
//
// "Call next" never touches this: it stays one UPDATE of the queue's counter.
export function positionFor(
  status: TicketStatus,
  waitingAhead: number,
): number | null {
  if (status === "serving") {
    return 0;
  }
  if (status === "waiting") {
    return waitingAhead + 1;
  }
  return null;
}

// A rough estimate only: it assumes every ticket ahead takes the shop's
// average service time and ignores no-shows finishing early.
export function deriveEtaMinutes(
  position: number,
  avgServiceMinutes: number,
): number {
  return position * avgServiceMinutes;
}
