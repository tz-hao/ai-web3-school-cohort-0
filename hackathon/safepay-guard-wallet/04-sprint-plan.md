# Sprint Plan - SafePay Guard Wallet

## Sprint Length

```text
7 days
```

## Sprint Goal

Build a working MVP that evaluates agent-initiated Web3 actions and returns:

```text
allow / deny / needs_human_confirmation
```

with a clear risk explanation and audit evidence.

## Day 1 - Product Frame + Data Model

Tasks:

- Finalize project README.
- Define `PolicyFacts`, `Policy`, `EvaluationResult`.
- Pick two demo scenarios:
  - x402 paid API
  - LI.FI bridge quote
- Prepare sample JSON inputs.

Deliverable:

- `docs/architecture.md`
- `packages/core/src/types.ts`

## Day 2 - Policy Engine

Tasks:

- Implement policy evaluator.
- Add checks for chain, token, amount, recipient, method, resource, slippage.
- Add decision types: allow, deny, needs_human_confirmation.

Deliverable:

- `evaluatePolicy.ts`
- unit tests for normal and blocked flows

## Day 3 - x402 Adapter

Tasks:

- Parse x402 payment requirement.
- Normalize payment facts.
- Generate x402 payment draft.
- Connect to existing local demo.

Deliverable:

- `x402-adapter`
- CLI command: `demo:x402`

## Day 4 - LI.FI Adapter

Tasks:

- Use mock LI.FI quote first.
- Normalize transactionRequest.
- Extract chain, token, recipient, method, amount, slippage.
- Mark high-risk bridge / swap cases.

Deliverable:

- `lifi-adapter`
- CLI command: `demo:lifi`

## Day 5 - Risk Explainer + Audit Log

Tasks:

- Generate user-facing risk summary.
- Write audit events.
- Include facts hash, policy hash, decision, reason.

Deliverable:

- `explainRisk.ts`
- `auditLog.ts`
- sample audit timeline

## Day 6 - Attack Simulation

Tasks:

- Add attack cases:
  - prompt injection
  - oversized payment
  - unknown recipient
  - wrong chain
  - wrong resource
  - unlimited approval
  - forged tool return
  - replay payload
- Convert simulation into regression tests.

Deliverable:

- `attack-sim`
- simulation report

## Day 7 - Demo Polish

Tasks:

- Build CLI or simple web UI.
- Prepare demo script.
- Record short video or screenshots.
- Write final hackathon submission.

Deliverable:

- MVP demo
- `docs/demo-script.md`
- final README

## Stretch Goals

- Real LI.FI quote API integration.
- Safe transaction draft.
- ERC-4337 UserOperation-style draft.
- Cobo CAW / Pact integration research.
- Frontend wallet confirmation screen.
- Exportable policy template.

## Definition of Done

The sprint is done when:

- A user can submit a sample action.
- The system normalizes facts.
- The policy engine returns a decision.
- The user receives a risk explanation.
- The action produces audit evidence.
- Attack simulation blocks at least oversized payment, unknown recipient, wrong resource, wrong chain, and unlimited approval.

