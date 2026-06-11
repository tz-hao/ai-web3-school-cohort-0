import type {
  PaymentRequest,
  TransactionStatus,
  WalletExecutionResult,
  WalletInfo,
  WalletMode,
} from "@/types";

export type ExecutePaymentInput = {
  request: PaymentRequest;
};

export interface WalletAdapter {
  mode: WalletMode;
  getWalletInfo(): Promise<WalletInfo>;
  executePayment(input: ExecutePaymentInput): Promise<WalletExecutionResult>;
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;
}

// Extension point: add new adapters here when supporting Safe, ERC-4337,
// payment facilitators, or exchange routers. The UI should keep depending on
// WalletAdapter instead of concrete wallet SDKs.
export function createMockTxHash(prefix: string, requestId: string) {
  return `${prefix}${requestId.replaceAll("-", "").slice(0, 24).toUpperCase()}`;
}
