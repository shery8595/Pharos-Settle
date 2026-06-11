# Environment variables

## Required for live Atlantic

| Variable | Purpose |
|----------|---------|
| `PRIVATE_KEY` | Payer agent (Agent A) private key — funds deals, attests, reclaims, onboards payees |
| `AGENT_B_PRIVATE_KEY` | Payee agent (Agent B) private key — delivers work, claims |
| `PHAROS_RPC_URL` | Atlantic JSON-RPC endpoint (default: `https://atlantic.dplabs-internal.com`) |

## Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `ATLANTIC_E2E` | Set to `1` to run full fund+claim in Atlantic smoke tests | off |
| `BATCH_SIZE` | Number of deals in batch demos | `5` |
| `BATCH_MODE` | `saliFast` or `hybridWork` for split batch demo | `saliFast` |
| `RPC_MIN_INTERVAL_MS` | Min ms between Atlantic RPC calls | `200` |
| `RPC_RETRY_MS` | Backoff when Atlantic returns CU limit errors | `1500` |

## SDK config vs env

The SDK reads keys from `SettlementConfig` first, then falls back to env:

| Config field | Env fallback |
|--------------|--------------|
| `payerSigner` | `PRIVATE_KEY` |
| `payeeSigner` | `AGENT_B_PRIVATE_KEY` |
| `rpcUrl` | `PHAROS_RPC_URL` / Atlantic default |

Integration tests pass keys explicitly via `test/helpers/sdk-config.cjs` and do not rely on `.env` for signing.

## MCP behavior

When `PRIVATE_KEY` is absent, MCP tools default to `mock: true` (no on-chain txs). See [MCP setup](../mcp/setup.md).

## Security

- Never commit `.env` to version control (listed in `.gitignore`).
- Use testnet keys only for Atlantic development.
- `.env.example` shows variable names without real values.

## Example `.env`

```env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
AGENT_B_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```

Use your own funded Atlantic wallets for live demos.
