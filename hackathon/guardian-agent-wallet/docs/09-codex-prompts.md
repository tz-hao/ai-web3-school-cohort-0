# Codex Prompts

This file stores useful prompts for continuing the project with Codex while keeping MVP scope.

## Repository Rule

```text
Act as a senior engineer on Guardian Agent Wallet.
Keep MVP scope.
Do not rewrite the app.
Prefer moving/refactoring existing files over deleting.
Preserve the working UI.
Run lint and build after code changes.
```

## Architecture Migration Prompt

```text
Refactor the current flat lib files into:
- lib/intent/
- lib/risk/
- lib/policy/
- lib/audit/

Keep public exports compatible.
Do not change UI behavior.
Run tests, lint, and build.
```

## CAW Integration Prompt

```text
Implement the real Cobo CAW execution path inside lib/wallets/cawWallet.ts.
Keep WalletAdapter unchanged.
If CAW credentials are missing, fallback to mock mode.
Do not bypass risk, policy, confirmation, or audit logging.
Add tests for missing credentials and successful mocked CAW execution.
```

## Demo Hardening Prompt

```text
Add Playwright or equivalent browser tests for:
1. Low-risk small payment: ALLOW
2. Over-budget payment: CONFIRM
3. Suspicious recipient: CONFIRM
4. Unlimited approval: DENY

Do not change product scope.
```

## TODO

- Add final Cobo CAW SDK/API integration prompt after API shape is confirmed.
- Add prompts for pitch deck, demo video script, and judging criteria checklist.
- Add prompts for threat model and security review.
