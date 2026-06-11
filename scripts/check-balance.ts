import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { createPublicClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  const rpc = process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com";
  const client = createPublicClient({ transport: http(rpc) });
  const payer = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const payee = privateKeyToAccount(process.env.AGENT_B_PRIVATE_KEY as `0x${string}`);
  const [payerBal, payeeBal, block] = await Promise.all([
    client.getBalance({ address: payer.address }),
    client.getBalance({ address: payee.address }),
    client.getBlockNumber(),
  ]);
  console.log("block", block.toString());
  console.log("payer", payer.address, formatEther(payerBal), "PHRS");
  console.log("payee", payee.address, formatEther(payeeBal), "PHRS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
