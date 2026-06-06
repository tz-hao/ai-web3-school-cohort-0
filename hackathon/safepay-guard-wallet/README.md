# SafePay Guard Wallet - Hackathon Package

## One-liner

SafePay Guard Wallet is an AI-assisted wallet execution guard for agentic Web3 workflows. It lets an agent propose actions, while policy, wallet infrastructure, human confirmation, and audit logs decide what can actually execute.

## Package Contents

| File | Purpose |
| --- | --- |
| `01-direction-card.md` | Hackathon Direction Card |
| `02-proposal-memo.md` | Project proposal memo |
| `03-repo-skeleton.md` | Repo skeleton and module plan |
| `04-sprint-plan.md` | Sprint plan |
| `05-risk-memo.md` | Risk memo |
| `06-sponsor-mentor-questions.md` | Sponsor / mentor question list |
| `07-cobo-track-fit.md` | Cobo Agentic Wallet track fit |
| `08-assumptions-failure-fallback.md` | Assumptions, failure modes, and Week 4 fallback plan |
| `09-scope-control-non-goals.md` | Week 4 scope control and non-goals |
| `10-week4-technical-validation-checklist.md` | Week 4 technical validation checklist |
| `11-sponsor-sdk-api-integration-plan.md` | Sponsor SDK / API integration plan |
| `12-sponsor-workshop-notes.md` | Sponsor workshop notes |

## Core Direction

```text
Wallet / Permission / Safe Execution
```

## MVP Loop

```text
User intent
  -> Agent prepares action
  -> Tool / SDK returns payment requirement or transactionRequest
  -> SafePay normalizes facts
  -> Policy decides allow / deny / human confirmation
  -> Wallet / Safe / CAW enforces
  -> Result and audit evidence are recorded
```

## Existing Learning Assets

- `references/week3-safepay-minimal-loop.md`
- `references/week3-safe-wallet-reading-summary.md`
- `submissions/week2-final-safe-wallet-proposal.md`
- `experiments/x402-caw-agent-payment/`
