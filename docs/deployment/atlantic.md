# Atlantic deployment

Pharos Atlantic testnet — chain ID **688689**.

## Deploy

```bash
# .env: PRIVATE_KEY, PHAROS_RPC_URL
npm run deploy:pharos
```

Writes `deployments/atlantic.json` (currently **v1.3.0**).

## Live addresses (v1.3.0)

Canonical source: [`deployments/atlantic.json`](../../deployments/atlantic.json).

| Contract | Address |
|----------|---------|
| SettlementRouter | `0xb39f403f7f36a2a1f4c35a0808f3a024fb73452e` |
| DealEscrow | `0x2911c456bf766661572eb8ab92f8cfd656661a9b` |
| AgentRegistry | `0xe4991f5a54b35cfbcf952c31ec7dfcf432a8c173` |
| TokenAllowlist | `0x456848b1a38954a61ee7f34a997d468831f2d224` |
| TEST token | `0x008f64b4da7ffcafad2706585cae349bd59b48bf` |

Explorer: [atlantic.pharosscan.xyz](https://atlantic.pharosscan.xyz)

v1.2.0 contracts remain on-chain for in-flight deals — see `notes` in `atlantic.json`.

## deployments/atlantic.json schema

| Field | Description |
|-------|-------------|
| `version` | Contract release (e.g. `1.3.0`) |
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
