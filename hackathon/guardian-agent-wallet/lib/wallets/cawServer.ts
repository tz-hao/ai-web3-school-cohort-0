import { Configuration, TransactionsApi, WalletsApi } from "@cobo/agentic-wallet";
import { getCawServerConfig, hasCawCredentials } from "@/lib/wallets/cawConfig";
import { mockWalletAdapter } from "@/lib/wallets/mockWallet";
import { getTrustedRecipientRegistry, resolveRecipient, type ResolvedRecipient } from "@/lib/wallets/recipientResolver";
import type { PaymentRequest, WalletExecutionResult, WalletInfo } from "@/types";

type TransferBody = {
  dst_addr: string;
  amount: string;
  token_id: string;
  chain_id: string;
  request_id: string;
  description: string;
};

type TransferResponse = {
  success?: boolean;
  result?: {
    id?: string;
    request_id?: string;
    transaction_hash?: string;
    status?: number;
    status_display?: string;
  };
  message?: string;
  suggestion?: string;
};

type CawServerDeps = {
  getWalletAddress?: (walletId: string) => Promise<string>;
  transferTokens?: (walletId: string, body: TransferBody) => Promise<TransferResponse>;
};

const CAW_CHAIN_ID = "SETH";
const CAW_TOKEN_ID = "SETH";
const MAX_MVP_SETH_AMOUNT = 0.01;

type CawValidationErrorCode = NonNullable<WalletExecutionResult["errorCode"]>;

type CawValidationResult = {
  code: CawValidationErrorCode;
  message: string;
};

export async function getCawWalletInfo(deps: CawServerDeps = {}): Promise<WalletInfo> {
  const config = getCawServerConfig();

  if (config.mockMode || !hasCawCredentials(config)) {
    const fallback = await mockWalletAdapter.getWalletInfo();

    return {
      ...fallback,
      name: config.mockMode ? "CAW Fallback Wallet" : "CAW Fallback Wallet",
      executionMode: "caw-fallback",
      cawConfigStatus: getSafeConfigStatus(config),
      cawTrustedRecipients: getSafeRecipientPreview(),
    };
  }

  return {
    mode: "caw",
    name: "Cobo Agentic Wallet",
    chainId: 11155111,
    address: await getWalletAddress(config.walletId, deps),
    isConnected: true,
    executionMode: "real-caw",
    cawConfigStatus: getSafeConfigStatus(config),
    cawTrustedRecipients: getSafeRecipientPreview(),
  };
}

export async function executeCawPayment(
  request: PaymentRequest,
  deps: CawServerDeps = {},
): Promise<WalletExecutionResult> {
  const config = getCawServerConfig();

  if (config.mockMode || !hasCawCredentials(config)) {
    const fallback = await mockWalletAdapter.executePayment({ request });

    return {
      ...fallback,
      executionMode: "caw-fallback",
      message: config.mockMode
        ? "CAW_MOCK_MODE=true; executed through mock wallet fallback."
        : "CAW credentials missing; executed through mock wallet fallback.",
    };
  }

  const resolvedRecipient = resolveRecipient(request.recipient);
  const requestPreview = buildCawRequestPreview(request, config, resolvedRecipient);
  logSafeCawDebug("caw.execute.preview", requestPreview, config, "real-caw");

  const validationError = validateMvpSethTransfer(request, config);
  if (validationError) {
    return {
      success: false,
      txHash: "",
      status: "failed",
      walletMode: "caw",
      executionMode: "real-caw",
      message: validationError.message,
      errorCode: validationError.code,
      cawRequestPreview: requestPreview,
    };
  }
  if (!resolvedRecipient.ok || !resolvedRecipient.evmAddress) {
    return {
      success: false,
      txHash: "",
      status: "failed",
      walletMode: "caw",
      executionMode: "real-caw",
      message: resolvedRecipient.reason || "Recipient must be a trusted alias or a valid EVM address.",
      errorCode: "unresolved_recipient",
      cawRequestPreview: requestPreview,
      recipientAlias: resolvedRecipient.alias,
      displayRecipient: resolvedRecipient.displayName,
      recipientIsFallback: resolvedRecipient.isFallback,
    };
  }

  const requestId = `guardian-caw-${request.id}`;
  const transferBody: TransferBody = {
    dst_addr: resolvedRecipient.evmAddress,
    amount: String(request.amount),
    token_id: CAW_TOKEN_ID,
    chain_id: CAW_CHAIN_ID,
    request_id: requestId,
    description: `Guardian Agent Wallet MVP transfer for request ${request.id}`,
  };
  let walletAddress = "";
  let transferResponse: TransferResponse;

  try {
    [walletAddress, transferResponse] = await Promise.all([
      getWalletAddress(config.walletId, deps),
      transferTokens(config.walletId, transferBody, deps),
    ]);
  } catch (error) {
    const message = formatCawSdkError(error);
    logSafeCawDebug("caw.execute.sdk_validation_error", requestPreview, config, "real-caw");

    return {
      success: false,
      txHash: "",
      status: "failed",
      walletMode: "caw",
      executionMode: "real-caw",
      message,
      requestId,
      errorCode: "caw_sdk_validation_error",
      cawRequestPreview: requestPreview,
      recipientAlias: resolvedRecipient.alias,
      displayRecipient: resolvedRecipient.displayName,
      resolvedRecipientAddress: resolvedRecipient.evmAddress,
      recipientIsFallback: resolvedRecipient.isFallback,
    };
  }
  const result = transferResponse.result;

  return {
    success: Boolean(transferResponse.success),
    txHash: result?.transaction_hash || "",
    status: mapCawStatus(result?.status),
    walletMode: "caw",
    executionMode: "real-caw",
    message: result?.transaction_hash
      ? "Real CAW transfer submitted with on-chain transaction hash."
      : "Real CAW transfer submitted; transaction hash is not available yet.",
    requestId: result?.request_id || requestId,
    receiptId: result?.id,
    walletAddress,
    cawRequestPreview: requestPreview,
    recipientAlias: resolvedRecipient.alias,
    displayRecipient: resolvedRecipient.displayName,
    resolvedRecipientAddress: resolvedRecipient.evmAddress,
    recipientIsFallback: resolvedRecipient.isFallback,
    rawCawResponse: transferResponse as Record<string, unknown>,
  };
}

async function getWalletAddress(walletId: string, deps: CawServerDeps) {
  if (deps.getWalletAddress) {
    return deps.getWalletAddress(walletId);
  }

  const config = getCawServerConfig();
  const walletsApi = new WalletsApi(new Configuration({ basePath: config.apiUrl, apiKey: config.apiKey }));
  const response = await walletsApi.listWalletAddresses(walletId);
  const addresses = response.data.result ?? [];
  const evmAddress = addresses.find(
    (address) => address.chain_type === "ETH" || address.compatible_chains?.includes(CAW_CHAIN_ID),
  );

  return evmAddress?.address || "caw-wallet-address-unavailable";
}

async function transferTokens(walletId: string, body: TransferBody, deps: CawServerDeps) {
  if (deps.transferTokens) {
    return deps.transferTokens(walletId, body);
  }

  const config = getCawServerConfig();
  const transactionsApi = new TransactionsApi(
    new Configuration({ basePath: config.apiUrl, apiKey: config.apiKey }),
  );
  const response = await transactionsApi.transferTokens(walletId, body);

  return response.data;
}

export function buildCawRequestPreview(
  request: PaymentRequest,
  config = getCawServerConfig(),
  resolvedRecipient: ResolvedRecipient = resolveRecipient(request.recipient),
) {
  return {
    chainId: CAW_CHAIN_ID,
    tokenId: request.token,
    amount: String(request.amount),
    recipient: request.recipient,
    displayRecipient: resolvedRecipient.displayName || request.recipient,
    resolvedRecipientAddress: resolvedRecipient.evmAddress,
    recipientIsFallback: Boolean(resolvedRecipient.isFallback),
    pactIdPresent: Boolean(config.pactId),
  };
}

function validateMvpSethTransfer(request: PaymentRequest, config = getCawServerConfig()): CawValidationResult | null {
  if (request.action !== "transfer") {
    return {
      code: "unsupported_chain",
      message: "Real CAW MVP currently supports only SETH transfer actions.",
    };
  }
  if (request.token !== CAW_TOKEN_ID) {
    return {
      code: "unsupported_token",
      message: "unsupported token: Real CAW MVP currently supports only SETH transfers.",
    };
  }
  if (request.chainId !== 11155111 && request.chainId !== 8453) {
    return {
      code: "unsupported_chain",
      message: "unsupported chain: Real CAW MVP currently supports Ethereum Sepolia SETH only.",
    };
  }
  if (!Number.isFinite(request.amount) || request.amount <= 0 || request.amount > MAX_MVP_SETH_AMOUNT) {
    return {
      code: "invalid_amount",
      message: `invalid amount: Real CAW MVP transfer amount must be greater than 0 and at most ${MAX_MVP_SETH_AMOUNT} SETH.`,
    };
  }
  if (!config.pactId) {
    return {
      code: "missing_pact_id",
      message: "missing pact id: set AGENT_WALLET_PACT_ID for real CAW execution, or use CAW fallback/mock mode.",
    };
  }
  if (!request.recipient.trim()) {
    return {
      code: "missing_recipient",
      message: "missing recipient: Real CAW MVP requires a destination recipient.",
    };
  }

  return null;
}

function getSafeConfigStatus(config = getCawServerConfig()) {
  return {
    apiUrlPresent: Boolean(config.apiUrl),
    walletIdPresent: Boolean(config.walletId),
    pactIdPresent: Boolean(config.pactId),
  };
}

function getSafeRecipientPreview() {
  return getTrustedRecipientRegistry().map((entry) => ({
    alias: entry.alias,
    displayNameZh: entry.displayNameZh,
    displayNameEn: entry.displayNameEn,
    evmAddress: entry.evmAddress,
    isFallback: entry.isFallback,
  }));
}

function logSafeCawDebug(
  label: string,
  preview: ReturnType<typeof buildCawRequestPreview>,
  config = getCawServerConfig(),
  executionMode: NonNullable<WalletInfo["executionMode"]>,
) {
  console.info(label, {
    chainId: preview.chainId,
    tokenId: preview.tokenId,
    amount: preview.amount,
    recipient: preview.recipient,
    pactIdExists: Boolean(config.pactId),
    walletIdExists: Boolean(config.walletId),
    apiUrlExists: Boolean(config.apiUrl),
    executionMode,
  });
}

function formatCawSdkError(error: unknown) {
  if (error && typeof error === "object") {
    const maybeResponse = error as {
      response?: {
        status?: number;
        data?: {
          message?: string;
          error?: string;
          suggestion?: string;
        };
      };
      message?: string;
    };
    const status = maybeResponse.response?.status;
    const data = maybeResponse.response?.data;
    const reason = data?.message || data?.error || maybeResponse.message || "CAW SDK validation error.";
    const suggestion = data?.suggestion ? ` Suggestion: ${data.suggestion}` : "";

    return status ? `CAW SDK validation error (${status}): ${reason}.${suggestion}` : `CAW SDK validation error: ${reason}.${suggestion}`;
  }

  return "CAW SDK validation error.";
}

function mapCawStatus(status: number | undefined): WalletExecutionResult["status"] {
  if (status === 900) return "confirmed";
  if (status && status >= 901) return "failed";

  return "pending";
}
