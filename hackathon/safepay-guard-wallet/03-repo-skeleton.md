# Repo Skeleton - SafePay Guard Wallet

## Goal

Create a clear repo structure for a hackathon MVP that can demonstrate:

```text
intent -> tool response -> normalized facts -> policy decision -> wallet draft -> audit evidence
```

## Proposed Structure

```text
safepay-guard-wallet/
  README.md
  package.json
  apps/
    cli/
      src/
        index.ts
        commands/
          evaluate.ts
          simulate.ts
          demo-x402.ts
          demo-lifi.ts
    web/
      src/
        app/
        components/
          IntentForm.tsx
          RiskSummary.tsx
          PolicyDecisionCard.tsx
          AuditTimeline.tsx
  packages/
    core/
      src/
        types.ts
        normalizeFacts.ts
        evaluatePolicy.ts
        explainRisk.ts
        auditLog.ts
    x402-adapter/
      src/
        parsePaymentRequirement.ts
        createPaymentPayloadDraft.ts
    lifi-adapter/
      src/
        getQuote.ts
        normalizeTransactionRequest.ts
    wallet-adapter/
      src/
        createSafeDraft.ts
        createUserOperationDraft.ts
        mockCawSigner.ts
    attack-sim/
      src/
        scenarios.ts
        runSimulation.ts
  policies/
    safepay-demo-policy.json
  examples/
    x402-payment-requirement.json
    lifi-quote-response.json
    safe-transaction-draft.json
  audit/
    .gitkeep
  docs/
    architecture.md
    demo-script.md
    risk-model.md
    sponsor-questions.md
```

## Module Responsibilities

| Module | Responsibility |
| --- | --- |
| `core/normalizeFacts` | Convert x402 / LI.FI / contract data into policy facts |
| `core/evaluatePolicy` | Return `allow`, `deny`, or `needs_human_confirmation` |
| `core/explainRisk` | Generate user-facing explanation from policy facts |
| `x402-adapter` | Parse x402 payment requirement and create payment draft |
| `lifi-adapter` | Get or mock LI.FI quote and normalize transaction request |
| `wallet-adapter` | Create Safe / ERC-4337 / CAW-style execution draft |
| `attack-sim` | Run adversarial scenarios against policy |
| `web` | Display intent, decision, risk summary, audit timeline |
| `cli` | Provide fast hackathon demo commands |

## Minimal CLI Commands

```bash
pnpm safepay evaluate examples/x402-payment-requirement.json
pnpm safepay evaluate examples/lifi-quote-response.json
pnpm safepay simulate
pnpm safepay demo:x402
pnpm safepay demo:lifi
```

## Data Types

```ts
type PolicyDecision = "allow" | "deny" | "needs_human_confirmation";

type PolicyFacts = {
  actionType: "x402_payment" | "bridge" | "swap" | "contract_call";
  chain: string;
  asset?: string;
  amount?: string;
  recipient?: string;
  contract?: string;
  method?: string;
  resource?: string;
  slippageBps?: number;
  requiresApproval?: boolean;
  simulationStatus?: "passed" | "failed" | "unknown";
};

type EvaluationResult = {
  decision: PolicyDecision;
  reason: string;
  checks: Record<string, "passed" | "failed" | "needs_review">;
  evidence: {
    factsHash: string;
    policyHash: string;
    auditEventId: string;
  };
};
```

## MVP Implementation Order

1. `types.ts`
2. `normalizeFacts.ts`
3. `evaluatePolicy.ts`
4. `explainRisk.ts`
5. `attack-sim`
6. CLI demo
7. Simple web UI
8. Safe / LI.FI / x402 adapters

## Existing Repo Assets to Reuse

```text
experiments/x402-caw-agent-payment/src/demo.js
experiments/x402-caw-agent-payment/src/attack-simulation.js
references/week3-safepay-minimal-loop.md
references/week3-safe-wallet-reading-summary.md
submissions/week2-final-safe-wallet-proposal.md
```

