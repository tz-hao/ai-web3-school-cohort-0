import type { PaymentRequest } from "@/types";

const NATIVE_TOKEN_USD_ESTIMATE = 3000;
const NATIVE_TOKENS = new Set(["ETH", "WETH", "SETH"]);

export function estimateBudgetValue(request: PaymentRequest) {
  if (NATIVE_TOKENS.has(request.token)) {
    return request.amount * NATIVE_TOKEN_USD_ESTIMATE;
  }

  return request.amount;
}
