import type { AgentProfile, AgentProfileId, PolicyDecision } from "@/types";
import { agentProfiles } from "@/lib/policy/agentProfiles";
import { parseIntent } from "@/lib/intent/intentParser";
import { evaluatePayment } from "@/lib/policy/policyEngine";

const comparisonPrompt = "支付 0.001 SETH 给 数据 API 服务商";

export function AgentProfilesPanel({
  selectedProfileId,
  onSelectProfile,
}: {
  selectedProfileId: AgentProfileId;
  onSelectProfile: (profileId: AgentProfileId) => void;
}) {
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-[#6B7280]">
        不同 Agent 使用不同预算、动作范围和收款方权限。切换 profile 会重新触发 policy evaluation。
      </p>
      <div className="grid gap-3">
        {Object.values(agentProfiles).map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            active={profile.id === selectedProfileId}
            onSelect={() => onSelectProfile(profile.id)}
          />
        ))}
      </div>
      <GovernanceComparison />
    </div>
  );
}

function ProfileCard({
  profile,
  active,
  onSelect,
}: {
  profile: AgentProfile;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition ${
        active ? "border-[#111827] bg-[#F8F9FA]" : "border-[#E5E7EB] bg-white hover:border-[#111827]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#111827]">{profile.label}</span>
        <span className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#6B7280]">
          {active ? "已选择" : "选择"}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-[#6B7280]">
        <Fact label="每日预算" value={formatSethBudget(profile.dailyBudget)} />
        <Fact label="允许动作" value={formatActions(profile.allowedActions)} />
        <Fact label="允许 Token" value={profile.allowedTokens.join(", ")} />
        <Fact label="可信收款方" value={profile.allowedRecipients.join(", ")} mono />
      </dl>
    </button>
  );
}

function GovernanceComparison() {
  const request = parseIntent(comparisonPrompt);
  const researchDecision = evaluatePayment(request, agentProfiles.ResearchAgent);
  const paymentDecision = evaluatePayment(request, agentProfiles.PaymentAgent);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
      <p className="text-xs font-medium text-[#6B7280]">Agent Governance 对比</p>
      <p className="mt-2 break-words font-mono text-xs text-[#6B7280]">{comparisonPrompt}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ComparisonResult profile="Research Agent" decision={researchDecision} />
        <ComparisonResult profile="Payment Agent" decision={paymentDecision} />
      </div>
    </div>
  );
}

function ComparisonResult({ profile, decision }: { profile: string; decision: PolicyDecision }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#111827]">{profile}</p>
        <span className={decisionClass(decision.decision)}>{decision.decision}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6B7280]">{decision.reason}</p>
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1">
      <dt className="font-medium text-[#111827]">{label}</dt>
      <dd className={`break-words ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function formatSethBudget(budgetValue: number) {
  return `${budgetValue / 3000} SETH/day equivalent`;
}

function formatActions(actions: AgentProfile["allowedActions"]) {
  const labels: Record<string, string> = {
    pay_api: "API 支付",
    transfer: "支付 / 转账",
    swap: "兑换",
    approve: "授权",
  };

  return actions.map((action) => labels[action] ?? action).join(", ");
}

function decisionClass(decision: PolicyDecision["decision"]) {
  const base = "rounded-full px-2 py-1 text-[10px] font-medium";
  if (decision === "ALLOW") return `${base} bg-[#ECFDF5] text-[#047857]`;
  if (decision === "CONFIRM") return `${base} bg-[#FFFBEB] text-[#B45309]`;
  return `${base} bg-[#FEF2F2] text-[#B91C1C]`;
}
