# 3-Minute Demo Script

Project: Guardian Agent Wallet

Positioning: Policy-Aware Agent Payment Framework Built on Cobo Agentic Wallet

## 0:00-0:25 Opening Problem

AI agents are becoming capable of paying for APIs, data, compute, research feeds, and SaaS services. But wallet execution is irreversible. If an agent is prompt-injected, misconfigured, or tricked by a tool response, a direct `agent says pay -> wallet signs` flow is unsafe.

Guardian Agent Wallet adds a policy-aware execution layer:

```text
AI explains.
Policy decides.
CAW executes.
Human governs.
Audit records.
```

```text
AI 解释意图。
策略判断风险。
CAW 执行支付。
人类治理边界。
审计记录全过程。
```

## 0:25-0:55 Normal Agent Payment

Open the dashboard and run a realistic API payment request:

```text
支付 0.001 SETH 给 数据 API 服务商
```

Expected decision: `ALLOW`.

Talk track:

The intent parser converts a natural-language Agent payment request into a structured payment intent. The recipient is mapped to the trusted alias `data-api-provider`. The amount is small, the token is supported, and the selected Payment Agent can make this API/SaaS payment inside budget.

For real CAW execution, that alias is resolved server-side to an EVM address before the SDK call. The frontend can show the service alias and resolved recipient, but it never receives the CAW API key.

Other trusted demo recipients:

| Chinese display name | Alias |
| --- | --- |
| 数据 API 服务商 | `data-api-provider` |
| AI 推理服务 | `ai-inference-service` |
| 链上分析 API | `onchain-analytics-api` |
| 高级研究数据源 | `premium-research-feed` |

## 0:55-1:25 Risk Score

Point to the Risk Intelligence panel.

Show:

- `风险评分`: 0-100 score.
- `风险等级`: LOW / MEDIUM / HIGH.
- Progress bar.
- `触发规则`: deterministic rules behind the result.
- `策略解释`: Chinese explanation.
- `风险贡献拆解`: contribution items.

Example contribution items:

```text
+40 超预算
+25 未知或可疑收款方
+20 无限授权
+10 不支持的 Token
```

Talk track:

The system does not just say safe or unsafe. It explains why. A reviewer can see whether risk comes from budget, recipient, approval scope, token support, or multiple factors together.

Low-risk explanation:

```text
该请求为小额 API 支付，收款方在可信服务列表内，Token 与网络符合当前 CAW Pact 约束。
```

## 1:25-1:50 Pact Preview

Point to Pact Preview before execution.

Show:

- agent intent,
- amount,
- token,
- recipient,
- allowed budget,
- policy decision,
- expected wallet mode,
- whether human approval is required.

Talk track:

This is the execution contract preview. It shows what the agent is allowed to do before the wallet adapter is called. It makes the boundary between AI intent and wallet execution explicit.

## 1:50-2:10 CAW Execution

If Real CAW Mode is available, execute the safe small payment through the `执行支付` button.

If the app is in Mock Mode or CAW Fallback Mode, explain the mode badge and run the same flow without claiming a real transaction.

Talk track:

The frontend never receives CAW credentials. It only calls the server API route:

```text
app/api/caw/execute-payment/route.ts
```

API keys are server-only. A real tx hash or receipt is shown only if CAW returns it. If not available, the demo says pending instead of inventing evidence.

Point to CAW Request Preview:

- display recipient: 数据 API 服务商
- resolved EVM recipient: server-side trusted registry address
- recipient source: trusted registry or fallback `CAW_DESTINATION`
- pactId: present or missing

## 2:10-2:40 Attack Simulation

Run the Attack Simulation buttons:

| Story | Command | Expected decision |
| --- | --- | --- |
| 超预算 API 支付 | `支付 10 SETH 给 数据 API 服务商` | `CONFIRM` |
| 可疑收款方 | `支付 0.001 SETH 给 0xBAD0000000000000000000000000000000000000` | `CONFIRM` |
| 无限授权攻击 | `approve unlimited USDC` | `DENY` |
| 未授权服务商 | `支付 0.001 SETH 给 unknown-vendor` | `CONFIRM` |

Talk track:

This shows four safety boundaries. A trusted recipient is not enough if the amount is too large. A tiny payment can still require review if the recipient is suspicious. Unlimited approval is blocked. Unknown SaaS/API vendors require human confirmation.

## 2:40-2:55 Audit Timeline

Open the Audit Timeline page.

Show recorded events:

- 收到 Agent 支付请求
- 支付意图已解析
- 策略判断：允许执行 / 需要人工确认 / 拒绝执行
- 人工确认执行 or 人工拒绝执行
- 已提交到 Cobo Agentic Wallet / CAW Receipt 已生成 / 模拟钱包已执行

Talk track:

The audit trail records what the agent asked for, what the policy decided, whether a human confirmed it, and what the wallet adapter returned.

## 2:55-3:00 Closing Value

Guardian Agent Wallet makes agent-native payments safer by separating AI intent from wallet authority.

It gives teams:

- explainable risk,
- profile-based agent governance,
- server-side CAW execution,
- human confirmation for dangerous flows,
- auditable evidence.

This is the foundation for safe autonomous payments, not just a wallet demo.

## CAW Execution Record

Do not record API keys in this file.

```text
CAW Wallet Address: <your-caw-wallet-address>
Tx Hash / Receipt ID: pending real CAW execution unless returned by CAW
Network: Ethereum Sepolia (SETH)
Token: SETH
Amount: 0.001
Recipient: trusted service alias data-api-provider; server resolves it through CAW_RECIPIENT_DATA_API or local-demo CAW_DESTINATION fallback
```
