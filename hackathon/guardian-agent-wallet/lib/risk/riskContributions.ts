import { estimateBudgetValue } from "@/lib/policy/budgetValue";
import { isAllowedToken, isSuspiciousAddress, isTrustedRecipient } from "@/lib/policy/securityConfig";
import type { PaymentRequest } from "@/types";

export type RiskContribution = {
  id: string;
  score: number;
  label: string;
  explanation: string;
};

export function buildRiskContributions(request: PaymentRequest): RiskContribution[] {
  const contributions = [
    buildAmountContribution(request),
    buildRecipientContribution(request),
    buildApprovalContribution(request),
    buildTokenContribution(request),
  ].filter((contribution): contribution is RiskContribution => contribution !== null);

  if (contributions.length > 0) return contributions;

  return [
    {
      id: "low_risk_baseline",
      score: 5,
      label: "低风险基线",
      explanation: "金额、收款方、Token 与授权范围都处于低风险边界内。",
    },
  ];
}

function buildAmountContribution(request: PaymentRequest): RiskContribution | null {
  if (estimateBudgetValue(request) <= 200) return null;

  return {
    id: "amount_over_budget",
    score: 40,
    label: "超预算",
    explanation: `${request.amount} ${request.token} 超过自动执行的预算风险阈值。`,
  };
}

function buildRecipientContribution(request: PaymentRequest): RiskContribution | null {
  const target = request.recipient || request.spender;

  if (!target || isTrustedRecipient(target)) return null;
  if (!isSuspiciousAddress(target) && request.action !== "transfer") return null;

  return {
    id: "unknown_or_suspicious_recipient",
    score: 25,
    label: "未知或可疑收款方",
    explanation: isSuspiciousAddress(target)
      ? "目标地址匹配可疑地址模式，需要人工确认。"
      : "收款方不在可信服务商列表中，需要人工确认。",
  };
}

function buildApprovalContribution(request: PaymentRequest): RiskContribution | null {
  if (request.action !== "approve" || !request.isUnlimitedApproval) return null;

  return {
    id: "unlimited_approval",
    score: 20,
    label: "无限授权",
    explanation: "无限授权可能允许合约在未来持续花费钱包资产。",
  };
}

function buildTokenContribution(request: PaymentRequest): RiskContribution | null {
  if (isAllowedToken(request.token)) return null;

  return {
    id: "unsupported_token",
    score: 10,
    label: "不支持的 Token",
    explanation: `${request.token} 不在当前 Agent 钱包允许的 Token 列表中。`,
  };
}
