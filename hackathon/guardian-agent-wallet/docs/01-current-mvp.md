# Current MVP

The current MVP is a Next.js Web3 security dashboard for agent payment safety. It runs locally, uses mock wallet execution by default, and contains a CAW adapter placeholder for future integration.

## Implemented Features

- Intent parser for simple Chinese and English payment commands.
- Agent profiles:
  - `ResearchAgent`
  - `PaymentAgent`
  - `TradingAgent`
- Risk engine with score, level, explanation, and warnings.
- Policy engine with `ALLOW`, `CONFIRM`, and `DENY`.
- Wallet adapter architecture:
  - mock wallet adapter,
  - Cobo CAW wallet placeholder adapter.
- Local audit timeline in browser localStorage.
- Frontend pages:
  - Dashboard: `/`
  - Risk Review: `/risk-review`
  - Audit Timeline: `/audit-timeline`

## MVP Demo Scenarios

| Scenario | Example | Expected Result |
| --- | --- | --- |
| Low-risk small payment | `买 10 USDC 的 ETH` | `ALLOW` |
| Over-budget payment | high amount over selected profile limit | `CONFIRM` |
| Suspicious recipient | `转账 20 USDC 给 0xBAD` | `CONFIRM` |
| Unlimited approval | `approve unlimited USDC` | `DENY` |

## Runtime Modes

```bash
NEXT_PUBLIC_WALLET_MODE=mock
NEXT_PUBLIC_WALLET_MODE=caw
```

If CAW credentials are missing, the project should fall back to mock mode for demo safety. Current code selects mock by default when no wallet mode is configured.

## What Is Still Mocked

- Real CAW payment execution.
- Real onchain transaction settlement.
- Real x402 facilitator payment flow.
- Server-side signed audit evidence.

## TODO

- Align the UI copy with the final selected Cobo hackathon use case.
- Add a CAW credential readiness indicator.
- Add end-to-end browser tests for the four required demo scenarios.
