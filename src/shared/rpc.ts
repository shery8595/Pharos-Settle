export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isRateLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /cu limit|too fast|rate limit|429/i.test(msg);
}

export function rpcMinIntervalMs(): number {
  const n = Number(process.env.RPC_MIN_INTERVAL_MS ?? 250);
  return Number.isFinite(n) && n >= 0 ? n : 250;
}

/** Process-wide queue so parallel reads do not burst past Atlantic / zan.top CU limits. */
let rpcTail: Promise<void> = Promise.resolve();
let lastRpcAt = 0;

/** Reset queue state (tests). */
export function resetRpcRateLimiter(): void {
  rpcTail = Promise.resolve();
  lastRpcAt = 0;
}

export async function scheduleRpc<T>(fn: () => Promise<T>): Promise<T> {
  const run = rpcTail.then(async () => {
    const gap = rpcMinIntervalMs();
    if (gap > 0) {
      const wait = Math.max(0, gap - (Date.now() - lastRpcAt));
      if (wait > 0) await sleep(wait);
    }
    lastRpcAt = Date.now();
    return fn();
  });
  rpcTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function withRpcRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 6,
  baseDelayMs = Number(process.env.RPC_RETRY_MS ?? 2000)
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRateLimitError(e) || i === attempts - 1) throw e;
      const wait = baseDelayMs * (i + 1);
      console.warn(`[rpc] ${label} rate limited — retry ${i + 2}/${attempts} in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw last;
}
