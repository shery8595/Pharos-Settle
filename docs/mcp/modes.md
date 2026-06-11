# MCP modes — project vs global

Pharos Settle supports two ways to connect MCP in Cursor (and similar IDEs). `npm run setup` asks which you prefer and writes your choice to `.pharos-settle/setup-checklist.json`.

## Compare

| | **Project mode** | **Global mode** |
|---|------------------|-----------------|
| **Best for** | Judges, first demo, working only in this repo | Your own agent app in another folder |
| **Cursor MCP config** | Committed `.cursor/mcp.json` (`cwd`: `${workspaceFolder}`) | **Settings → MCP → Add global server** |
| **Workspace** | Open **Pharos-Settle** as workspace root | Any project — MCP points at fixed Pharos clone path |
| **Skill location** | `.cursor/skills/trusted-agent-settlement/` (setup copies here) | `~/.cursor/skills/trusted-agent-settlement/` (setup copies here too) |
| **Generated config** | `.cursor/mcp.json` already works after reload | Paste from `.pharos-settle/mcp-bin.generated.json` |

Both modes use the **same MCP server** and **same `.env`** in your Pharos-Settle clone. Keys are read from that clone on every tool call.

---

## Project mode (default)

Plug-and-play for hackathons and repo development.

1. `git clone` → `cd Pharos-Settle` → `npm run setup` → choose **1** (project)
2. Open **Pharos-Settle** as workspace root (`File → Open Folder`)
3. **Settings → MCP** → reload **pharos-settle**
4. Agent confirms workspace + MCP — see [AGENTS.md](../../AGENTS.md)

Committed config:

```json
{
  "mcpServers": {
    "pharos-settle": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

`${workspaceFolder}` must be the Pharos-Settle repo root (the folder that contains `.cursor/mcp.json`).

---

## Global mode

Use settlement tools from **any** Cursor workspace while MCP runs from one Pharos install on disk.

1. `git clone` → `cd Pharos-Settle` → `npm run setup` → choose **2** (global)
2. **Cursor → Settings → MCP → Add new global MCP server**
3. Paste the `pharos-settle` block from **`.pharos-settle/mcp-bin.generated.json`** (recommended — no `cwd` needed):

```json
"pharos-settle": {
  "command": "node",
  "args": ["E:/path/to/Pharos-Settle/bin/pharos-settle-mcp.mjs"]
}
```

Or use **`.pharos-settle/mcp.generated.json`** (absolute `cwd` + `npx tsx`).

4. Reload **pharos-settle** in MCP settings
5. Open **any** project in Cursor — global MCP + global skill apply
6. Agent confirms global MCP connected (not workspace root) — see [AGENTS.md](../../AGENTS.md)

**Keys:** still live in `<Pharos-Settle>/.env` on disk, not in the project you have open.

---

## Non-interactive setup

**Agents** running `npm run setup` in Cursor often have **no TTY** — CLI prompts are skipped (`mcpMode` and `runMode` stay `null`). The **agent must ask you** project/global and demo/live in chat (see `AGENTS.md`).

Run yourself in a terminal for interactive prompts, or pass flags:

```bash
npm run setup -- --mode=project --run=demo
npm run setup -- --mode=global --run=live
```

Interactive setup also asks **demo vs live**. Live mode pauses for you to edit `.env` (`PRIVATE_KEY`, `AGENT_B_PRIVATE_KEY`) before continuing.

---

## Claude Desktop / other IDEs

Global-style config is the norm: paste from `.pharos-settle/mcp.generated.json` into your IDE’s user MCP config. See [other-ides.md](other-ides.md).

---

## Troubleshooting

| Symptom | Project mode | Global mode |
|---------|--------------|-------------|
| MCP missing | Open Pharos-Settle as root, not parent folder | Add global server from `mcp-bin.generated.json` |
| Tools work in CLI but not chat | Reload MCP | Reload global MCP; check absolute path |
| Wrong network / contracts | Re-run `npm run setup` for fresh generated JSON | Same |

---

## Related

- [setup.md](setup.md) — first-run checklist  
- [other-ides.md](other-ides.md) — IDE-specific paths  
- [AGENTS.md](../../AGENTS.md) — agent confirmation flow per mode
