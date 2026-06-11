import { RECIPIENT_DISPLAY_NAMES } from "@/lib/policy/securityConfig";
import type {
  AuditEvent,
  AuditLog,
  AuditTimelineItem,
  PaymentRequest,
  PolicyDecision,
  UserConfirmationStatus,
  WalletExecutionResult,
  WalletInfo,
} from "@/types";

const STORAGE_KEY = "guardian-agent-wallet-audit-logs";

export function getAuditLogs(): AuditLog[] {
  return getAuditRecords();
}

export function getAuditRecords(): AuditLog[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAuditRecord) : [];
  } catch {
    return [];
  }
}

export function getAuditRecordByRequestId(requestId: string): AuditLog | null {
  return getAuditRecords().find((record) => record.requestId === requestId) ?? null;
}

export function getAuditRecordById(id: string): AuditLog | null {
  return getAuditRecords().find((record) => record.id === id) ?? null;
}

export function getAuditTimelineItems(): AuditTimelineItem[] {
  return buildAuditTimelineItems(getAuditRecords());
}

export function addAuditLog(log: AuditLog): void {
  upsertAuditRecord(log);
}

export function upsertAuditRecord(record: AuditLog): void {
  if (typeof window === "undefined") return;

  const records = getAuditRecords();
  const nextRecords = [record, ...records.filter((item) => item.id !== record.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
}

export function clearAuditLogs(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
}

export function createAuditLog(
  request: PaymentRequest,
  decision: PolicyDecision,
  walletResult: WalletExecutionResult | null,
  wallet: WalletInfo | null = null,
  userConfirmation: UserConfirmationStatus = "not_required",
): AuditLog {
  return createAuditRecord({
    request,
    decision,
    wallet,
    userConfirmation,
    executionResult: walletResult,
  });
}

export function recordIntentAndPolicy({
  request,
  decision,
  wallet,
}: {
  request: PaymentRequest;
  decision: PolicyDecision;
  wallet: WalletInfo | null;
}) {
  const record = createAuditRecord({
    request,
    decision,
    wallet,
    userConfirmation: decision.decision === "CONFIRM" ? "pending" : "not_required",
    executionResult: null,
  });

  upsertAuditRecord(record);
  return record;
}

export function recordUserConfirmation({
  requestId,
  confirmed,
}: {
  requestId: string;
  confirmed: boolean;
}) {
  const record = getAuditRecordByRequestId(requestId);
  if (!record) return null;

  const nextRecord = appendEvent(
    {
      ...record,
      userConfirmation: confirmed ? "confirmed" : "rejected",
    },
    createAuditEvent({
      type: "User Confirmed",
      title: confirmed ? "人工确认执行" : "人工拒绝执行",
      description: confirmed
        ? "继续提交到 CAW 前已完成人工确认。"
        : "人工审查已拒绝该支付请求，不会提交到 CAW。",
    }),
  );

  upsertAuditRecord(nextRecord);
  return nextRecord;
}

export function recordTransactionExecuted({
  requestId,
  wallet,
  executionResult,
}: {
  requestId: string;
  wallet: WalletInfo | null;
  executionResult: WalletExecutionResult;
}) {
  const record = getAuditRecordByRequestId(requestId);
  if (!record) return null;

  const nextRecord = appendEvent(
    {
      ...record,
      wallet,
      txHash: executionResult.txHash || null,
      executionResult,
    },
    createAuditEvent({
      type: "Transaction Executed",
      title: executionResult.success ? titleForExecutedTransaction(executionResult) : "CAW 执行失败",
      description: executionResult.message,
    }),
  );

  upsertAuditRecord(nextRecord);
  return nextRecord;
}

export function buildAuditTimelineItems(records: AuditLog[]): AuditTimelineItem[] {
  return records.flatMap((record) =>
    record.events.map((event) => ({
      id: event.id,
      auditId: record.id,
      timestamp: event.timestamp,
      title: event.title,
      description: event.description,
      tone: getEventTone(event, record),
      details: [
        `${record.request.action.toUpperCase()} ${record.request.amount} ${record.request.token}`,
        `策略判断: ${record.policyDecision.decision} / 风险评分: ${record.riskScore}`,
        `收款方: ${displayRecipient(record.request.recipient)}`,
        record.executionResult?.resolvedRecipientAddress
          ? `Resolved recipient: ${record.executionResult.resolvedRecipientAddress}`
          : "Resolved recipient: pending",
        record.txHash ? `Tx: ${record.txHash}` : `Wallet: ${record.wallet?.name ?? "未执行"}`,
      ],
    })),
  );
}

function createAuditRecord({
  request,
  decision,
  wallet,
  userConfirmation,
  executionResult,
}: {
  request: PaymentRequest;
  decision: PolicyDecision;
  wallet: WalletInfo | null;
  userConfirmation: UserConfirmationStatus;
  executionResult: WalletExecutionResult | null;
}): AuditLog {
  const now = new Date().toISOString();
  const txHash = executionResult?.txHash || null;

  return {
    id: `audit-${request.id}`,
    requestId: request.id,
    createdAt: now,
    updatedAt: now,
    request,
    policyDecision: decision,
    riskScore: decision.score,
    wallet,
    txHash,
    userConfirmation,
    executionResult,
    events: [
      createAuditEvent({
        type: "Intent Parsed",
        title: "收到 Agent 支付请求",
        description: `支付意图已解析：${request.action} ${request.amount} ${request.token} -> ${displayRecipient(request.recipient)}。`,
      }),
      createAuditEvent({
        type: "Policy Evaluated",
        title: `策略判断：${decisionLabel(decision.decision)}`,
        description: decision.reason,
      }),
    ],
  };
}

function displayRecipient(recipient: string) {
  return RECIPIENT_DISPLAY_NAMES[recipient] ?? (recipient || "未提供收款方");
}

function decisionLabel(decision: PolicyDecision["decision"]) {
  if (decision === "ALLOW") return "允许执行";
  if (decision === "CONFIRM") return "需要人工确认";
  return "拒绝执行";
}

function titleForExecutedTransaction(executionResult: WalletExecutionResult) {
  if (executionResult.receiptId) return "CAW Receipt 已生成";
  if (executionResult.executionMode === "real-caw") return "已提交到 Cobo Agentic Wallet";
  return "模拟钱包已执行";
}

function appendEvent(record: AuditLog, event: AuditEvent): AuditLog {
  return {
    ...record,
    updatedAt: event.timestamp,
    events: [...record.events, event],
  };
}

function createAuditEvent({
  type,
  title,
  description,
}: {
  type: AuditEvent["type"];
  title: string;
  description: string;
}): AuditEvent {
  return {
    id: `${type.toLowerCase().replaceAll(" ", "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    timestamp: new Date().toISOString(),
    title,
    description,
  };
}

function getEventTone(event: AuditEvent, record: AuditLog): AuditTimelineItem["tone"] {
  if (record.policyDecision.decision === "DENY") return "danger";
  if (event.type === "Transaction Executed") {
    return record.executionResult?.success ? "success" : "danger";
  }
  if (event.type === "User Confirmed" || record.policyDecision.decision === "CONFIRM") {
    return "warning";
  }

  return "info";
}

function isAuditRecord(value: unknown): value is AuditLog {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<AuditLog>;
  return Boolean(record.id && record.requestId && record.request && record.policyDecision);
}
