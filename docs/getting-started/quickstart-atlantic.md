# Atlantic quickstart (Pharos testnet)

Deploy and run agent settlements on Pharos Atlantic (chain ID `688689`).

**Both demo wallets are pre-registered on Atlantic — clone, add keys to `.env`, run `npm run demo:pharos`.** (Run `deploy:pharos` and `seed:pharos` once first if contracts are not on-chain yet; seed registers both wallets — no `registerRecipient` step.)

## 1. Configure environment

```bash
cp .env.example .env
```

Required variables:

```env
PRIVATE_KEY=0x...           # Agent A (payer)
AGENT_B_PRIVATE_KEY=0x...   # Agent B (payee)
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```

See [Environment variables](environment.md).

## 2. Deploy contracts

```bash
npm run deploy:pharos
```

Writes addresses to `deployments/atlantic.json`.

## 3. Seed registry and allowlist

```bash
npm run seed:pharos
```

Registers demo agents, allows TEST token + Atlantic ERC-20s (USDC, USDT, WBTC, WETH, WPHRS).

## 4. Run live demo

```bash
npm run demo:pharos
```

Full cooperative settlement on Atlantic with receipt verification.

## 5. Simulate first (recommended)

```bash
npm run demo:simulate
npm run demo:batch:simulate
npm run demo:batch:split:simulate
```

## 6. MCP plug-in

```bash
npm run mcp
```

Configure Cursor — see [MCP setup](../mcp/setup.md).

## 7. Verify Atlantic connectivity

```bash
npm run test:atlantic
```

~5 read-only RPC smoke tests. Optional full settle:

```bash
ATLANTIC_E2E=1 npm run test:atlantic
```

## Supported tokens

After seeding, see `deployments/atlantic.json` → `allowedTokens` or [Atlantic deployment](../deployment/atlantic.md).

## Next steps

- [SDK settlement flows](../sdk/settlement-flows.md)
- [Batch pipeline demo](../examples/batch-pipeline.md)
- [MCP tools](../mcp/tools.md)
