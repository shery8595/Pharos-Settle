import { ATLANTIC } from "../../src/shared/chain.js";

async function rpcCall(method: string, params: unknown[] = []) {
  const res = await fetch(ATLANTIC.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function main() {
  console.log("Atlantic gates — RPC:", ATLANTIC.rpcUrl);

  const block = await rpcCall("eth_blockNumber");
  console.log("✓ eth_blockNumber:", block);

  const proof = (await rpcCall("eth_getProof", [
    "0x0000000000000000000000000000000000000001",
    [],
    "latest",
  ])) as { accountProof?: unknown[] };

  if (!proof?.accountProof || !Array.isArray(proof.accountProof)) {
    throw new Error("eth_getProof missing accountProof array (Pharos format)");
  }
  console.log("✓ eth_getProof returned accountProof with", proof.accountProof.length, "nodes");
  console.log("Gates passed.");
}

main().catch((e) => {
  console.error("Gates failed:", e);
  process.exit(1);
});
