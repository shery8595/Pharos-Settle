# Settlement Operations (Pharos Settle)

Agent-to-agent escrow with ghost protection on Pharos Atlantic.

```bash
# --- Environment Setup ---
export RPC=$(jq -r '.atlantic.rpcUrl' assets/networks.json)
export ROUTER=$(jq -r .settlementRouter assets/deployments.json)
export ESCROW=$(jq -r .dealEscrow assets/deployments.json)
export REGISTRY=$(jq -r .agentRegistry assets/deployments.json)
export TOKEN=$(jq -r .mockToken assets/deployments.json)   # see assets/tokens.json
export DEAL_ID="1"
export AMOUNT=1000000000000000000                        # 1 TEST (18 decimals)
# Keys — never mix owner/admin with agent wallets
export PAYER_PRIVATE_KEY=0xYourPayerKey                  # fund, attest, reject, reclaim
export PAYEE_PRIVATE_KEY=0xYourPayeeKey                # submitDelivery, claim
export ARBITER_PRIVATE_KEY=0xYourArbiterKey              # resolveDispute only
export PAYER=$(cast wallet address --private-key $PAYER_PRIVATE_KEY)
export PAYEE=0xYourPayeeAddress
export TTL=604800                                        # 7 days
export DISPUTE_WINDOW=259200                           # 3 days
export ARBITER=0x0000000000000000000000000000000000000000
# --------------------------
```

> **Network:** `$RPC` ← `assets/networks.json` → `atlantic.rpcUrl`  
> **Contracts:** `assets/deployments.json`  
> **Keys:** `--private-key $PAYER_PRIVATE_KEY` or `$PAYEE_PRIVATE_KEY` on every write (Foundry does not auto-read env)

**Default pre-checks** (tier 1 cast): **Foundry** (`cast --version` — [foundry-gate](execution.md#foundry-gate)) → RPC → keys in shell (load `.env` on "proceed" — [when-user-confirms-keys-are-set--stay-on-cast](execution.md#when-user-confirms-keys-are-set--stay-on-cast)) → contracts → balance.

**Execution tiers:** Method A = tier 1 (cast). Method B = tier 3 (MCP). Method C = tier 2 (npm). Escalation rules: [execution.md](execution.md).

---

## Fund Deal

### Overview

Lock tokens in escrow for a registered payee. Hybrid release (`requiresHybridRelease: true`) enables attest-or-auto-release ghost payer protection.

### Method A (Preferred) — cast

**Pre-checks**

```bash
cast call $REGISTRY "isRegistered(address)(bool)" $PAYER --rpc-url $RPC   # true
cast call $REGISTRY "isRegistered(address)(bool)" $PAYEE --rpc-url $RPC   # true
cast call $TOKEN "balanceOf(address)(uint256)" $PAYER --rpc-url $RPC
cast call $TOKEN "allowance(address,address)(uint256)" $PAYER $ESCROW --rpc-url $RPC
```

**Step 1 — Approve token**

```bash
# Correct: spender is DealEscrow ($ESCROW), not SettlementRouter ($ROUTER)
cast send $TOKEN "approve(address,uint256)" $ESCROW $AMOUNT \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

**Step 2 — Hash work id**

```bash
export WORK_HASH=$(cast keccak "my-task-id")
export PREFLIGHT_HASH=$(cast keccak "preflight-v1")

export TX_HASH=$(cast send $ROUTER \
  "fundAndAcceptHybrid(address,address,address,uint256,uint256,bytes32,bytes32,bool,uint64,address)" \
  $PAYER $PAYEE $TOKEN $AMOUNT $TTL $WORK_HASH $PREFLIGHT_HASH true $DISPUTE_WINDOW $ARBITER \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC --json | jq -r '.transactionHash')
```

**Step 3 — Parse dealId from receipt**

```bash
cast receipt $TX_HASH --rpc-url $RPC
# dealId is the first indexed arg in SettlementInitiated logs on $ROUTER
```

> Do **not** use `cast logs --from-block latest` — the fund block may already be past when you query. Always capture `$TX_HASH` from the send and read the receipt.

**Post-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state should be 2 (Accepted) after fundAndAcceptHybrid
```

| Parameter | Description |
|-----------|-------------|
| `$PAYEE` | Worker agent address (must be registered) |
| `$TTL` | Seconds until reclaim if no delivery |
| `$DISPUTE_WINDOW` | Seconds after delivery before auto-release |
| `$ARBITER` | `0x0` for cooperative; arbiter address for disputed mode |

### Method B (MCP)

Tool: `fund_deal`

```json
{
  "agentA": "0xPayer...",
  "agentB": "0xPayee...",
  "token": "0x008f64b4da7ffcafad2706585cae349bd59b48bf",
  "amount": "1000000000000000000",
  "workDescription": "my-task-id",
  "autoOnboardRecipients": true
}
```

Returns `{ "dealId", "fundTx", "nextAction": "deliver" }`.

Preflight first: `simulate_trusted_settlement` with same fields.

### Method C (npm) — tier 2

```bash
npm run pay:once -- --payee 0xPayee... --amount 1 --work "my-task-id"
npm run pay:once -- --payee 0xPayee... --amount 1 --work "my-task-id" --simulate
```

---

## Submit Delivery

### Overview

Payee binds work proof (`resultHash`) to the deal.

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state must be 2 (Accepted); deliverySubmittedAt must be 0
```

```bash
export RESULT_HASH=$(cast keccak "my-task-id")   # must match work binding
cast send $ROUTER "submitDelivery(uint256,bytes32)" $DEAL_ID $RESULT_HASH \
  --private-key $PAYEE_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC
# false until attest or dispute window elapses
```

### Method B (MCP)

Tool: `submit_delivery` — `{ "dealId": "42", "workDescription": "my-task-id" }` (payee session)

---

## Attest Release

### Overview

Payer confirms delivery quality; enables immediate claim.

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state 2 (Accepted); delivery must be submitted
```

```bash
cast send $ROUTER "attestRelease(uint256,bytes32)" $DEAL_ID $RESULT_HASH \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC   # should be true
```

### Method B (MCP)

Tool: `attest_release` — `{ "dealId": "42", "workDescription": "my-task-id" }`

---

## Claim (Complete Settlement)

### Overview

Payee withdraws escrowed tokens after attest or auto-release window.

> [!WARNING]
> Payee must call `claim` **before** the deal's `deadline` (TTL) expires. Once the deadline passes, `claim` reverts and the payer can retrieve funds via `reclaim` (if no delivery) or funds remain locked per dispute rules. Plan claim timing: submit delivery early enough to survive the dispute window and still claim before `deadline`.

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC   # must be true
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# confirm block.timestamp <= deadline (field 6)
```

```bash
export PROOF_HASH=$(cast keccak "proof-v1")
cast send $ROUTER "claim(uint256,bytes32)" $DEAL_ID $PROOF_HASH \
  --private-key $PAYEE_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state should be 4 (Released)
cast call $TOKEN "balanceOf(address)(uint256)" $PAYEE --rpc-url $RPC
```

### Method B (MCP)

Tool: `complete_claim_for_deal` — `{ "dealId": "42" }`

Poll: `get_settlement_status` → act on `nextAction: "claim"`.

---

## Reclaim (Ghost Payee)

### Overview

Payer recovers funds when payee never delivered and TTL expired.

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state 1 or 2; deadline passed; no delivery submitted
```

```bash
cast send $ROUTER "reclaim(uint256)" $DEAL_ID \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state should be 5 (Refunded)
cast call $TOKEN "balanceOf(address)(uint256)" $PAYER --rpc-url $RPC
```

### Method B (MCP)

Tool: `reclaim_trusted_settlement` — `{ "dealId": "42" }`

---

## Reject Delivery

### Overview

Payer safety valve for junk delivery. Requires auditable `reasonHash`.

> [!IMPORTANT]
> If `arbiter` is `address(0)`, rejection refunds the payer immediately (`Refunded`). If an arbiter is set, rejection shifts the deal to `Disputed` (state `3`), freezing funds until the arbiter calls `resolveDispute`.

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# delivery submitted; within dispute window; payer not yet attested
```

```bash
export REASON_HASH=$(cast keccak "junk-delivery-reason")
cast send $ROUTER "rejectDelivery(uint256,bytes32)" $DEAL_ID $REASON_HASH \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state 5 (Refunded) if cooperative; state 3 (Disputed) if arbiter set
```

### Method B (MCP)

Tool: `reject_delivery` — `{ "dealId": "42", "reason": "junk output" }`

---

## Resolve Dispute (Arbiter Flow)

### Overview

The designated arbiter resolves a disputed deal by deciding the outcome: release to payee (`0`), refund to payer (`1`), or split (`2`).

| Outcome | Value | Behavior |
|---------|-------|----------|
| `ReleaseToPayee` | `0` | Payee receives escrow (minus fee) |
| `RefundPayer` | `1` | Full refund to payer |
| `Split` | `2` | `0 < payeeBps < 10000`; fee on payee share only |

### Method A (Preferred) — cast

**Pre-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state must be 3 (Disputed); arbiter field must match caller
```

```bash
export OUTCOME=1        # 1 = RefundPayer
export PAYEE_BPS=0      # only used when OUTCOME=2 (Split)

cast send $ROUTER "resolveDispute(uint256,uint8,uint16)" $DEAL_ID $OUTCOME $PAYEE_BPS \
  --private-key $ARBITER_PRIVATE_KEY --rpc-url $RPC
```

**Post-check**

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
# state 4 (Released) or 5 (Refunded)
```

### Method B (MCP)

Tool: `resolve_dispute` — `{ "dealId": "42", "outcome": "refund" }` (arbiter session)

---

## Ghost Protection Flows

| Scenario | What happens | Action |
|----------|--------------|--------|
| Payee ghosts | TTL expires, no delivery | `reclaim` |
| Payer ghosts after delivery | Auto-release after `disputeWindow` | Payee `claim` when `canClaim` is true |
| Junk delivery | Payer rejects during window | `rejectDelivery` |
| Both cooperate | Attest → claim | Standard flow |
| Arbiter mode reject | Funds frozen in `Disputed` | Arbiter `resolveDispute` |

---

## Batch Payroll (SALI FastPay)

### Method A (Preferred) — cast loop

For N payees, run `fundAndAcceptHybrid` N times and capture each `dealId` from the transaction receipt.

Save deal IDs to a manifest for payee claim handoff:

```bash
# After each fund, append dealId (example for three jobs)
echo '{"dealIds": ["1", "2", "3"], "payees": ["0xPayeeA", "0xPayeeB", "0xPayeeC"]}' > ./manifest.json
```

Each payee claims their deal:

```bash
export DEAL_ID=$(jq -r '.dealIds[0]' ./manifest.json)
export PAYEE=$(jq -r '.payees[0]' ./manifest.json)
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC
cast send $ROUTER "claim(uint256,bytes32)" $DEAL_ID $(cast keccak "proof-v1") \
  --private-key $PAYEE_PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

- Payer: `fund_deals_batch` → share `manifest`
- Payee: `complete_claims_batch`
- Demo (both keys): `execute_batch_settlement` with `batchMode: "saliFast"`

### Method C (npm) — tier 2

```bash
npm run batch:fund -- --payees 0xA,0xB,0xC --amount 1 --work-prefix "payroll"
npm run batch:claim -- --manifest ./manifest.json
npm run pay:batch -- --payees 0xA,0xB --amount 1   # demo: both keys
npm run demo:judge                                  # mock, no keys
```

See `docs/mcp/batch-sali.md` and [execution.md](execution.md).

---

## Timing Fields

| Field | Default guidance |
|-------|------------------|
| `ttlSeconds` | > `disputeWindowSeconds`; e.g. 604800 (7d) |
| `disputeWindowSeconds` | e.g. 259200 (3d) for auto-release after delivery |

---

## Error Handling

| Revert | Cause | Fix |
|--------|-------|-----|
| `sponsor not registered` | Payer not on registry | `registerRecipient` or MCP `register_recipients` |
| `agent not registered` | Payee not on registry | Payer sponsors payee registration |
| `only payee` | Wrong key on delivery/claim | Use `$PAYEE_PRIVATE_KEY` |
| `only payer` | Wrong key on attest/reject | Use `$PAYER_PRIVATE_KEY` |
| `only arbiter` | Wrong key on resolve | Use `$ARBITER_PRIVATE_KEY` |
| `ERC20: insufficient allowance` | Approved router instead of escrow | Approve `$ESCROW` — see Fund Deal |
| `bad state` | Pre-condition not met | Run section pre-checks; read `getDeal` state |
| `expired` | Claim after deadline | Claim before TTL; see Claim warning |
| `token not allowed` | Token not seeded | Use `assets/tokens.json` addresses |

> **Agent Guidelines:**
> 1. Complete default pre-checks (SKILL.md) — not MCP setup unless user chose MCP.
> 2. Prefer Method A (cast) unless user requests MCP or MCP tools are already in session.
> 3. Simulate before fund: `cast estimate` or MCP `simulate_trusted_settlement`.
> 4. Show explorer link: `{explorerUrl}/tx/{txHash}` from `assets/networks.json`.
> 5. Run pre-checks before every write and post-checks after — do not skip verification reads.
