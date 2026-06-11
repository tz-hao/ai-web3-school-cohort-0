# Guardian Agent Wallet Codex Guide

## Project

Guardian Agent Wallet

## Goal

Cobo Agentic Wallet hackathon MVP.

## Architecture

```text
Intent Parser
  ->
Risk Engine
  ->
Policy Engine
  ->
Wallet Adapter
  |-- Mock Wallet
  `-- Cobo CAW Wallet
  ->
Audit Log
  ->
Frontend Dashboard
```

## Rules

- Keep MVP scope.
- Do not rewrite the whole app.
- Prefer moving/refactoring existing files over deleting.
- Preserve existing working UI.
- Use TypeScript.
- Update docs when architecture changes.
- After code changes, run `npm run lint` and `npm run build`.
- If CAW credentials are missing, fallback to mock mode.

## Target Folders

- `lib/intent/`
- `lib/risk/`
- `lib/policy/`
- `lib/wallets/`
- `lib/audit/`
- `components/`
- `docs/`

## Done Criteria

- App builds.
- Existing demo flow still works.
- Docs reflect real code.
