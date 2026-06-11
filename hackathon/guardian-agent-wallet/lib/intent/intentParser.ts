import type { PaymentRequest } from "@/types";

const DEFAULT_CHAIN_ID = 8453;
const ZERO_ADDRESS = "";

const BUY = "\u4e70";
const TRANSFER = "\u8f6c\u8d26";
const PAY = "\u652f\u4ed8";
const TO = "\u7ed9";

const serviceRecipientAliases: Array<{ alias: string; names: string[] }> = [
  {
    alias: "data-api-provider",
    names: ["数据 API 服务商", "数据API服务商", "Data API Provider", "data-api-provider"],
  },
  {
    alias: "ai-inference-service",
    names: ["AI 推理服务", "AI推理服务", "AI Inference Service", "ai-inference-service"],
  },
  {
    alias: "onchain-analytics-api",
    names: ["链上分析 API", "链上分析API", "Onchain Analytics API", "onchain-analytics-api"],
  },
  {
    alias: "premium-research-feed",
    names: ["高级研究数据源", "Premium Research Feed", "premium-research-feed"],
  },
];

export const samplePrompts = [
  `${PAY} 0.001 SETH ${TO} 数据 API 服务商`,
  `${PAY} 0.005 SETH ${TO} AI 推理服务`,
  `${PAY} 0.01 SETH ${TO} 链上分析 API`,
  `${PAY} 0.05 SETH ${TO} 高级研究数据源`,
  "approve unlimited USDC",
];

export function parseIntent(input: string): PaymentRequest {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();
  const action = parseAction(lower);

  return {
    id: createId(),
    rawInput: input,
    action,
    token: parseToken(normalized),
    amount: parseAmount(normalized),
    recipient: action === "transfer" ? parseRecipient(input) : ZERO_ADDRESS,
    spender: action === "approve" ? parseSpender(normalized) : ZERO_ADDRESS,
    chainId: DEFAULT_CHAIN_ID,
    timestamp: Date.now(),
    isUnlimitedApproval: action === "approve" && lower.includes("unlimited"),
  };
}

function parseAction(input: string): PaymentRequest["action"] {
  if (input.includes(BUY) || input.includes("buy")) return "swap";
  if (input.includes(TRANSFER) || input.includes("send")) return "transfer";
  if (input.includes(PAY)) return "transfer";
  if (input.includes("pay") && input.includes(" to ")) return "transfer";
  if (input.includes("approve")) return "approve";
  return "unknown";
}

function parseAmount(input: string) {
  const match = input.match(/(\d+(?:\.\d+)?)\s*(USDC|USDT|ETH|DAI|WETH|SETH)/i);
  return match ? Number(match[1]) : 0;
}

function parseToken(input: string) {
  const match = input.match(/\b(USDC|USDT|ETH|DAI|WETH|SETH)\b/i);
  return match ? match[1].toUpperCase() : "USDC";
}

function parseRecipient(input: string) {
  const serviceRecipient = parseServiceRecipient(input);
  if (serviceRecipient) return serviceRecipient;

  const match = input.match(/0x[a-zA-Z0-9]+/);
  if (match) return match[0];

  const aliasMatch = input.match(/(?:to|给)\s+([a-z0-9-]+)/i);
  return aliasMatch?.[1] ?? ZERO_ADDRESS;
}

function parseServiceRecipient(input: string) {
  const normalized = input.toLowerCase();

  for (const service of serviceRecipientAliases) {
    if (service.names.some((name) => normalized.includes(name.toLowerCase()))) {
      return service.alias;
    }
  }

  return "";
}

function parseSpender(input: string) {
  const match = input.match(new RegExp(`(?:to|${TO})\\s+(0x[a-zA-Z0-9]+)`, "i"));
  return match ? match[1] : ZERO_ADDRESS;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
