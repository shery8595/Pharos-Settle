import type { NextAction } from "./abis.js";

export type CheckResult = {
  name: string;
  passed: boolean;
  reason?: string;
};

export type SettlementMode = "cooperative" | "safetyNet";

export type TrustedSettlementInput = {
  agentA: string;
  agentB: string;
  token: string;
  amount: string;
  workDescription: string;
  ttlSeconds?: number;
  requiresHybridRelease?: boolean;
  disputeWindowSeconds?: number;
  /** Optional dispute arbiter; address(0) = cooperative instant-refund rejection. */
  arbiter?: string;
};

export type BatchMode = "saliFast" | "hybridWork";

export type SettlementConfig = {
  payerSigner?: string;
  payeeSigner?: string;
  arbiterSigner?: string;
  mode?: SettlementMode | "demo";
  proveTier?: "receipt" | "spv";
  rpcUrl?: string;
  routerAddress?: string;
  deploymentNetwork?: string;
  mock?: boolean;
  /** Skip payer attest in cooperative mode (e.g. ghost-payer demo waits for auto-release). */
  skipAttest?: boolean;
  dealId?: string;
  /** When true, payer registers unregistered payee(s) before funding. */
  autoOnboardRecipients?: boolean;
  /** Hardhat in-process JSON-RPC (integration tests). */
  inProcessProvider?: { send(method: string, params?: unknown[]): Promise<unknown> };
  /** saliFast = fund+claim; hybridWork = fund+deliver+attest+claim. Default saliFast for batch. */
  batchMode?: BatchMode;
  /** Skip RPC rate-limit queue during parallel batch write submission (reads stay throttled). */
  rpcBurstWrites?: boolean;
};

export type BatchDealManifest = {
  index: number;
  dealId: string;
  fundTx: string;
  amount: string;
  agentA: string;
  agentB: string;
  token: string;
  workDescription: string;
  workHash: string;
  fundBlock?: string;
};

export type BatchClaimInput = {
  index?: number;
  dealId: string;
  fundTx: string;
  amount: string;
  agentB: string;
};

export type BatchDeliveryInput = {
  index?: number;
  dealId: string;
  workDescription?: string;
  resultHash?: string;
};

export type BatchAttestInput = {
  index?: number;
  dealId: string;
  workDescription?: string;
  resultHash?: string;
};

export type BatchPhaseDealResult = {
  index: number;
  success: boolean;
  dealId?: string;
  fundTx?: string;
  deliverTx?: string;
  attestTx?: string;
  claimTx?: string;
  fundBlock?: string;
  deliverBlock?: string;
  attestBlock?: string;
  claimBlock?: string;
  finalityMs?: number;
  feeAmount?: string;
  error?: string;
};

export type FeeQuote = {
  feeBps: number;
  feeAmount: string;
  payeeAmount: string;
  grossAmount: string;
};

export type ProveStage = {
  verified: boolean;
  method: "receipt" | "spv" | "skipped";
  proofHash?: string;
  transferLogIndex?: number;
  blockNumber?: string;
  reason?: string;
};

export type TrustedSettlementOutput = {
  success: boolean;
  dealId?: string;
  routerAddress: string;
  nextAction?: NextAction;
  feeQuote?: FeeQuote;
  stages: {
    preflight: {
      ready: boolean;
      checks: CheckResult[];
      preflightHash?: string;
    };
    onboard?: {
      registerTx?: string;
      recipients: string[];
      explorerLink?: string;
    };
    prove: {
      preSettlement?: ProveStage;
      postSettlement?: ProveStage;
    };
    settle?: {
      fundTx?: string;
      deliverTx?: string;
      attestTx?: string;
      claimTx?: string;
      settlementReceipt?: { txHash: string; blockNumber: string; finalityMs: number };
    };
  };
  explorerLink?: string;
  totalDurationMs: number;
};

export type SimulationOutput = Pick<
  TrustedSettlementOutput,
  "success" | "routerAddress" | "nextAction" | "feeQuote" | "stages" | "totalDurationMs"
>;

export type DealTerms = {
  payer: string;
  payee: string;
  token: string;
  amount: string;
  workHash: string;
  /** On-chain result hash after delivery; null until delivered. */
  onChainResultHash: string | null;
  /** Validate workDescription: keccak256(workDescription) must equal workHash. */
  workDescriptionHint: string;
};

export type SettlementStatus = {
  dealId: string;
  state: "Created" | "Funded" | "Accepted" | "Disputed" | "Released" | "Refunded";
  payer: string;
  payee: string;
  token: string;
  amount: string;
  deadline: string;
  reclaimable: boolean;
  rejectEligible: boolean;
  disputeOpen: boolean;
  resolveEligible: boolean;
  arbiter: string;
  rejectionReasonHash: string | null;
  requiresHybridRelease: boolean;
  deliverySubmitted: boolean;
  payerAttested: boolean;
  canClaim: boolean;
  autoReleaseAt?: string;
  nextAction: NextAction;
  feeQuote?: FeeQuote;
  explorerLink?: string;
  terms: DealTerms;
};

export type FundDealOutput = {
  success: boolean;
  dealId?: string;
  fundTx?: string;
  nextAction?: NextAction;
  terms?: DealTerms;
  stages?: {
    preflight: { ready: boolean; checks: CheckResult[] };
    onboard?: { recipients: string[] };
  };
  reason?: string;
};

export type AgentRole = "payer" | "payee" | "arbiter" | "demo" | "mock";

export type AgentReadinessCheck = {
  name: string;
  passed: boolean;
  action?: string | null;
};

export type AgentReadiness = {
  role: AgentRole;
  ready: boolean;
  checks: AgentReadinessCheck[];
  allowedTools: string[];
  nextStep: string;
};

export type RegisterRecipientsOutput = {
  success: boolean;
  registered: string[];
  alreadyRegistered: string[];
  registerTx?: string;
  explorerLink?: string;
};

export type ReclaimOutput = {
  success: boolean;
  dealId: string;
  refundTx?: string;
  reason?: string;
  nextAction?: NextAction;
};

export type RejectOutput = {
  success: boolean;
  dealId: string;
  refundTx?: string;
  reasonHash?: string;
  disputed?: boolean;
  reason?: string;
  nextAction?: NextAction;
};

export type DisputeOutcomeName = "release" | "refund" | "split";

export type ResolveDisputeOutput = {
  success: boolean;
  dealId: string;
  resolveTx?: string;
  outcome: DisputeOutcomeName;
  payeeBps?: number;
  reason?: string;
  nextAction?: NextAction;
};
