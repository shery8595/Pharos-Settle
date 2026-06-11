import type { NextAction } from "../../shared/abis.js";

export type DealSnapshot = {
  state: number;
  deadline: bigint;
  requiresHybridRelease: boolean;
  deliverySubmittedAt: bigint;
  disputeWindow: bigint;
  payerAttested: boolean;
  canClaim: boolean;
  arbiter?: string;
  rejectionReasonHash?: string;
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function computeNextAction(deal: DealSnapshot, nowSec: number): NextAction {
  if (deal.state === 4 || deal.state === 5) return "done";
  if (deal.state === 3) return "resolve";

  if (deal.state === 0 || deal.state === 1) return "fund";
  if (deal.state !== 2) return "wait";

  if (!deal.requiresHybridRelease) {
    return deal.canClaim ? "claim" : "wait";
  }

  if (deal.payerAttested && deal.canClaim) return "claim";
  if (deal.payerAttested) return "wait";

  if (deal.deliverySubmittedAt === 0n) return "deliver";

  if (deal.canClaim) return "claim";

  const autoReleaseAt = Number(deal.deliverySubmittedAt) + Number(deal.disputeWindow);
  if (nowSec < autoReleaseAt) return "attest";

  if (nowSec > Number(deal.deadline) && deal.deliverySubmittedAt === 0n) return "reclaim";

  return "wait";
}

export function computeReclaimable(deal: DealSnapshot, nowSec: number): boolean {
  if (deal.state === 3 || deal.state === 4 || deal.state === 5) return false;
  if (deal.deliverySubmittedAt > 0n) return false;
  return nowSec > Number(deal.deadline);
}

export function computeRejectEligible(deal: DealSnapshot, nowSec: number): boolean {
  if (deal.state !== 2) return false;
  if (!deal.requiresHybridRelease) return false;
  if (deal.deliverySubmittedAt === 0n) return false;
  if (deal.payerAttested) return false;
  if (nowSec > Number(deal.deadline)) return false;
  const autoReleaseAt = Number(deal.deliverySubmittedAt) + Number(deal.disputeWindow);
  return nowSec < autoReleaseAt;
}

export function computeResolveEligible(deal: DealSnapshot): boolean {
  return deal.state === 3;
}

export function hasArbiter(deal: DealSnapshot): boolean {
  const a = deal.arbiter?.toLowerCase();
  return Boolean(a && a !== ZERO_ADDR);
}
