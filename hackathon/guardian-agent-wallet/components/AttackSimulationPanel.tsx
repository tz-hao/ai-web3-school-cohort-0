import { attackScenarios } from "@/lib/demo/attackScenarios";
import type { PolicyDecision } from "@/types";

export function AttackSimulationPanel({
  onRunScenario,
  getExpectedDecision,
}: {
  onRunScenario: (prompt: string) => void;
  getExpectedDecision: (prompt: string) => PolicyDecision["decision"];
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-[#6B7280]">
        选择一个评委演示场景，只运行 intent parser、risk engine 和 policy engine，不会自动执行 CAW 支付。
      </p>
      {attackScenarios.map((scenario) => (
        <ScenarioButton
          key={scenario.id}
          label={scenario.label}
          category={scenario.category}
          actor={scenario.actor}
          story={scenario.story}
          prompt={scenario.prompt}
          expectedDecision={getExpectedDecision(scenario.prompt)}
          onRunScenario={onRunScenario}
        />
      ))}
    </div>
  );
}

function ScenarioButton({
  label,
  category,
  actor,
  story,
  prompt,
  expectedDecision,
  onRunScenario,
}: {
  label: string;
  category: string;
  actor: string;
  story: string;
  prompt: string;
  expectedDecision: PolicyDecision["decision"];
  onRunScenario: (prompt: string) => void;
}) {
  return (
    <button
      onClick={() => onRunScenario(prompt)}
      className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-left transition hover:border-[#111827]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111827]">{label}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{actor}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${decisionClass(expectedDecision)}`}>
          预期 {expectedDecision}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#6B7280]">{story}</p>
      <p className="mt-3 break-words rounded-lg bg-[#F8F9FA] p-2 font-mono text-xs text-[#6B7280]">{prompt}</p>
      <p className="mt-3 text-xs font-medium text-[#111827]">{category}</p>
    </button>
  );
}

function decisionClass(decision: "ALLOW" | "CONFIRM" | "DENY") {
  if (decision === "ALLOW") return "bg-[#ECFDF5] text-[#047857]";
  if (decision === "CONFIRM") return "bg-[#FFFBEB] text-[#B45309]";
  return "bg-[#FEF2F2] text-[#B91C1C]";
}
