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

## One-shot CLI

```bash
npm run pay:once -- --payee 0x... --amount 5 --work "task-id"
npm run pay:batch -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "payroll"
npm run pay:batch -- --payee 0x... --count 10 --amount 2 --mode saliFast
```

Thin SDK wrappers — prefer MCP (`execute_trusted_settlement`, `execute_batch_settlement`, or split batch tools). Agents must **not** create ad-hoc `pay-custom.ts` / `pay-batch-custom.ts` scripts.

Batch details: [batch-settlements.md](batch-settlements.md) · MCP: [batch-sali.md](../mcp/batch-sali.md)

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
