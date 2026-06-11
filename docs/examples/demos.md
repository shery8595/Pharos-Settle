# Demo commands

## Simulation (no gas)

```bash
npm run demo:simulate
```

Output: preflight checks, `feeQuote`, `nextAction`.

## Live Atlantic

```bash
npm run deploy:pharos
npm run seed:pharos
npm run demo:pharos
```

Full cooperative settlement with receipt prove.

## Batch / SALI

```bash
npm run demo:batch                    # saliFast on Atlantic (BATCH_SIZE=5)
npm run demo:batch:simulate           # mock
BATCH_SIZE=10 npm run demo:batch
BATCH_MODE=hybridWork npm run demo:batch

npm run demo:batch:split                # two-agent manifest handoff
BATCH_MODE=hybridWork npm run demo:batch:split
npm run demo:batch:split:simulate
```

Reports `batchMode`, `maxParallelInBlock`, `endToEndDealsPerSec`. See [batch-sali.md](../mcp/batch-sali.md).

## Ghost payer

```bash
npm run demo:ghost-payer
npm run demo:ghost-payer:simulate
```

Payee paid after payer ghosts (auto-release).

## Agent consumer

```bash
npm run demo:agent
```

OpenAI-style agent uses Skill — no settlement code in agent logic.

## Pipeline (composable steps)

```bash
npm run demo:pipeline
```

Uses `steps.ts` primitives directly.

## SPV prove tier

```bash
npm run demo:spv
```

`--prove-tier spv` on Atlantic.

## Reclaim demo

```bash
npm run demo:reclaim
```

Safety net flow.

## Video recording

See [demo-script.md](../demo-script.md) for a <3 minute script covering MCP, simulate, batch, agent, ghost payer.
