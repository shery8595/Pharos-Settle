# MCP setup — other IDEs

Pharos Settle uses a **standard stdio MCP server**. Any MCP client can connect with the same server block; only the **config file location** differs.

After clone:

```bash
npm run setup
```

Setup asks **project** or **global** MCP mode and writes **`.pharos-settle/setup-checklist.json`**. See [modes.md](modes.md).

- **Project (Cursor):** open Pharos-Settle as workspace root — `.cursor/mcp.json` uses `${workspaceFolder}`
- **Global (Cursor):** paste **`.pharos-settle/mcp-bin.generated.json`** into Settings → MCP → global servers
- **Other IDEs:** always use absolute path from **`.pharos-settle/mcp.generated.json`**

---

## Universal server block

```json
"pharos-settle": {
  "command": "npx",
  "args": ["tsx", "mcp/server.ts"],
  "cwd": "/absolute/path/to/Pharos-Settle",
  "env": {
    "PHAROS_RPC_URL": "https://atlantic.dplabs-internal.com"
  }
}
```

Alternative (no `tsx` in args path):

```json
"pharos-settle": {
  "command": "node",
  "args": ["/absolute/path/to/Pharos-Settle/bin/pharos-settle-mcp.mjs"]
}
```

No keys in `env` → **mock mode** (safe for judges).

---

## Cursor

| Item | Project mode | Global mode |
|------|--------------|-------------|
| MCP config | `.cursor/mcp.json` (`${workspaceFolder}`) | Settings → MCP → global — `mcp-bin.generated.json` |
| Skill | `.cursor/skills/trusted-agent-settlement/` | Same + `~/.cursor/skills/trusted-agent-settlement/` |
| Agent gate | `.cursor/rules/pharos-settle-mcp.mdc` | Same |

1. `npm run setup` — choose mode when prompted  
2. **Project:** open **Pharos-Settle** as workspace root → reload MCP  
3. **Global:** add global MCP server → reload — any workspace works  
4. Agent confirms per `mcpMode` in checklist (see `AGENTS.md`)

Guides: [modes.md](modes.md) · [setup.md](setup.md)

---

## Claude Desktop

| Item | Location |
|------|----------|
| MCP config | OS-specific — see [Claude MCP docs](https://modelcontextprotocol.io) |

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Merge into top-level `mcpServers` (use block from `.pharos-settle/mcp.generated.json`):

```json
{
  "mcpServers": {
    "pharos-settle": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "C:/path/to/Pharos-Settle",
      "env": {
        "PHAROS_RPC_URL": "https://atlantic.dplabs-internal.com"
      }
    }
  }
}
```

Restart Claude Desktop. Paste **`skills/trusted-agent-settlement/SKILL.md`** into a Project's custom instructions (Claude has no `.cursor/rules`).

**Agent gate:** Read `AGENTS.md` and `.pharos-settle/setup-checklist.json`; ask user to confirm repo path + MCP connected before settlement tools.

---

## Windsurf / Cline / Continue / other MCP IDEs

1. Find **MCP servers** in settings  
2. Add stdio server — paste `pharos-settle` from `.pharos-settle/mcp.generated.json`  
3. Reload MCP  
4. Add `AGENTS.md` or `skills/trusted-agent-settlement/SKILL.md` to project rules if supported  

---

## No MCP (terminal / Codex / scripts)

```bash
npm run agent:doctor:mock
npm run demo:simulate
npm run demo:pharos    # live — needs .env keys
```

SDK: `pharos-trusted-settlement` — see [sdk/README.md](../sdk/README.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP not listed | **Project:** open `Pharos-Settle` as root. **Global:** add server from `mcp-bin.generated.json` |
| Tools missing in chat | Reload MCP; restart IDE |
| `cwd` wrong | Re-run `npm run setup` — copies fresh `.pharos-settle/mcp.generated.json` |
| Windows spawn errors | Use generated config; run `npm run setup` (not nested manual `npm.cmd` spawn) |

---

## Related

- [AGENTS.md](../../AGENTS.md) — portable agent instructions  
- [modes.md](modes.md) — project vs global MCP  
- [setup.md](setup.md) — Cursor-first checklist  
- [roles.md](roles.md) — payer / payee / demo tool matrix
