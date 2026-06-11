import { isAllowedToken, isSuspiciousAddress, isTrustedRecipient } from "@/lib/policy/securityConfig";
import { estimateBudgetValue } from "@/lib/policy/budgetValue";
import type { PaymentRequest } from "@/types";

export type RiskFactorKey = "amount" | "recipient" | "approval" | "token";

export type RiskFactor = {
  key: RiskFactorKey;
  label: string;
  value: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
};

export function buildRiskFactors(request: PaymentRequest): RiskFactor[] {
  return [
    buildAmountRisk(request),
    buildRecipientRisk(request),
    buildApprovalRisk(request),
    buildTokenRisk(request),
  ];
}

function buildAmountRisk(request: PaymentRequest): RiskFactor {
  const budgetValue = estimateBudgetValue(request);

  if (budgetValue > 200) {
    return {
      key: "amount",
      label: "金额风险",
      value: "HIGH",
      explanation: `${request.amount} ${request.token} 超过当前 Agent 单笔支付限制，需要人工确认。`,
    };
  }

  if (budgetValue > 50) {
    return {
      key: "amount",
      label: "金额风险",
      value: "MEDIUM",
      explanation: `${request.amount} ${request.token} 高于常规 API 支付范围。`,
    };
  }

  return {
    key: "amount",
    label: "金额风险",
    value: "LOW",
    explanation: `${request.amount || 0} ${request.token} 属于小额服务支付范围。`,
  };
}

function buildRecipientRisk(request: PaymentRequest): RiskFactor {
  if (request.action === "transfer" && !request.recipient.trim()) {
    return {
      key: "recipient",
      label: "收款方风险",
      value: "MEDIUM",
      explanation: "收款方缺失，需要人工确认。",
    };
  }

  if (isSuspiciousAddress(request.recipient)) {
    return {
      key: "recipient",
      label: "收款方风险",
      value: "HIGH",
      explanation: "收款方匹配可疑地址模式。",
    };
  }

  if (!request.recipient || isTrustedRecipient(request.recipient)) {
    return {
      key: "recipient",
      label: "收款方风险",
      value: "LOW",
      explanation: "收款方在可信服务商列表内。",
    };
  }

  return {
    key: "recipient",
    label: "收款方风险",
    value: "MEDIUM",
    explanation: "收款方不在可信服务商列表内。",
  };
}

function buildApprovalRisk(request: PaymentRequest): RiskFactor {
  if (request.action !== "approve") {
    return {
      key: "approval",
      label: "授权风险",
      value: "LOW",
      explanation: "该请求不会授予 Token 花费权限。",
    };
  }

  if (request.isUnlimitedApproval) {
    return {
      key: "approval",
      label: "授权风险",
      value: "HIGH",
      explanation: "无限授权可能允许外部合约持续花费钱包资产。",
    };
  }

  return {
    key: "approval",
    label: "授权风险",
    value: "MEDIUM",
    explanation: "授权会允许外部合约花费 Token。",
  };
}

function buildTokenRisk(request: PaymentRequest): RiskFactor {
  if (isAllowedToken(request.token)) {
    return {
      key: "token",
      label: "Token 风险",
      value: "LOW",
      explanation: `${request.token} 在当前 Pact 允许范围内。`,
    };
  }

  return {
    key: "token",
    label: "Token 风险",
    value: "HIGH",
    explanation: `${request.token} 不在当前 Agent 执行允许范围内。`,
  };
}
