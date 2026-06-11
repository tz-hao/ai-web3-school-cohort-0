import { buildPactPreview } from "@/lib/policy/pactPreview";
import type { AgentProfile, PaymentRequest, PolicyDecision, WalletInfo } from "@/types";

export function PactPreview({
  request,
  decision,
  agentProfile,
  walletInfo,
}: {
  request: PaymentRequest;
  decision: PolicyDecision;
  agentProfile: AgentProfile;
  walletInfo: WalletInfo | null;
}) {
  const preview = buildPactPreview({ request, decision, agentProfile, walletInfo });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Fact label="Amount" value={String(preview.amount)} />
        <Fact label="Token" value={preview.token} />
        <Fact label="Recipient" value={preview.recipient} mono />
        <Fact label="Budget" value={preview.allowedBudget} />
        <Fact label="Execution Mode" value={preview.expectedCawMode} />
        <Fact label="Human Approval" value={preview.humanApprovalRequired ? "需要" : "不需要"} />
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
        <p className="text-xs font-medium text-[#6B7280]">支付意图</p>
        <p className="mt-2 text-sm leading-6 text-[#111827]">{preview.intent}</p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="text-xs font-medium text-[#6B7280]">CAW Request Preview</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <MiniFact label="chainId" value={preview.cawRequestPreview.chainId} />
          <MiniFact label="tokenId" value={preview.cawRequestPreview.tokenId} />
          <MiniFact label="amount" value={preview.cawRequestPreview.amount} />
          <MiniFact label="display recipient" value={preview.cawRequestPreview.displayRecipient} />
          <MiniFact label="resolved EVM recipient" value={preview.cawRequestPreview.resolvedRecipientAddress} mono />
          <MiniFact
            label="recipient source"
            value={recipientSourceLabel(preview.cawRequestPreview.recipientFallbackStatus)}
            tone={preview.cawRequestPreview.recipientFallbackStatus === "fallback" ? "warning" : "success"}
          />
          <MiniFact
            label="pactId"
            value={preview.cawRequestPreview.pactIdStatus === "present" ? "present" : "missing"}
            tone={preview.cawRequestPreview.pactIdStatus === "present" ? "success" : "warning"}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BoundaryCard title="Policy boundary" text={decision.decision === "ALLOW" ? "Within automated execution boundary." : decision.reason} />
        <BoundaryCard
          title="Human governance"
          text={preview.humanApprovalRequired ? "Execution requires human approval." : "Low-risk action can continue without manual approval."}
        />
      </div>
    </div>
  );
}

function BoundaryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs font-medium text-[#6B7280]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#111827]">{text}</p>
    </div>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <dt className="text-xs font-medium text-[#6B7280]">{label}</dt>
      <dd className={`mt-2 break-words text-sm font-medium text-[#111827] ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function MiniFact({
  label,
  value,
  mono = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#ECFDF5] text-[#047857]"
      : tone === "warning"
        ? "bg-[#FFFBEB] text-[#B45309]"
        : "bg-[#F8F9FA] text-[#111827]";

  return (
    <div className={`rounded-lg px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-medium text-[#6B7280]">{label}</p>
      <p className={`mt-1 break-words text-xs font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function recipientSourceLabel(status: "fallback" | "configured" | "direct" | "missing") {
  if (status === "fallback") return "fallback CAW_DESTINATION";
  if (status === "direct") return "direct address";
  if (status === "configured") return "trusted registry";
  return "unresolved";
}
