import { createPublicClient, http } from "viem";

const RPC = "{{RPC_URL}}";
const ROUTER = "{{ROUTER_ADDRESS}}" as const;

const client = createPublicClient({ transport: http(RPC) });

// Read deal state
const dealId = {{DEAL_ID}}n;
const canClaim = await client.readContract({
  address: ROUTER,
  abi: [/* SettlementRouter ABI */],
  functionName: "canClaim",
  args: [dealId],
});
