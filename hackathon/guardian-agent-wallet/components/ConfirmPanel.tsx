import type { PolicyDecision, WalletExecutionResult } from "@/types";

export function ConfirmPanel({
  decision,
  walletResult,
  isExecuting,
  onExecute,
  onConfirm,
  onReject,
}: {
  decision: PolicyDecision;
  walletResult: WalletExecutionResult | null;
  isExecuting: boolean;
  onExecute: () => void;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
        <p className="text-xs font-medium text-[#6B7280]">CAW Execution Gate</p>
        <p className="mt-2 text-sm leading-6 text-[#111827]">{messageFor(decision, walletResult, isExecuting)}</p>
      </div>

      {decision.decision === "ALLOW" ? (
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExecuting ? "执行中..." : "执行支付"}
        </button>
      ) : null}

      {decision.decision === "CONFIRM" ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className="rounded-xl bg-[#111827] px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExecuting ? "执行中..." : "确认执行"}
          </button>
          <button
            onClick={onReject}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-[#111827] transition hover:border-[#111827]"
          >
            拒绝
          </button>
        </div>
      ) : null}

      {decision.decision === "DENY" ? (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          已被策略拒绝，不会进入钱包执行。
        </div>
      ) : null}

      {walletResult ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-xs font-medium text-[#6B7280]">执行结果</p>
          <p className="mt-2 text-sm leading-6 text-[#111827]">{walletResult.message}</p>
          {walletResult.txHash ? (
            <p className="mt-2 break-words font-mono text-xs text-[#6B7280]">{walletResult.txHash}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function messageFor(decision: PolicyDecision, walletResult: WalletExecutionResult | null, isExecuting: boolean) {
  if (isExecuting) return "钱包适配器正在准备交易结果。";
  if (walletResult?.success) return walletResult.message;
  if (decision.decision === "ALLOW") return "低风险请求可在当前策略边界内自动执行。";
  if (decision.decision === "CONFIRM") return "继续提交到 CAW 前需要人工确认。";
  return "策略已在钱包执行前拒绝该请求。";
}
