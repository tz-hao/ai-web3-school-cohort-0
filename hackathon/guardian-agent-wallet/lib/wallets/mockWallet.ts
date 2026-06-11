import type { PaymentRequest, TransactionStatus, WalletExecutionResult, WalletInfo } from "@/types";
import { createMockTxHash, type WalletAdapter } from "./walletAdapter";

export class MockWalletAdapter implements WalletAdapter {
  mode = "mock" as const;

  async getWalletInfo(): Promise<WalletInfo> {
    return {
      mode: this.mode,
      name: "Mock Wallet",
      chainId: 8453,
      address: "0xMOCK_AGENT_WALLET",
      isConnected: true,
    };
  }

  async executePayment({ request }: { request: PaymentRequest }): Promise<WalletExecutionResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (request.action === "unknown") {
      return {
        success: false,
        txHash: "",
        status: "failed",
        walletMode: this.mode,
        message: "Mock wallet rejected unknown action.",
      };
    }

    return {
      success: true,
      txHash: createMockTxHash("0xMOCK", request.id),
      status: "confirmed",
      walletMode: this.mode,
      message: "Mock wallet execution recorded.",
    };
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    return {
      txHash,
      status: txHash ? "confirmed" : "failed",
      confirmations: txHash ? 1 : 0,
      updatedAt: Date.now(),
    };
  }
}

export const mockWalletAdapter = new MockWalletAdapter();

export async function executeMockTransaction(request: PaymentRequest) {
  return mockWalletAdapter.executePayment({ request });
}
