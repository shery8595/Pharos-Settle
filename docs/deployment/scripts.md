# Deployment scripts

## scripts/deploy.ts

Hardhat/ethers deploy for `localhost` network.

```bash
npm run deploy:local
# hardhat run scripts/deploy.ts --network localhost
```

Deploys full stack, writes `deployments/localhost.json`.

## scripts/deploy-viem.ts

viem-based deploy for Atlantic.

```bash
npm run deploy:pharos
```

Uses `PRIVATE_KEY` from env. Writes `deployments/atlantic.json`.

## scripts/seed.ts

Post-deploy configuration:

- Register payer/payee agents
- Allow TEST + Atlantic tokens (`config/atlantic-tokens.json`)
- `setFeeConfig` on DealEscrow
- Mint TEST (local only)

```bash
npm run seed:local   # --network localhost
npm run seed:pharos  # --network pharos
```

## scripts/demo.ts

End-to-end settlement demo.

```bash
npm run demo
npm run demo:pharos
npm run demo:simulate
npm run demo:batch
npm run demo:batch:split
```

Batch demos: `examples/pipeline/run-batch.ts`, `run-batch-split.ts`. Env: `BATCH_SIZE`, `BATCH_MODE` (`saliFast` | `hybridWork`).

## scripts/gates/validate-atlantic.ts

```bash
npm run gates:atlantic
```

Validates Atlantic deployment invariants.

## scripts/check-balance.ts

```bash
npm run check:balance
```

Quick wallet balance check on Atlantic.

## config/atlantic-tokens.ts

TypeScript export of `atlantic-tokens.json` for scripts.

## Related source

- `hardhat.config.cjs`
- `config/atlantic-tokens.json`
