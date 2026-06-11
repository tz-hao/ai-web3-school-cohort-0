import { buildRiskContributions } from "@/lib/risk/riskContributions";
import type { PaymentRequest, PolicyDecision } from "@/types";

export function RiskIntelligencePanel({
  decision,
  request,
}: {
  decision: PolicyDecision;
  request?: PaymentRequest | null;
}) {
  const score = Math.max(0, Math.min(100, decision.score));
  const contributions = request ? buildRiskContributions(request) : [];
  const tone = toneFor(decision.riskLevel);

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-5 text-center">
        <p className="text-xs font-medium text-[#6B7280]">风险评分</p>
        <p className="mt-3 text-6xl font-semibold tracking-tight text-[#111827]">{score}</p>
        <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}>
          {riskLabel(decision.riskLevel)}
        </span>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#6B7280]">策略解释</p>
          <p className="mt-2 text-sm leading-6 text-[#111827]">
            {buildChineseExplanation(decision, contributions)}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#6B7280]">触发规则</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {decision.triggeredRules.map((rule) => (
              <span key={rule} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#111827]">
                {rule}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#6B7280]">风险贡献拆解</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {contributions.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#111827]">{item.label}</p>
                  <span className="text-sm font-semibold text-[#EF4444]">+{item.score}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6B7280]">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildChineseExplanation(decision: PolicyDecision, contributions: ReturnType<typeof buildRiskContributions>) {
  if (decision.decision === "ALLOW") {
    return "该请求为小额 API 支付，收款方在可信服务列表内，Token 与网络符合当前 CAW Pact 约束。";
  }

  if (decision.triggeredRules.includes("unlimited_approval")) {
    return "该请求试图创建无限授权，已被策略拒绝。";
  }

  if (decision.triggeredRules.includes("single_payment_limit") || decision.triggeredRules.includes("daily_budget")) {
    return "该请求金额超过当前 Agent 单笔支付限制，需要人工确认。";
  }

  const reasons = contributions
    .filter((item) => item.id !== "low_risk_baseline")
    .map((item) => item.label)
    .join("、");

  if (decision.decision === "DENY") {
    return `策略检测到高风险项：${reasons || "硬性风险规则"}。该请求已被阻断，不会进入 CAW 执行。`;
  }

  return `策略检测到需要治理确认的风险项：${reasons || "中高风险规则"}。执行前需要人工确认。`;
}

function toneFor(riskLevel: PolicyDecision["riskLevel"]) {
  if (riskLevel === "HIGH") {
    return {
      bar: "bg-[#EF4444]",
      badge: "bg-[#FEF2F2] text-[#B91C1C]",
    };
  }

  if (riskLevel === "MEDIUM") {
    return {
      bar: "bg-[#F59E0B]",
      badge: "bg-[#FFFBEB] text-[#B45309]",
    };
  }

  return {
    bar: "bg-[#10B981]",
    badge: "bg-[#ECFDF5] text-[#047857]",
  };
}

function riskLabel(riskLevel: PolicyDecision["riskLevel"]) {
  if (riskLevel === "HIGH") return "高风险";
  if (riskLevel === "MEDIUM") return "中风险";
  return "低风险";
}
