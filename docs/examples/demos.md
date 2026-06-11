# Demo commands

Canonical list of demo scripts. Entry points (README, SUBMISSION, JUDGES) mirror a shortened table from this file.

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

## Key demos

| Command | What it shows |
|---------|----------------|
| `npm run demo:simulate` | Preflight + fee quote (no gas) |
| `npm run demo:pharos` | End-to-end cooperative settlement on Atlantic |
| `npm run demo:ghost-payee` | Ghost payee — payer reclaims when worker never delivers |
| `npm run demo:ghost-payee:simulate` | Ghost payee mock (<5s, no keys) |
| `npm run demo:ghost-payer` | Ghost payer — payee paid when payer ghosts |
| `npm run demo:ghost-payer:simulate` | Ghost payer mock (<60s, no keys) |
| `npm run demo:batch` | SALI FastPay batch payroll (`saliFast`, BATCH_SIZE=5) |
| `npm run demo:batch:simulate` | Batch flow in mock mode |
| `npm run demo:batch:split` | Two-agent manifest handoff (saliFast or hybridWork) |
| `npm run demo:batch:split:simulate` | Split batch mock |
| `npm run demo:agent` | Generic agent uses Skill (no settlement code) |
| `npm run demo:pipeline` | Composable Layer 2 pipeline (`steps.ts`) |
| `npm run demo:spv` | SPV prove tier on Atlantic |
| `npm run demo:reclaim` | **Alias** for `demo:ghost-payee` (backward compat) |
| `npm run agent:doctor:mock` | MCP readiness — 15 tools, no keys |

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

## Ghost payee (dual-ghost protection)

```bash
npm run demo:ghost-payee
npm run demo:ghost-payee:simulate
```

Payer reclaims after payee ghosts (no delivery). See [ghost-payee.md](ghost-payee.md).

## Ghost payer (dual-ghost protection)

```bash
npm run demo:ghost-payer
npm run demo:ghost-payer:simulate
```

Payee paid after payer ghosts (auto-release). See [ghost-payer.md](ghost-payer.md).

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

## Video recording

See [demo-script.md](../demo-script.md) for a ~90s script covering dual-ghost protection, MCP, SALI batch, and live Atlantic proof.
