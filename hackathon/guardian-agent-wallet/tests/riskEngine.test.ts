import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessRisk } from "../lib/risk/riskEngine";
import type { PaymentRequest } from "../types";

function request(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "risk-test",
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

describe("risk engine", () => {
  it("returns low risk for a small trusted payment", () => {
    const risk = assessRisk(request());

    assert.equal(risk.riskScore, 5);
    assert.equal(risk.riskLevel, "LOW");
    assert.deepEqual(risk.warnings, ["小额服务支付：10 USDC。"]);
  });

  it("generates a human explanation for unlimited approvals", () => {
    const risk = assessRisk(
      request({
        action: "approve",
        amount: 0,
        recipient: "0xUNKNOWN",
        spender: "0xUNKNOWN",
        isUnlimitedApproval: true,
      }),
    );

    assert.equal(risk.riskScore, 100);
    assert.equal(risk.riskLevel, "HIGH");
    assert.equal(
      risk.explanation,
      "该请求试图创建无限授权，已被策略拒绝。",
    );
    assert.ok(
      risk.warnings.includes(
        "无限授权：该请求试图创建无限授权，已被策略拒绝。",
      ),
    );
  });

  it("flags unsupported tokens", () => {
    const risk = assessRisk(request({ token: "DOGE" }));

    assert.equal(risk.riskScore, 50);
    assert.equal(risk.riskLevel, "MEDIUM");
    assert.ok(risk.warnings.includes("不支持的 Token：DOGE 不在当前 Pact 允许范围内。"));
  });

  it("flags unknown recipients and suspicious contracts", () => {
    const risk = assessRisk(
      request({
        action: "transfer",
        recipient: "0xBAD",
      }),
    );

    assert.equal(risk.riskScore, 95);
    assert.equal(risk.riskLevel, "HIGH");
    assert.ok(
      risk.warnings.includes(
        "未知收款方：目标不在可信服务商列表内。",
      ),
    );
    assert.ok(
      risk.warnings.includes(
        "可疑目标：收款方或合约地址匹配可疑地址模式。",
      ),
    );
  });
});
