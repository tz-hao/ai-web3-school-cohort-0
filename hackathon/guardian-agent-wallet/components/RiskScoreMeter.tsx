import type { PolicyDecision } from "@/types";

export function RiskScoreMeter({ decision }: { decision: PolicyDecision }) {
  const score = Math.max(0, Math.min(100, decision.score));
  const tone = toneFor(decision.riskLevel);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">风险评分</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-[#111827]">{score}</p>
          <p className="mt-2 text-sm text-[#6B7280]">{riskLabel(decision.riskLevel)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}>{decision.riskLevel}</span>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {decision.triggeredRules.map((rule) => (
          <span key={rule} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#111827]">
            {rule}
          </span>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-[#6B7280]">{decision.reason}</p>
    </div>
  );
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
