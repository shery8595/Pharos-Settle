# Local quickstart (Hardhat)

Run the full stack on an in-process Hardhat network without a running `localhost:8545` node.

## 1. Build

```bash
npm run build
```

## 2. Run contract tests (optional sanity check)

```bash
npm run test:contracts
```

Deploys contracts in-process via `test/helpers/hardhat-fixture.cjs` inside each test file.

## 3. Simulate demo (mock mode)

No private keys or RPC required:

```bash
npm run demo:simulate
```

Returns preflight checks, fee quote, and `nextAction` without sending transactions.

## 4. Full local e2e (optional)

Requires a Hardhat node on port 8545:

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npm run e2e:local
```

This runs `deploy:local` → `seed:local` → `demo.ts` against `localhost`.

## 5. SDK integration tests

```bash
npm run test:integration
```

Uses `inProcessProvider` (Hardhat's JSON-RPC provider) — see [Tier 3 integration tests](../tests/tier-integration.md).

## Local deployment artifact

Integration tests write addresses to `deployments/localhost.json`:

```json
{
  "settlementRouter": "0x...",
  "dealEscrow": "0x...",
  "agentRegistry": "0x...",
  "tokenAllowlist": "0x...",
  "mockToken": "0x...",
  "chainId": 31337
}
```

## Next steps

- [Atlantic quickstart](quickstart-atlantic.md) for live testnet
- [Local Hardhat deployment](../deployment/local-hardhat.md)
- [Settlement flows](../sdk/settlement-flows.md)
