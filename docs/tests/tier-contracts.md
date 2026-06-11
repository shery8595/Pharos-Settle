# Tier 1: Contract tests

**Runner:** Hardhat + Mocha  
**Path:** `test/contracts/**/*.test.cjs`  
**Count:** 42 tests (v1.3 payer auth + hybrid timing guards)

## Files

| File | Tests | Coverage |
|------|-------|----------|
| `SettlementRouter.test.cjs` | 22 | Legacy fund→claim, hybrid, reclaim, reject, arbiter resolve, fees, payer auth, timing reverts |
| `AgentRegistry.test.cjs` | 6 | Owner register/remove, onboarding, batch skip |
| `TokenAllowlist.test.cjs` | 3 | allow/disallow, requireAllowed, batch Atlantic tokens |
| `DealEscrow.test.cjs` | 11 | MAX_FEE_BPS, router-only, canClaim, cooperative/arbiter reject, resolveDispute split |

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
