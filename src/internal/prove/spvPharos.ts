import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createPublicClient, http, type Address } from "viem";
import { ATLANTIC } from "../../shared/chain.js";
import type { ProveStage } from "../../shared/schemas.js";

const execFileAsync = promisify(execFile);

export async function verifySpvPostSettlement(params: {
  rpcUrl?: string;
  address: Address;
  blockNumber?: bigint;
}): Promise<ProveStage> {
  const rpcUrl = params.rpcUrl ?? ATLANTIC.rpcUrl;
  const client = createPublicClient({ transport: http(rpcUrl) });
  const block: `0x${string}` | "latest" =
    params.blockNumber !== undefined
      ? (`0x${params.blockNumber.toString(16)}` as `0x${string}`)
      : "latest";

  const proof = await client.request({
    method: "eth_getProof",
    params: [params.address, [], block] as const,
  });

  const tmpDir = join(process.cwd(), "tmp");
  await mkdir(tmpDir, { recursive: true });
  const proofPath = join(tmpDir, "proof.json");
  await writeFile(proofPath, JSON.stringify({ result: proof }, null, 2));

  try {
    const script = join(process.cwd(), "vendor", "spv_verify.py");
    await execFileAsync("python3", [script, proofPath, "--address", params.address, "--no-rpc"], {
      timeout: 30_000,
    });
    return { verified: true, method: "spv", proofHash: undefined, reason: "spv_verify.py ok" };
  } catch (e) {
    return {
      verified: false,
      method: "spv",
      reason: (e as Error).message,
    };
  }
}
