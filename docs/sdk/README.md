# SDK

TypeScript SDK for agent settlements on Pharos Atlantic.

## Package

```json
{
  "name": "pharos-trusted-settlement",
  "main": "dist/trustedAgentSettlement.js",
  "exports": {
    ".": "./dist/trustedAgentSettlement.js",
    "./steps": "./dist/steps.js"
  }
}
```

## Build and import

```bash
npm run build
```

```typescript
// Layer 1 — high-level API
import {
  simulateTrustedSettlement,
  executeTrustedSettlement,
  getSettlementStatus,
  reclaimTrustedSettlement,
  completeClaimForDeal,
  executeBatchSettlement,
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
  registerRecipients,
} from "pharos-trusted-settlement";

// Layer 2 — composable steps
import {
  preflight,
  settle,
  prove,
  submitDelivery,
  attestRelease,
  claimDeal,
  reclaimDeal,
  executeBatchSettlement,
  registerRecipients,
  getFeeQuote,
} from "pharos-trusted-settlement/steps";
```

From source (development):

```typescript
import { executeTrustedSettlement } from "./src/trustedAgentSettlement.js";
```

## Documentation index

| Doc | Content |
|-----|---------|
| [API reference](api-reference.md) | All exported functions |
| [Configuration](configuration.md) | `SettlementConfig` fields |
| [Settlement flows](settlement-flows.md) | Cooperative, safety net, ghost payer |
| [Preflight and onboarding](preflight-and-onboarding.md) | Checks and payee registration |
| [Prove tiers](prove-tiers.md) | Receipt vs SPV verification |
| [Batch settlements](batch-settlements.md) | `saliFast` / `hybridWork` SALI batch |

## Source layout

```
src/
├── trustedAgentSettlement.ts   # Layer 1 orchestration
├── steps.ts                    # Layer 2 re-exports
├── shared/
│   ├── schemas.ts              # Types
│   ├── chain.ts                # Deployments, explorer URLs
│   ├── abis.ts                 # Contract ABIs
│   ├── clients.ts              # transportFromConfig
│   └── rpc.ts                  # withRpcRetry
└── internal/
    ├── preflight/
    ├── onboard/
    ├── settle/
    ├── prove/
    └── commerce/
```

## Related tests

- [Tier 2: Unit](../tests/tier-unit.md)
- [Tier 3: Integration](../tests/tier-integration.md)
