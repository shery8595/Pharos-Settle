# Test troubleshooting

Lessons from integration test debugging. Symptom → cause → fix.

## Wrong transaction sender / zero balance

**Symptom:** `writeContract` from unexpected address (e.g. `0x5711…` instead of `0xf39F…`).

**Cause:** Hardcoded "well-known" Hardhat key #0 had a typo. It does not match keys derived from Hardhat's mnemonic.

**Fix:** Use `derivePrivateKeys` from `hardhat/internal/core/providers/util` in `test/helpers/sdk-config.cjs`. Never copy private keys from folklore docs.

## Settlement timeouts (40s+)

**Symptom:** `executeTrustedSettlement` hangs after claim; Mocha timeout.

**Cause:** `verifySettlementReceipt` used `http(rpcUrl)` while settle used `inProcessProvider`. Claim receipt exists only on in-process Hardhat, not `http://127.0.0.1:8545`.

**Fix:** Pass `config` to `verifySettlementReceipt` so it uses `transportFromConfig`.

## Reclaim returns success: false after time.increase

**Symptom:** On-chain deadline passed but `reclaimTrustedSettlement` says not reclaimable.

**Cause:** `getSettlementStatus` used `Date.now()` instead of block timestamp. `time.increase()` only advances chain time.

**Fix:** `chainNowSec(config)` reads latest block timestamp from RPC.

## Wrong dealId from receipt logs

**Symptom:** Reclaim or batch claim fails for wrong deal.

**Cause:** `logs.find(l => l.topics[1])` matches ERC-20 `Transfer` (indexed `from`), not `DealCreated`.

**Fix:** Filter by escrow contract address before reading `topics[1]` as dealId.

## Batch succeeded 1/3 on Hardhat

**Symptom:** `Nonce too high. Note that transactions can't be queued when automining.`

**Cause:** Parallel fund txs with explicit nonces (`nonce`, `nonce+1`, `nonce+2`). Hardhat automines each tx immediately.

**Fix:** When `inProcessProvider` set, `executeBatchSettlement` submits sequentially without pre-assigned nonces. Atlantic still uses parallel nonces for SALI.

## submitDelivery: already delivered

**Symptom:** Integration test reverts on second delivery.

**Cause:** `executeTrustedSettlement` with hybrid already calls `submitDelivery` internally; test called it again.

**Fix:** Only advance time and test reclaim blocking — do not double-submit delivery.

## .env leaking into tests

**Symptom:** Unexpected signer when `config.payerSigner` should be set.

**Cause:** `normalizePrivateKey(key ?? process.env.PRIVATE_KEY)` when key undefined.

**Fix:** Always pass `payerSigner`/`payeeSigner` via `buildSdkConfig`; integration tests should not depend on `.env` keys.

## Atlantic smoke skipped

**Symptom:** All Atlantic tests skipped.

**Cause:** Missing `deployments/atlantic.json` or `PRIVATE_KEY`.

**Fix:** Run `npm run deploy:pharos` and configure `.env`. See [Atlantic tier](tier-atlantic.md).
