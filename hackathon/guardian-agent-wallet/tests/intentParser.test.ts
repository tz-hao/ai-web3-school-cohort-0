import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseIntent } from "../lib/intent/intentParser";

describe("intent parser", () => {
  it("parses realistic Chinese agent payment requests into trusted service aliases", () => {
    const cases = [
      ["支付 0.001 SETH 给 数据 API 服务商", 0.001, "data-api-provider"],
      ["支付 0.005 SETH 给 AI 推理服务", 0.005, "ai-inference-service"],
      ["支付 0.01 SETH 给 链上分析 API", 0.01, "onchain-analytics-api"],
      ["支付 0.05 SETH 给 高级研究数据源", 0.05, "premium-research-feed"],
    ] as const;

    for (const [input, amount, recipient] of cases) {
      const request = parseIntent(input);

      assert.equal(request.action, "transfer");
      assert.equal(request.token, "SETH");
      assert.equal(request.amount, amount);
      assert.equal(request.recipient, recipient);
    }
  });
});
