import type { AgentProfile, AgentProfileId, PaymentRequest } from "@/types";
import { ALLOWED_TOKENS, TRUSTED_RECIPIENTS } from "@/lib/policy/securityConfig";

const SETH_BUDGET_UNIT = 3000;

export const agentProfiles: Record<AgentProfileId, AgentProfile> = {
  ResearchAgent: {
    id: "ResearchAgent",
    label: "Research Agent",
    allowedActions: ["pay_api"],
    dailyBudget: 5 * SETH_BUDGET_UNIT,
    singlePaymentLimit: 1 * SETH_BUDGET_UNIT,
    allowedRecipients: [...TRUSTED_RECIPIENTS],
    allowedTokens: ["USDC", "SETH"],
  },
  PaymentAgent: {
    id: "PaymentAgent",
    label: "Payment Agent",
    allowedActions: ["pay_api", "transfer"],
    dailyBudget: 20 * SETH_BUDGET_UNIT,
    singlePaymentLimit: 5 * SETH_BUDGET_UNIT,
    allowedRecipients: [...TRUSTED_RECIPIENTS],
    allowedTokens: ["USDC", "USDT", "DAI", "SETH"],
  },
  TradingAgent: {
    id: "TradingAgent",
    label: "Trading Agent",
    allowedActions: ["swap", "transfer"],
    dailyBudget: 100 * SETH_BUDGET_UNIT,
    singlePaymentLimit: 25 * SETH_BUDGET_UNIT,
    allowedRecipients: [...TRUSTED_RECIPIENTS],
    allowedTokens: [...ALLOWED_TOKENS],
  },
};

export const defaultAgentProfile = agentProfiles.TradingAgent;

export function getAgentProfile(profileId: AgentProfileId = defaultAgentProfile.id) {
  return agentProfiles[profileId];
}

export function resolveAgentAction(request: PaymentRequest) {
  if (TRUSTED_RECIPIENTS.includes(request.recipient as (typeof TRUSTED_RECIPIENTS)[number])) {
    return request.action === "swap" ? "swap" : "pay_api";
  }

  return request.action;
}
