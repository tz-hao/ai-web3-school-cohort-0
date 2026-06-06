# Week 4 Technical Validation Checklist

## Project

```text
SafePay Guard Wallet
```

## Goal

Week 4 should validate the minimum technical proof:

```text
Agent proposes a wallet action.
SafePay normalizes facts.
Policy decides allow / deny / needs_human_confirmation.
Wallet draft or transaction evidence is produced.
Audit log records the full trace.
```

## 1. Agent Trace

### What to Validate

- User intent is captured.
- Agent tool call is recorded.
- Tool response is stored or hashed.
- Normalized policy facts are generated.
- Policy decision is linked to the original intent.
- Final output explains why the action is allowed, denied, or escalated.

### Evidence

- `trace.json`
- CLI output
- audit event id
- screenshots of trace timeline

### Minimum Trace Fields

```json
{
  "intentId": "intent_001",
  "userIntent": "Call paid AI API under 0.10 USDC",
  "toolCalled": "x402",
  "toolResponseHash": "0x...",
  "normalizedFactsHash": "0x...",
  "policyDecision": "allow",
  "riskLevel": "low",
  "finalStatus": "completed"
}
```

## 2. SDK / Tool Calls

### What to Validate

At least one tool call path should work:

- x402 payment requirement parser; or
- LI.FI quote / transactionRequest parser; or
- Safe transaction draft generator; or
- mock CAW / Pact signer.

### Recommended Week 4 Scope

Required:

- x402 local demo or fixture parser.
- mock CAW / Pact signer.

Optional:

- LI.FI real quote API.
- Safe transaction draft.

### Evidence

- raw tool response JSON;
- normalized facts JSON;
- adapter function output;
- CLI command output.

## 3. Testnet Transaction or Wallet Draft

### What to Validate

One of the following is enough:

1. A real testnet transaction; or
2. A Safe transaction draft; or
3. An ERC-4337-style UserOperation draft; or
4. An x402 mock settlement receipt.

Week 4 does **not** require mainnet funds.

### Evidence

- testnet tx hash, if available;
- Safe transaction draft JSON;
- UserOperation draft JSON;
- x402 settlement ledger entry;
- screenshot of draft / explorer / CLI.

### Minimum Draft Fields

```json
{
  "to": "0xTargetContract",
  "chain": "base-sepolia",
  "asset": "USDC",
  "amount": "0.10",
  "method": "transfer",
  "requiresHumanConfirmation": false,
  "policyDecisionHash": "0x..."
}
```

## 4. Contract Interaction

### What to Validate

If contract interaction is included, validate:

- target contract is known or allowlisted;
- method is known;
- calldata can be decoded or described;
- asset delta is estimated;
- dangerous methods are denied or escalated.

### Dangerous Methods

- `approve`
- `increaseAllowance`
- `setApprovalForAll`
- `delegatecall`
- `upgradeTo`
- `setOwner`
- `setGuard`
- `enableModule`

### Evidence

- decoded calldata;
- method allowlist / denylist result;
- simulation result or mock simulation;
- policy decision.

## 5. Permission Control

### What to Validate

Policy checks should cover:

- chain allowlist;
- token allowlist;
- recipient allowlist;
- resource allowlist;
- contract allowlist;
- method allowlist / denylist;
- max amount per transaction;
- daily budget;
- human confirmation threshold;
- time window;
- audit-required flag.

### Required Demo Cases

| Case | Expected |
| --- | --- |
| Approved x402 payment under 0.10 USDC | `allow` |
| Payment amount 10 USDC | `deny` |
| Unknown recipient | `deny` |
| Wrong resource | `deny` |
| High slippage LI.FI quote | `needs_human_confirmation` |
| Unlimited approval | `deny` |

### Evidence

- policy JSON;
- policy decision JSON;
- failed checks list;
- attack simulation report.

## 6. Logging and Audit Trail

### What to Validate

Every decision should produce an audit event.

Required events:

- `intent_created`
- `tool_called`
- `tool_response_received`
- `facts_normalized`
- `policy_decision`
- `wallet_draft_created`
- `human_confirmation_requested`, if needed
- `execution_result`
- `failure`, if any

### Evidence

- `audit-log.jsonl`
- `attack-simulation-report.json`
- settlement ledger or draft hash

### Minimum Audit Event

```json
{
  "timestamp": "2026-06-06T00:00:00+08:00",
  "event": "policy_decision",
  "intentId": "intent_001",
  "agentId": "agent:safepay-execution:v0.1",
  "decision": "needs_human_confirmation",
  "reason": "high_slippage",
  "factsHash": "0x...",
  "policyHash": "0x..."
}
```

## 7. Demo Screenshots / Recording

### What to Capture

At least 4 screenshots:

1. User intent input.
2. Normalized facts and policy decision.
3. Risk explanation.
4. Audit log / settlement / wallet draft.

Optional:

- CLI demo recording;
- frontend screen;
- testnet explorer screenshot;
- attack simulation output.

## 8. Week 4 Validation Matrix

| Technical Point | Required? | Minimum Evidence |
| --- | --- | --- |
| Agent trace | Required | trace JSON or CLI timeline |
| SDK / tool call | Required | x402 or LI.FI fixture / response |
| Policy engine | Required | decision JSON |
| Permission control | Required | passed / failed checks |
| Wallet draft | Required | draft JSON or mock settlement |
| Testnet transaction | Optional | tx hash |
| Contract interaction | Optional | decoded calldata / simulation |
| Audit log | Required | JSONL log |
| Attack simulation | Required | simulation report |
| Demo screenshots | Required | 4 screenshots or CLI recording |

## 9. Minimum Passing Demo

The demo passes if it can show:

```text
1 low-risk action -> allow
1 malicious action -> deny
1 high-risk action -> needs_human_confirmation
```

Each case must include:

- user intent;
- normalized facts;
- policy decision;
- risk explanation;
- audit evidence.

## 10. Stretch Validation

If time allows:

- real LI.FI quote API call;
- Base Sepolia transaction draft;
- Safe transaction draft;
- ERC-4337 UserOperation draft;
- Cobo CAW / Pact integration notes;
- frontend policy decision UI.

