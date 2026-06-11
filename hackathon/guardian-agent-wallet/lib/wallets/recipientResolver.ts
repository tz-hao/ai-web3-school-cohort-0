const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export type TrustedRecipientCategory = "data" | "ai" | "analytics" | "research";

export type TrustedRecipientEntry = {
  alias: string;
  displayNameZh: string;
  displayNameEn: string;
  evmAddress: string;
  allowedTokens: string[];
  allowedChains: string[];
  category: TrustedRecipientCategory;
  isFallback: boolean;
};

export type ResolvedRecipient = {
  ok: boolean;
  alias?: string;
  displayName?: string;
  evmAddress?: string;
  reason?: string;
  isFallback?: boolean;
};

type RecipientDefinition = {
  alias: string;
  displayNameZh: string;
  displayNameEn: string;
  envKey: string;
  category: TrustedRecipientCategory;
};

const recipientDefinitions: RecipientDefinition[] = [
  {
    alias: "data-api-provider",
    displayNameZh: "数据 API 服务商",
    displayNameEn: "Data API Provider",
    envKey: "CAW_RECIPIENT_DATA_API",
    category: "data",
  },
  {
    alias: "ai-inference-service",
    displayNameZh: "AI 推理服务",
    displayNameEn: "AI Inference Service",
    envKey: "CAW_RECIPIENT_AI_INFERENCE",
    category: "ai",
  },
  {
    alias: "onchain-analytics-api",
    displayNameZh: "链上分析 API",
    displayNameEn: "Onchain Analytics API",
    envKey: "CAW_RECIPIENT_ONCHAIN_ANALYTICS",
    category: "analytics",
  },
  {
    alias: "premium-research-feed",
    displayNameZh: "高级研究数据源",
    displayNameEn: "Premium Research Feed",
    envKey: "CAW_RECIPIENT_RESEARCH_FEED",
    category: "research",
  },
];

const allowedTokens = ["SETH"];
const allowedChains = ["SETH"];

export function getTrustedRecipientRegistry({
  allowFallback = isLocalDemoMode(),
}: {
  allowFallback?: boolean;
} = {}): TrustedRecipientEntry[] {
  return recipientDefinitions.map((definition) => {
    const configuredAddress = process.env[definition.envKey] || "";
    const fallbackAddress = allowFallback ? process.env.CAW_DESTINATION || "" : "";
    const evmAddress = configuredAddress || fallbackAddress;

    return {
      alias: definition.alias,
      displayNameZh: definition.displayNameZh,
      displayNameEn: definition.displayNameEn,
      evmAddress,
      allowedTokens,
      allowedChains,
      category: definition.category,
      isFallback: Boolean(!configuredAddress && fallbackAddress),
    };
  });
}

export function resolveRecipient(
  input: string,
  {
    allowFallback = isLocalDemoMode(),
  }: {
    allowFallback?: boolean;
  } = {},
): ResolvedRecipient {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return {
      ok: false,
      reason: "Recipient is missing.",
    };
  }

  if (EVM_ADDRESS_PATTERN.test(normalizedInput)) {
    return {
      ok: true,
      alias: "direct-evm-address",
      displayName: "Direct EVM address",
      evmAddress: normalizedInput,
      isFallback: false,
    };
  }

  const registryEntry = getTrustedRecipientRegistry({ allowFallback }).find((entry) =>
    matchesRecipientEntry(normalizedInput, entry),
  );

  if (!registryEntry) {
    return {
      ok: false,
      reason: "Recipient must be a trusted alias or a valid EVM address.",
    };
  }

  if (!EVM_ADDRESS_PATTERN.test(registryEntry.evmAddress)) {
    return {
      ok: false,
      alias: registryEntry.alias,
      displayName: registryEntry.displayNameZh,
      reason: "Trusted recipient is configured but does not have a valid EVM address.",
      isFallback: registryEntry.isFallback,
    };
  }

  return {
    ok: true,
    alias: registryEntry.alias,
    displayName: registryEntry.displayNameZh,
    evmAddress: registryEntry.evmAddress,
    isFallback: registryEntry.isFallback,
  };
}

function matchesRecipientEntry(input: string, entry: TrustedRecipientEntry) {
  const normalized = input.toLowerCase();

  return (
    normalized === entry.alias.toLowerCase() ||
    normalized === entry.displayNameEn.toLowerCase() ||
    input === entry.displayNameZh
  );
}

function isLocalDemoMode() {
  return process.env.NODE_ENV !== "production";
}
