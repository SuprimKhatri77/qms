import { useEffect, useState, useSyncExternalStore } from "react";
import {
  normalizeSubject,
  parseRetryBlock,
  secondsUntil,
} from "@/lib/retry-block";
import {
  getSavedBlockText,
  setSavedBlockText,
  subscribeToSavedBlocks,
} from "@/lib/retry-block-store";

// Tracks a rate-limit block for one form and counts it down to zero.
//
// - start(seconds, subject): the API just said "blocked for N seconds";
//   `subject` is the email (or token) it was about.
// - secondsLeftFor(subject): how long is left if the form is still on the
//   blocked subject, otherwise 0. Another email may be allowed, so the form
//   lets the user try it and the server decides.
//
// The block is saved under `storageKey`, so reloading the page picks the
// countdown back up instead of forgetting it.
export function useRetryCountdown(storageKey: string) {
  // useSyncExternalStore reads the saved block from outside React. The last
  // argument is what the server renders (no block — it has no
  // localStorage), and React switches to the real value right after
  // hydration without a server/browser mismatch.
  const savedText = useSyncExternalStore(
    subscribeToSavedBlocks,
    () => getSavedBlockText(storageKey),
    () => null,
  );
  const block = parseRetryBlock(savedText);
  const endsAt = block?.endsAt ?? null;

  const [now, setNow] = useState(() => Date.now());

  // While blocked, move `now` forward every second so the time left is
  // re-worked out from the clock (never counted down by 1, which would drift
  // in a background tab where the browser slows timers down).
  useEffect(() => {
    if (endsAt === null) {
      return;
    }

    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (secondsUntil(endsAt, currentTime) === 0) {
        setSavedBlockText(storageKey, null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, storageKey]);

  function start(seconds: number, subject: string) {
    const startedAt = Date.now();
    // So the first render after this already shows the full wait, not one
    // worked out from a `now` that's minutes old.
    setNow(startedAt);
    setSavedBlockText(
      storageKey,
      JSON.stringify({
        endsAt: startedAt + seconds * 1000,
        subject: normalizeSubject(subject),
      }),
    );
  }

  function secondsLeftFor(subject: string): number {
    if (block === null || block.subject !== normalizeSubject(subject)) {
      return 0;
    }
    return secondsUntil(block.endsAt, now);
  }

  return { start, secondsLeftFor };
}

// Reads the store directly rather than through a render, for an effect that
// has to decide something straight away (see the verify page).
export function isBlockedNow(storageKey: string, subject: string): boolean {
  const block = parseRetryBlock(getSavedBlockText(storageKey));

  return (
    block !== null &&
    block.subject === normalizeSubject(subject) &&
    secondsUntil(block.endsAt, Date.now()) > 0
  );
}
