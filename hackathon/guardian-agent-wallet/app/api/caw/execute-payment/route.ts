import { NextResponse } from "next/server";
import { executeCawPayment, getCawWalletInfo } from "@/lib/wallets/cawServer";
import type { PaymentRequest } from "@/types";

export async function GET() {
  try {
    return NextResponse.json({ wallet: await getCawWalletInfo() });
  } catch (error) {
    return NextResponse.json(
      {
        wallet: {
          mode: "mock",
          name: "CAW Fallback Wallet",
          chainId: 8453,
          address: "caw-wallet-info-unavailable",
          isConnected: false,
          executionMode: "caw-fallback",
        },
        error: error instanceof Error ? error.message : "Unable to load CAW wallet info.",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { request?: PaymentRequest };

    if (!body.request) {
      return NextResponse.json({ error: "Missing payment request." }, { status: 400 });
    }

    const result = await executeCawPayment(body.request);
    const status = result.errorCode ? 422 : 200;

    return NextResponse.json(
      {
        result,
        error: result.errorCode
          ? {
              code: result.errorCode,
              reason: result.message,
              cawRequestPreview: result.cawRequestPreview,
            }
          : undefined,
      },
      { status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        result: {
          success: false,
          txHash: "",
          status: "failed",
          walletMode: "caw",
          executionMode: "real-caw",
          message: error instanceof Error ? error.message : "CAW execution failed.",
          errorCode: "caw_sdk_validation_error",
        },
        error: {
          code: "caw_sdk_validation_error",
          reason: error instanceof Error ? error.message : "CAW execution failed.",
        },
      },
      { status: 422 },
    );
  }
}
