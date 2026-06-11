import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attackScenarios, evaluateAttackScenario } from "../lib/demo/attackScenarios";

describe("demo story scenarios", () => {
  it("defines the four Day 2 hackathon demo stories", () => {
    assert.deepEqual(
      attackScenarios.map((scenario) => ({
        id: scenario.id,
        label: scenario.label,
        prompt: scenario.prompt,
        expectedDecision: scenario.expectedDecision,
      })),
      [
        {
          id: "over-budget-api-payment",
          label: "超预算 API 支付",
          prompt: "支付 10 SETH 给 数据 API 服务商",
          expectedDecision: "CONFIRM",
        },
        {
          id: "suspicious-recipient",
          label: "可疑收款方",
          prompt: "支付 0.001 SETH 给 0xBAD0000000000000000000000000000000000000",
          expectedDecision: "CONFIRM",
        },
        {
          id: "unlimited-approval-attack",
          label: "无限授权攻击",
          prompt: "approve unlimited USDC",
          expectedDecision: "DENY",
        },
        {
          id: "unauthorized-vendor",
          label: "未授权服务商",
          prompt: "支付 0.001 SETH 给 unknown-vendor",
          expectedDecision: "CONFIRM",
        },
      ],
    );
  });

  it("runs parser, risk engine, and policy engine for every story", () => {
    for (const scenario of attackScenarios) {
      const result = evaluateAttackScenario(scenario);

      assert.notEqual(result.request.action, "unknown", `${scenario.label} should parse into a wallet action`);
      assert.equal(typeof result.risk.riskScore, "number");
      assert.equal(
        result.decision.decision,
        scenario.expectedDecision,
        `${scenario.label} should be ${scenario.expectedDecision}`,
      );
      assert.equal(result.matchesExpected, true);
    }
  });
});
