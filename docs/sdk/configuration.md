# Configuration

## SettlementConfig

| Field | Type | Description |
|-------|------|-------------|
| `payerSigner` | string? | Payer private key (hex). Fallback: `PRIVATE_KEY` |
| `payeeSigner` | string? | Payee private key. Fallback: `AGENT_B_PRIVATE_KEY` |
| `mode` | `"cooperative"` \| `"safetyNet"` \| `"demo"`? | Settlement mode (default cooperative) |
| `proveTier` | `"receipt"` \| `"spv"`? | Post-settlement verification (default receipt) |
| `rpcUrl` | string? | JSON-RPC URL. Fallback: Atlantic default |
| `routerAddress` | string? | Override router. Fallback: deployments JSON |
| `deploymentNetwork` | string? | `"atlantic"`, `"localhost"`, etc. → `deployments/{network}.json` |
| `mock` | boolean? | Skip on-chain calls; return mock txs |
| `skipAttest` | boolean? | Omit payer attest (ghost payer demo) |
| `dealId` | string? | For safetyNet reclaim-only execute |
| `autoOnboardRecipients` | boolean? | Register unregistered payee before fund |
| `inProcessProvider` | `{ send(...) }`? | Hardhat in-process RPC for integration tests |

## Network resolution

`resolveDeploymentNetwork(config)` → `config.deploymentNetwork ?? "atlantic"`

Loads addresses from `deployments/{network}.json` via `loadDeployments()`.

## Signer resolution

Payer/payee wallet clients use `privateKeyToAccount(config.payerSigner ?? process.env.PRIVATE_KEY)`.

**Important:** Integration tests derive Hardhat keys via mnemonic — do not hardcode folklore keys. See [Test troubleshooting](../tests/troubleshooting.md).

## Transport

`transportFromConfig(config, rpcUrl)`:

- If `inProcessProvider` set → custom viem transport (Hardhat)
- Else → `http(rpcUrl)`

All settle/preflight/status paths use this. Prove receipt verification must also receive `config` for local tests.

## Mock mode

When `mock: true`:

- Preflight uses in-memory mock registry
- Settle returns deterministic fake tx hashes
- Prove returns verified mock proof

MCP defaults to mock when `PRIVATE_KEY` is unset.

## Example — Atlantic live

```typescript
await executeTrustedSettlement(input, {
  mode: "cooperative",
  deploymentNetwork: "atlantic",
  payerSigner: process.env.PRIVATE_KEY,
  payeeSigner: process.env.AGENT_B_PRIVATE_KEY,
  rpcUrl: process.env.PHAROS_RPC_URL,
  autoOnboardRecipients: true,
});
```

## Example — Hardhat integration

```typescript
const config = await buildSdkConfig(fixture); // test/helpers/sdk-config.cjs
// includes inProcessProvider: hre.network.provider
```

## Related source

- `src/shared/schemas.ts`
- `src/shared/clients.ts`
- `test/helpers/sdk-config.cjs`
