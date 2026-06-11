# Ghost payer example

**File:** `examples/ghost-payer/run-ghost-payer.ts`

Demonstrates payee getting paid when the payer ghosts after delivery.

## Flow

1. Payer funds hybrid deal
2. Payee submits delivery
3. Payer **never** attests (`skipAttest: true` in SDK)
4. Wait for `disputeWindow` (auto-release)
5. Payee claims

## Run

```bash
npm run demo:ghost-payer
npm run demo:ghost-payer:simulate
```

## SDK pattern

```typescript
const result = await executeTrustedSettlement(input, { skipAttest: true });

// Poll status
let status = await getSettlementStatus(result.dealId!);
while (status.nextAction === "wait") {
  await sleep(5000);
  status = await getSettlementStatus(result.dealId!);
}

await completeClaimForDeal(result.dealId!, input, config);
```

## MCP prompt

Use `recover-from-ghost-payer` prompt — see [Resources and prompts](../mcp/resources-and-prompts.md).

## Related docs

- [Settlement flows](../sdk/settlement-flows.md)
- [On-chain flows](../architecture/on-chain-flows.md)
