/** Deal TTL from funding — 7 days. */
export const DEFAULT_TTL_SECONDS = 7 * 24 * 3600;

/** Auto-release after delivery — must stay strictly less than TTL (3 days). */
export const DEFAULT_DISPUTE_WINDOW_SECONDS = 3 * 24 * 3600;

export function resolveTtlSeconds(input?: number): number {
  return input ?? DEFAULT_TTL_SECONDS;
}

export function resolveDisputeWindowSeconds(input?: number): number {
  return input ?? DEFAULT_DISPUTE_WINDOW_SECONDS;
}

/** Hybrid ghost-payer auto-claim requires disputeWindow < ttlSeconds on-chain. */
export function assertDisputeWindowLtTtl(
  ttlSeconds: number,
  disputeWindowSeconds: number,
  hybrid: boolean
): void {
  if (hybrid && disputeWindowSeconds >= ttlSeconds) {
    throw new Error("disputeWindowSeconds must be less than ttlSeconds for hybrid deals");
  }
}
