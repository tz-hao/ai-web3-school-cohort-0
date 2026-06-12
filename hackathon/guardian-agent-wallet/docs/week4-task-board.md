# Week 4 Task Board

## Decision

Week 4 only ships one minimum verifiable main flow:

```text
Trusted Agent API payment
-> intent parsed
-> risk scored
-> policy allowed
-> Pact preview reviewed
-> CAW execution submitted
-> request / receipt / tx status recorded
-> audit timeline proves the decision path
```

Recommended demo input:

```text
支付 0.0001 SETH 给 数据 API 服务商
```

The goal is not to show every wallet feature. The goal is to prove that Guardian Agent Wallet can safely mediate one agent-native payment from intent to auditable execution.

## Team Roles

Replace role labels with real member names before sprint execution.

| Role | Suggested owner |
| --- | --- |
| Product / Demo Lead | Owner A |
| Frontend / UX | Owner B |
| CAW / Backend | Owner C |
| QA / Docs / Submission | Owner D |

## Must-Have

| Item | Owner | Deadline | Verification |
| --- | --- | --- | --- |
| Freeze the single Week 4 main flow: trusted Data API payment under `0.001 SETH` | Owner A | 2026-06-13 | Demo script contains exactly one primary happy path and uses `支付 0.0001 SETH 给 数据 API 服务商`. |
| Confirm local and deployed app can parse the demo input into `transfer`, `SETH`, `0.0001`, and `data-api-provider` | Owner C | 2026-06-13 | Run the UI input and confirm parsed transaction preview shows the trusted service alias. |
| Show risk score as low risk with readable explanation | Owner B | 2026-06-13 | Risk panel shows score, level, triggered rules, and explanation for the main flow. |
| Show policy result as `ALLOW` for the main flow | Owner C | 2026-06-13 | Policy Decision card displays `ALLOW`; tests for policy engine still pass. |
| Show Pact Preview before execution | Owner B | 2026-06-13 | Pact Preview displays amount, token, recipient, execution mode, and human approval requirement before the execute button. |
| Execute through server-side CAW path without exposing API key | Owner C | 2026-06-14 | Browser network calls only `/api/caw/execute-payment`; no CAW API key appears in frontend code or response. |
| Record audit timeline after execution attempt | Owner D | 2026-06-14 | Audit Timeline records intent parsed, policy evaluated, execution submitted/result, request ID or receipt/tx status if returned. |
| Confirm `.env.local` and `.vercel/` are not committed | Owner D | 2026-06-14 | `git check-ignore -v .env.local .vercel/project.json` confirms ignored files. |
| Production deployment is reachable | Owner D | 2026-06-14 | Vercel public URL returns HTTP 200 and opens the dashboard. |
| Final 3-minute demo script matches the single main flow | Owner A | 2026-06-15 | `docs/demo-script.md` can be followed end-to-end without switching scenarios. |

## Should-Have

| Item | Owner | Target | Verification |
| --- | --- | --- | --- |
| Attack Simulation panel remains available as supporting evidence | Owner B | 2026-06-15 | Buttons show over-budget, suspicious recipient, unlimited approval, and unknown vendor outcomes. |
| Agent Profiles remain visible but do not distract from the main flow | Owner B | 2026-06-15 | Research / Payment / Trading profiles are visible; default demo uses the profile that allows API payment. |
| Transaction status refresh works when tx hash is pending | Owner C | 2026-06-15 | Refresh button can query by request ID and displays pending without fake tx hash. |
| README clearly separates CAW-enforced scope from Guardian application-level controls | Owner D | 2026-06-15 | README states CAW enforces chain/token/amount/expiry/total spend; Guardian enforces recipient resolver and daily demo budget. |
| Submission summary points judges to one URL and one input | Owner A | 2026-06-15 | Submission doc includes public URL and `支付 0.0001 SETH 给 数据 API 服务商`. |

## Nice-to-Have

| Item | Why it is optional |
| --- | --- |
| More polished charts or animations | Nice for presentation, but not required to prove safety. |
| Multiple service-specific real recipients | Useful later; one trusted demo recipient is enough for Week 4. |
| Real tx hash every time | CAW may return request/receipt first; pending status is acceptable if honestly shown. |
| Extra wallet actions such as swap or approve | The MVP proves payment safety with one transfer flow. |
| Browser E2E automation | Helpful, but manual verification is enough for hackathon submission if test/lint/build pass. |

## Cut / Mock

| Item | Decision |
| --- | --- |
| Unlimited approvals | Cut from execution; always `DENY`. |
| Arbitrary recipient payment | Cut from main flow; only trusted service alias is used for the demo. |
| Recipient allowlist inside CAW Pact | Mock / application-level only until CAW schema support is confirmed. |
| Daily budget inside CAW Pact | Mock / application-level only until CAW schema support is confirmed. |
| Real production funds | Cut; use Sepolia `SETH` only. |
| Complex DAO, governance, or multi-agent workflows | Cut from Week 4; keep them as future roadmap. |
| Full wallet portfolio management | Cut; the demo is a policy-aware payment framework, not a general wallet. |

## Week 4 Done Criteria

- One public URL works.
- One demo input works end-to-end.
- One CAW request is submitted or a clear CAW pending/error state is honestly shown.
- No fake tx hash is displayed.
- No API key is exposed to frontend, docs, GitHub, or terminal output.
- Audit timeline records the flow.
- README and demo script tell the same story.
- `npm.cmd run test`, `npm.cmd run lint`, and `npm.cmd run build` pass.
