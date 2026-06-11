import type { PaymentRequest, PolicyDecision } from "@/types";
import type { AgentProfile } from "@/types";
import { defaultAgentProfile, resolveAgentAction } from "@/lib/policy/agentProfiles";
import { estimateBudgetValue } from "@/lib/policy/budgetValue";
import { assessRisk } from "@/lib/risk/riskEngine";
import { isSuspiciousAddress } from "@/lib/policy/securityConfig";

type PolicyDecisionValue = PolicyDecision["decision"];
type RiskLevel = PolicyDecision["riskLevel"];

export type PolicyContext = {
  dailySpent: number;
  dailyBudgetLimit: number;
  singlePaymentLimit: number;
  trustedRecipients: string[];
  allowedTokens: string[];
  agentProfile: AgentProfile;
  timeWindow: {
    startHourUtc: number;
    endHourUtc: number;
  };
};

export type PolicyRuleResult = {
  id: string;
  decision: Exclude<PolicyDecisionValue, "ALLOW">;
  riskLevel: Exclude<RiskLevel, "LOW">;
  score: number;
  reason: string;
};

export interface PolicyRule {
  id: string;
  label: string;
  evaluate(request: PaymentRequest, context: PolicyContext): PolicyRuleResult | null;
}

export const walletPolicy: PolicyContext = {
  dailySpent: 0,
  dailyBudgetLimit: defaultAgentProfile.dailyBudget,
  singlePaymentLimit: defaultAgentProfile.singlePaymentLimit,
  trustedRecipients: defaultAgentProfile.allowedRecipients,
  allowedTokens: defaultAgentProfile.allowedTokens,
  agentProfile: defaultAgentProfile,
  timeWindow: {
    startHourUtc: 0,
    endHourUtc: 24,
  },
};

export function createPolicyContext(
  agentProfile: AgentProfile = defaultAgentProfile,
  overrides: Partial<Omit<PolicyContext, "agentProfile">> = {},
): PolicyContext {
  return {
    dailySpent: overrides.dailySpent ?? walletPolicy.dailySpent,
    dailyBudgetLimit: overrides.dailyBudgetLimit ?? agentProfile.dailyBudget,
    singlePaymentLimit: overrides.singlePaymentLimit ?? agentProfile.singlePaymentLimit,
    trustedRecipients: overrides.trustedRecipients ?? agentProfile.allowedRecipients,
    allowedTokens: overrides.allowedTokens ?? agentProfile.allowedTokens,
    agentProfile,
    timeWindow: overrides.timeWindow ?? walletPolicy.timeWindow,
  };
}

export const AgentPermissionPolicy: PolicyRule = {
  id: "agent_permission",
  label: "Agent permission",
  evaluate(request, context) {
    const requestedAction = resolveAgentAction(request);

    if (context.agentProfile.allowedActions.includes(requestedAction)) return null;

    return {
      id: this.id,
      decision: "DENY",
      riskLevel: "HIGH",
      score: 95,
      reason: `${context.agentProfile.id} 无权执行 ${requestedAction} 动作，需要切换到具备该权限的 Agent Profile。`,
    };
  },
};

export const UnknownActionPolicy: PolicyRule = {
  id: "unknown_action",
  label: "Known action required",
  evaluate(request) {
    if (request.action !== "unknown") return null;

    return {
      id: this.id,
      decision: "CONFIRM",
      riskLevel: "MEDIUM",
      score: 50,
      reason: "该 Agent 请求无法解析为受支持的钱包动作，需要人工确认。",
    };
  },
};

export const DailyBudgetPolicy: PolicyRule = {
  id: "daily_budget",
  label: "Daily budget",
  evaluate(request, context) {
    const budgetValue = estimateBudgetValue(request);
    if (context.dailySpent + budgetValue <= context.dailyBudgetLimit) return null;

    return {
      id: this.id,
      decision: "CONFIRM",
      riskLevel: "HIGH",
      score: 80,
      reason: `该请求金额超过当前 Agent 每日预算限制（${context.dailyBudgetLimit} budget units），需要人工确认。`,
    };
  },
};

export const SinglePaymentLimitPolicy: PolicyRule = {
  id: "single_payment_limit",
  label: "Single payment limit",
  evaluate(request, context) {
    const budgetValue = estimateBudgetValue(request);
    if (budgetValue <= context.singlePaymentLimit) return null;

    return {
      id: this.id,
      decision: "CONFIRM",
      riskLevel: "HIGH",
      score: 75,
      reason: `该请求金额超过当前 Agent 单笔支付限制（${context.singlePaymentLimit} budget units），需要人工确认。`,
    };
  },
};

export const TrustedRecipientPolicy: PolicyRule = {
  id: "trusted_recipient",
  label: "Trusted recipient",
  evaluate(request, context) {
    if (request.action === "transfer" && request.recipient.trim() === "") {
      return {
        id: "missing_recipient",
        decision: "CONFIRM",
        riskLevel: "MEDIUM",
        score: 55,
        reason: "该支付请求缺少收款方，执行前必须人工确认。",
      };
    }

    if (isSuspiciousAddress(request.recipient)) {
      return {
        id: "suspicious_recipient",
        decision: "CONFIRM",
        riskLevel: "HIGH",
        score: 85,
        reason: "该请求的收款方匹配可疑地址模式，需要人工确认。",
      };
    }

    if (context.trustedRecipients.includes(request.recipient)) return null;

    return {
      id: this.id,
      decision: "CONFIRM",
      riskLevel: "MEDIUM",
      score: 60,
      reason: "该收款方不在可信服务商列表内，需要人工确认。",
    };
  },
};

export const UnlimitedApprovalPolicy: PolicyRule = {
  id: "unlimited_approval",
  label: "Unlimited approval",
  evaluate(request) {
    if (request.action !== "approve" || !request.isUnlimitedApproval) return null;

    return {
      id: this.id,
      decision: "DENY",
      riskLevel: "HIGH",
      score: 100,
      reason: "该请求试图创建无限授权，已被策略拒绝。",
    };
  },
};

export const AllowedTokenPolicy: PolicyRule = {
  id: "allowed_token",
  label: "Allowed token",
  evaluate(request, context) {
    if (context.allowedTokens.includes(request.token)) return null;

    return {
      id: this.id,
      decision: "DENY",
      riskLevel: "HIGH",
      score: 90,
      reason: `${request.token} 不在当前 CAW Pact 允许的 Token 范围内，已被策略拒绝。`,
    };
  },
};

export const TimeWindowPolicy: PolicyRule = {
  id: "time_window",
  label: "Execution time window",
  evaluate(request, context) {
    const hour = new Date(request.timestamp).getUTCHours();
    const { startHourUtc, endHourUtc } = context.timeWindow;
    const insideWindow =
      startHourUtc <= endHourUtc
        ? hour >= startHourUtc && hour < endHourUtc
        : hour >= startHourUtc || hour < endHourUtc;

    if (insideWindow) return null;

    return {
      id: this.id,
      decision: "CONFIRM",
      riskLevel: "MEDIUM",
      score: 45,
      reason: `该请求不在允许执行时间窗口内（${startHourUtc}:00-${endHourUtc}:00 UTC），需要人工确认。`,
    };
  },
};

export const defaultPolicyRules: PolicyRule[] = [
  AgentPermissionPolicy,
  UnknownActionPolicy,
  UnlimitedApprovalPolicy,
  AllowedTokenPolicy,
  TrustedRecipientPolicy,
  SinglePaymentLimitPolicy,
  DailyBudgetPolicy,
  TimeWindowPolicy,
];

export function evaluatePayment(
  request: PaymentRequest,
  agentProfile: AgentProfile = defaultAgentProfile,
): PolicyDecision {
  return evaluatePolicies(request, createPolicyContext(agentProfile));
}

export function evaluatePolicies(
  request: PaymentRequest,
  context: PolicyContext = walletPolicy,
  rules: PolicyRule[] = defaultPolicyRules,
): PolicyDecision {
  const risk = assessRisk(request);
  const results = rules
    .map((rule) => rule.evaluate(request, context))
    .filter((result): result is PolicyRuleResult => result !== null);

  if (results.length === 0) {
    return buildDecision({
      decision: "ALLOW",
      riskLevel: risk.riskLevel,
      score: Math.max(10, risk.riskScore),
      reason: "该请求为小额 API 支付，收款方在可信服务列表内，Token 与网络符合当前 CAW Pact 约束。",
      triggeredRules: ["all_checks_passed"],
    });
  }

  const score = Math.min(
    100,
    Math.max(risk.riskScore, ...results.map((result) => result.score)),
  );
  const decision = results.some((result) => result.decision === "DENY") ? "DENY" : "CONFIRM";
  const riskLevel = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  const reason = [risk.explanation, ...results.map((result) => result.reason)].join(" ");
  const triggeredRules = results.map((result) => result.id);

  return buildDecision({
    decision,
    riskLevel,
    score,
    reason,
    triggeredRules,
  });
}

function buildDecision({
  decision,
  riskLevel,
  score,
  reason,
  triggeredRules,
}: {
  decision: PolicyDecisionValue;
  riskLevel: RiskLevel;
  score: number;
  reason: string;
  triggeredRules: string[];
}): PolicyDecision {
  return {
    decision,
    riskLevel,
    score,
    reason,
    triggeredRules,
    rulesTriggered: triggeredRules,
  };
}
