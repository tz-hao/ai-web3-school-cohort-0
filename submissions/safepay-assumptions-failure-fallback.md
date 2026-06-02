# Submission - SafePay Assumptions, Failure Modes, and Week 4 Fallback Plan

## File

```text
hackathon/safepay-guard-wallet/08-assumptions-failure-fallback.md
```

## Summary

This memo clarifies what SafePay Guard Wallet depends on, where it is most likely to fail, and how Week 4 should adapt if full wallet / CAW / LI.FI / x402 integration is too risky.

Core fallback principle:

```text
If integration risk is high, ship a strong pre-signing policy and risk review demo instead of a fragile full wallet execution demo.
```

Recommended Week 4 scope:

```text
Real policy engine + fixture/optional real tool output + wallet draft mode + attack simulation.
```

Final success definition:

- low-risk action allowed;
- malicious action denied;
- high-risk action escalated to human confirmation;
- user sees why;
- audit log records evidence;
- Cobo CAW / Pact fit is clear.

