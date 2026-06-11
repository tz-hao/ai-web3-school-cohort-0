import type { PaymentRequest, TransactionStatus, WalletExecutionResult, WalletInfo } from "@/types";
import type { WalletAdapter } from "./walletAdapter";

export class CawWalletAdapter implements WalletAdapter {
  mode = "caw" as const;

  async getWalletInfo(): Promise<WalletInfo> {
    const response = await fetch("/api/caw/execute-payment", { method: "GET" });
    const data = (await response.json()) as { wallet: WalletInfo };

    return data.wallet;
  }

  async executePayment({ request }: { request: PaymentRequest }): Promise<WalletExecutionResult> {
    const response = await fetch("/api/caw/execute-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });
    const data = (await response.json()) as { result: WalletExecutionResult };

    return data.result;
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    return {
      txHash,
      status: txHash ? "pending" : "failed",
      confirmations: 0,
      updatedAt: Date.now(),
    };
  }
}

export const cawWalletAdapter = new CawWalletAdapter();
