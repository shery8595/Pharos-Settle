import {
  createPublicClient,
  http,
  keccak256,
  toBytes,
  decodeEventLog,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { ATLANTIC } from "../../shared/chain.js";
import { erc20Abi } from "../../shared/abis.js";
import type { ProveStage } from "../../shared/schemas.js";
import type { SettlementConfig } from "../../shared/schemas.js";
import { transportFromConfig } from "../../shared/clients.js";

export async function verifySettlementReceipt(params: {
  rpcUrl?: string;
  config?: SettlementConfig;
  token: Address;
  payee: Address;
  escrowAddress: Address;
  /** Net amount transferred to payee on claim (gross minus protocol fee). */
  payeeAmount: bigint;
  claimTxHash: Hash;
}): Promise<ProveStage> {
  const rpcUrl = params.config?.rpcUrl ?? params.rpcUrl ?? ATLANTIC.rpcUrl;
  const transport = params.config
    ? transportFromConfig(params.config, rpcUrl)
    : http(rpcUrl);
  const client = createPublicClient({ transport });
  const start = Date.now();
  const receipt = await client.waitForTransactionReceipt({ hash: params.claimTxHash });
  const finalityMs = Date.now() - start;

  const transfer = findTransferToPayee(
    receipt,
    params.token,
    params.payee,
    params.escrowAddress,
    params.payeeAmount
  );
  if (!transfer) {
    return {
      verified: false,
      method: "receipt",
      reason: "Transfer event to payee not found in claim receipt",
    };
  }

  const proofHash = keccak256(
    toBytes(`${params.claimTxHash}:${params.payeeAmount.toString()}:${params.payee.toLowerCase()}`)
  );

  return {
    verified: true,
    method: "receipt",
    proofHash,
    transferLogIndex: transfer.logIndex,
    blockNumber: receipt.blockNumber.toString(),
    reason: `finalityMs=${finalityMs}`,
  };
}

function findTransferToPayee(
  receipt: TransactionReceipt,
  token: Address,
  payee: Address,
  from: Address,
  amount: bigint
): { logIndex: number } | null {
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    if (log.address.toLowerCase() !== token.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics });
      if (decoded.eventName !== "Transfer") continue;
      const args = decoded.args as { from: Address; to: Address; value: bigint };
      if (
        args.from.toLowerCase() === from.toLowerCase() &&
        args.to.toLowerCase() === payee.toLowerCase() &&
        args.value === amount
      ) {
        return { logIndex: i };
      }
    } catch {
      continue;
    }
  }
  return null;
}
