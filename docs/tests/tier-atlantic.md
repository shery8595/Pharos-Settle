# Tier 5: Atlantic smoke tests

**Runner:** Vitest (`describe.sequential`)  
**Path:** `test/atlantic/smoke.vitest.ts`  
**Count:** 5 tests (default)

## Preconditions

- `deployments/atlantic.json` exists
- `.env` has `PRIVATE_KEY` (and related vars)
- Skips gracefully with `describe.skip` message if missing

## Helper

`test/helpers/atlantic-config.ts` — loads Atlantic context, wraps reads with `withRpcRetry`.

## Default tests (~15 RPC calls)

| Test | RPC cost | Assert |
|------|----------|--------|
| Preflight ready | ~5 eth_call | `preflight.ready === true` |
| Simulate fee + fund | ~6 calls | `success`, `feeBps === 100` |
| loadAllowedTokens | 0 | 6 tokens |
| USDC allowlist | 1 call | `isAllowed` true |
| registerRecipients dry-run | 1 call | `alreadyRegistered` contains agentB |

## Optional E2E

```bash
ATLANTIC_E2E=1 npm run test:atlantic
```

Micro-settle (0.01 TEST) — high RPC cost; gated off in default CI.

## Run

```bash
npm run test:atlantic
```

Included in full `npm test` when env + deployments present.

## Related docs

- [Atlantic deployment](../deployment/atlantic.md)
- [Environment](../getting-started/environment.md)
