# Tier 1: Contract tests

**Runner:** Hardhat + Mocha  
**Path:** `test/contracts/**/*.test.cjs`  
**Count:** 27 tests

## Files

| File | Tests | Coverage |
|------|-------|----------|
| `SettlementRouter.test.cjs` | 14 | Legacy fund→claim, hybrid, reclaim, fees, reverts |
| `AgentRegistry.test.cjs` | 6 | Owner register/remove, onboarding, batch skip |
| `TokenAllowlist.test.cjs` | 3 | allow/disallow, requireAllowed, batch Atlantic tokens |
| `DealEscrow.test.cjs` | 4 | MAX_FEE_BPS, router-only fund/claim, canClaim |

## Fixture

`test/helpers/hardhat-fixture.cjs`:

- `deployFullStack()` — MockERC20, registry, allowlist, escrow, router
- `mintAndApprove()` — fund payer for tests
- `allowAtlanticTokens()` — TEST + config/atlantic-tokens.json

## Run

```bash
npm run test:contracts
```

Excludes integration via `--grep "SDK integration" --invert`.

## Related contract docs

- [SettlementRouter](../contracts/SettlementRouter.md)
- [DealEscrow](../contracts/DealEscrow.md)
- [AgentRegistry](../contracts/AgentRegistry.md)
- [TokenAllowlist](../contracts/TokenAllowlist.md)
