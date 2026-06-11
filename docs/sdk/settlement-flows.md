# Settlement flows

## Cooperative — legacy fund→claim

Non-hybrid: payee claims immediately after fund.

```typescript
const input = {
  agentA: payerAddress,
  agentB: payeeAddress,
  token: tokenAddress,
  amount: "1000000000000000000",
  workDescription: "labeling batch #1",
  requiresHybridRelease: false,
};

const sim = await simulateTrustedSettlement(input, { mode: "cooperative" });
if (sim.stages.preflight.ready) {
  const result = await executeTrustedSettlement(input, { mode: "cooperative" });
  // result.success when prove verifies claim receipt
}
```

## Cooperative — hybrid full path

Default when `requiresHybridRelease` is omitted (true):

```typescript
const result = await executeTrustedSettlement(
  { ...input, requiresHybridRelease: true, disputeWindowSeconds: 3600 },
  { mode: "cooperative" }
);
// settle stages: fundTx → deliverTx → attestTx → claimTx
```

## Ghost payer

Payer funds and payee delivers; payer never attests. Payee waits for auto-release.

```typescript
// Step 1: fund + deliver, skip attest
const result = await executeTrustedSettlement(input, {
  skipAttest: true,
});

// Step 2: poll until canClaim
const status = await getSettlementStatus(result.dealId!);
// status.nextAction === "wait" until autoReleaseAt

// Step 3: claim when ready
await completeClaimForDeal(result.dealId!, input, config);
```

See [Ghost payer example](../examples/ghost-payer.md).

## Safety net — ghost payee

Payee never delivers; payer reclaims after TTL.

```typescript
// Fund via execute with short TTL, or manual fund
await time.increase(ttl + 1); // Hardhat only

const reclaim = await reclaimTrustedSettlement(dealId, { mode: "safetyNet" });
```

Blocked if delivery was submitted.

## Junk delivery — cooperative reject (v1.2)

Default when no `arbiter` on fund:

```typescript
import { rejectDeliveryForDeal, rejectionReasonHash } from "./src/trustedAgentSettlement.js";

const result = await rejectDeliveryForDeal(
  dealId,
  { reason: "output does not match spec section 3" },
  { payerSigner: process.env.PRIVATE_KEY }
);
// result.reasonHash on-chain; cooperative → instant refund
```

## Adversarial payment — arbiter dispute (v1.2)

```typescript
const input = {
  ...baseInput,
  arbiter: "0xYourReviewerAddress",
  requiresHybridRelease: true,
};

await fundDealSettlement(input, config);
// payee delivers, payer rejects with reason → Disputed (funds frozen)

await resolveDisputeForDeal(dealId, "split", { arbiterSigner: process.env.ARBITER_PRIVATE_KEY }, 7000);
```

## Onboard then settle

```typescript
await executeTrustedSettlement(input, {
  autoOnboardRecipients: true,
});
// stages.onboard.recipients lists newly registered payees
```

## Mode summary

| Mode | Primary path |
|------|--------------|
| `cooperative` | fund → deliver → attest → claim |
| `safetyNet` | reclaim when payee ghosts |

## nextAction progression

| Stage | nextAction |
|-------|------------|
| Payee unregistered | `onboardRecipient` |
| Ready to fund | `fund` |
| Funded, hybrid | `deliver` |
| Delivered | `attest` or `wait` |
| Attested / auto-release | `claim` |
| Expired, no delivery | `reclaim` |
| Disputed (arbiter mode) | `resolve` |
| Complete | `done` |

## Related docs

- [On-chain flows](../architecture/on-chain-flows.md)
- [Preflight and onboarding](preflight-and-onboarding.md)
- [Integration tests](../tests/tier-integration.md)
