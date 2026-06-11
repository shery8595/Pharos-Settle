# Local Hardhat deployment

## Option A: In-process (tests)

Contract and integration tests deploy via `test/helpers/hardhat-fixture.cjs` — no running node required.

Addresses written to `deployments/localhost.json` during integration `before` hook.

## Option B: localhost:8545

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npm run deploy:local
npm run seed:local
npm run demo -- --network localhost
```

Or one-shot:

```bash
npm run e2e:local
```

## hardhat.config.cjs networks

```javascript
localhost: { url: "http://127.0.0.1:8545" }
pharos: {
  url: process.env.PHAROS_RPC_URL,
  chainId: 688689,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
}
```

## SDK integration testing

Uses `inProcessProvider: hre.network.provider` — not HTTP localhost.

See [Tier 3 integration tests](../tests/tier-integration.md).

## localhost.json

Same schema as `atlantic.json` with `chainId: 31337` and locally deployed addresses.
