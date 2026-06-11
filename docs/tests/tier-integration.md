# Tier 3: Integration tests

**Runner:** Hardhat (imports compiled `dist/`)  
**Path:** `test/integration/sdk.local.test.cjs`  
**Count:** 10 tests

## Approach

1. `deployFullStack()` from hardhat-fixture
2. `writeLocalDeployments()` → `deployments/localhost.json`
3. `buildSdkConfig(fx)` with `inProcessProvider: hre.network.provider`
4. Dynamic `import("../../dist/trustedAgentSettlement.js")`

Uses Hardhat's **in-process** network — no `localhost:8545` required.

## Tests

| Test | Asserts |
|------|---------|
| Cooperative legacy fund→claim | `executeTrustedSettlement` success |
| Hybrid full flow | deliver + attest + claim txs |
| getSettlementStatus | `nextAction: done` after claim |
| reclaim after deadline | `reclaimTrustedSettlement` success |
| registerRecipients + autoOnboard | onboard + settle |
| executeBatchSettlement N=3 | `succeeded === 3` |
| executeBatchSettlement saliFast split | phase functions + manifest |
| executeBatchSettlement hybridWork | deliver + attest + claim batch |
| disallowed token simulate | preflight `token_allowed` fails |
| reclaim blocked after delivery | reclaim fails post-delivery |

## Helpers

### sdk-config.cjs

- `hardhatPrivateKeys()` — derives keys via Hardhat `derivePrivateKeys` (do not hardcode)
- `keyForSigner(signer)` — maps ethers signer index to derived key
- `buildSdkConfig(fixture)` — full `SettlementConfig` with inProcessProvider

## Run

```bash
npm run build
npm run test:integration
```

## Related docs

- [SDK configuration](../sdk/configuration.md)
- [Troubleshooting](troubleshooting.md)
