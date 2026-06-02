# Hackathon Direction Card - SafePay Guard Wallet

## Direction

```text
Wallet / Permission / Safe Execution
```

## Project Name

```text
SafePay Guard Wallet
```

## One-liner

An AI-assisted wallet execution guard that checks agent-initiated payments, swaps, bridges, and contract calls before they reach the signing layer.

## Problem

AI agents are increasingly able to call Web3 tools such as x402 paid APIs, LI.FI quotes, wallet SDKs, RPC endpoints, and contract write methods. The dangerous part is not tool calling itself; the dangerous part is letting agent output become wallet execution without clear policy, budget, confirmation, and audit boundaries.

Users need a wallet-layer guardrail that can answer:

- What is the agent trying to do?
- Which chain, token, contract, method, amount, and recipient are involved?
- Is this action inside the user's policy?
- Does it require human confirmation?
- What evidence is left after execution?

## Target Users

- Web3 users who want to delegate low-risk actions to agents.
- DAO treasury operators who need safer budget execution.
- Wallet builders exploring agentic execution.
- Web3 developers integrating LI.FI, x402, Safe, ERC-4337, or CAW-style policies.
- Hackathon teams building agent workflows with real wallet actions.

## Why Now

Agent tooling is moving from read-only assistants to action-capable workflows. x402, LI.FI agent tooling, server wallets, ERC-4337, Safe modules, and CAW/Pact-style authorization are converging around the same question:

> How can an agent act without becoming an unbounded wallet controller?

## AI Role

- Parse user intent.
- Explain transaction and payment risk.
- Summarize quote / payment requirement.
- Generate audit summary.
- Help classify low-risk vs high-risk actions.
- Suggest next steps when policy denies execution.

## Web3 Role

- Provide account abstraction and wallet execution.
- Enforce policy, budget, allowlist, session key, and guard rules.
- Produce transaction hash, settlement receipt, and audit evidence.
- Allow users to revoke agent authority.

## MVP Scope

The MVP will not custody real user funds. It will:

1. Accept a user intent.
2. Generate or ingest an x402 payment requirement or LI.FI-style transaction request.
3. Normalize facts.
4. Evaluate policy.
5. Return `allow`, `deny`, or `needs_human_confirmation`.
6. Produce a wallet execution draft.
7. Write audit evidence.
8. Run attack simulations.

## Not in Scope

- Full production wallet custody.
- Real mainnet signing by default.
- Automatic policy expansion.
- Unlimited approvals.
- Unknown contract execution.
- Replacing human governance or Safe signers.

## Success Criteria

- A demo user can see why an action is allowed, denied, or escalated.
- Policy blocks oversized payment, unknown recipient, wrong resource, wrong chain, and unlimited approval.
- The system leaves an audit trail for each decision.
- The demo connects clearly to Safe / ERC-4337 / CAW / x402 / LI.FI concepts.

