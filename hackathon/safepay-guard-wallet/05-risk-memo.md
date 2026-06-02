# Risk Memo - SafePay Guard Wallet

## Core Safety Principle

```text
AI can suggest.
Policy decides.
Wallet enforces.
Human can revoke.
Audit records.
```

## Primary Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Prompt injection | Agent attempts unauthorized payment or contract call | Natural language cannot modify policy; signer re-checks structured facts |
| Oversized payment | Budget loss | Per-transaction and daily caps |
| Unknown recipient | Funds sent to attacker | Recipient allowlist and human confirmation |
| Wrong resource | Payment made for a different API/service | Resource allowlist and requirement hash |
| Wrong chain/token | Funds moved to unintended network or asset | Chain and token allowlists |
| Unlimited approval | Long-term token drain risk | Deny by default; require human confirmation |
| Forged tool result | Agent believes false policy or quote result | Signer and policy engine re-evaluate facts |
| Replay payload | Duplicate payment or settlement | Nonce and settlement ledger |
| Audit failure | No evidence for dispute or debugging | Fail closed if audit cannot be written |
| Misconfigured policy | Unsafe actions allowed | Policy templates, tests, and human review |
| Bad AI explanation | User misunderstands risk | Show raw facts and policy checks alongside AI summary |

## Low-risk Auto Execution

Allowed only if all are true:

- chain is allowlisted;
- token is allowlisted;
- recipient is allowlisted;
- API resource or contract is allowlisted;
- method is allowlisted;
- amount is under per-transaction cap;
- daily budget is not exceeded;
- no approval is required;
- no owner/module/guard change is involved;
- simulation passed;
- audit log is writable.

## High-risk Human Confirmation

Required if any are true:

- new recipient;
- new contract;
- new chain;
- new token;
- amount exceeds threshold;
- daily budget is near exhaustion;
- approval or increaseAllowance is needed;
- unlimited approval;
- Safe owner / module / guard change;
- policy change;
- simulation failed or unknown;
- LI.FI route has high slippage;
- x402 resource mismatch;
- tool results conflict.

## Fail-closed Conditions

The system must stop execution if:

- policy evaluation fails;
- audit log cannot be written;
- signer cannot re-check policy;
- payment payload signature is invalid;
- settlement fails;
- transaction simulation fails and no human approval exists;
- private key or secret appears in input/output.

## Attack Simulation Backlog

| Attack | Expected Result |
| --- | --- |
| Prompt says "ignore policy" | Policy unchanged |
| x402 returns 10 USDC amount | Deny |
| x402 returns attacker payTo | Deny |
| x402 returns evil resource | Deny |
| LI.FI quote returns wrong chain | Deny or human confirmation |
| LI.FI quote high slippage | Human confirmation |
| transactionRequest includes approve | Human confirmation |
| transactionRequest includes unlimited approval | Deny |
| forged tool says policy allowed | Signer re-check blocks |
| replay payment payload | Provider/facilitator blocks |

## Residual Risks

- If allowlists are configured incorrectly, the system may faithfully execute bad policy.
- AI explanation may be incomplete.
- Mock demos do not prove production signer security.
- Real bridge / swap routes include liquidity and settlement risks.
- Guard code can create denial of service if poorly written.
- Users may approve high-risk actions despite warnings.

## Risk Reduction Roadmap

1. Keep signing disabled in MVP except mock/test mode.
2. Add Safe transaction draft before real execution.
3. Add simulation and allowance checks.
4. Add policy template review checklist.
5. Add attack simulation regression tests.
6. Add human confirmation UI.
7. Add revocation / pause flow.

