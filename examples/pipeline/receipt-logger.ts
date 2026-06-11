import type { TrustedSettlementOutput } from "../../src/shared/schemas.js";

/** Tiny downstream skill: consumes settlement receipt. */
export function receiptLogger(task: string, receipt: TrustedSettlementOutput): string {
  const tx = receipt.stages.settle?.claimTx ?? receipt.explorerLink ?? "n/a";
  return `logged settlement ${tx} for ${task} task (deal ${receipt.dealId ?? "?"})`;
}
