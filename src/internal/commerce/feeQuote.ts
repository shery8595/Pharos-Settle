import { createPublicClient, type Address } from "viem";
import { transportFromConfig } from "../../shared/clients.js";
import { ATLANTIC, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { dealEscrowAbi } from "../../shared/abis.js";
import type { FeeQuote, SettlementConfig } from "../../shared/schemas.js";

export async function getFeeQuote(amount: string, config: SettlementConfig = {}): Promise<FeeQuote> {
  const gross = BigInt(amount);
  if (config.mock) {
    return {
      feeBps: 0,
      feeAmount: "0",
      payeeAmount: amount,
      grossAmount: amount,
    };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const client = createPublicClient({ transport: transportFromConfig(config, rpcUrl) });

  try {
    const feeBps = Number(
      await client.readContract({
        address: deployments.dealEscrow as Address,
        abi: dealEscrowAbi,
        functionName: "feeBps",
      })
    );
    const feeAmount = (gross * BigInt(feeBps)) / 10_000n;
    const payeeAmount = gross - feeAmount;
    return {
      feeBps,
      feeAmount: feeAmount.toString(),
      payeeAmount: payeeAmount.toString(),
      grossAmount: amount,
    };
  } catch {
    return {
      feeBps: 0,
      feeAmount: "0",
      payeeAmount: amount,
      grossAmount: amount,
    };
  }
}
