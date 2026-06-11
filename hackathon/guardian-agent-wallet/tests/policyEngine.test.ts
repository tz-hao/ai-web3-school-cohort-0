import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentProfiles } from "../lib/policy/agentProfiles";
import {
  createPolicyContext,
  evaluatePayment,
  evaluatePolicies,
  walletPolicy,
  type PolicyContext,
} from "../lib/policy/policyEngine";
import type { PaymentRequest } from "../types";

function request(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "test-request",
    rawInput: "buy 10 USDC ETH",
    action: "swap",
    token: "USDC",
    amount: 10,
    recipient: "data-api-provider",
    spender: "",
    chainId: 8453,
    timestamp: Date.UTC(2026, 0, 1, 12),
    isUnlimitedApproval: false,
    ...overrides,
  };
}

function context(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    ...walletPolicy,
    timeWindow: { ...walletPolicy.timeWindow },
    ...overrides,
  };
}

describe("policy engine", () => {
  it("allows a trusted recipient within limits", () => {
    const decision = evaluatePayment(request());

    assert.equal(decision.decision, "ALLOW");
    assert.equal(decision.riskLevel, "LOW");
    assert.equal(decision.score, 10);
    assert.deepEqual(decision.triggeredRules, ["all_checks_passed"]);
  });

  it("requires confirmation when a single payment exceeds the limit", () => {
    const decision = evaluatePayment(request({ amount: 30, token: "SETH" }));

    assert.equal(decision.decision, "CONFIRM");
    assert.equal(decision.riskLevel, "HIGH");
    assert.equal(decision.score, 75);
    assert.deepEqual(decision.triggeredRules, ["single_payment_limit"]);
  });

  it("requires confirmation when the daily budget would be exceeded", () => {
    const decision = evaluatePolicies(
      request({ amount: 20 }),
      context({ dailySpent: 290, dailyBudgetLimit: 300 }),
    );

    assert.equal(decision.decision, "CONFIRM");
    assert.equal(decision.riskLevel, "HIGH");
    assert.equal(decision.score, 80);
    assert.ok(decision.triggeredRules.includes("daily_budget"));
  });

  it("requires confirmation for suspicious recipients", () => {
    const decision = evaluatePayment(
      request({
        action: "transfer",
        recipient: "0xBAD",
      }),
    );

    assert.equal(decision.decision, "CONFIRM");
    assert.equal(decision.riskLevel, "HIGH");
    assert.equal(decision.score, 95);
    assert.deepEqual(decision.triggeredRules, ["suspicious_recipient"]);
  });

  it("denies unlimited approvals", () => {
    const decision = evaluatePayment(
      request({
        action: "approve",
        isUnlimitedApproval: true,
      }),
    );

    assert.equal(decision.decision, "DENY");
    assert.equal(decision.riskLevel, "HIGH");
    assert.equal(decision.score, 100);
    assert.ok(decision.triggeredRules.includes("unlimited_approval"));
  });

  it("denies tokens outside the allowlist", () => {
    const decision = evaluatePayment(request({ token: "DOGE" }));

    assert.equal(decision.decision, "DENY");
    assert.equal(decision.riskLevel, "HIGH");
    assert.equal(decision.score, 90);
    assert.deepEqual(decision.triggeredRules, ["allowed_token"]);
  });

  it("requires confirmation outside the execution time window", () => {
    const decision = evaluatePolicies(
      request({ timestamp: Date.UTC(2026, 0, 1, 3) }),
      context({
        timeWindow: {
          startHourUtc: 9,
          endHourUtc: 17,
        },
      }),
    );

    assert.equal(decision.decision, "CONFIRM");
    assert.equal(decision.riskLevel, "MEDIUM");
    assert.equal(decision.score, 45);
    assert.deepEqual(decision.triggeredRules, ["time_window"]);
  });

  it("denies ResearchAgent trading actions", () => {
    const decision = evaluatePayment(
      request({
        action: "swap",
        recipient: "data-api-provider",
      }),
      agentProfiles.ResearchAgent,
    );

    assert.equal(decision.decision, "DENY");
    assert.equal(decision.riskLevel, "HIGH");
    assert.ok(decision.triggeredRules.includes("agent_permission"));
  });

  it("allows ResearchAgent API payments", () => {
    const decision = evaluatePayment(
      request({
        action: "transfer",
        amount: 10,
        recipient: "data-api-provider",
      }),
      agentProfiles.ResearchAgent,
    );

    assert.equal(decision.decision, "ALLOW");
    assert.equal(decision.riskLevel, "LOW");
  });

  it("uses PaymentAgent recipient and token permissions", () => {
    const decision = evaluatePayment(
      request({
        action: "transfer",
        amount: 20,
        recipient: "data-api-provider",
        token: "DAI",
      }),
      agentProfiles.PaymentAgent,
    );

    assert.equal(decision.decision, "ALLOW");
  });

  it("uses TradingAgent larger budget", () => {
    const paymentDecision = evaluatePolicies(
      request({ action: "swap", amount: 200 }),
      createPolicyContext(agentProfiles.PaymentAgent),
    );
    const tradingDecision = evaluatePolicies(
      request({ action: "swap", amount: 200 }),
      createPolicyContext(agentProfiles.TradingAgent),
    );

    assert.equal(paymentDecision.decision, "DENY");
    assert.ok(paymentDecision.triggeredRules.includes("agent_permission"));
    assert.equal(tradingDecision.decision, "ALLOW");
  });

  it("defines Day 3 agent governance budgets and permissions", () => {
    assert.deepEqual(agentProfiles.ResearchAgent.allowedActions, ["pay_api"]);
    assert.equal(agentProfiles.ResearchAgent.dailyBudget, 15_000);
    assert.ok(!agentProfiles.ResearchAgent.allowedActions.includes("approve"));

    assert.deepEqual(agentProfiles.PaymentAgent.allowedActions, ["pay_api", "transfer"]);
    assert.equal(agentProfiles.PaymentAgent.dailyBudget, 60_000);
    assert.ok(agentProfiles.PaymentAgent.allowedTokens.includes("SETH"));

    assert.deepEqual(agentProfiles.TradingAgent.allowedActions, ["swap", "transfer"]);
    assert.equal(agentProfiles.TradingAgent.dailyBudget, 300_000);
    assert.ok(!agentProfiles.TradingAgent.allowedActions.includes("approve"));
  });

  it("evaluates the same transfer differently for ResearchAgent and PaymentAgent", () => {
    const samePayment = request({
      action: "transfer",
      rawInput: "支付 0.001 SETH 给 unknown-vendor",
      amount: 0.001,
      token: "SETH",
      recipient: "unknown-vendor",
    });

    const researchDecision = evaluatePayment(samePayment, agentProfiles.ResearchAgent);
    const paymentDecision = evaluatePayment(samePayment, agentProfiles.PaymentAgent);

    assert.equal(researchDecision.decision, "DENY");
    assert.ok(researchDecision.triggeredRules.includes("agent_permission"));
    assert.equal(paymentDecision.decision, "CONFIRM");
    assert.ok(paymentDecision.triggeredRules.includes("trusted_recipient"));
  });
});
