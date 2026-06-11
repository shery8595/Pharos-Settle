# Atlantic deployment

Pharos Atlantic testnet — chain ID **688689**.

## Deploy

```bash
# .env: PRIVATE_KEY, PHAROS_RPC_URL
npm run deploy:pharos
```

Writes `deployments/atlantic.json`.

## deployments/atlantic.json schema

| Field | Description |
|-------|-------------|
| `settlementRouter` | Router address |
| `dealEscrow` | Escrow address |
| `agentRegistry` | Registry address |
| `tokenAllowlist` | Allowlist address |
| `mockToken` | TEST token address |
| `chainId` | 688689 |
| `network` | `"pharos"` |
| `deployer` | Deployer address |
| `allowedTokens` | Array of `{ symbol, name, decimals, address }` |

## Seed

```bash
npm run seed:pharos
```

- Registers demo agents (from env keys)
- Allows TEST + tokens from `config/atlantic-tokens.json`:
  - USDC, USDT, WBTC, WETH, WPHRS
- Sets fee config on escrow

## Token registry

Official Atlantic tokens: [Pharos token registry](https://docs.pharos.xyz/getting-started/token-registry)

Local mirror: `config/atlantic-tokens.json`

## SDK usage

```typescript
await executeTrustedSettlement(input, {
  deploymentNetwork: "atlantic",
  rpcUrl: process.env.PHAROS_RPC_URL,
});
```

`loadDeployments("atlantic")` reads the JSON file.

## Validation

```bash
npm run gates:atlantic
```

Runs `scripts/gates/validate-atlantic.ts`.

## Related tests

- [Tier 5: Atlantic smoke](../tests/tier-atlantic.md)
