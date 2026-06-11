import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAuditTimelineItems, createAuditLog } from "../lib/audit/auditLog";
import type { PaymentRequest, PolicyDecision, WalletExecutionResult, WalletInfo } from "../types";

const request: PaymentRequest = {
  id: "audit-request",
  rawInput: "支付 0.001 SETH 给 数据 API 服务商",
  action: "transfer",
  token: "SETH",
  amount: 0.001,
  recipient: "data-api-provider",
  spender: "",
  chainId: 8453,
  timestamp: Date.UTC(2026, 0, 1, 12),
  isUnlimitedApproval: false,
};

const decision: PolicyDecision = {
  decision: "ALLOW",
  riskLevel: "LOW",
  score: 10,
  reason: "Request is within policy.",
  triggeredRules: ["all_checks_passed"],
  rulesTriggered: ["all_checks_passed"],
};

const wallet: WalletInfo = {
  mode: "mock",
  name: "Mock Wallet",
  chainId: 8453,
  address: "0xMOCK_AGENT_WALLET",
  isConnected: true,
};

const executionResult: WalletExecutionResult = {
  success: true,
  txHash: "0xMOCK123",
  status: "confirmed",
  walletMode: "mock",
  message: "Mock wallet execution recorded.",
};

const cawExecutionResult: WalletExecutionResult = {
  success: true,
  txHash: "0xREALCAWTX",
  status: "pending",
  walletMode: "caw",
  message: "CAW transfer submitted.",
  requestId: "guardian-caw-audit-request",
  receiptId: "tx-receipt-1",
  walletAddress: "0x1111111111111111111111111111111111111111",
  rawCawResponse: {
    result: {
      id: "tx-receipt-1",
      request_id: "guardian-caw-audit-request",
      transaction_hash: "0xREALCAWTX",
    },
  },
};

describe("audit log", () => {
  it("stores request, policy, risk, wallet, confirmation, and execution result", () => {
    const record = createAuditLog(request, decision, executionResult, wallet, "not_required");

    assert.equal(record.requestId, request.id);
    assert.deepEqual(record.request, request);
    assert.deepEqual(record.policyDecision, decision);
    assert.equal(record.riskScore, 10);
    assert.deepEqual(record.wallet, wallet);
    assert.equal(record.txHash, executionResult.txHash);
    assert.deepEqual(record.executionResult, executionResult);
    assert.equal(record.userConfirmation, "not_required");
    assert.deepEqual(
      record.events.map((event) => event.type),
      ["Intent Parsed", "Policy Evaluated"],
    );
  });

  it("generates UI-friendly timeline items", () => {
    const record = createAuditLog(request, decision, executionResult, wallet, "not_required");
    const items = buildAuditTimelineItems([record]);

    assert.equal(items.length, 2);
    assert.equal(items[0].title, "收到 Agent 支付请求");
    assert.equal(items[0].tone, "info");
    assert.ok(items[0].details.some((detail) => detail.includes("TRANSFER 0.001 SETH")));
    assert.ok(items[0].details.some((detail) => detail.includes("数据 API 服务商")));
    assert.ok(items[1].details.some((detail) => detail.includes("风险评分: 10")));
  });

  it("stores CAW receipt metadata and real transaction hash when available", () => {
    const record = createAuditLog(request, decision, cawExecutionResult, wallet, "not_required");

    assert.equal(record.txHash, "0xREALCAWTX");
    assert.equal(record.executionResult?.receiptId, "tx-receipt-1");
    assert.equal(record.executionResult?.requestId, "guardian-caw-audit-request");
    assert.equal(record.executionResult?.walletAddress, "0x1111111111111111111111111111111111111111");
    assert.equal(record.executionResult?.rawCawResponse?.result?.transaction_hash, "0xREALCAWTX");
  });
});
