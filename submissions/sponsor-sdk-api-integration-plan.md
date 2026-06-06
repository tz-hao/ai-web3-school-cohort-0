# Submission - Sponsor SDK / API Integration Plan

## File

```text
hackathon/safepay-guard-wallet/11-sponsor-sdk-api-integration-plan.md
```

## Summary

SafePay Guard Wallet will treat sponsor SDK/API integration as layered, not blocking.

Week 4 required:

- Cobo Pact-style policy mock;
- x402 local demo or fixture;
- LI.FI quote fixture;
- policy engine;
- wallet draft;
- audit log;
- attack simulation.

Optional:

- real LI.FI quote;
- Safe SDK transaction draft;
- ERC-4337-style UserOperation draft;
- real Cobo CAW notes if access is available.

Fallback principle:

```text
Do not let sponsor SDK integration block the core demo.
```

Core demo:

```text
tool output -> normalized facts -> policy decision -> wallet draft -> audit evidence
```

