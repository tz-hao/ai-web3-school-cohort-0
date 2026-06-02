# Submission - Cobo Track Fit for SafePay Guard Wallet

## Track

```text
Cobo | Agentic Economy x Cobo Agentic Wallet
```

## Project

```text
SafePay Guard Wallet
```

## Summary

If SafePay Guard Wallet chooses the Cobo track, the project should frame Cobo Agentic Wallet as the execution boundary for AI agents.

The agent does not receive raw private keys. It receives a scoped Pact:

- intent;
- execution plan;
- budget;
- allowed chains / tokens / contracts / tools;
- human approval thresholds;
- completion conditions;
- audit requirements.

The project then demonstrates how the agent can pay for APIs, request resources, or prepare trading / bridge actions while CAW enforces the Pact.

## Key Files

- `hackathon/safepay-guard-wallet/07-cobo-track-fit.md`
- `hackathon/safepay-guard-wallet/README.md`
- `hackathon/safepay-guard-wallet/02-proposal-memo.md`
- `references/week3-safepay-minimal-loop.md`

## Core Design

```text
Agent proposes.
Pact scopes.
CAW enforces.
Human confirms high risk.
Audit records.
```

