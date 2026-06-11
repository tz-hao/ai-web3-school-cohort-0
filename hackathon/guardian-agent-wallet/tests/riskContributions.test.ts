import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRiskContributions } from "../lib/risk/riskContributions";
import type { PaymentRequest } from "../types";

function request(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "risk-contribution-request",
    rawInput: "支付 10 SETH 给 0xBAD0000000000000000000000000000000000000",
    action: "transfer",
    token: "SETH",
    amount: 10,
    recipient: "0xBAD0000000000000000000000000000000000000",
    spender: "",
    chainId: 8453,
    timestamp: Date.UTC(2026, 0, 1, 12),
    isUnlimitedApproval: false,
    ...overrides,
  };
}

describe("risk contributions", () => {
  it("explains amount, recipient, approval, and token contributions in Chinese", () => {
    const contributions = buildRiskContributions(
      request({
        action: "approve",
        token: "DOGE",
        amount: 300,
        spender: "0xBAD0000000000000000000000000000000000000",
        isUnlimitedApproval: true,
      }),
    );

    assert.deepEqual(
      contributions.map((item) => `${item.score} ${item.label}`),
      ["40 超预算", "25 未知或可疑收款方", "20 无限授权", "10 不支持的 Token"],
    );
  });

  it("returns a low-risk contribution for a safe small payment", () => {
    const contributions = buildRiskContributions(
      request({
        rawInput: "支付 0.001 SETH 给 数据 API 服务商",
        amount: 0.001,
        recipient: "data-api-provider",
      }),
    );

    assert.deepEqual(contributions, [
      {
        id: "low_risk_baseline",
        score: 5,
        label: "低风险基线",
        explanation: "金额、收款方、Token 与授权范围都处于低风险边界内。",
      },
    ]);
  });
});
