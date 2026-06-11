# Script Generation

Generate JS/TS/Python interaction scripts from SettlementRouter ABI or `assets/templates/`.

## Rules

1. Read RPC and addresses from `assets/networks.json` + `assets/deployments.json` — never hardcode.
2. Use `$PRIVATE_KEY` from env — never embed in generated files.
3. Reads: use `template_read.ts.tpl` pattern (viem `readContract`).
4. Writes: use `template_write.ts.tpl` (viem `writeContract` with explicit account).
5. Include explorer link: `{explorerUrl}/tx/{txHash}`.

## Templates

| File | Use |
|------|-----|
| `assets/templates/template_read.ts.tpl` | View calls (`canClaim`, `getDeal`) |
| `assets/templates/template_write.ts.tpl` | Router writes (`fundAndAcceptHybrid`, etc.) |

## SDK / npm alternative (tier 2)

For production apps, use tier 2 npm scripts (`pay:once`) or import `pharos-trusted-settlement` instead of one-off generated scripts. Escalation ladder: [execution.md](execution.md).

```typescript
import { simulateTrustedSettlement, executeTrustedSettlement } from "pharos-trusted-settlement";
```

See `docs/sdk/` in repo for full API.
