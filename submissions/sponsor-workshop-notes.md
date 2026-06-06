# Submission - Sponsor Workshop Notes

## File

```text
hackathon/safepay-guard-wallet/12-sponsor-workshop-notes.md
```

## Selected Workshops

1. **Cobo | Agentic Economy x Cobo Agentic Wallet**
2. **Z.AI | GLM / Agentic Engineering**

## Summary

Cobo is the primary workshop direction for SafePay Guard Wallet because it directly solves the wallet boundary problem: how an AI agent can pay, trade, or purchase resources without holding unrestricted private keys. Cobo's Agentic Wallet / Pact model maps naturally to SafePay's budget, allowlist, human confirmation, and audit log design.

Z.AI is a secondary supporting workshop direction. It can help generate user-facing risk explanations, summarize agent traces, and turn policy decisions into clear confirmation prompts. However, Z.AI should not be the trust boundary; deterministic wallet policy should decide, and the model should explain.

## Demo Mapping

- Cobo demo: x402 payment under Pact-style budget, high-risk confirmation, attack blocked by policy.
- Z.AI demo: policy result explanation, trace summary, human confirmation warning.

