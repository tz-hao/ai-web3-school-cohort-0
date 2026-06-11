import type { PaymentRequest, RiskAssessment } from "@/types";
import { estimateBudgetValue } from "@/lib/policy/budgetValue";
import { isAllowedToken, isSuspiciousAddress, isTrustedRecipient } from "@/lib/policy/securityConfig";

export function assessRisk(request: PaymentRequest): RiskAssessment {
  const factors = [
    evaluateAmountRisk(request),
    evaluateRecipientRisk(request),
    evaluateApprovalRisk(request),
    evaluateTokenRisk(request),
    evaluateSuspiciousContractRisk(request),
  ].filter((warning): warning is RiskWarning => warning !== null);

  const riskScore = Math.min(
    100,
    factors.reduce((total, warning) => total + warning.score, 0),
  );
  const riskLevel = toRiskLevel(riskScore);
  const warnings = factors.map((factor) => factor.message);

  return {
    riskScore,
    riskLevel,
    explanation: buildExplanation(request, warnings),
    warnings,
  };
}

type RiskWarning = {
  score: number;
  message: string;
};

function evaluateAmountRisk(request: PaymentRequest): RiskWarning | null {
  const budgetValue = estimateBudgetValue(request);

  if (budgetValue > 200) {
    return {
      score: 50,
      message: `该请求金额 ${request.amount} ${request.token} 超过当前 Agent 单笔支付限制，需要人工确认。`,
    };
  }

  if (budgetValue > 50) {
    return {
      score: 30,
      message: `该请求金额 ${request.amount} ${request.token} 高于常规 API 支付范围，需要额外审查。`,
    };
  }

  if (request.amount > 0) {
    return {
      score: 5,
      message: `小额服务支付：${request.amount} ${request.token}。`,
    };
  }

  return null;
}

function evaluateRecipientRisk(request: PaymentRequest): RiskWarning | null {
  if (request.action === "transfer" && request.recipient.trim() === "") {
    return {
      score: 35,
      message: "缺少收款方：Agent 没有提供服务商或目标地址。",
    };
  }

  if (!request.recipient || isTrustedRecipient(request.recipient)) return null;

  return {
    score: 35,
    message: "未知收款方：目标不在可信服务商列表内。",
  };
}

function evaluateApprovalRisk(request: PaymentRequest): RiskWarning | null {
  if (request.action !== "approve") return null;

  if (request.isUnlimitedApproval) {
    return {
      score: 70,
      message: "无限授权：该请求试图创建无限授权，已被策略拒绝。",
    };
  }

  return {
    score: 35,
    message: "授权请求：该动作会允许外部合约花费钱包 Token。",
  };
}

function evaluateTokenRisk(request: PaymentRequest): RiskWarning | null {
  if (isAllowedToken(request.token)) return null;

  return {
    score: 45,
    message: `不支持的 Token：${request.token} 不在当前 Pact 允许范围内。`,
  };
}

function evaluateSuspiciousContractRisk(request: PaymentRequest): RiskWarning | null {
  const target = request.spender || request.recipient;

  if (!target || !isSuspiciousAddress(target)) return null;

  return {
    score: 55,
    message: "可疑目标：收款方或合约地址匹配可疑地址模式。",
  };
}

function buildExplanation(request: PaymentRequest, warnings: string[]) {
  if (warnings.length === 0) {
    return "该请求为小额 API 支付，收款方在可信服务列表内，Token 与网络符合当前 CAW Pact 约束。";
  }

  if (request.action === "approve" && request.isUnlimitedApproval) {
    return "该请求试图创建无限授权，已被策略拒绝。";
  }

  if (warnings.length === 1) {
    return warnings[0];
  }

  return warnings.join(" ");
}

function toRiskLevel(score: number): RiskAssessment["riskLevel"] {
  if (score >= 70) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}
