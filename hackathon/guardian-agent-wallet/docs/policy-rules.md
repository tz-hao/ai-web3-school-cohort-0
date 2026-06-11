# Guardian Agent Wallet Policy Rules

Guardian Agent Wallet is a mock-first safety assistant. It does not execute real blockchain transactions yet.

## Low-risk automatic path

The mock wallet can mark an action as `allow` only when all facts match the policy:

- Chain is `base`.
- Asset is `USDC`.
- Amount is less than or equal to `0.10`.
- Recipient is in the allowlist.
- Resource is in the allowlist.
- Action is not forbidden.

## Human confirmation path

The action becomes `needs_human_confirmation` when it is not a hard deny but leaves the low-risk envelope:

- Amount is above the per-action cap.
- Chain or asset is not the expected value.
- Resource is not allowlisted.

## Deny path

The action is denied before signing or settlement when it crosses a hard wallet boundary:

- Recipient is unknown.
- Action is `approve_unlimited`.
- Action tries to change policy.
- Action tries to call an unknown contract.

## Current non-goals

- No Safe integration.
- No ERC-4337 integration.
- No 1inch or Uniswap routing.
- No GPT API calls.
- No real private keys, signatures, token approvals, or onchain settlement.
