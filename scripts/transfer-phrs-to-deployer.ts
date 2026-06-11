import { config as loadEnv } from "dotenv";
loadEnv({ override: true });
import { createPublicClient, createWalletClient, formatEther, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ATLANTIC = {
  id: 688689,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com"] },
  },
} as const;

async function main() {
  const payeeKey = process.env.AGENT_B_PRIVATE_KEY?.trim();
  const payerKey = process.env.PRIVATE_KEY?.trim();
  if (!payeeKey || !payerKey) throw new Error("Set PRIVATE_KEY and AGENT_B_PRIVATE_KEY in .env");

  const payee = privateKeyToAccount(payeeKey as `0x${string}`);
  const payer = privateKeyToAccount(payerKey as `0x${string}`);
  const rpc = process.env.PHAROS_RPC_URL ?? "https://atlantic.dplabs-internal.com";
  const publicClient = createPublicClient({ chain: ATLANTIC, transport: http(rpc) });
  const walletClient = createWalletClient({ account: payee, chain: ATLANTIC, transport: http(rpc) });

  const bal = await publicClient.getBalance({ address: payee.address });
  const reserve = parseEther(process.env.TRANSFER_RESERVE_PHRS ?? "0.008");
  const amount = bal > reserve ? bal - reserve : 0n;
  if (amount <= 0n) throw new Error("Payee balance too low to transfer after reserve");

  console.log(`Transferring ${formatEther(amount)} PHRS`);
  console.log(`From payee ${payee.address} -> deployer ${payer.address}`);

  const hash = await walletClient.sendTransaction({ to: payer.address, value: amount });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Tx", hash, "status", receipt.status);

  const [payerBal, payeeBal] = await Promise.all([
    publicClient.getBalance({ address: payer.address }),
    publicClient.getBalance({ address: payee.address }),
  ]);
  console.log("After — payer", formatEther(payerBal), "PHRS | payee", formatEther(payeeBal), "PHRS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
