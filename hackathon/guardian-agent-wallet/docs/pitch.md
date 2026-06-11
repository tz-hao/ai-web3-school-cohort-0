# Guardian Agent Wallet Pitch

## 30-Second Pitch

Guardian Agent Wallet is a Policy-Aware Agent Payment Framework Built on Cobo Agentic Wallet.

AI agents can now initiate payments, but wallet execution is irreversible. Guardian Agent Wallet puts deterministic risk, policy, agent governance, human confirmation, and audit logging between AI intent and CAW execution. The result is a safer path for agent-native payments: AI explains, policy decides, CAW executes, human governs, and audit records.

## 1-Minute Pitch

AI agents are beginning to buy APIs, data, compute, research feeds, and SaaS services. The problem is that agent output is probabilistic while wallet execution is irreversible. A prompt injection, forged tool result, excessive payment, unknown vendor, or unlimited approval can turn a useful agent into a wallet risk.

Guardian Agent Wallet solves this by adding a policy-aware execution layer built on Cobo Agentic Wallet. The MVP parses agent payment intent, scores risk, applies agent-specific permissions, previews the execution scope, and routes allowed payments through a server-side CAW adapter. Medium and high-risk actions require human confirmation or are blocked.

The demo shows realistic API/SaaS payments, over-budget payments, suspicious recipients, unknown vendors, unlimited approvals, agent profile differences, risk contribution explanations, CAW execution modes, and an audit timeline.

## 3-Minute Pitch

The core problem is simple: AI agents can decide to pay, but they should not automatically control wallet authority.

Today, an autonomous agent might pay for an API, buy data, call a paid service, or perform a wallet action. In Web3, those actions can be irreversible. Prompt injection, forged tool responses, broad approvals, and unclear budgets make direct agent-to-wallet execution unsafe.

Guardian Agent Wallet is a Policy-Aware Agent Payment Framework Built on Cobo Agentic Wallet. It separates agent intent from wallet execution.

The workflow is:

```text
Intent Parser -> Risk Engine -> Policy Engine -> Pact Preview -> CAW Execution Adapter -> Audit Log
```

The agent submits a natural language request such as `支付 0.001 SETH 给 数据 API 服务商`. The intent parser converts it into a structured request with the trusted alias `data-api-provider`. The risk engine scores the transaction and explains risk in Chinese, including contribution items like `+40 超预算`, `+25 未知或可疑收款方`, and `+20 无限授权`. The policy engine checks the selected agent profile. A Research Agent can pay trusted APIs only; a Payment Agent can make small API/SaaS payments within budget; a Trading Agent can swap and transfer, but approval remains restricted.

If a request is low risk, it can proceed. If it is medium or high risk, the user must confirm. If it is dangerous, such as unlimited approval, it is denied. Before execution, Pact Preview shows the exact intent, amount, token, recipient, budget, decision, wallet mode, and whether human approval is required.

Cobo Agentic Wallet is the execution layer. The frontend never sees API keys. It calls a server-side route, and real tx hash or receipt evidence is shown only if CAW returns it. Mock Mode and CAW Fallback Mode are clearly labeled so the demo never fakes transaction evidence.

The value is a practical safety layer for agent-native payments: explainable risk, scoped permissions, human governance, server-side CAW execution, and auditability.
