# Submission Summary

## Track

Cobo Agentic Wallet Hackathon

## Project Name

Guardian Agent Wallet

## Positioning

Policy-Aware Agent Payment Framework Built on Cobo Agentic Wallet

## Target Users

- AI agent builders who want agents to pay for APIs, data, compute, or services.
- Web3 teams experimenting with autonomous payment workflows.
- Wallet, security, and infrastructure teams that need scoped permissions and auditability.
- Hackathon judges evaluating CAW-based agent payment safety patterns.

## Problem

AI agents can generate payment intent, but wallet execution is irreversible. Without a policy-aware layer, agents may:

- exceed budget,
- transfer to suspicious recipients,
- accept forged tool results,
- grant unlimited approvals,
- expose users to irreversible loss,
- leave weak audit evidence.

## MVP Features

- Intent Parser for simple Chinese and English payment commands.
- Agent Governance with Research Agent, Payment Agent, and Trading Agent profiles.
- Risk Intelligence with score, level, Chinese explanation, and contribution breakdown.
- Policy Engine that returns `ALLOW`, `CONFIRM`, or `DENY`.
- Pact Preview before execution.
- Wallet Adapter with Mock Mode, CAW Fallback Mode, and Real CAW Mode.
- Server-side CAW execution path through `app/api/caw/execute-payment/route.ts`.
- Audit Timeline for parsed intent, policy decision, user confirmation, and execution result.
- Demo stories for normal payment, runaway agent, malicious approval, and phishing recipient.

## Tech Path

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Node.js test runner with `tsx`
- `@cobo/agentic-wallet`
- Server-only CAW credentials via `AGENT_WALLET_*`
- Frontend mode display via `NEXT_PUBLIC_WALLET_MODE`
- Browser localStorage for MVP audit persistence

## CAW Integration

The frontend does not call the CAW SDK and does not receive credentials.

Execution path:

```text
Frontend Wallet Adapter
  -> /api/caw/execute-payment
  -> lib/wallets/cawServer.ts
  -> @cobo/agentic-wallet
```

The current MVP focuses on a small `SETH` transfer path. Real wallet address, request ID, receipt ID, and tx hash are returned only if CAW returns them.

## Risks And Caveats

- Do not expose `AGENT_WALLET_API_KEY`.
- Do not commit `.env.local`.
- Do not fake tx hash or receipt evidence.
- Intent parsing is demo-scoped.
- Risk scoring is deterministic and MVP-oriented.
- Audit persistence is browser localStorage only.
- CAW execution supports a narrow MVP transfer path.
- Mock fallback must remain clearly labeled in public demos.

## Validation

Required checks:

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Manual demo checks:

- normal payment -> `ALLOW`,
- over-budget payment -> `CONFIRM`,
- unlimited approval -> `DENY`,
- phishing recipient -> `CONFIRM`,
- Research Agent vs Payment Agent comparison differs,
- Pact Preview appears before execution,
- Audit Timeline records the flow,
- runtime mode badge is visible and accurate.
