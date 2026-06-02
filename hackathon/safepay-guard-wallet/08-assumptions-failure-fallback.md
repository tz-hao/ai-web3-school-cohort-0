# Assumptions, Failure Modes, and Week 4 Fallback Plan

## Project

```text
SafePay Guard Wallet
```

## 1. Project Assumptions

SafePay Guard Wallet can work only if several assumptions hold.

### 1.1 User Need Assumptions

| Assumption | Why It Matters | How to Validate |
| --- | --- | --- |
| Users want agents to execute low-risk wallet actions | Without this, the product is only a risk dashboard | Interview Web3 users / DAO operators / builders |
| Users do not trust agents with unrestricted signing power | This justifies policy and guard layers | Ask users what actions they would delegate |
| Users can understand allow / deny / confirmation explanations | The UX depends on understandable risk summaries | Test with 3-5 sample users |
| DAO / treasury workflows need better execution checklists | This gives the project a serious user segment | Review DAO payment workflows and Safe usage |

### 1.2 Technical Assumptions

| Assumption | Why It Matters | How to Validate |
| --- | --- | --- |
| Tool outputs can be normalized into policy facts | The policy engine needs structured inputs | Test x402 requirement and LI.FI quote parsing |
| Policy checks can catch the most dangerous cases | Core safety claim depends on it | Run attack simulation regression tests |
| Wallet layer can re-check policy before signing | Prevents agent/tool spoofing | Use mock signer first, then Safe/CAW integration |
| Audit logs can be produced for every decision | Enables verification and dispute handling | Generate JSONL evidence in demo |
| Safe / ERC-4337 / CAW concepts can be shown without full production integration | Hackathon MVP needs feasibility | Use transaction drafts and mock signing |

### 1.3 Ecosystem Assumptions

| Assumption | Why It Matters | How to Validate |
| --- | --- | --- |
| x402-style paid API workflows are relevant to agent commerce | Provides a payment use case | Demo x402 paywall loop |
| LI.FI quote / transactionRequest is a realistic high-risk tool output | Provides a real Web3 execution scenario | Use sample or real quote API |
| Cobo CAW / Pact is a good track fit | Sponsor relevance depends on it | Map Pact to project policy model |
| Safe / guard / modules are acceptable wallet infrastructure references | Supports security architecture | Compare Safe docs and existing Safe experiments |

## 2. Most Likely Failure Points

### 2.1 The Scope Becomes Too Broad

The project can easily sprawl across:

- wallet safety;
- x402 payments;
- LI.FI bridge/swap;
- Safe / ERC-4337;
- CAW / Pact;
- AI risk explanations;
- DAO treasury workflows.

This is the most likely failure mode.

Mitigation:

```text
Week 4 MVP should focus on one execution path:
x402 paid API OR LI.FI quote review, not both as production-grade flows.
```

### 2.2 Real Wallet Integration Takes Too Long

Connecting real Safe, ERC-4337, CAW, or signing flows may consume the whole sprint.

Risk:

- no working demo;
- too much integration debugging;
- security story becomes unclear.

Mitigation:

- use wallet draft mode;
- show Safe transaction draft instead of real execution;
- keep signing mocked unless testnet integration is stable;
- emphasize policy decision and audit evidence.

### 2.3 AI Explanation Is Not Reliable Enough

AI may produce incomplete or overconfident risk summaries.

Risk:

- users over-trust the assistant;
- important contract details are missed;
- judges see it as generic AI wrapper.

Mitigation:

- always show raw policy facts next to AI summary;
- mark AI explanation as advisory;
- use deterministic policy results as the source of truth;
- avoid claims like "safe"; say "allowed by policy".

### 2.4 Policy Is Too Simple

If policy only checks amount and recipient, the demo may feel shallow.

Risk:

- not enough technical depth;
- weak differentiation from simple spend limit wallets.

Mitigation:

Add checks for:

- chain;
- token;
- recipient;
- resource;
- contract;
- method;
- slippage;
- approval flag;
- simulation status;
- daily budget.

### 2.5 Policy Is Too Complex

If policy tries to model every possible wallet risk, the MVP becomes hard to finish.

Risk:

- unclear demo;
- incomplete implementation;
- hard to explain.

Mitigation:

Use a small number of high-signal checks:

1. amount;
2. recipient;
3. resource / contract;
4. chain / token;
5. approval / dangerous method;
6. simulation status.

### 2.6 Sponsor Fit Is Not Obvious

If the project feels like a generic wallet risk checker, it may not match Cobo / agentic economy.

Mitigation:

Frame the project around:

```text
Agent receives Pact, not private key.
Agent can request actions.
CAW / policy decides.
MPC / wallet enforces.
Audit proves boundary.
```

### 2.7 The Demo Does Not Show Human Confirmation Clearly

The key product value is low-risk automation and high-risk human confirmation. If the demo only shows allow/deny, it may miss the middle path.

Mitigation:

Include three demo cases:

1. low-risk action: allow;
2. malicious action: deny;
3. ambiguous/high-risk action: needs human confirmation.

## 3. Failure Consequence Map

| Failure | Consequence | Severity | Recovery |
| --- | --- | --- | --- |
| No real wallet integration | Demo still works as policy layer | Medium | Present as pre-signing safety layer |
| No LI.FI real quote | Use mock quote | Low | Show adapter-ready structure |
| No CAW integration | Use Pact-style policy model | Medium | Explain Cobo integration path |
| AI explanation weak | Use deterministic policy facts | Medium | Make AI summary secondary |
| Policy engine incomplete | Narrow MVP scope | High | Focus on 5 core checks |
| Demo too complex | Judges lose thread | High | Use one clear scenario |
| Attack sim misses cases | Security claim weaker | Medium | Document known gaps |

## 4. Week 4 Fallback Plan

### Fallback Principle

If integration risk is high, ship a strong **pre-signing policy and risk review demo** instead of a fragile full wallet execution demo.

The fallback still supports the core claim:

```text
Agent proposes. Policy checks. Human confirms high risk. Audit records.
```

## 5. Fallback Levels

### Level 1 - Full Target Demo

Ideal Week 4 demo:

- User enters intent.
- Agent gets x402 requirement or LI.FI quote.
- Policy evaluates facts.
- Low-risk action creates payment / transaction draft.
- High-risk action triggers human confirmation.
- Audit log records everything.
- Optional Safe / CAW / testnet integration.

### Level 2 - No Real Signing

If signing integration is unstable:

- Generate Safe transaction draft or ERC-4337 UserOperation-like draft.
- Do not broadcast.
- Show policy checks and risk summary.
- Show what would be signed.
- Record draft hash and audit event.

This is still valid because the project is about execution boundaries before signing.

### Level 3 - No Real LI.FI / x402 API

If external APIs are unstable:

- Use fixture JSON for x402 payment requirement.
- Use fixture JSON for LI.FI quote / transactionRequest.
- Run policy engine and attack simulator.
- Show adapter architecture for real API integration.

This keeps the demo deterministic.

### Level 4 - Policy Engine Only

If time is very limited:

Ship a CLI:

```bash
safepay evaluate examples/x402-payment.json
safepay evaluate examples/lifi-quote.json
safepay simulate-attacks
```

Output:

- allow / deny / needs_human_confirmation;
- failed checks;
- user-facing explanation;
- audit JSON.

This is the minimum viable proof of the project idea.

### Level 5 - Documentation + Existing Demo

If implementation blocks entirely:

- Use existing x402 CAW mock demo.
- Use attack simulation report.
- Present architecture, policy model, and sponsor fit.
- Show roadmap to CAW / Safe integration.

This is the least desirable fallback, but still coherent.

## 6. Week 4 Recommended Scope

Recommended realistic scope:

```text
Level 2.5:
Real policy engine + fixture/optional real tool output + wallet draft mode + attack simulation.
```

Specifically:

1. Use x402 fixture or existing local x402 demo.
2. Add LI.FI quote fixture.
3. Normalize both into the same `PolicyFacts`.
4. Run policy evaluation.
5. Return allow / deny / needs_human_confirmation.
6. Generate wallet draft but do not sign real funds.
7. Show audit timeline.
8. Run attack simulation.

## 7. What Not To Do in Week 4

Avoid:

- mainnet funds;
- unlimited approvals;
- building a full wallet from scratch;
- solving all bridge/swap risks;
- over-optimizing UI before policy works;
- claiming production-grade security;
- hiding raw facts behind AI summaries.

## 8. Final Week 4 Success Definition

Week 4 is successful if the demo can show:

1. A normal low-risk action is allowed.
2. A malicious or out-of-policy action is denied.
3. A high-risk but possibly legitimate action asks for human confirmation.
4. The user sees why.
5. The audit log proves what happened.
6. The sponsor can see where Cobo CAW / Pact fits.

That is enough to prove the project direction.

