// Rejects if `promise` hasn't settled within `ms`. Used around Redis calls:
// Bun's client doesn't enforce its own connectionTimeout when the host is
// unreachable (the connect just hangs), and a request must never wait on
// Redis for longer than this.
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
