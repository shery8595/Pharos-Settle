import {
  createWalletClient,
  createPublicClient,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ATLANTIC, explorerTxUrl, loadDeployments, resolveDeploymentNetwork } from "../../shared/chain.js";
import { agentRegistryAbi } from "../../shared/abis.js";
import type { SettlementConfig } from "../../shared/schemas.js";
import { withRpcRetry } from "../../shared/rpc.js";
import { transportFromConfig } from "../../shared/clients.js";
import { mockRegister } from "./mockRegistry.js";

const pharosChain = {
  id: ATLANTIC.chainId,
  name: "Pharos Atlantic",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: { default: { http: [ATLANTIC.rpcUrl] } },
} as const;

export type RegisterRecipientsOutput = {
  success: boolean;
  registered: string[];
  alreadyRegistered: string[];
  registerTx?: string;
  explorerLink?: string;
};

function payerKey(config: SettlementConfig): Hex {
  const pk = (config.payerSigner ?? process.env.PRIVATE_KEY)?.trim();
  if (!pk || pk.length < 66) throw new Error("Missing PRIVATE_KEY");
  return pk as Hex;
}

function uniqueAddresses(addresses: string[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const raw of addresses) {
    const addr = raw as Address;
    const key = addr.toLowerCase();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr) || seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  return out;
}

export async function registerRecipients(
  addresses: string[],
  config: SettlementConfig = {}
): Promise<RegisterRecipientsOutput> {
  const unique = uniqueAddresses(addresses);
  if (unique.length === 0) {
    return { success: true, registered: [], alreadyRegistered: [] };
  }

  if (config.mock) {
    mockRegister(unique);
    return {
      success: true,
      registered: unique,
      alreadyRegistered: [],
      registerTx: "0x" + "66".repeat(32),
    };
  }

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const registry = deployments.agentRegistry as Address;
  const chain = { ...pharosChain, id: deployments.chainId, rpcUrls: { default: { http: [rpcUrl] } } } as const;

  const transport = transportFromConfig(config, rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const payerAccount = privateKeyToAccount(payerKey(config));
  const payerClient = createWalletClient({ account: payerAccount, chain, transport });

  const statuses = await Promise.all(
    unique.map((addr) =>
      withRpcRetry(`isRegistered ${addr}`, () =>
        publicClient.readContract({
          address: registry,
          abi: agentRegistryAbi,
          functionName: "isRegistered",
          args: [addr],
        })
      )
    )
  );

  const alreadyRegistered = unique.filter((_, i) => statuses[i]);
  const toRegister = unique.filter((_, i) => !statuses[i]);

  if (toRegister.length === 0) {
    return { success: true, registered: [], alreadyRegistered };
  }

  const sponsorRegistered = await withRpcRetry("sponsor registered", () =>
    publicClient.readContract({
      address: registry,
      abi: agentRegistryAbi,
      functionName: "isRegistered",
      args: [payerAccount.address],
    })
  );
  if (!sponsorRegistered) {
    throw new Error("Payer must be registered before onboarding recipients");
  }

  const registerTx = await withRpcRetry("registerRecipients", () =>
    payerClient.writeContract({
      address: registry,
      abi: agentRegistryAbi,
      functionName: "registerRecipients",
      args: [toRegister],
    })
  );

  await withRpcRetry("registerRecipients receipt", () =>
    publicClient.waitForTransactionReceipt({ hash: registerTx })
  );

  return {
    success: true,
    registered: toRegister,
    alreadyRegistered,
    registerTx,
    explorerLink: explorerTxUrl(registerTx, deployments.chainId),
  };
}

export async function registerRecipient(
  address: string,
  config: SettlementConfig = {}
): Promise<RegisterRecipientsOutput> {
  return registerRecipients([address], config);
}

export async function filterUnregistered(
  addresses: string[],
  config: SettlementConfig = {}
): Promise<string[]> {
  if (config.mock) return uniqueAddresses(addresses);

  const deployments = loadDeployments(resolveDeploymentNetwork(config));
  const rpcUrl = config.rpcUrl ?? ATLANTIC.rpcUrl;
  const registry = deployments.agentRegistry as Address;
  const publicClient = createPublicClient({ transport: transportFromConfig(config, rpcUrl) });

  const unique = uniqueAddresses(addresses);
  const statuses = await Promise.all(
    unique.map((addr) =>
      publicClient.readContract({
        address: registry,
        abi: agentRegistryAbi,
        functionName: "isRegistered",
        args: [addr],
      })
    )
  );
  return unique.filter((_, i) => !statuses[i]);
}
