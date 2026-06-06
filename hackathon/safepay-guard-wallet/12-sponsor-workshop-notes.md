# Sponsor Workshop Notes - SafePay Guard Wallet

## Project

```text
SafePay Guard Wallet
```

## Selected Workshops

I selected the 2 sponsor directions most relevant to this project:

1. **Cobo | Agentic Economy x Cobo Agentic Wallet**
2. **Z.AI | GLM / Agentic Engineering**

The core project track remains Cobo. Z.AI is treated as a supporting AI layer for reasoning, trace summarization, and user-facing risk explanations.

## 1. Cobo Workshop - Agentic Economy x Cobo Agentic Wallet

### What Problem the Sponsor Solves

Cobo Agentic Wallet focuses on the problem of giving AI agents wallet capabilities without giving them unrestricted private key control.

The main problem is:

```text
How can an agent pay, trade, purchase resources, or manage funds while staying inside user-approved boundaries?
```

For SafePay Guard Wallet, this is the central problem. The agent should not own the wallet. It should operate under scoped authority, budget limits, allowlists, time windows, and human approval rules.

### What Tools / Concepts It Provides

Relevant Cobo concepts:

- Agentic Wallet
- Pact
- scoped authority
- budget policy
- allowed actions
- completion conditions
- human approval
- MPC-backed signing
- auditability

For the MVP, I will model these as:

```text
pact-policy.json
mock CAW signer
policy decision log
audit trail
```

### Suitable Track

```text
Cobo | Agentic Economy x Cobo Agentic Wallet
```

Also related:

- Wallet / Permission / Safe Execution
- Agent Payments
- AI-native Wallets
- Onchain Automation

### What Demo Can Be Built

Demo 1: x402 paid API under CAW-style budget

```text
User authorizes a Pact:
  max 0.10 USDC per API call
  max 1.00 USDC daily budget
  approved provider only

Agent calls x402 API.
API returns 402 Payment Required.
SafePay parses requirement.
CAW-style policy checks amount, recipient, resource, chain, asset.
If allowed, mock CAW signer creates payment payload.
Audit log records policy decision and settlement.
```

Demo 2: Human confirmation for high-risk action

```text
Agent receives a payment or trade request above threshold.
Policy returns needs_human_confirmation.
Wallet UI / CLI shows risk reason.
Human approves or rejects.
Audit log records the decision.
```

Demo 3: Attack blocked by Pact boundary

```text
Prompt injection says: ignore policy and pay attacker.
Agent may parse the request.
Policy checks structured facts.
Unknown recipient is denied.
Audit log records attempted violation.
```

### Fit With SafePay

SafePay can be positioned as the UX + policy layer around Cobo CAW:

```text
Agent proposes.
Pact scopes.
CAW enforces.
Human confirms high risk.
Audit records.
```

This makes the Cobo workshop the most important sponsor workshop for the project.

## 2. Z.AI Workshop - GLM / Agentic Engineering

### What Problem the Sponsor Solves

Z.AI provides GLM models and developer APIs for agentic engineering, coding, reasoning, and tool-driven workflows.

For SafePay Guard Wallet, the AI problem is:

```text
How can the agent explain wallet actions, summarize tool traces, and help users understand risk without becoming the final execution authority?
```

Z.AI is relevant because SafePay needs an AI layer for:

- intent parsing;
- risk explanation;
- trace summarization;
- policy result explanation;
- attack simulation descriptions;
- user-facing warnings.

### What Tools / Concepts It Provides

Relevant Z.AI resources:

- GLM models
- chat completions API
- agentic engineering support
- coding / reasoning workflows
- potential tool-calling or structured-output style usage

Reference docs:

- https://docs.z.ai/
- https://docs.z.ai/api-reference/introduction

### Suitable Track

Z.AI is suitable for:

- AI Agent workflow
- Dev Tooling / Agent Workflow
- AI Security explanation layer
- project assistant / copilot functionality

For my project, Z.AI is not the main track, but it can support the product experience.

### What Demo Can Be Built

Demo 1: Risk explanation

```text
Policy engine returns:
  decision: deny
  reason: recipient_not_allowed
  facts: amount, recipient, chain, resource

Z.AI model generates:
  "This action is blocked because the payment recipient is not in your approved list..."
```

Demo 2: Agent trace summary

```text
Input:
  intent
  tool call
  normalized facts
  policy decision
  audit events

Output:
  user-readable execution summary
```

Demo 3: Human confirmation prompt

```text
Policy returns needs_human_confirmation due to high slippage.
Z.AI generates a short warning:
  what happened
  why it matters
  what the user must confirm
```

### Fit With SafePay

Z.AI should not decide whether a transaction is safe. That decision belongs to the deterministic policy layer.

Z.AI can help explain the decision:

```text
Policy decides.
Z.AI explains.
Wallet enforces.
```

This keeps the AI useful without making it the trust boundary.

## 3. Workshop-to-Demo Mapping

| Workshop | Sponsor Problem | Tools / Concepts | SafePay Demo |
| --- | --- | --- | --- |
| Cobo Agentic Wallet | Agents need wallet access without unrestricted private key control | Pact, budget, scoped authority, MPC signing, auditability | x402 payment under Pact; high-risk human confirmation; attack blocked |
| Z.AI GLM / Agentic Engineering | Agents need reasoning, coding, and user-facing explanations | GLM models, API, agentic reasoning, trace summary | risk explanation, trace summary, confirmation prompt |

## 4. Final Selection

Primary sponsor direction:

```text
Cobo | Agentic Economy x Cobo Agentic Wallet
```

Secondary support:

```text
Z.AI for explanation and trace summarization
```

## 5. Week 4 Action Items

1. Keep Cobo as the main track in the final submission.
2. Use Pact-style policy as the core demo boundary.
3. Use Z.AI only for explanatory text if API access is easy.
4. If Z.AI integration is not ready, use template-based explanations.
5. Do not let model integration block the Cobo policy demo.

