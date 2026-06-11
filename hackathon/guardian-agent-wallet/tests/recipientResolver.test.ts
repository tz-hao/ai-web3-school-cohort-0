import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRecipient } from "../lib/wallets/recipientResolver";

const DATA_API_ADDRESS = "0x1111111111111111111111111111111111111111";
const AI_ADDRESS = "0x2222222222222222222222222222222222222222";
const FALLBACK_ADDRESS = "0x9999999999999999999999999999999999999999";

function setRecipientEnv(overrides: NodeJS.ProcessEnv) {
  const previous = {
    CAW_RECIPIENT_DATA_API: process.env.CAW_RECIPIENT_DATA_API,
    CAW_RECIPIENT_AI_INFERENCE: process.env.CAW_RECIPIENT_AI_INFERENCE,
    CAW_RECIPIENT_ONCHAIN_ANALYTICS: process.env.CAW_RECIPIENT_ONCHAIN_ANALYTICS,
    CAW_RECIPIENT_RESEARCH_FEED: process.env.CAW_RECIPIENT_RESEARCH_FEED,
    CAW_DESTINATION: process.env.CAW_DESTINATION,
    AGENT_WALLET_API_KEY: process.env.AGENT_WALLET_API_KEY,
  };

  process.env.CAW_RECIPIENT_DATA_API = overrides.CAW_RECIPIENT_DATA_API;
  process.env.CAW_RECIPIENT_AI_INFERENCE = overrides.CAW_RECIPIENT_AI_INFERENCE;
  process.env.CAW_RECIPIENT_ONCHAIN_ANALYTICS = overrides.CAW_RECIPIENT_ONCHAIN_ANALYTICS;
  process.env.CAW_RECIPIENT_RESEARCH_FEED = overrides.CAW_RECIPIENT_RESEARCH_FEED;
  process.env.CAW_DESTINATION = overrides.CAW_DESTINATION;
  process.env.AGENT_WALLET_API_KEY = overrides.AGENT_WALLET_API_KEY;

  return () => {
    process.env.CAW_RECIPIENT_DATA_API = previous.CAW_RECIPIENT_DATA_API;
    process.env.CAW_RECIPIENT_AI_INFERENCE = previous.CAW_RECIPIENT_AI_INFERENCE;
    process.env.CAW_RECIPIENT_ONCHAIN_ANALYTICS = previous.CAW_RECIPIENT_ONCHAIN_ANALYTICS;
    process.env.CAW_RECIPIENT_RESEARCH_FEED = previous.CAW_RECIPIENT_RESEARCH_FEED;
    process.env.CAW_DESTINATION = previous.CAW_DESTINATION;
    process.env.AGENT_WALLET_API_KEY = previous.AGENT_WALLET_API_KEY;
  };
}

describe("recipient resolver", () => {
  it("resolves Chinese display names", () => {
    const restore = setRecipientEnv({
      CAW_RECIPIENT_DATA_API: DATA_API_ADDRESS,
      CAW_RECIPIENT_AI_INFERENCE: "",
      CAW_RECIPIENT_ONCHAIN_ANALYTICS: "",
      CAW_RECIPIENT_RESEARCH_FEED: "",
      CAW_DESTINATION: "",
      AGENT_WALLET_API_KEY: "secret-test-key",
    });

    try {
      const result = resolveRecipient("数据 API 服务商");

      assert.equal(result.ok, true);
      assert.equal(result.alias, "data-api-provider");
      assert.equal(result.displayName, "数据 API 服务商");
      assert.equal(result.evmAddress, DATA_API_ADDRESS);
      assert.equal(result.isFallback, false);
    } finally {
      restore();
    }
  });

  it("resolves English service names and aliases", () => {
    const restore = setRecipientEnv({
      CAW_RECIPIENT_DATA_API: "",
      CAW_RECIPIENT_AI_INFERENCE: AI_ADDRESS,
      CAW_RECIPIENT_ONCHAIN_ANALYTICS: "",
      CAW_RECIPIENT_RESEARCH_FEED: "",
      CAW_DESTINATION: "",
      AGENT_WALLET_API_KEY: "secret-test-key",
    });

    try {
      assert.equal(resolveRecipient("AI Inference Service").evmAddress, AI_ADDRESS);
      assert.equal(resolveRecipient("ai-inference-service").evmAddress, AI_ADDRESS);
    } finally {
      restore();
    }
  });

  it("resolves direct EVM addresses", () => {
    const result = resolveRecipient(DATA_API_ADDRESS);

    assert.equal(result.ok, true);
    assert.equal(result.alias, "direct-evm-address");
    assert.equal(result.evmAddress, DATA_API_ADDRESS);
    assert.equal(result.isFallback, false);
  });

  it("fails unknown vendors", () => {
    const result = resolveRecipient("unknown-vendor");

    assert.equal(result.ok, false);
    assert.match(result.reason || "", /trusted alias|valid EVM address/);
  });

  it("uses CAW_DESTINATION fallback only when allowed", () => {
    const restore = setRecipientEnv({
      CAW_RECIPIENT_DATA_API: "",
      CAW_RECIPIENT_AI_INFERENCE: "",
      CAW_RECIPIENT_ONCHAIN_ANALYTICS: "",
      CAW_RECIPIENT_RESEARCH_FEED: "",
      CAW_DESTINATION: FALLBACK_ADDRESS,
      AGENT_WALLET_API_KEY: "secret-test-key",
    });

    try {
      const allowed = resolveRecipient("data-api-provider", { allowFallback: true });
      const blocked = resolveRecipient("data-api-provider", { allowFallback: false });

      assert.equal(allowed.ok, true);
      assert.equal(allowed.evmAddress, FALLBACK_ADDRESS);
      assert.equal(allowed.isFallback, true);
      assert.equal(blocked.ok, false);
    } finally {
      restore();
    }
  });

  it("never returns the API key", () => {
    const restore = setRecipientEnv({
      CAW_RECIPIENT_DATA_API: DATA_API_ADDRESS,
      CAW_RECIPIENT_AI_INFERENCE: "",
      CAW_RECIPIENT_ONCHAIN_ANALYTICS: "",
      CAW_RECIPIENT_RESEARCH_FEED: "",
      CAW_DESTINATION: "",
      AGENT_WALLET_API_KEY: "secret-test-key",
    });

    try {
      const result = JSON.stringify(resolveRecipient("data-api-provider"));

      assert.doesNotMatch(result, /secret-test-key/);
      assert.doesNotMatch(result, /AGENT_WALLET_API_KEY/);
    } finally {
      restore();
    }
  });
});
