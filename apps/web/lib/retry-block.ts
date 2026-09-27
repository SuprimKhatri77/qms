// The pure parts of a rate-limit block, kept apart from the React hook
// (hooks/use-retry-countdown.ts) so they can be unit-tested with plain
// numbers instead of a real clock.

// A block the API gave us: when it ends, and who it's for. `subject` is the
// email (or ticket token) that was blocked. Another email may well be
// allowed, so the countdown only applies while the form is on this one.
export type RetryBlock = {
  endsAt: number;
  subject: string;
};

// The same normalising the API does before counting, so "A@x.com" and
// "a@x.com " are treated as one subject here too.
export function normalizeSubject(subject: string): string {
  return subject.trim().toLowerCase();
}

// Whole seconds left until `endsAt`, never below 0. Worked out from the
// clock each time rather than counted down, so it's still right after the
// browser has slowed timers in a background tab.
export function secondsUntil(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

// Reads a saved block back from storage. The stored text could be anything
// (edited by hand, left by an older version), so it's checked field by field
// and anything unexpected is treated as "no block".
export function parseRetryBlock(saved: string | null): RetryBlock | null {
  if (!saved) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(saved);

    if (
      typeof value === "object" &&
      value !== null &&
      "endsAt" in value &&
      "subject" in value &&
      typeof value.endsAt === "number" &&
      typeof value.subject === "string"
    ) {
      return { endsAt: value.endsAt, subject: value.subject };
    }

    return null;
  } catch {
    return null;
  }
}
