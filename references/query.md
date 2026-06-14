# Query Operations

```bash
# --- Environment Setup ---
export RPC=$(jq -r '.atlantic.rpcUrl' assets/networks.json)
export ROUTER=$(jq -r .settlementRouter assets/deployments.json)
export ESCROW=$(jq -r .dealEscrow assets/deployments.json)
export TOKEN=$(jq -r .mockToken assets/deployments.json)   # see assets/tokens.json for others
export DEAL_ID="1"
export TX_HASH="0xYourTransactionHash"
# Derive wallet address from payer key (or set explicitly)
export PAYER_PRIVATE_KEY=0xYourPayerKey
export DEPLOYER=$(cast wallet address --private-key $PAYER_PRIVATE_KEY)
# --------------------------
```

> **Network:** `$RPC` from `assets/networks.json` → `atlantic.rpcUrl`  
> **Contracts:** `assets/deployments.json`

All query operations are free (no gas).

---

## Native PHRS Balance

### Command Template

```bash
cast balance $DEPLOYER --rpc-url $RPC --ether
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `$DEPLOYER` | address | Yes | `cast wallet address --private-key $PAYER_PRIVATE_KEY` |
| `$RPC` | string | Yes | Atlantic RPC URL |

### Output Parsing

| Field | Description |
|-------|-------------|
| Decimal number | PHRS balance in ether units |

---

## ERC20 Token Balance

### Command Template

```bash
cast call $TOKEN "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC
```

Use token addresses from `assets/tokens.json`.

---

## Read Deal State

### Command Template

```bash
cast call $ROUTER "getDeal(uint256)((address,address,address,uint256,uint8,uint256,bytes32,bytes32,bytes32,bool,bytes32,uint64,uint64,bool,address,bytes32))" $DEAL_ID --rpc-url $RPC
```

`$ROUTER` = `assets/deployments.json` → `settlementRouter`.

Deal `state` is field 5 (`uint8`): `0` Created, `1` Funded, `2` Accepted, `3` Disputed, `4` Released, `5` Refunded.

### Can Claim?

```bash
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC
```

Returns `true` when payee may call `claim`.

### Registration Check

```bash
export REGISTRY=$(jq -r .agentRegistry assets/deployments.json)
cast call $REGISTRY "isRegistered(address)(bool)" $PAYEE --rpc-url $RPC
```

---

## Transaction Status

```bash
cast tx $TX_HASH --rpc-url $RPC
cast receipt $TX_HASH --rpc-url $RPC
```

---

## Settlement Events

```bash
cast logs --rpc-url $RPC --address $ROUTER "SettlementInitiated(uint256,address,address,address,uint256,bytes32)" --from-block 0
cast logs --rpc-url $RPC --address $ESCROW "DeliverySubmitted(uint256,address,bytes32)" --from-block 0
```

`$ESCROW` = `assets/deployments.json` → `dealEscrow`.

> **Agent Guidelines:** Prefer `canClaim` + `get_settlement_status` (MCP Method B) when polling multi-step flows.

---

## Error Reference

| Revert / symptom | Cause | Solution |
|------------------|-------|----------|
| Empty return from `cast call` | Wrong contract address or network | Confirm `$ROUTER` / `$ESCROW` from `assets/deployments.json` and `$RPC` chain-id `688689` |
| `connection refused` | Missing or bad RPC | Set `$RPC` from `assets/networks.json` |
| `transaction not found` | TX not indexed yet | Wait and retry `cast receipt`; confirm `$TX_HASH` |
| `canClaim` returns `false` | Attest pending, dispute window active, or deadline passed | Re-read `getDeal`; poll until window elapses or payer attests |
| `isRegistered` returns `false` | Agent not on registry | Register via [transaction.md](transaction.md) before funding |

Full global list: [errors.md](errors.md).
