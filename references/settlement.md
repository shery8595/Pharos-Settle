# Settlement Operations (Pharos Settle)

Agent-to-agent escrow with ghost protection on Pharos Atlantic.

> **Network:** `$RPC` ← `assets/networks.json` → `atlantic.rpcUrl`  
> **Contracts:** `assets/deployments.json`  
> **Private key:** `--private-key $PRIVATE_KEY` on every write (Foundry does not auto-read env)

**Default pre-checks** (tier 1 cast): **Foundry** (`cast --version` — [foundry-gate](execution.md#foundry-gate)) → RPC → `$PRIVATE_KEY` in shell (load `.env` on "proceed" — [when-user-confirms-keys-are-set--stay-on-cast](execution.md#when-user-confirms-keys-are-set--stay-on-cast)) → contracts → balance.

**Execution tiers:** Method A = tier 1 (cast). Method B = tier 3 (MCP). Method C = tier 2 (npm). Escalation rules: [execution.md](execution.md).

---

## Fund Deal

### Overview

Lock tokens in escrow for a registered payee. Hybrid release (`requiresHybridRelease: true`) enables attest-or-auto-release ghost payer protection.

### Method A (Preferred) — cast

**Step 1 — Approve token**

```bash
export ROUTER=$(jq -r .settlementRouter assets/deployments.json)
export TOKEN=0x008f64b4da7ffcafad2706585cae349bd59b48bf   # TEST — see assets/tokens.json
export AMOUNT=1000000000000000000                        # 1 TEST (18 decimals)

cast send $TOKEN "approve(address,uint256)" $ROUTER $AMOUNT \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

**Step 2 — Hash work id**

```bash
export WORK_HASH=$(cast keccak "my-task-id")
export PREFLIGHT_HASH=$(cast keccak "preflight-v1")
export PAYER=$(cast wallet address --private-key $PRIVATE_KEY)
export PAYEE=0xYourPayeeAddress
export TTL=604800          # 7 days
export DISPUTE_WINDOW=259200  # 3 days
export ARBITER=0x0000000000000000000000000000000000000000

cast send $ROUTER \
  "fundAndAcceptHybrid(address,address,address,uint256,uint256,bytes32,bytes32,bool,uint64,address)" \
  $PAYER $PAYEE $TOKEN $AMOUNT $TTL $WORK_HASH $PREFLIGHT_HASH true $DISPUTE_WINDOW $ARBITER \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

**Step 3 — Parse dealId from logs**

```bash
cast logs --rpc-url $RPC --address $ROUTER \
  "SettlementInitiated(uint256,address,address,address,uint256,bytes32)" --from-block latest
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

```bash
export RESULT_HASH=$(cast keccak "my-task-id")   # must match work binding
cast send $ROUTER "submitDelivery(uint256,bytes32)" $DEAL_ID $RESULT_HASH \
  --private-key $PAYEE_PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

Tool: `submit_delivery` — `{ "dealId": "42", "workDescription": "my-task-id" }` (payee session)

---

## Attest Release

### Overview

Payer confirms delivery quality; enables immediate claim.

### Method A (Preferred) — cast

```bash
cast send $ROUTER "attestRelease(uint256,bytes32)" $DEAL_ID $RESULT_HASH \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

Tool: `attest_release` — `{ "dealId": "42", "workDescription": "my-task-id" }`

---

## Claim (Complete Settlement)

### Overview

Payee withdraws escrowed tokens after attest or auto-release window.

### Method A (Preferred) — cast

```bash
# Check first
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC

export PROOF_HASH=$(cast keccak "proof-v1")
cast send $ROUTER "claim(uint256,bytes32)" $DEAL_ID $PROOF_HASH \
  --private-key $PAYEE_PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

Tool: `complete_claim_for_deal` — `{ "dealId": "42" }`

Poll: `get_settlement_status` → act on `nextAction: "claim"`.

---

## Reclaim (Ghost Payee)

### Overview

Payer recovers funds when payee never delivered and TTL expired.

### Method A (Preferred) — cast

```bash
cast send $ROUTER "reclaim(uint256)" $DEAL_ID \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

Tool: `reclaim_trusted_settlement` — `{ "dealId": "42" }`

---

## Reject Delivery

### Overview

Payer safety valve for junk delivery. Requires auditable `reasonHash`.

### Method A (Preferred) — cast

```bash
export REASON_HASH=$(cast keccak "junk-delivery-reason")
cast send $ROUTER "rejectDelivery(uint256,bytes32)" $DEAL_ID $REASON_HASH \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

### Method B (MCP)

Tool: `reject_delivery` — `{ "dealId": "42", "reason": "junk output" }`

---

## Ghost Protection Flows

| Scenario | What happens | Action |
|----------|--------------|--------|
| Payee ghosts | TTL expires, no delivery | `reclaim` |
| Payer ghosts after delivery | Auto-release after `disputeWindow` | Payee `claim` when `canClaim` is true |
| Junk delivery | Payer rejects during window | `rejectDelivery` |
| Both cooperate | Attest → claim | Standard flow |

---

## Batch Payroll (SALI FastPay)

### Method A (Preferred) — cast loop

Repeat fund + claim per job. For N payees, run `fundAndAcceptHybrid` N times, hand off `dealId`s, then each payee claims.

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
| `only payee` | Wrong key on delivery/claim | Use payee key |
| `only payer` | Wrong key on attest/reject | Use payer key |
| `token not allowed` | Token not seeded | Use `assets/tokens.json` addresses |

> **Agent Guidelines:**
> 1. Complete default pre-checks (SKILL.md) — not MCP setup unless user chose MCP.
> 2. Prefer Method A (cast) unless user requests MCP or MCP tools are already in session.
> 3. Simulate before fund: `cast estimate` or MCP `simulate_trusted_settlement`.
> 4. Show explorer link: `{explorerUrl}/tx/{txHash}` from `assets/networks.json`.
