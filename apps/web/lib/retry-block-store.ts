// Where rate-limit blocks are kept: in memory for this page, copied to
// localStorage so a reload (or a new tab) can pick the countdown back up.
// Components read it through useSyncExternalStore, React's hook for data
// that lives outside React (see hooks/use-retry-countdown.ts).
//
// The in-memory copy matters when localStorage is unavailable (private
// mode, blocked site data): the countdown still works on this page, it just
// won't survive a reload.

const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();

export function getSavedBlockText(key: string): string | null {
  if (!cache.has(key)) {
    cache.set(key, readStorage(key));
  }
  return cache.get(key) ?? null;
}

// `text` null clears the block.
export function setSavedBlockText(key: string, text: string | null) {
  cache.set(key, text);
  writeStorage(key, text);
  listeners.forEach((listener) => listener());
}

export function subscribeToSavedBlocks(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, text: string | null) {
  try {
    if (text === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, text);
    }
  } catch {
    // Storage unavailable: the in-memory copy above is still updated.
  }
}
