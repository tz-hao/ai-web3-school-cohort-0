# System Architecture

Guardian Agent Wallet follows a layered architecture. The UI never calls a concrete wallet implementation directly; it works through the policy, risk, audit, and wallet adapter layers.

## High-Level Flow

```mermaid
flowchart TD
  A["User / Agent Command"] --> B["Intent Parser"]
  B --> C["Risk Engine"]
  C --> D["Policy Engine"]
  D --> E{"Decision"}
  E -->|"ALLOW"| F["Wallet Adapter"]
  E -->|"CONFIRM"| G["Human Confirmation"]
  E -->|"DENY"| H["Blocked"]
  G -->|"approved"| F
  G -->|"rejected"| H
  F --> I["Mock Wallet or Cobo CAW Wallet"]
  I --> J["Audit Log"]
  B --> J
  D --> J
  G --> J
  J --> K["Frontend Dashboard"]
```

## Current Files

- `lib/intent/intentParser.ts`: parses raw commands.
- `lib/risk/riskEngine.ts`: scores transaction risk.
- `lib/policy/policyEngine.ts`: decides `ALLOW`, `CONFIRM`, or `DENY`.
- `lib/policy/agentProfiles.ts`: defines agent permission profiles.
- `lib/policy/securityConfig.ts`: central allowlists and suspicious address helpers.
- `lib/wallets/walletAdapter.ts`: wallet adapter interface.
- `lib/wallets/mockWallet.ts`: deterministic mock execution.
- `lib/wallets/cawWallet.ts`: frontend CAW adapter that calls the server API route.
- `lib/wallets/cawServer.ts`: server-side CAW execution helper.
- `app/api/caw/execute-payment/route.ts`: server API route for CAW execution and fallback handling.
- `lib/audit/auditLog.ts`: local audit record and timeline generation.
- `components/SecurityDashboard.tsx`: main dashboard orchestration.

## Data Flow

```mermaid
sequenceDiagram
  participant UI as Frontend Dashboard
  participant Parser as Intent Parser
  participant Risk as Risk Engine
  participant Policy as Policy Engine
  participant Wallet as Wallet Adapter
  participant Audit as Audit Log

  UI->>Parser: raw command
  Parser-->>UI: PaymentRequest
  UI->>Policy: PaymentRequest + AgentProfile
  Policy->>Risk: assessRisk(request)
  Risk-->>Policy: RiskAssessment
  Policy-->>UI: PolicyDecision
  UI->>Audit: Intent Parsed + Policy Evaluated
  alt ALLOW
    UI->>Wallet: executePayment(request)
  else CONFIRM
    UI->>Audit: User Confirmed / Rejected
    UI->>Wallet: executePayment(request)
  else DENY
    UI-->>UI: blocked
  end
  Wallet-->>UI: WalletExecutionResult
  UI->>Audit: Transaction Executed
```

## TODO

- Keep the new module folders stable as implementation grows:
  - `lib/intent/`
  - `lib/risk/`
  - `lib/policy/`
  - `lib/audit/`
- Extract dashboard orchestration into a hook.
- Keep route pages thin and UI components presentational.
