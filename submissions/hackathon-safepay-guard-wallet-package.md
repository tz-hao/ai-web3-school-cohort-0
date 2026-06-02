# Hackathon Package Submission - SafePay Guard Wallet

## Package

```text
hackathon/safepay-guard-wallet/
```

## Included Materials

| Required Item | File |
| --- | --- |
| Hackathon Direction Card | `hackathon/safepay-guard-wallet/01-direction-card.md` |
| Proposal Memo | `hackathon/safepay-guard-wallet/02-proposal-memo.md` |
| Repo Skeleton | `hackathon/safepay-guard-wallet/03-repo-skeleton.md` |
| Sprint Plan | `hackathon/safepay-guard-wallet/04-sprint-plan.md` |
| Risk Memo | `hackathon/safepay-guard-wallet/05-risk-memo.md` |
| Sponsor / Mentor Questions | `hackathon/safepay-guard-wallet/06-sponsor-mentor-questions.md` |

## Project Summary

SafePay Guard Wallet is an AI-assisted wallet execution guard for agentic Web3 workflows.

It helps answer:

```text
The agent wants to execute something. Should the wallet allow it, block it, or ask a human?
```

The project focuses on:

- x402 payment requirements;
- LI.FI transaction requests;
- Safe / ERC-4337 / CAW-style wallet execution;
- policy checks;
- low-risk automation;
- high-risk human confirmation;
- audit evidence.

## Main Direction

```text
Wallet / Permission / Safe Execution
```

## MVP Decision

The hackathon MVP should start with a CLI or simple web demo:

1. User submits intent.
2. Agent gets x402 requirement or LI.FI quote.
3. SafePay normalizes policy facts.
4. Policy returns allow / deny / needs human confirmation.
5. Risk explanation and audit evidence are generated.

## Why This Direction

This project is not pure AI because wallet execution requires deterministic enforcement, signature control, spending limits, revocation, and audit records.

It is not pure Web3 because users need AI to understand complex route, contract, payment, allowance, and execution risks.

The valuable layer is in between:

```text
Agent proposes.
Policy checks.
Wallet signs.
Human confirms high risk.
Audit records.
```

