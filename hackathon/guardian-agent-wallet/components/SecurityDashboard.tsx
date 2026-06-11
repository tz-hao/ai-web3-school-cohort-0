"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Bot,
  FileClock,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Wallet,
} from "lucide-react";
import { AgentProfilesPanel } from "@/components/AgentProfilesPanel";
import { AttackSimulationPanel } from "@/components/AttackSimulationPanel";
import { AuditTimeline } from "@/components/AuditTimeline";
import { ChatBox } from "@/components/ChatBox";
import { ConfirmPanel } from "@/components/ConfirmPanel";
import { PactPreview } from "@/components/PactPreview";
import { RiskCard } from "@/components/RiskCard";
import { RiskIntelligencePanel } from "@/components/RiskIntelligencePanel";
import {
  buildAuditTimelineItems,
  clearAuditLogs,
  getAuditLogs,
  recordIntentAndPolicy,
  recordTransactionExecuted,
  recordUserConfirmation,
} from "@/lib/audit/auditLog";
import { parseIntent } from "@/lib/intent/intentParser";
import { agentProfiles, getAgentProfile } from "@/lib/policy/agentProfiles";
import { evaluatePayment } from "@/lib/policy/policyEngine";
import { getWalletAdapter } from "@/lib/wallets";
import type {
  AgentProfileId,
  AuditLog,
  AuditTimelineItem,
  PaymentRequest,
  PolicyDecision,
  WalletExecutionResult,
  WalletInfo,
} from "@/types";

type DashboardView = "dashboard" | "risk" | "audit";

const defaultPrompt = "支付 0.001 SETH 给 数据 API 服务商";
const walletAdapter = getWalletAdapter();

export function SecurityDashboard({ view }: { view: DashboardView }) {
  const pathname = usePathname();
  const [input, setInput] = useState(defaultPrompt);
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const [agentProfileId, setAgentProfileId] = useState<AgentProfileId>("PaymentAgent");
  const [walletResult, setWalletResult] = useState<WalletExecutionResult | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const auditTimelineItems: AuditTimelineItem[] = buildAuditTimelineItems(auditLogs);
  const currentProfile = getAgentProfile(agentProfileId);
  const walletExecutionMode =
    walletResult?.executionMode ?? walletInfo?.executionMode ?? (walletAdapter.mode === "mock" ? "mock" : "caw-fallback");

  useEffect(() => {
    walletAdapter.getWalletInfo().then(setWalletInfo);

    const auditLoadTimer = window.setTimeout(() => {
      setAuditLogs(getAuditLogs());
    }, 0);

    return () => window.clearTimeout(auditLoadTimer);
  }, []);

  function analyzeRequest() {
    analyzeInput(input);
  }

  function analyzeInput(value: string) {
    const nextRequest = parseIntent(value);
    const nextDecision = evaluatePayment(nextRequest, currentProfile);

    setInput(value);
    setRequest(nextRequest);
    setDecision(nextDecision);
    setWalletResult(null);
    recordIntentAndPolicy({
      request: nextRequest,
      decision: nextDecision,
      wallet: walletInfo,
    });
    setAuditLogs(getAuditLogs());
  }

  async function executeRequest() {
    if (!request || !decision) return;

    setIsExecuting(true);
    try {
      if (decision.decision === "CONFIRM") {
        recordUserConfirmation({ requestId: request.id, confirmed: true });
      }

      const result = await walletAdapter.executePayment({ request });
      setWalletResult(result);
      recordTransactionExecuted({
        requestId: request.id,
        wallet: walletInfo,
        executionResult: result,
      });
    } catch (error) {
      const failedResult: WalletExecutionResult = {
        success: false,
        txHash: "",
        status: "failed",
        walletMode: walletAdapter.mode,
        message: error instanceof Error ? error.message : "Wallet adapter execution failed.",
      };
      setWalletResult(failedResult);
      recordTransactionExecuted({
        requestId: request.id,
        wallet: walletInfo,
        executionResult: failedResult,
      });
    } finally {
      setIsExecuting(false);
      setAuditLogs(getAuditLogs());
    }
  }

  function rejectRequest() {
    if (!request) return;

    recordUserConfirmation({ requestId: request.id, confirmed: false });
    setAuditLogs(getAuditLogs());
  }

  function handleProfileChange(nextProfileId: AgentProfileId) {
    const nextProfile = getAgentProfile(nextProfileId);
    setAgentProfileId(nextProfileId);

    if (request) {
      const nextDecision = evaluatePayment(request, nextProfile);
      setDecision(nextDecision);
      setWalletResult(null);
      recordIntentAndPolicy({
        request,
        decision: nextDecision,
        wallet: walletInfo,
      });
      setAuditLogs(getAuditLogs());
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#111827]">
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />

        <div className="min-w-0 flex-1">
          <TopHeader walletExecutionMode={walletExecutionMode} walletInfo={walletInfo} />

          <div className="grid gap-8 px-6 py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              <PageIntro />

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <MetricCard title="Risk Score" value={decision ? String(decision.score) : "23"} caption={riskCaption(decision)} tone={decision?.riskLevel ?? "LOW"} />
                <MetricCard title="Policy Decision" value={decision?.decision ?? "ALLOW"} caption="Policy Engine" decision={decision?.decision ?? "ALLOW"} />
                <MetricCard title="Execution Mode" value={walletModeLabel(walletExecutionMode)} caption="Wallet Adapter" compact />
              </div>

              {view === "dashboard" ? (
                <DashboardGrid
                  input={input}
                  setInput={setInput}
                  analyzeRequest={analyzeRequest}
                  runScenario={analyzeInput}
                  request={request}
                  decision={decision}
                  agentProfileId={agentProfileId}
                  handleProfileChange={handleProfileChange}
                  walletResult={walletResult}
                  isExecuting={isExecuting}
                  executeRequest={executeRequest}
                  rejectRequest={rejectRequest}
                  currentProfile={currentProfile}
                  walletInfo={walletInfo}
                />
              ) : null}

              {view === "risk" ? (
                <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <ControlPanel
                    input={input}
                    setInput={setInput}
                    analyzeRequest={analyzeRequest}
                    runScenario={analyzeInput}
                    agentProfileId={agentProfileId}
                    handleProfileChange={handleProfileChange}
                  />
                  <RiskReviewPanel
                    request={request}
                    decision={decision}
                    walletResult={walletResult}
                    isExecuting={isExecuting}
                    executeRequest={executeRequest}
                    rejectRequest={rejectRequest}
                    currentProfile={currentProfile}
                    walletInfo={walletInfo}
                  />
                </div>
              ) : null}

              {view === "audit" ? (
                <div className="mt-8">
                  <DashboardCard title="Audit Log" caption="审计日志" icon={<FileClock className="h-4 w-4" />}>
                    <AuditTimeline
                      items={auditTimelineItems}
                      onClear={() => {
                        clearAuditLogs();
                        setAuditLogs([]);
                      }}
                    />
                  </DashboardCard>
                </div>
              ) : null}
            </section>

            <aside className="min-w-0">
              <DashboardCard title="Audit Panel" caption="实时执行证据" icon={<FileClock className="h-4 w-4" />}>
                <AuditTimeline
                  items={auditTimelineItems}
                  onClear={() => {
                    clearAuditLogs();
                    setAuditLogs([]);
                  }}
                />
              </DashboardCard>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const items = [
    { label: "仪表盘", href: "/", activePath: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "支付请求", href: "/", icon: <Wallet className="h-4 w-4" /> },
    { label: "Pact 预览", href: "/", icon: <LockKeyhole className="h-4 w-4" /> },
    { label: "风险审查", href: "/risk-review", activePath: "/risk-review", icon: <ShieldAlert className="h-4 w-4" /> },
    { label: "攻击模拟", href: "/", icon: <Swords className="h-4 w-4" /> },
    { label: "Agent 配置", href: "/", icon: <Bot className="h-4 w-4" /> },
    { label: "审计日志", href: "/audit-timeline", activePath: "/audit-timeline", icon: <FileClock className="h-4 w-4" /> },
    { label: "设置", href: "/", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#E5E7EB] bg-white px-4 py-6 lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#111827] text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827]">Guardian</p>
          <p className="text-xs text-[#6B7280]">Agent Wallet</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-1">
        {items.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              item.activePath === pathname
                ? "bg-[#111827] font-medium text-white"
                : "text-[#6B7280] hover:bg-[#F8F9FA] hover:text-[#111827]"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function TopHeader({
  walletExecutionMode,
  walletInfo,
}: {
  walletExecutionMode: NonNullable<WalletInfo["executionMode"]>;
  walletInfo: WalletInfo | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
      <div className="flex min-h-16 flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Policy-Aware Agent Payment Framework</p>
          <h1 className="text-xl font-semibold text-[#111827]">Guardian Agent Wallet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WalletModeBadge executionMode={walletExecutionMode} />
          <span className="max-w-72 truncate rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#6B7280]">
            {walletInfo?.isConnected ? walletInfo.address : "Wallet adapter ready"}
          </span>
        </div>
      </div>
    </header>
  );
}

function PageIntro() {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-[#6B7280]">仪表盘</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[#111827]">Agent payment control center</h2>
      <p className="mt-4 text-sm leading-6 text-[#6B7280]">
        AI 解释意图。策略判断风险。CAW 执行支付。人类治理边界。审计记录全过程。
      </p>
    </div>
  );
}

function DashboardGrid({
  input,
  setInput,
  analyzeRequest,
  runScenario,
  request,
  decision,
  agentProfileId,
  handleProfileChange,
  walletResult,
  isExecuting,
  executeRequest,
  rejectRequest,
  currentProfile,
  walletInfo,
}: {
  input: string;
  setInput: (value: string) => void;
  analyzeRequest: () => void;
  runScenario: (value: string) => void;
  request: PaymentRequest | null;
  decision: PolicyDecision | null;
  agentProfileId: AgentProfileId;
  handleProfileChange: (profileId: AgentProfileId) => void;
  walletResult: WalletExecutionResult | null;
  isExecuting: boolean;
  executeRequest: () => void;
  rejectRequest: () => void;
  currentProfile: (typeof agentProfiles)[AgentProfileId];
  walletInfo: WalletInfo | null;
}) {
  return (
    <div className="mt-8 grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <ControlPanel
          input={input}
          setInput={setInput}
          analyzeRequest={analyzeRequest}
          runScenario={runScenario}
          agentProfileId={agentProfileId}
          handleProfileChange={handleProfileChange}
        />
        <RiskReviewPanel
          request={request}
          decision={decision}
          walletResult={walletResult}
          isExecuting={isExecuting}
          executeRequest={executeRequest}
          rejectRequest={rejectRequest}
          currentProfile={currentProfile}
          walletInfo={walletInfo}
        />
      </div>
    </div>
  );
}

function ControlPanel({
  input,
  setInput,
  analyzeRequest,
  runScenario,
  agentProfileId,
  handleProfileChange,
}: {
  input: string;
  setInput: (value: string) => void;
  analyzeRequest: () => void;
  runScenario: (value: string) => void;
  agentProfileId: AgentProfileId;
  handleProfileChange: (profileId: AgentProfileId) => void;
}) {
  return (
    <div className="grid gap-6">
      <DashboardCard title="Payment Requests" caption="支付请求" icon={<Activity className="h-4 w-4" />}>
        <ChatBox value={input} onChange={setInput} onSubmit={analyzeRequest} />
      </DashboardCard>
      <DashboardCard title="Attack Simulation" caption="攻击模拟" icon={<Swords className="h-4 w-4" />}>
        <AttackSimulationPanel
          onRunScenario={runScenario}
          getExpectedDecision={(value) => evaluatePayment(parseIntent(value), getAgentProfile(agentProfileId)).decision}
        />
      </DashboardCard>
      <DashboardCard title="Agent Profiles" caption="Agent 配置" icon={<Bot className="h-4 w-4" />}>
        <AgentProfilesPanel selectedProfileId={agentProfileId} onSelectProfile={handleProfileChange} />
      </DashboardCard>
    </div>
  );
}

function RiskReviewPanel({
  request,
  decision,
  walletResult,
  isExecuting,
  executeRequest,
  rejectRequest,
  currentProfile,
  walletInfo,
}: {
  request: PaymentRequest | null;
  decision: PolicyDecision | null;
  walletResult: WalletExecutionResult | null;
  isExecuting: boolean;
  executeRequest: () => void;
  rejectRequest: () => void;
  currentProfile: (typeof agentProfiles)[AgentProfileId];
  walletInfo: WalletInfo | null;
}) {
  return (
    <div className="grid gap-6">
      {decision ? (
        <>
          <DashboardCard title="Risk Review" caption="风险审查" icon={<Gauge className="h-4 w-4" />}>
            <RiskIntelligencePanel decision={decision} request={request} />
          </DashboardCard>
          <DashboardCard title="Policy Decision" caption="策略结果" icon={<ShieldAlert className="h-4 w-4" />}>
            <RiskCard decision={decision} request={request} />
          </DashboardCard>
          {request ? (
            <DashboardCard title="Pact Preview" caption="Pact 预览" icon={<LockKeyhole className="h-4 w-4" />}>
              <PactPreview request={request} decision={decision} agentProfile={currentProfile} walletInfo={walletInfo} />
            </DashboardCard>
          ) : null}
          <DashboardCard title="Execution" caption="CAW 提交" icon={<Wallet className="h-4 w-4" />}>
            <ConfirmPanel
              decision={decision}
              walletResult={walletResult}
              isExecuting={isExecuting}
              onExecute={executeRequest}
              onConfirm={executeRequest}
              onReject={rejectRequest}
            />
          </DashboardCard>
        </>
      ) : (
        <DashboardCard title="Risk Review" caption="风险审查" icon={<Gauge className="h-4 w-4" />}>
          <EmptyState text="选择一个真实 Agent 支付请求，或输入自定义 API/SaaS payment intent。系统会运行 intent parser、risk engine 和 policy engine。" />
        </DashboardCard>
      )}
    </div>
  );
}

function DashboardCard({
  title,
  caption,
  icon,
  children,
}: {
  title: string;
  caption: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">{caption}</p>
          <h3 className="mt-1 text-xl font-semibold text-[#111827]">{title}</h3>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-[#111827]">
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  caption,
  tone,
  decision,
  compact = false,
}: {
  title: string;
  value: string;
  caption: string;
  tone?: PolicyDecision["riskLevel"];
  decision?: PolicyDecision["decision"];
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6B7280]">{title}</p>
          <p className={`mt-3 font-semibold tracking-tight text-[#111827] ${compact ? "text-2xl leading-tight" : "text-4xl"}`}>
            {value}
          </p>
          <p className="mt-2 text-sm text-[#6B7280]">{caption}</p>
        </div>
        {tone ? <RiskDot riskLevel={tone} /> : null}
        {decision ? <StatusBadge decision={decision} compact /> : null}
      </div>
      <SimpleLine tone={tone} />
    </div>
  );
}

function WalletModeBadge({ executionMode }: { executionMode: NonNullable<WalletInfo["executionMode"]> }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827]">
      <Wallet className="h-3.5 w-3.5" />
      {walletModeLabel(executionMode)}
    </span>
  );
}

function StatusBadge({ decision, compact = false }: { decision: PolicyDecision["decision"]; compact?: boolean }) {
  const classes = {
    ALLOW: "bg-[#ECFDF5] text-[#047857]",
    CONFIRM: "bg-[#FFFBEB] text-[#B45309]",
    DENY: "bg-[#FEF2F2] text-[#B91C1C]",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${classes[decision]}`}>
      {compact ? decision.slice(0, 1) : decision}
    </span>
  );
}

function RiskDot({ riskLevel }: { riskLevel: PolicyDecision["riskLevel"] }) {
  const color = riskLevel === "HIGH" ? "bg-[#EF4444]" : riskLevel === "MEDIUM" ? "bg-[#F59E0B]" : "bg-[#10B981]";

  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}

function SimpleLine({ tone }: { tone?: PolicyDecision["riskLevel"] }) {
  const stroke = tone === "HIGH" ? "#EF4444" : tone === "MEDIUM" ? "#F59E0B" : "#10B981";

  return (
    <svg className="mt-6 h-10 w-full" viewBox="0 0 240 40" role="img" aria-label="Simple trend line">
      <path d="M2 31 C 34 25, 48 12, 76 18 S 126 35, 154 20 S 201 8, 238 15" fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA] p-8 text-sm leading-6 text-[#6B7280]">
      {text}
    </div>
  );
}

function walletModeLabel(executionMode: NonNullable<WalletInfo["executionMode"]>) {
  const labels = {
    "real-caw": "真实 CAW 模式",
    "caw-fallback": "CAW 回退模式",
    mock: "模拟模式",
  };

  return labels[executionMode];
}

function riskCaption(decision: PolicyDecision | null) {
  if (!decision) return "低风险";
  if (decision.riskLevel === "HIGH") return "高风险";
  if (decision.riskLevel === "MEDIUM") return "中风险";
  return "低风险";
}
