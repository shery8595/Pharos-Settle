# MockERC20

Simple mintable ERC-20 for local Hardhat testing.

**Source:** `contracts/MockERC20.sol`

## Purpose

- Local deploys and contract tests
- `TEST` token symbol in fixtures
- Not deployed to Atlantic (Atlantic uses a deployed TEST token address in `deployments/atlantic.json`)

## Usage in tests

`test/helpers/hardhat-fixture.cjs`:

1. Deploys `MockERC20("TEST", "TEST")`
2. Mints to payer
3. Approves `DealEscrow` for settlement amounts

## Related tests

All `test/contracts/*.test.cjs` and `test/integration/sdk.local.test.cjs` use MockERC20.

## Related source

- `scripts/deploy.ts` — local deployment
- `src/shared/abis.ts` — `erc20Abi`
