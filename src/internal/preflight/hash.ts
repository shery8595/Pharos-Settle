import { keccak256, toBytes } from "viem";
import type { TrustedSettlementInput, CheckResult } from "../../shared/schemas.js";

/** Canonical JSON: sorted object keys at every level; array order preserved. */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(",")}}`;
}

export function computePreflightHash(input: TrustedSettlementInput, checks: CheckResult[]): string {
  const sortedChecks = [...checks]
    .map((c) => ({ name: c.name, passed: c.passed }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const payload = canonicalJsonStringify({
    agentA: input.agentA.toLowerCase(),
    agentB: input.agentB.toLowerCase(),
    token: input.token.toLowerCase(),
    amount: input.amount,
    workDescription: input.workDescription,
    checks: sortedChecks,
  });
  return keccak256(toBytes(payload));
}

/** Off-chain audit: compare on-chain `preflightHash` to a re-run of preflight checks. */
export function verifyPreflightHash(
  onChainHash: string,
  input: TrustedSettlementInput,
  checks: CheckResult[]
): boolean {
  return computePreflightHash(input, checks).toLowerCase() === onChainHash.toLowerCase();
}
