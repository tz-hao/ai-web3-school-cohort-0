import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRiskFactors } from "../lib/risk/riskBreakdown";
import type { PaymentRequest } from "../types";

function request(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "risk-factor-request",
    rawInput: "支付 0.001 SETH 给 数据 API 服务商",
    action: "transfer",
    token: "SETH",
    amount: 0.001,
    recipient: "data-api-provider",
    spender: "",
    chainId: 8453,
    timestamp: Date.UTC(2026, 0, 1, 12),
    isUnlimitedApproval: false,
    ...overrides,
  };
}

describe("risk breakdown", () => {
  it("returns amount, recipient, approval, and token risk factors", () => {
    const factors = buildRiskFactors(request());

    assert.deepEqual(
      factors.map((factor) => factor.key),
      ["amount", "recipient", "approval", "token"],
    );
  });

  it("marks unlimited approvals as high approval risk", () => {
    const factors = buildRiskFactors(
      request({
        action: "approve",
        isUnlimitedApproval: true,
      }),
    );

    assert.equal(factors.find((factor) => factor.key === "approval")?.value, "HIGH");
  });
});
