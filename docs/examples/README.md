# Examples

Runnable demos and integration patterns.

## npm scripts

| Script | File | Description |
|--------|------|-------------|
| `demo` | `scripts/demo.ts` | Default demo |
| `demo:pharos` | `scripts/demo.ts` | Live Atlantic |
| `demo:simulate` | `scripts/demo.ts` | Mock simulate |
| `demo:batch` | `examples/pipeline/run-batch.ts` | SALI `saliFast` batch |
| `demo:batch:split` | `examples/pipeline/run-batch-split.ts` | Two-MCP batch handoff |
| `demo:batch:simulate` | `examples/pipeline/run-batch.ts` | Mock batch |
| `demo:batch:split:simulate` | `examples/pipeline/run-batch-split.ts` | Mock split batch |
| `demo:ghost-payee` | `examples/ghost-payee/run-ghost-payee.ts` | Payee ghosts → reclaim |
| `demo:ghost-payer` | `examples/ghost-payer/run-ghost-payer.ts` | Payer ghosts → auto-release |
| `demo:reclaim` | `examples/ghost-payee/run-ghost-payee.ts` | Alias for `demo:ghost-payee` |
| `demo:agent` | `examples/agent-consumer/openai-agent.ts` | NL agent |
| `demo:pipeline` | `examples/pipeline/run-pipeline.ts` | Composable steps |

## Documentation

- [Demos](demos.md) — full command table
- [Batch pipeline](batch-pipeline.md)
- [Ghost payee](ghost-payee.md)
- [Ghost payer](ghost-payer.md)
- [Agent consumer](agent-consumer.md)

## Video script

[Demo video script](../demo-script.md) — <3 min recording guide.

## Hackathon

[SUBMISSION.md](../SUBMISSION.md) — project submission details.
