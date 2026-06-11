import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type Chain,
  type Transport,
  type EIP1193RequestFn,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import type { SettlementConfig } from "./schemas.js";
import { scheduleRpc, withRpcRetry } from "./rpc.js";

export type InProcessProvider = {
  send(method: string, params?: unknown[]): Promise<unknown>;
};

function rateLimitedHttp(rpcUrl: string): Transport {
  const base = http(rpcUrl, { batch: false, timeout: 30_000, retryCount: 0 });
  return (opts) => {
    const inner = base(opts);
    return {
      ...inner,
      request: (args, options) =>
        scheduleRpc(() => withRpcRetry("transport", () => inner.request(args, options))),
    };
  };
}

function plainHttp(rpcUrl: string): Transport {
  return http(rpcUrl, { batch: false, timeout: 30_000, retryCount: 0 });
}

export function transportFromConfig(config: SettlementConfig, rpcUrl: string): Transport {
  if (config.inProcessProvider) {
    const provider = config.inProcessProvider;
    const request = (async ({ method, params }) =>
      provider.send(method, params as unknown[] | undefined)) as EIP1193RequestFn;
    return custom({ request });
  }
  if (config.rpcBurstWrites) {
    return plainHttp(rpcUrl);
  }
  return rateLimitedHttp(rpcUrl);
}

export function publicClient(chain: Chain, config: SettlementConfig, rpcUrl: string) {
  return createPublicClient({ chain, transport: transportFromConfig(config, rpcUrl) });
}

export function walletClient(
  account: PrivateKeyAccount,
  chain: Chain,
  config: SettlementConfig,
  rpcUrl: string
) {
  return createWalletClient({ account, chain, transport: transportFromConfig(config, rpcUrl) });
}
