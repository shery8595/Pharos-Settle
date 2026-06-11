# Transaction Operations

> **Network:** `$RPC` from `assets/networks.json`  
> **Private key:** Pass explicitly `--private-key $PRIVATE_KEY` on every write. Foundry does **not** auto-read env.

Complete **Default Pre-checks** (see root `SKILL.md`) before any write.

---

## Approve Token for Router

Required before `fundAndAcceptHybrid`.

### Method A (Preferred) — cast

```bash
cast send $TOKEN "approve(address,uint256)" $ROUTER $AMOUNT \
  --private-key $PRIVATE_KEY --rpc-url $RPC
```

| Parameter | Description |
|-----------|-------------|
| `$TOKEN` | From `assets/tokens.json` |
| `$ROUTER` | `settlementRouter` in `assets/deployments.json` |
| `$AMOUNT` | Wei string (e.g. `10000000000000000000` for 10 TEST) |

---

## Register Payee (Sponsor Flow)

Payer must already be registered on `AgentRegistry`.

```bash
cast send $REGISTRY "registerRecipient(address)" $PAYEE \
  --private-key $PRIVATE_KEY --rpc-url $RPC
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
