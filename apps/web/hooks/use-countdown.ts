import { useEffect, useState } from "react";

// Counts down whole seconds to zero, e.g. after the API says "try again in
// 900 seconds". Call start(seconds) to begin; secondsLeft is 0 when idle.
//
// It remembers the moment the wait ends and works out what's left from the
// clock on every tick, rather than subtracting 1 each second. Browsers slow
// timers down in background tabs, so a subtract-1 counter would drift and
// show more time than is really left; this one is right as soon as the tab
// is looked at again.
export function useCountdown() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (endsAt === null) {
      return;
    }
    const end = endsAt;

    function tick() {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        setEndsAt(null);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  function start(seconds: number) {
    setEndsAt(Date.now() + seconds * 1000);
  }

  return { secondsLeft, start };
}
