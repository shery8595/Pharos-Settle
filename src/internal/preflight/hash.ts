import { keccak256, toBytes } from "viem";
import type { TrustedSettlementInput, CheckResult } from "../../shared/schemas.js";

export function computePreflightHash(input: TrustedSettlementInput, checks: CheckResult[]): string {
  const payload = JSON.stringify({
    agentA: input.agentA.toLowerCase(),
    agentB: input.agentB.toLowerCase(),
    token: input.token.toLowerCase(),
    amount: input.amount,
    workDescription: input.workDescription,
    checks: checks.map((c) => ({ name: c.name, passed: c.passed })),
  });
  return keccak256(toBytes(payload));
}
