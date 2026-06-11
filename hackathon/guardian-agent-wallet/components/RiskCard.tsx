import { buildRiskFactors } from "@/lib/risk/riskBreakdown";
import type { PaymentRequest, PolicyDecision } from "@/types";

export function RiskCard({
  decision,
  request,
}: {
  decision: PolicyDecision;
  request?: PaymentRequest | null;
}) {
  const factors = request ? buildRiskFactors(request) : [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-5">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">Policy Decision</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{decision.decision}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${decisionClass(decision.decision)}`}>
          {decision.riskLevel} / {decision.score}
        </span>
      </div>

      <p className="text-sm leading-6 text-[#111827]">{decision.reason}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {factors.map((factor) => (
          <div key={factor.key} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#111827]">{factor.label}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskClass(factor.value)}`}>
                {factor.value}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6B7280]">{factor.explanation}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {decision.triggeredRules.map((rule) => (
          <span key={rule} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#111827]">
            {rule}
          </span>
        ))}
      </div>
    </div>
  );
}

function decisionClass(decision: PolicyDecision["decision"]) {
  if (decision === "ALLOW") return "bg-[#ECFDF5] text-[#047857]";
  if (decision === "CONFIRM") return "bg-[#FFFBEB] text-[#B45309]";
  return "bg-[#FEF2F2] text-[#B91C1C]";
}

function riskClass(value: "LOW" | "MEDIUM" | "HIGH") {
  if (value === "HIGH") return "bg-[#FEF2F2] text-[#B91C1C]";
  if (value === "MEDIUM") return "bg-[#FFFBEB] text-[#B45309]";
  return "bg-[#ECFDF5] text-[#047857]";
}
