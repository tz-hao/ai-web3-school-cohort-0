# Demo Script

This demo presents Guardian Agent Wallet as a CAW-powered policy layer for safe agent payments.

## Setup

```bash
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Talk Track

"Guardian Agent Wallet lets AI agents initiate payment intents, but it does not let them bypass safety. Every intent goes through risk scoring, policy evaluation, optional human confirmation, wallet adapter execution, and audit logging. Today the wallet adapter can run in mock mode; the target Cobo track path is CAW execution."

## Scenario 1: Low-Risk Small Payment

Input:

```text
买 10 USDC 的 ETH
```

Expected:

- `ALLOW`
- low risk score,
- execute button available,
- audit timeline records intent, policy, and execution.

## Scenario 2: Over-Budget Payment

Input a payment above the selected agent profile limit.

Expected:

- `CONFIRM`
- high or medium risk,
- human confirmation required,
- audit timeline records confirmation before execution.

## Scenario 3: Suspicious Recipient

Input:

```text
转账 20 USDC 给 0xBAD
```

Expected:

- `CONFIRM`
- suspicious recipient warning,
- human confirmation required.

## Scenario 4: Unlimited Approval

Input:

```text
approve unlimited USDC
```

Expected:

- `DENY`
- wallet execution blocked,
- audit timeline records policy evaluation.

## TODO

- Update scenario 2 with the final exact prompt after profile thresholds are finalized.
- Add screenshots for each scenario.
- Add a CAW mode demo once real CAW credentials are available.
