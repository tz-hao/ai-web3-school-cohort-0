import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentProfiles } from "../lib/policy/agentProfiles";
import { buildPactPreview } from "../lib/policy/pactPreview";
import type { PaymentRequest, PolicyDecision, WalletInfo } from "../types";

const request: PaymentRequest = {
  id: "pact-preview-request",
  rawInput: "send 0.001 SETH to 0x1111111111111111111111111111111111111111",
  action: "transfer",
  token: "SETH",
  amount: 0.001,
  recipient: "0x1111111111111111111111111111111111111111",
  spender: "",
  chainId: 11155111,
  timestamp: Date.UTC(2026, 0, 1, 12),
  isUnlimitedApproval: false,
};

const decision: PolicyDecision = {
  decision: "CONFIRM",
  riskLevel: "MEDIUM",
  score: 45,
  reason: "Human review required.",
  triggeredRules: ["trusted_recipient"],
  rulesTriggered: ["trusted_recipient"],
};

const wallet: WalletInfo = {
  mode: "caw",
  name: "Cobo Agentic Wallet",
  chainId: 11155111,
  address: "0x4444444444444444444444444444444444444444",
  isConnected: true,
  executionMode: "real-caw",
  cawConfigStatus: {
    apiUrlPresent: true,
    walletIdPresent: true,
    pactIdPresent: true,
  },
  cawTrustedRecipients: [
    {
      alias: "data-api-provider",
      displayNameZh: "数据 API 服务商",
      displayNameEn: "Data API Provider",
      evmAddress: "0x3333333333333333333333333333333333333333",
      isFallback: false,
    },
  ],
};

describe("pact preview", () => {
  it("builds a UI-ready pact preview from request, policy, profile, and wallet mode", () => {
    const preview = buildPactPreview({
      request,
      decision,
      agentProfile: agentProfiles.TradingAgent,
      walletInfo: wallet,
    });

    assert.equal(preview.intent, request.rawInput);
    assert.equal(preview.amount, "0.001");
    assert.equal(preview.token, "SETH");
    assert.equal(preview.recipient, request.recipient);
    assert.equal(preview.policyDecision, "CONFIRM");
    assert.equal(preview.expectedCawMode, "Real CAW Mode");
    assert.equal(preview.humanApprovalRequired, true);
    assert.equal(preview.cawRequestPreview.chainId, "SETH");
    assert.equal(preview.cawRequestPreview.tokenId, "SETH");
    assert.equal(preview.cawRequestPreview.pactIdStatus, "present");
    assert.equal(preview.cawRequestPreview.resolvedRecipientAddress, request.recipient);
    assert.equal(preview.cawRequestPreview.recipientFallbackStatus, "direct");
    assert.match(preview.allowedBudget, /25 SETH equivalent/);
    assert.match(preview.allowedBudget, /100 SETH equivalent/);
  });

  it("shows resolved registry addresses for aliases before execution", () => {
    const preview = buildPactPreview({
      request: {
        ...request,
        recipient: "data-api-provider",
      },
      decision,
      agentProfile: agentProfiles.PaymentAgent,
      walletInfo: wallet,
    });

    assert.equal(preview.cawRequestPreview.displayRecipient, "数据 API 服务商");
    assert.equal(preview.cawRequestPreview.resolvedRecipientAddress, "0x3333333333333333333333333333333333333333");
    assert.equal(preview.cawRequestPreview.recipientFallbackStatus, "configured");
  });
});
