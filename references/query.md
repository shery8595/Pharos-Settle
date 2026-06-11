# Query Operations

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
| `$DEPLOYER` | address | Yes | `cast wallet address --private-key $PRIVATE_KEY` |
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

### Can Claim?

```bash
cast call $ROUTER "canClaim(uint256)(bool)" $DEAL_ID --rpc-url $RPC
```

Returns `true` when payee may call `claim`.

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
