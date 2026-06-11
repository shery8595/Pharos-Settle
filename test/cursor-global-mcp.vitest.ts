import { describe, expect, it } from "vitest";
import { mergePharosSettleMcp } from "../scripts/lib/cursor-global-mcp.mjs";

describe("mergePharosSettleMcp", () => {
  const pharos = {
    "pharos-settle": {
      command: "node",
      args: ["E:/pharos/bin/pharos-settle-mcp.mjs"],
    },
  };

  it("creates mcpServers when config is empty", () => {
    expect(mergePharosSettleMcp({}, pharos)).toEqual({ mcpServers: pharos });
  });

  it("preserves other global MCP servers", () => {
    const existing = {
      mcpServers: {
        supabase: { command: "npx", args: ["-y", "@supabase/mcp"] },
      },
    };
    const merged = mergePharosSettleMcp(existing, pharos);
    expect(merged.mcpServers.supabase).toEqual(existing.mcpServers.supabase);
    expect(merged.mcpServers["pharos-settle"]).toEqual(pharos["pharos-settle"]);
  });

  it("replaces stale pharos-settle path", () => {
    const existing = {
      mcpServers: {
        "pharos-settle": {
          command: "node",
          args: ["E:/old/Pharos-Settle/bin/pharos-settle-mcp.mjs"],
        },
      },
    };
    const merged = mergePharosSettleMcp(existing, pharos);
    expect(merged.mcpServers["pharos-settle"].args[0]).toBe("E:/pharos/bin/pharos-settle-mcp.mjs");
  });

  it("throws when pharos-settle entry is invalid", () => {
    expect(() => mergePharosSettleMcp({}, { "pharos-settle": { command: "node" } })).toThrow(
      /pharos-settle/
    );
  });
});
