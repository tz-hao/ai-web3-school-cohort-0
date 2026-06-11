export const TRUSTED_RECIPIENTS = [
  "data-api-provider",
  "ai-inference-service",
  "onchain-analytics-api",
  "premium-research-feed",
] as const;
export const ALLOWED_TOKENS = ["USDC", "USDT", "ETH", "DAI", "WETH", "SETH"] as const;

export const RECIPIENT_DISPLAY_NAMES: Record<string, string> = {
  "data-api-provider": "数据 API 服务商",
  "ai-inference-service": "AI 推理服务",
  "onchain-analytics-api": "链上分析 API",
  "premium-research-feed": "高级研究数据源",
};

export function isSuspiciousAddress(address: string) {
  return address.startsWith("0xBAD") || address.startsWith("0xbad");
}

export function isAllowedToken(token: string) {
  return ALLOWED_TOKENS.includes(token as (typeof ALLOWED_TOKENS)[number]);
}

export function isTrustedRecipient(recipient: string) {
  return TRUSTED_RECIPIENTS.includes(recipient as (typeof TRUSTED_RECIPIENTS)[number]);
}
