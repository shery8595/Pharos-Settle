# Agent consumer example

**File:** `examples/agent-consumer/openai-agent.ts`

Shows a generic LLM agent paying another agent via the Skill — **no settlement code** in the agent.

## Run

```bash
npm run demo:agent
```

Requires API keys for the configured LLM provider (see file header).

## Pattern

1. Agent receives natural-language task ("pay agent B for labeling")
2. Agent invokes MCP tools or SDK via Skill instructions
3. `simulate_trusted_settlement` → `execute_trusted_settlement`
4. Agent reports dealId and outcome to user

## Skill dependency

Agent loads [`skills/trusted-agent-settlement/SKILL.md`](../../skills/trusted-agent-settlement/SKILL.md) or connects MCP server.

## Related docs

- [Skills integration](../skills/integration.md)
- [MCP setup](../mcp/setup.md)
