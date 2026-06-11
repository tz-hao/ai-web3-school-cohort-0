import type { PaymentRequest } from "@/types";

export type CawPaymentIntent = {
  walletId: string;
  request: PaymentRequest;
};

export type CawExecutionReceipt = {
  provider: "cobo-caw";
  status: "pending" | "confirmed" | "failed";
  txHash: string;
  message: string;
};
