export const dealEscrowAbi = [
  { name: "feeBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "feeRecipient", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "canClaim", type: "function", stateMutability: "view", inputs: [{ name: "dealId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const settlementRouterAbi = [
  {
    name: "settle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "ttlSeconds", type: "uint256" },
      { name: "workHash", type: "bytes32" },
      { name: "preflightHash", type: "bytes32" },
      { name: "proofHash", type: "bytes32" },
    ],
    outputs: [{ name: "dealId", type: "uint256" }],
  },
  {
    name: "fundAndAccept",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "ttlSeconds", type: "uint256" },
      { name: "workHash", type: "bytes32" },
      { name: "preflightHash", type: "bytes32" },
    ],
    outputs: [{ name: "dealId", type: "uint256" }],
  },
  {
    name: "fundAndAcceptHybrid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payer", type: "address" },
      { name: "payee", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "ttlSeconds", type: "uint256" },
      { name: "workHash", type: "bytes32" },
      { name: "preflightHash", type: "bytes32" },
      { name: "requiresHybridRelease", type: "bool" },
      { name: "disputeWindow", type: "uint64" },
      { name: "arbiter", type: "address" },
    ],
    outputs: [{ name: "dealId", type: "uint256" }],
  },
  {
    name: "submitDelivery",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "resultHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "attestRelease",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "resultHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "proofHash", type: "bytes32" },
    ],
    outputs: [],
  },
  { name: "reclaim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "dealId", type: "uint256" }], outputs: [] },
  {
    name: "rejectDelivery",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "reasonHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "resolveDispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dealId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "payeeBps", type: "uint16" },
    ],
    outputs: [],
  },
  { name: "canClaim", type: "function", stateMutability: "view", inputs: [{ name: "dealId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  {
    name: "getDeal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "dealId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "payer", type: "address" },
          { name: "payee", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "state", type: "uint8" },
          { name: "deadline", type: "uint256" },
          { name: "workHash", type: "bytes32" },
          { name: "preflightHash", type: "bytes32" },
          { name: "proofHash", type: "bytes32" },
          { name: "requiresHybridRelease", type: "bool" },
          { name: "resultHash", type: "bytes32" },
          { name: "deliverySubmittedAt", type: "uint64" },
          { name: "disputeWindow", type: "uint64" },
          { name: "payerAttested", type: "bool" },
          { name: "arbiter", type: "address" },
          { name: "rejectionReasonHash", type: "bytes32" },
        ],
      },
    ],
  },
  { name: "isSettled", type: "function", stateMutability: "view", inputs: [{ name: "dealId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const erc20Abi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

export const agentRegistryAbi = [
  { name: "isRegistered", type: "function", stateMutability: "view", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  {
    name: "registerRecipient",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
  },
  {
    name: "registerRecipients",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agents", type: "address[]" }],
    outputs: [],
  },
] as const;

export const tokenAllowlistAbi = [
  { name: "isAllowed", type: "function", stateMutability: "view", inputs: [{ name: "token", type: "address" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const DEAL_STATE = ["Created", "Funded", "Accepted", "Disputed", "Released", "Refunded"] as const;

export const DISPUTE_OUTCOME = ["ReleaseToPayee", "RefundPayer", "Split"] as const;

export type NextAction =
  | "fund"
  | "onboardRecipient"
  | "deliver"
  | "attest"
  | "claim"
  | "reclaim"
  | "reject"
  | "resolve"
  | "wait"
  | "done";
