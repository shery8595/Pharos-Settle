# Transaction Operations

```bash
# --- Environment Setup ---
export RPC=$(jq -r '.atlantic.rpcUrl' assets/networks.json)
export ROUTER=$(jq -r .settlementRouter assets/deployments.json)
export ESCROW=$(jq -r .dealEscrow assets/deployments.json)
export REGISTRY=$(jq -r .agentRegistry assets/deployments.json)
export TOKEN=$(jq -r .mockToken assets/deployments.json)   # see assets/tokens.json
export AMOUNT=1000000000000000000                        # 1 TEST (18 decimals)
export PAYER_PRIVATE_KEY=0xYourPayerKey
export PAYEE=0xYourPayeeAddress
export PAYER=$(cast wallet address --private-key $PAYER_PRIVATE_KEY)
# Fund params (for gas estimate)
export WORK_HASH=$(cast keccak "my-task-id")
export PREFLIGHT_HASH=$(cast keccak "preflight-v1")
export TTL=604800
export DISPUTE_WINDOW=259200
export ARBITER=0x0000000000000000000000000000000000000000
# --------------------------
```

> **Network:** `$RPC` from `assets/networks.json`  
> **Keys:** `$PAYER_PRIVATE_KEY` for payer writes. Pass explicitly `--private-key $PAYER_PRIVATE_KEY` on every write. Foundry does **not** auto-read env.

Complete **Default Pre-checks** (see root `SKILL.md`) before any write.

---

## Approve Token for Escrow

Required before `fundAndAcceptHybrid`. The spender is **DealEscrow** (`$ESCROW`), not the router — `fund()` pulls tokens via `safeTransferFrom(payer, escrow, amount)`.

### Pre-check

```bash
cast call $TOKEN "allowance(address,address)(uint256)" $PAYER $ESCROW --rpc-url $RPC
```

### Method A (Preferred) — cast

```bash
# Correct: spender is DealEscrow ($ESCROW), not SettlementRouter ($ROUTER)
cast send $TOKEN "approve(address,uint256)" $ESCROW $AMOUNT \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

### Post-check

```bash
cast call $TOKEN "allowance(address,address)(uint256)" $PAYER $ESCROW --rpc-url $RPC
```

| Parameter | Description |
|-----------|-------------|
| `$TOKEN` | From `assets/tokens.json` |
| `$ESCROW` | `dealEscrow` in `assets/deployments.json` |
| `$AMOUNT` | Wei string (e.g. `10000000000000000000` for 10 TEST) |

---

## Register Payee (Sponsor Flow)

Payer must already be registered on `AgentRegistry`.

### Pre-check

```bash
cast call $REGISTRY "isRegistered(address)(bool)" $PAYER --rpc-url $RPC   # must be true
cast call $REGISTRY "isRegistered(address)(bool)" $PAYEE --rpc-url $RPC   # false → register
```

```bash
cast send $REGISTRY "registerRecipient(address)" $PAYEE \
  --private-key $PAYER_PRIVATE_KEY --rpc-url $RPC
```

### Post-check

```bash
cast call $REGISTRY "isRegistered(address)(bool)" $PAYEE --rpc-url $RPC   # must be true
```

### Method B (MCP)

Tool: `register_recipients` with `{ "recipients": ["0x..."], "mock": false }`

---

## Estimate Gas

```bash
cast estimate $ROUTER "fundAndAcceptHybrid(address,address,address,uint256,uint256,bytes32,bytes32,bool,uint64,address)" \
  $PAYER $PAYEE $TOKEN $AMOUNT $TTL $WORK_HASH $PREFLIGHT_HASH true $DISPUTE_WINDOW $ARBITER \
  --rpc-url $RPC
```

---

## Gas Price

```bash
cast gas-price --rpc-url $RPC
```

---

## Helper: Hash Work Description

```bash
cast keccak "my-task-id-2026-06"
# or
cast keccak $(cast abi-encode "f(string)" "my-task-id-2026-06")
```

Use consistent hashing for `workHash`, `resultHash`, `preflightHash`, `proofHash`.

---

## Error Reference

| Revert error | Cause | Solution |
|--------------|-------|----------|
| `sponsor not registered` | Payer agent is not registered on AgentRegistry | Register payer first (owner `register` or sponsor flow) |
| `agent not registered` | Payee is not registered on AgentRegistry | `registerRecipient` via registered payer — see above |
| `ERC20: insufficient allowance` | Approved `$ROUTER` instead of `$ESCROW`, or amount too low | Approve `$ESCROW`; re-check `allowance` |
| `token not allowed` | Token not on allowlist | Use address from `assets/tokens.json` |
| `insufficient funds` | PHRS too low for gas | `cast balance $PAYER --rpc-url $RPC --ether` |

Full global list: [errors.md](errors.md).
