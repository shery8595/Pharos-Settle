import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http("{{RPC_URL}}"),
});

// Write: fund deal via SettlementRouter
await client.writeContract({
  address: "{{ROUTER_ADDRESS}}",
  abi: [/* SettlementRouter ABI */],
  functionName: "fundAndAcceptHybrid",
  args: [/* payer, payee, token, amount, ttl, workHash, preflightHash, true, disputeWindow, arbiter */],
});
