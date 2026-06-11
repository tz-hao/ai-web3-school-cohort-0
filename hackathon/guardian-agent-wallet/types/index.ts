export type PaymentRequest = {
  id: string;
  rawInput: string;
  action: "swap" | "transfer" | "approve" | "unknown";
  token: string;
  amount: number;
  recipient: string;
  spender: string;
  chainId: number;
  timestamp: number;
  isUnlimitedApproval: boolean;
};

export type AgentProfileId = "ResearchAgent" | "PaymentAgent" | "TradingAgent";

export type AgentAllowedAction = PaymentRequest["action"] | "pay_api";

export type AgentProfile = {
  id: AgentProfileId;
  label: string;
  allowedActions: AgentAllowedAction[];
  dailyBudget: number;
  singlePaymentLimit: number;
  allowedRecipients: string[];
  allowedTokens: string[];
};

export type PolicyDecision = {
  decision: "ALLOW" | "CONFIRM" | "DENY";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  reason: string;
  triggeredRules: string[];
  rulesTriggered: string[];
};

export type RiskAssessment = {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  warnings: string[];
};

export type LegacyAuditLog = {
  id: string;
  timestamp: string;
  rawInput: string;
  action: PaymentRequest["action"];
  amount: number;
  token: string;
  recipient: string;
  decision: PolicyDecision["decision"];
  riskLevel: PolicyDecision["riskLevel"];
  reason: string;
};

export type AuditEventType =
  | "Intent Parsed"
  | "Policy Evaluated"
  | "User Confirmed"
  | "Transaction Executed";

export type UserConfirmationStatus = "not_required" | "pending" | "confirmed" | "rejected";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  timestamp: string;
  title: string;
  description: string;
};

export type AuditLog = {
  id: string;
  requestId: string;
  createdAt: string;
  updatedAt: string;
  request: PaymentRequest;
  policyDecision: PolicyDecision;
  riskScore: number;
  wallet: WalletInfo | null;
  txHash: string | null;
  userConfirmation: UserConfirmationStatus;
  executionResult: WalletExecutionResult | null;
  events: AuditEvent[];
};

export type AuditTimelineItem = {
  id: string;
  auditId: string;
  timestamp: string;
  title: string;
  description: string;
  tone: "info" | "success" | "warning" | "danger";
  details: string[];
};

export type WalletMode = "mock" | "caw";

export type WalletInfo = {
  mode: WalletMode;
  name: string;
  chainId: number;
  address: string;
  isConnected: boolean;
  executionMode?: "real-caw" | "caw-fallback" | "mock";
  cawConfigStatus?: {
    apiUrlPresent: boolean;
    walletIdPresent: boolean;
    pactIdPresent: boolean;
  };
  cawTrustedRecipients?: Array<{
    alias: string;
    displayNameZh: string;
    displayNameEn: string;
    evmAddress: string;
    isFallback: boolean;
  }>;
};

export type WalletExecutionResult = {
  success: boolean;
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  walletMode: WalletMode;
  message: string;
  requestId?: string;
  receiptId?: string;
  walletAddress?: string;
  executionMode?: "real-caw" | "caw-fallback" | "mock";
  errorCode?:
    | "missing_recipient"
    | "invalid_amount"
    | "missing_pact_id"
    | "unresolved_recipient"
    | "unsupported_token"
    | "unsupported_chain"
    | "caw_sdk_validation_error";
  cawRequestPreview?: {
    chainId: string;
    tokenId: string;
    amount: string;
    recipient: string;
    displayRecipient?: string;
    resolvedRecipientAddress?: string;
    recipientIsFallback?: boolean;
    pactIdPresent: boolean;
  };
  recipientAlias?: string;
  displayRecipient?: string;
  resolvedRecipientAddress?: string;
  recipientIsFallback?: boolean;
  rawCawResponse?: Record<string, unknown>;
};

export type TransactionStatus = {
  txHash: string;
  status: WalletExecutionResult["status"];
  confirmations: number;
  updatedAt: number;
};
