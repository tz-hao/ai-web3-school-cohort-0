# Submission - Week 4 Technical Validation Checklist

## File

```text
hackathon/safepay-guard-wallet/10-week4-technical-validation-checklist.md
```

## Summary

Week 4 should validate the minimum technical proof for SafePay Guard Wallet:

```text
Agent trace -> SDK/tool call -> normalized facts -> policy decision -> wallet draft -> audit evidence
```

Required validation areas:

- agent trace;
- SDK/tool call;
- permission control;
- wallet draft or mock settlement;
- audit log;
- attack simulation;
- demo screenshots.

Optional validation areas:

- testnet transaction;
- real LI.FI quote;
- Safe transaction draft;
- ERC-4337 UserOperation draft;
- Cobo CAW / Pact notes.

Minimum passing demo:

```text
1 low-risk action -> allow
1 malicious action -> deny
1 high-risk action -> needs_human_confirmation
```

