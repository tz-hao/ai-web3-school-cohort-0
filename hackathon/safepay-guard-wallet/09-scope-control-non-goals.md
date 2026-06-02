# Scope Control and Non-goals - Week 4

## Purpose

SafePay Guard Wallet can easily become too large because it touches AI agents, wallets, x402, LI.FI, Safe, ERC-4337, Cobo CAW, policy engines, audit logs, and security simulation.

This memo defines what the project will **not** do in Week 4.

## Week 4 Focus

The Week 4 demo should prove one narrow claim:

```text
An agent can propose a Web3 action, but a deterministic wallet policy decides whether to allow, deny, or require human confirmation.
```

The demo should prioritize:

- normalized policy facts;
- policy evaluation;
- risk explanation;
- wallet execution draft;
- audit evidence;
- attack simulation.

## Cut, Delay, or Mock

## 1. Cut: Mainnet Funds and Real Asset Movement

Status:

```text
Cut for Week 4
```

Reason:

Moving real funds increases risk and integration complexity. It also distracts from the main thesis, which is pre-signing safety and policy enforcement.

Week 4 replacement:

- Use mock settlement;
- Use testnet or local simulation only if stable;
- Show transaction / payment draft instead of real mainnet execution.

Success still counts if:

- policy decision is correct;
- execution draft is generated;
- audit evidence is recorded.

## 2. Delay: Full Cobo CAW / Pact Production Integration

Status:

```text
Delay to post-hackathon or stretch goal
```

Reason:

Real CAW integration may require credentials, account setup, API access, sponsor guidance, and production-level signing assumptions. It is too risky as a core Week 4 dependency.

Week 4 replacement:

- Implement a Pact-style JSON policy;
- Use mock CAW signer;
- Explain where CAW / MPC enforcement plugs in;
- Prepare sponsor questions for real CAW integration.

Success still counts if:

- Pact-style policy is clear;
- signer re-checks policy before creating draft;
- high-risk actions are escalated.

## 3. Mock: LI.FI Real Execution

Status:

```text
Mock transactionRequest first; real quote optional
```

Reason:

LI.FI real quote and cross-chain status are useful, but bridge/swap execution adds route complexity, slippage, balances, token approvals, and failure states.

Week 4 replacement:

- Use a fixture LI.FI quote / transactionRequest;
- Normalize it into policy facts;
- Check chain, token, amount, recipient, route tool, slippage;
- Do not sign or broadcast.

Stretch:

- Call real LI.FI quote API if time permits;
- Stop before signing.

## 4. Mock: Safe / ERC-4337 Execution

Status:

```text
Mock or draft mode
```

Reason:

Full Safe / ERC-4337 execution can consume the sprint. The core demo does not need a live UserOperation or Safe transaction broadcast.

Week 4 replacement:

- Generate Safe transaction draft;
- Generate ERC-4337-style UserOperation draft;
- Show what would be signed;
- Record draft hash in audit log.

Success still counts if:

- dangerous draft is blocked;
- safe draft is created;
- human confirmation path is shown.

## 5. Delay: Full Web UI

Status:

```text
Delay unless core CLI is done
```

Reason:

A polished UI is nice but secondary. The core risk is policy correctness, not visual polish.

Week 4 replacement:

- Build CLI first;
- Use structured JSON output;
- Optionally create a small static demo screen later.

Required CLI outputs:

- policy facts;
- decision;
- failed checks;
- risk explanation;
- audit event id.

## 6. Cut: Unlimited Policy Builder

Status:

```text
Cut for Week 4
```

Reason:

Letting users build arbitrary policies requires validation, UX, and security review. A bad policy builder can create unsafe configurations.

Week 4 replacement:

- Use 1-2 predefined policy templates:
  - x402 paid API policy;
  - LI.FI quote review policy.

Policy editing can be a future feature.

## 7. Delay: Full AI Contract Analysis

Status:

```text
Delay
```

Reason:

Analyzing arbitrary contract bytecode/source is a separate dev tooling problem. It can overwhelm the safe execution MVP.

Week 4 replacement:

- Show method name, target contract, amount, and known risk flags;
- Do not claim full contract safety;
- Use allowlist/denylist and simulation status.

## 8. Cut: DAO Treasury Automation

Status:

```text
Cut from Week 4 core demo
```

Reason:

DAO budget execution is a strong use case, but it adds governance approval, milestone review, multi-sig coordination, and dispute handling.

Week 4 replacement:

- Mention DAO treasury as future scenario;
- Keep MVP focused on individual / agent wallet action review.

## Week 4 Core Deliverables

The project should ship only:

1. CLI or minimal demo runner.
2. x402 fixture or local x402 demo.
3. LI.FI quote fixture.
4. `normalizeFacts()`.
5. `evaluatePolicy()`.
6. `explainRisk()`.
7. `createWalletDraft()`.
8. `auditLog`.
9. attack simulation.

## Minimum Demo Scenarios

### Scenario 1: Low-risk Action

Input:

- approved x402 payment;
- 0.10 USDC;
- allowlisted recipient;
- approved resource.

Expected:

```text
allow
```

### Scenario 2: Malicious Action

Input:

- x402 payment with attacker recipient or 10 USDC amount.

Expected:

```text
deny
```

### Scenario 3: High-risk Action

Input:

- LI.FI quote with high slippage or approval requirement.

Expected:

```text
needs_human_confirmation
```

## Final Non-goal Statement

For Week 4, SafePay Guard Wallet is **not** trying to be:

- a production wallet;
- a mainnet signing agent;
- a full bridge/swap platform;
- a complete CAW integration;
- a full Safe / ERC-4337 implementation;
- a generic policy builder;
- a full DAO treasury automation system.

It is trying to prove:

> Before an AI agent reaches wallet execution, a deterministic policy layer can convert tool outputs into allow / deny / human-confirm decisions with evidence.

