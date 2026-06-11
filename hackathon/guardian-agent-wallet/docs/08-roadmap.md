# Roadmap

Guardian Agent Wallet should evolve from a local MVP into a CAW-powered policy layer for safe agent payments.

## Phase 1: Current MVP

- Local intent parser.
- Risk engine.
- Policy engine.
- Agent profiles.
- Mock wallet adapter.
- CAW-ready and CAW-integrated execution adapter.
- Audit timeline.
- Web3 security dashboard.

## Phase 2: Architecture Cleanup

- Move flat files into target folders:
  - `lib/intent/`
  - `lib/risk/`
  - `lib/policy/`
  - `lib/audit/`
- Extract dashboard state into a hook.
- Split dashboard cards into smaller components.
- Remove legacy wallet compatibility exports.

## Phase 3: CAW Execution

- Connect `CawWalletAdapter` to real Cobo Agentic Wallet execution.
- Add credential readiness and fallback logic.
- Add transaction receipt fields.
- Add CAW-specific policy checks for scopes, session windows, and budgets.

## Phase 4: Production-Grade Safety

- Server-side audit persistence.
- Signed audit records.
- Transaction simulation.
- Token allowance checks.
- Contract risk metadata.
- End-to-end tests.

## TODO

- Confirm Cobo CAW API requirements.
- Decide whether the demo focuses on API payment, data purchase, or service settlement.
- Add implementation milestones with owners.
