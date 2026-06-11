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

## SDK alternative

For production apps, prefer `pharos-trusted-settlement` npm package instead of generated scripts:

```typescript
import { simulateTrustedSettlement, executeTrustedSettlement } from "pharos-trusted-settlement";
```

See `docs/sdk/` in repo for full API.
