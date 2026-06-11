# TokenAllowlist

Owner-managed mapping of ERC-20 tokens permitted in settlements.

**Source:** `contracts/TokenAllowlist.sol`

## Public API

| Function | Access | Description |
|----------|--------|-------------|
| `allow(token)` | owner | Add token |
| `disallow(token)` | owner | Remove token |
| `requireAllowed(token)` | view | Reverts if not allowed |
| `isAllowed(token)` | view | Boolean |

## Reverts

- `"not owner"` — mutating calls from non-owner
- `"token not allowed"` — `requireAllowed` failure

## Events

| Event | When |
|-------|------|
| `TokenAllowed` | Token added |
| `TokenDisallowed` | Token removed |

## Atlantic seed tokens

After `npm run seed:pharos`, allowlist includes TEST + tokens from `config/atlantic-tokens.json`:

- USDC, USDT, WBTC, WETH, WPHRS

See [Atlantic deployment](../deployment/atlantic.md).

## Related tests

`test/contracts/TokenAllowlist.test.cjs` — 3 tests including batch-allow

## Related source

- `src/internal/preflight/index.ts` — `token_allowed` check
- `src/shared/chain.ts` — `loadAllowedTokens`
