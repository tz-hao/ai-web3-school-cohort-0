# Changelog

## Unreleased

### Added

- Added shared security configuration for trusted recipients, allowed tokens, and suspicious address detection.
- Added this changelog to track MVP architecture changes.

### Changed

- Consolidated duplicated allowlist and suspicious-address checks across agent profiles, policy evaluation, and risk scoring.
- Hardened wallet execution UI flow so adapter failures produce a failed execution result, restore loading state, and write an audit event.

### Verified

- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`

## 0.1.0

### Added

- Built Guardian Agent Wallet as a Cobo Agentic Wallet hackathon MVP.
- Added intent parsing for simple Chinese and English demo commands.
- Added agent profiles for `ResearchAgent`, `PaymentAgent`, and `TradingAgent`.
- Added extensible policy engine with agent permissions, budgets, recipients, token allowlists, approval checks, and time windows.
- Added standalone risk engine with risk score, risk level, explanation, and warnings.
- Added wallet adapter architecture with mock and CAW modes.
- Added local audit timeline with intent, policy, confirmation, and execution events.
- Added Web3 Security Dashboard UI with Dashboard, Risk Review, and Audit Timeline pages.
- Added TypeScript unit tests for audit log, policy engine, and risk engine.
