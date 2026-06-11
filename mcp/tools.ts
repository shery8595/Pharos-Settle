// MCP SDK 1.29+ supports Zod v4 schemas via zod-compat (package.json pins zod@4.4.3).
import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  executeTrustedSettlement,
  simulateTrustedSettlement,
  getSettlementStatus,
  reclaimTrustedSettlement,
  rejectDeliveryForDeal,
  registerRecipients,
  completeClaimForDeal,
  fundDealSettlement,
  submitDeliveryForDeal,
  attestReleaseForDeal,
  getAgentReadinessStatus,
} from "../src/trustedAgentSettlement.js";
import {
  executeBatchSettlement,
  fundDealsBatch,
  submitDeliveriesBatch,
  attestReleasesBatch,
  claimDealsBatch,
} from "../src/internal/settle/batch.js";
import type {
  BatchAttestInput,
  BatchClaimInput,
  BatchDeliveryInput,
  BatchMode,
  SettlementConfig,
  TrustedSettlementInput,
} from "../src/shared/schemas.js";
import { hasValidPrivateKey, reloadProjectEnv } from "./reload-env.js";

const settlementFields = {
  agentA: z.string().describe("Payer agent address (0x...)"),
  agentB: z.string().describe("Payee agent address (0x...)"),
  token: z.string().describe("ERC20 token contract address"),
  amount: z.string().describe("Payment amount in token wei"),
  workDescription: z.string().describe("Description of work being paid for"),
  ttlSeconds: z.number().optional().describe("Deal deadline seconds (default 3600)"),
  disputeWindowSeconds: z.number().optional().describe("Auto-release window after delivery (default 259200)"),
  requiresHybridRelease: z.boolean().optional().describe("Work-based hybrid release (default true)"),
};

const settlementInputSchema = z.object(settlementFields);

const modeSchema = z
  .enum(["cooperative", "safetyNet"])
  .optional()
  .describe("cooperative = pay for work; safetyNet = reclaim");

const batchModeSchema = z
  .enum(["saliFast", "hybridWork"])
  .optional()
  .describe("saliFast = fund+claim; hybridWork = fund+deliver+attest+claim");

const claimItemSchema = z.object({
  index: z.number().optional(),
  dealId: z.string(),
  fundTx: z.string(),
  amount: z.string(),
  agentB: z.string(),
});

const deliveryItemSchema = z.object({
  index: z.number().optional(),
  dealId: z.string(),
  workDescription: z.string().optional(),
  resultHash: z.string().optional(),
});

const hashOrWorkSchema = {
  workDescription: z.string().optional().describe("Must match payer's original string exactly"),
  resultHash: z
    .string()
    .optional()
    .describe("keccak256('delivery:' + workDescription); use instead of workDescription when known"),
};

function defaultMock(mock?: boolean): boolean {
  return mock ?? !hasValidPrivateKey(process.env.PRIVATE_KEY);
}

function buildConfig(mode?: "cooperative" | "safetyNet", mock?: boolean): SettlementConfig {
  reloadProjectEnv();
  return {
    mode: mode ?? "cooperative",
    mock: defaultMock(mock),
    deploymentNetwork: "atlantic",
  };
}

function mcpConfig(mock?: boolean): SettlementConfig {
  return { ...buildConfig(), mock: defaultMock(mock) };
}

function pickInput(args: z.infer<typeof settlementInputSchema>): TrustedSettlementInput {
  return {
    agentA: args.agentA,
    agentB: args.agentB,
    token: args.token,
    amount: args.amount,
    workDescription: args.workDescription,
    ttlSeconds: args.ttlSeconds,
    disputeWindowSeconds: args.disputeWindowSeconds,
    requiresHybridRelease: args.requiresHybridRelease,
  };
}

function formatResult(result: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}

function formatError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: msg }, null, 2) }],
    isError: true as const,
  };
}

const STATUS_DESCRIPTION =
  "Deal state, terms (payer/payee/token/amount/workHash), canClaim, autoReleaseAt, nextAction, fee quote. " +
  "Payer: fund_deal, attest_release, reclaim. Payee: submit_delivery, complete_claim_for_deal. " +
  "Batch: fund_deals_batch / submit_deliveries_batch / attest_releases_batch / complete_claims_batch. " +
  "Demo: execute_batch_settlement.";

export function registerSettlementTools(mcpServer: McpServer) {
  mcpServer.registerTool(
    "get_agent_readiness",
    {
      description:
        "Role-aware readiness (payer | payee | demo | mock). Returns allowedTools and fix actions before spending gas.",
      inputSchema: {
        mock: z.boolean().optional(),
      },
    },
    async ({ mock }) => {
      try {
        const result = await getAgentReadinessStatus(mcpConfig(mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "simulate_trusted_settlement",
    {
      description:
        "Simulate agent-to-agent payment on Pharos. Returns preflight, fee quote, nextAction. Call before execute.",
      inputSchema: {
        ...settlementFields,
        mode: modeSchema,
        mock: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const { mode, mock, ...rest } = args;
        const result = await simulateTrustedSettlement(pickInput(rest), buildConfig(mode, mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "fund_deal",
    {
      description:
        "Payer only: fund escrow and create deal. Returns dealId + terms for payee handoff. nextAction becomes deliver.",
      inputSchema: {
        ...settlementFields,
        mock: z.boolean().optional(),
        autoOnboardRecipients: z.boolean().optional().describe("Register unregistered payee before fund"),
      },
    },
    async (args) => {
      try {
        const { mock, autoOnboardRecipients, ...rest } = args;
        const result = await fundDealSettlement(pickInput(rest), {
          ...buildConfig("cooperative", mock),
          autoOnboardRecipients,
        });
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "submit_delivery",
    {
      description: "Payee only: submit delivery for dealId. Pass workDescription or resultHash from get_settlement_status terms.",
      inputSchema: {
        dealId: z.string(),
        ...hashOrWorkSchema,
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, workDescription, resultHash, mock }) => {
      try {
        const result = await submitDeliveryForDeal(
          dealId,
          { workDescription, resultHash },
          mcpConfig(mock)
        );
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "attest_release",
    {
      description: "Payer only: attest release after payee delivery. Pass workDescription or resultHash.",
      inputSchema: {
        dealId: z.string(),
        ...hashOrWorkSchema,
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, workDescription, resultHash, mock }) => {
      try {
        const result = await attestReleaseForDeal(
          dealId,
          { workDescription, resultHash },
          mcpConfig(mock)
        );
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "execute_trusted_settlement",
    {
      description:
        "Demo shortcut (both keys in one process): fund → deliver → attest → claim. For split agents use fund_deal + submit_delivery + attest_release + complete_claim_for_deal.",
      inputSchema: {
        ...settlementFields,
        mode: modeSchema,
        mock: z.boolean().optional(),
        skipAttest: z.boolean().optional().describe("Skip payer attest (ghost-payer auto-release demo)"),
        autoOnboardRecipients: z
          .boolean()
          .optional()
          .describe("Register unregistered payee before funding"),
      },
    },
    async (args) => {
      try {
        const { mode, mock, skipAttest, autoOnboardRecipients, ...rest } = args;
        const result = await executeTrustedSettlement(pickInput(rest), {
          ...buildConfig(mode, mock),
          skipAttest,
          autoOnboardRecipients,
        });
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "get_settlement_status",
    {
      description: STATUS_DESCRIPTION,
      inputSchema: {
        dealId: z.string(),
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, mock }) => {
      try {
        const result = await getSettlementStatus(dealId, mcpConfig(mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "complete_claim_for_deal",
    {
      description:
        "Payee only: claim when nextAction=claim. Use terms.amount and terms.payee from get_settlement_status.",
      inputSchema: {
        dealId: z.string(),
        amount: z.string().optional().describe("Deal amount in wei; omit to use on-chain terms"),
        agentB: z.string().optional().describe("Payee address; omit to use on-chain terms"),
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, amount, agentB, mock }) => {
      try {
        const cfg = mcpConfig(mock);
        let claimAmount = amount;
        let claimPayee = agentB;
        if (!claimAmount || !claimPayee) {
          const status = await getSettlementStatus(dealId, cfg);
          claimAmount = claimAmount ?? status.terms.amount;
          claimPayee = claimPayee ?? status.terms.payee;
        }
        const result = await completeClaimForDeal(
          dealId,
          { amount: claimAmount!, agentB: claimPayee! },
          cfg
        );
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "register_recipients",
    {
      description:
        "Payer only: onboard payee addresses into AgentRegistry before first payment.",
      inputSchema: {
        recipients: z.array(z.string()).describe("Payee addresses to register (0x...)"),
        mock: z.boolean().optional(),
      },
    },
    async ({ recipients, mock }) => {
      try {
        const result = await registerRecipients(recipients, mcpConfig(mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "reclaim_trusted_settlement",
    {
      description: "Payer only: reclaim escrow when payee never delivered and deadline passed.",
      inputSchema: {
        dealId: z.string(),
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, mock }) => {
      try {
        const result = await reclaimTrustedSettlement(dealId, mcpConfig(mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "reject_delivery",
    {
      description:
        "Payer only: reject invalid delivery during dispute window — immediate full refund to payer.",
      inputSchema: {
        dealId: z.string(),
        mock: z.boolean().optional(),
      },
    },
    async ({ dealId, mock }) => {
      try {
        const result = await rejectDeliveryForDeal(dealId, mcpConfig(mock));
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "fund_deals_batch",
    {
      description:
        "Payer only: parallel fund N deals. Returns manifest for payee handoff. batchMode saliFast or hybridWork.",
      inputSchema: {
        jobs: z.array(z.object(settlementFields)),
        batchMode: batchModeSchema,
        mock: z.boolean().optional(),
        autoOnboardRecipients: z.boolean().optional(),
      },
    },
    async ({ jobs, batchMode, mock, autoOnboardRecipients }) => {
      try {
        const cfg: SettlementConfig = {
          ...buildConfig("cooperative", mock),
          batchMode: (batchMode ?? "saliFast") as BatchMode,
          autoOnboardRecipients,
          rpcBurstWrites: true,
        };
        const result = await fundDealsBatch(jobs.map((j) => pickInput(j)), cfg);
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "submit_deliveries_batch",
    {
      description: "Payee only (hybridWork): parallel submitDelivery for manifest items.",
      inputSchema: {
        deliveries: z.array(deliveryItemSchema),
        mock: z.boolean().optional(),
      },
    },
    async ({ deliveries, mock }) => {
      try {
        const result = await submitDeliveriesBatch(deliveries as BatchDeliveryInput[], {
          ...mcpConfig(mock),
          rpcBurstWrites: true,
        });
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "attest_releases_batch",
    {
      description: "Payer only (hybridWork): parallel attestRelease after payee delivery batch.",
      inputSchema: {
        attestations: z.array(deliveryItemSchema),
        mock: z.boolean().optional(),
      },
    },
    async ({ attestations, mock }) => {
      try {
        const result = await attestReleasesBatch(attestations as BatchAttestInput[], {
          ...buildConfig("cooperative", mock),
          rpcBurstWrites: true,
        });
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "complete_claims_batch",
    {
      description:
        "Payee only: parallel claim N deals. Requires manifest with dealId, fundTx, amount, agentB per item.",
      inputSchema: {
        claims: z.array(claimItemSchema),
        mock: z.boolean().optional(),
      },
    },
    async ({ claims, mock }) => {
      try {
        const result = await claimDealsBatch(claims as BatchClaimInput[], {
          ...mcpConfig(mock),
          rpcBurstWrites: true,
        });
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );

  mcpServer.registerTool(
    "execute_batch_settlement",
    {
      description:
        "Demo shortcut (both keys): full batch in one process. batchMode saliFast or hybridWork.",
      inputSchema: {
        jobs: z.array(z.object(settlementFields)).describe("Array of settlement inputs"),
        batchMode: batchModeSchema,
        mock: z.boolean().optional(),
        autoOnboardRecipients: z.boolean().optional(),
      },
    },
    async ({ jobs, batchMode, mock, autoOnboardRecipients }) => {
      try {
        const cfg: SettlementConfig = {
          ...buildConfig("cooperative", mock),
          batchMode: (batchMode ?? "saliFast") as BatchMode,
          autoOnboardRecipients,
          rpcBurstWrites: true,
        };
        const result = await executeBatchSettlement(jobs.map((j) => pickInput(j)), cfg);
        return formatResult(result);
      } catch (e) {
        return formatError(e);
      }
    }
  );
}
