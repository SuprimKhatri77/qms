// A ticket's position is never stored: it's the gap between its own token and
// the queue's single counter, computed fresh on every read. 0 means it's this
// ticket's turn right now; 1 means next; 2 means two away, and so on.
//
// Shared by the owner dashboard and the customer-facing ticket page, so there
// is exactly one place that does this subtraction.
export function derivePosition(
  tokenNumber: number,
  currentServingNumber: number,
): number {
  return Math.max(0, tokenNumber - currentServingNumber);
}

// A rough estimate only: it assumes every ticket ahead takes the shop's
// average service time and ignores no-shows finishing early.
export function deriveEtaMinutes(
  position: number,
  avgServiceMinutes: number,
): number {
  return position * avgServiceMinutes;
}
