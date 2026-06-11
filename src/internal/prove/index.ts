import { keccak256, toBytes, type Address, type Hash } from "viem";
import type { SettlementConfig } from "../../shared/schemas.js";
import type { ProveStage } from "../../shared/schemas.js";
import { verifySettlementReceipt } from "./receiptVerify.js";
import { verifySpvPostSettlement } from "./spvPharos.js";
import { loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";

export type ProveInput = {
  token: string;
  payee: string;
  amount: string;
  claimTxHash?: Hash;
  claimBlockNumber?: bigint;
};

export async function prove(
  input: ProveInput,
  config: SettlementConfig = {}
): Promise<{ preSettlement?: ProveStage; postSettlement?: ProveStage }> {
  const tier = config.proveTier ?? "receipt";

  const preSettlement: ProveStage = {
    verified: true,
    method: "skipped",
    reason: "pre-settlement SPV optional in Phase 1; preflight covers readiness",
  };

  if (!input.claimTxHash) {
    return { preSettlement, postSettlement: { verified: false, method: "skipped", reason: "no claim tx" } };
  }

  if (config.mock) {
    return {
      preSettlement,
      postSettlement: {
        verified: true,
        method: "receipt",
        proofHash: keccak256(toBytes(`mock:${input.claimTxHash}`)),
      },
    };
  }

  if (tier === "spv") {
    const spv = await verifySpvPostSettlement({
      rpcUrl: config.rpcUrl,
      address: input.payee as Address,
      blockNumber: input.claimBlockNumber,
    });
    return { preSettlement, postSettlement: spv };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const postSettlement = await verifySettlementReceipt({
    rpcUrl: config.rpcUrl,
    config,
    token: input.token as Address,
    payee: input.payee as Address,
    escrowAddress: deployments.dealEscrow as Address,
    amount: BigInt(input.amount),
    claimTxHash: input.claimTxHash,
  });

  return { preSettlement, postSettlement };
}

export function computeProofHash(claimTxHash: string, amount: string, payee: string): `0x${string}` {
  return keccak256(toBytes(`${claimTxHash}:${amount}:${payee.toLowerCase()}`));
}
