# Week 2 Module C - Agent Profile: SafePay Execution Agent

## 1. 选择的 Agent / Workflow

我选择的 workflow 是前面 Week 2 Module B 中搭建的 **x402 paywall + Cobo CAW agent 自主支付闭环**。

在这个 workflow 里，我把消费方 agent 抽象成一个更清晰的 agent：

```text
SafePay Execution Agent
```

它不是一个“自动花钱机器人”，而是一个受 Pact 约束的钱包安全执行 agent。它的核心任务是在用户预授权范围内，识别 API 付款要求、检查预算和权限、完成受控支付，并保留审计记录。

## 2. Identity

| 字段 | 设计 |
| --- | --- |
| Agent Name | SafePay Execution Agent |
| Agent ID | `agent:safepay-execution:v0.1` |
| Owner / Maintainer | 由用户或团队维护，例如 `tz-hao` / DAO treasury ops team / wallet product team |
| Domain | Wallet / Permission / Safe Execution |
| Main Network | Base |
| Settlement Asset | USDC |
| Trust Anchor | Agent profile registry + maintainer signature + CAW/Pact policy hash |
| Current Status | Prototype / demo |

这个 agent 的身份不能只靠一个 URL 或名字声明。更合理的方式是：

- profile 由 maintainer 地址签名；
- profile 中包含 endpoint、version、capability、pricing 和 policy template；
- profile hash 可以注册到链上 registry；
- 每次支付或执行都引用当前 profile hash 和 Pact policy hash。

## 3. Capability

### Capability 1: x402 Payment Request Handler

识别服务方返回的 `402 Payment Required`，解析 payment requirement，并判断是否符合当前 Pact。

输入：

```json
{
  "httpStatus": 402,
  "paymentRequirement": {
    "scheme": "exact",
    "network": "base",
    "asset": "USDC",
    "amount": "0.10",
    "payTo": "0xServiceProviderTreasury",
    "resource": "https://api.example.ai/v1/infer",
    "expiresAt": "2026-05-28T23:59:59+08:00"
  }
}
```

输出：

```json
{
  "decision": "allowed",
  "reason": "within_pact_scope",
  "requirementHash": "0x...",
  "nextAction": "create_payment_payload"
}
```

### Capability 2: Pact Budget / Scope Check

检查 agent 是否可以支付。

检查项：

- chain 是否在 allowlist；
- asset 是否在 allowlist；
- recipient 是否在 allowlist；
- API resource 是否在 allowlist；
- 单次金额是否低于上限；
- 今日预算是否足够；
- 时间窗口是否有效；
- 是否需要人工确认。

### Capability 3: CAW Payment Payload Creation

在 Pact 允许范围内，请求 CAW / MPC signer 生成支付 payload。这个能力不能直接暴露私钥，也不能让 agent 绕过 wallet layer。

输出：

```json
{
  "paymentPayload": "<signed-x402-payment-payload>",
  "pactId": "pact_week2_x402_caw_demo",
  "paymentPayloadHash": "0x..."
}
```

### Capability 4: Audit Trail Writer

记录每个关键事件：

- 收到 402；
- Pact 决策；
- payment payload 创建；
- settlement 成功或失败；
- API 返回结果 hash；
- 失败原因和是否需要人工介入。

## 4. Inputs and Outputs

### Inputs

| 输入 | 说明 |
| --- | --- |
| `task` | 用户希望 agent 完成的任务，例如调用某个 AI API |
| `apiRequest` | HTTP method、URL、body、headers |
| `pactPolicy` | 预算、范围、时间窗口、recipient allowlist |
| `paymentRequirement` | 服务端返回的 x402 payment requirement |
| `walletContext` | CAW wallet id、network、asset balance、policy status |

### Outputs

| 输出 | 说明 |
| --- | --- |
| `policyDecision` | allow / deny / require_human_approval |
| `paymentPayload` | CAW 生成的 x402 payment payload |
| `settlementReceipt` | settlement tx hash、amount、asset、network |
| `apiResult` | 付款成功后拿到的服务结果 |
| `auditLog` | 可审计事件记录 |
| `failureReason` | 失败时的可解释原因 |

## 5. Collaboration Objects

SafePay Execution Agent 需要与以下对象协作：

| 协作对象 | 作用 |
| --- | --- |
| User | 设定任务、授权 Pact、处理高风险确认 |
| x402 Protected API | 提供受 paywall 保护的 API 或 AI 推理服务 |
| CAW / Wallet Layer | 管理 wallet、签名、预算和策略边界 |
| Pact Policy Engine | 判断 agent 动作是否在授权范围内 |
| x402 Facilitator | 验证 payment payload 并完成 settlement |
| Chain / Settlement Layer | 记录支付结算结果 |
| Audit Log | 留下可复盘、可追责的操作证据 |
| Agent Registry | 发现 agent profile、endpoint、capability 和版本 |

## 6. Failure Points

| 失败点 | 可能原因 | 处理方式 |
| --- | --- | --- |
| 解析 402 失败 | 服务端返回格式不兼容 | 停止支付，记录错误 |
| recipient 不匹配 | payTo 不在 allowlist | 拒绝支付，要求人工确认 |
| 价格超预算 | amount 超过单次或每日上限 | 拒绝支付或请求人工批准 |
| resource 不匹配 | 付款要求中的 resource 与实际 API 不一致 | 拒绝支付，标记 phishing risk |
| Pact 过期 | 时间窗口失效 | 拒绝支付，要求用户重新授权 |
| 签名失败 | CAW signer 不可用或策略拒绝 | 停止执行，返回 signer error |
| settlement 失败 | facilitator / 链上结算失败 | 不返回成功结果，记录 settlement failure |
| API 结果异常 | 付款成功但服务端返回错误 | 记录 response hash，触发 dispute / refund flow |
| audit 写入失败 | 日志系统不可用 | 默认 fail-closed，不继续自动支付 |

## 7. Agent Profile 草图

```json
{
  "profileVersion": "0.1",
  "agentId": "agent:safepay-execution:v0.1",
  "name": "SafePay Execution Agent",
  "description": "A Pact-constrained wallet execution agent for x402-protected API payments.",
  "maintainer": {
    "name": "tz-hao",
    "github": "https://github.com/tz-hao",
    "address": "0xMaintainerAddress"
  },
  "domain": "Wallet / Permission / Safe Execution",
  "capabilities": [
    {
      "id": "handle_x402_payment_requirement",
      "description": "Parse HTTP 402 payment requirements and prepare policy checks.",
      "input": ["http_response", "payment_requirement"],
      "output": ["requirement_hash", "normalized_requirement"]
    },
    {
      "id": "evaluate_pact_scope",
      "description": "Check budget, recipient, API resource, chain, asset, and time window.",
      "input": ["normalized_requirement", "pact_policy"],
      "output": ["allow", "deny", "require_human_approval"]
    },
    {
      "id": "create_caw_payment_payload",
      "description": "Request CAW signer to create a payment payload under Pact constraints.",
      "input": ["requirement_hash", "pact_id"],
      "output": ["payment_payload", "payment_payload_hash"]
    },
    {
      "id": "write_audit_log",
      "description": "Write request, policy decision, settlement, and response hash to audit log.",
      "input": ["event"],
      "output": ["audit_event_id"]
    }
  ],
  "invocation": {
    "mcpTool": "safepay.execute_paid_api_request",
    "httpEndpoint": "POST /agent/safepay/execute",
    "requiredHeaders": ["Authorization", "X-Agent-Profile-Hash"]
  },
  "pricing": {
    "model": "per_successful_execution",
    "amount": "0.02",
    "asset": "USDC",
    "network": "base",
    "note": "Service API payment is separate from agent service fee."
  },
  "verification": {
    "profileHash": "0xProfileHash",
    "maintainerSignature": "0xSignature",
    "registry": "agent-profile-registry",
    "pactPolicyHashRequired": true,
    "auditLogRequired": true
  },
  "failureHandling": {
    "defaultMode": "fail_closed",
    "humanApprovalRequiredFor": [
      "unknown_recipient",
      "budget_increase",
      "policy_change",
      "resource_mismatch",
      "unlimited_approval",
      "unknown_contract_call"
    ],
    "refundOrDispute": "Open dispute if settlement succeeded but API result failed."
  }
}
```

## 8. 如何收费

这里要区分两类费用：

1. **服务方费用**：x402 protected API 收取的费用，例如 `0.10 USDC / request`。
2. **Agent 服务费**：SafePay Execution Agent 自己的执行费用，例如 `0.02 USDC / successful execution`。

更安全的收费方式是：

- agent service fee 只在 API 调用成功并有 settlement receipt 后收取；
- agent 不能把自己的费用混进服务方 402 payment requirement；
- 两笔费用都必须进入 audit log；
- 用户 Pact 应分别设置服务方预算和 agent fee 预算。

## 9. 如何被验证

SafePay Execution Agent 的验证可以分成三层：

### Profile 验证

- profile hash 是否与 registry 中一致；
- maintainer signature 是否有效；
- endpoint 是否属于 profile 声明；
- capability version 是否匹配。

### Policy 验证

- 本次 payment requirement 是否符合 Pact；
- Pact hash 是否被用户授权；
- Pact 是否过期；
- budget 是否足够；
- recipient / API / asset / chain 是否在 allowlist。

### Execution 验证

- payment payload 是否由 CAW signer 生成；
- settlement receipt 是否存在；
- response hash 是否写入 audit log；
- request、decision、settlement、response 是否能串成完整 trace。

## 10. 为什么它不是普通 API Bot

普通 API bot 只需要拿到请求、调用服务、返回结果。

SafePay Execution Agent 多了 Web3 执行边界：

- 它处理真实支付；
- 它必须遵守预算；
- 它必须限制 recipient 和 resource；
- 它必须保留 settlement 和 audit trace；
- 它必须在高风险动作时 fail closed。

这也是 AI x Web3 的核心：AI 负责理解、协调和解释；Web3 负责身份、授权、支付、结算和可验证记录。

## 11. 可选加分：MCP、A2A、ERC-8004、MPP 对比

### MCP vs A2A

| 协议 | 更适合解决什么问题 | 在本 agent 中的作用 |
| --- | --- | --- |
| MCP | 让一个 agent 标准化调用工具、数据源和本地/远程能力 | 把 `evaluate_pact_scope`、`create_caw_payment_payload`、`write_audit_log` 暴露成工具 |
| A2A | 让多个 agent 之间发现、协作、委托和返回结果 | 让 SafePay Agent 与报价 agent、风控 agent、结算 agent 协作 |

MCP 更像“agent 调工具”的接口层；A2A 更像“agent 调 agent”的协作层。

### ERC-8004 vs MPP

| 协议 | 更适合解决什么问题 | 在本 agent 中的作用 |
| --- | --- | --- |
| ERC-8004 | agent 身份、发现、能力声明、声誉和可验证 endpoint | 注册 SafePay Agent 的 profile、capability、maintainer 和 endpoint |
| MPP | 机器之间的支付、报价、支付要求、结算和凭证 | 表达 agent 调用付费服务时的付款和 settlement 语义 |

ERC-8004 更偏 identity / reputation / registry；MPP 更偏 payment / commerce / settlement。

### 与 x402 的关系

x402 更适合 HTTP API paywall：服务端直接用 `402 Payment Required` 表达“需要付款才能访问资源”。  
MPP 更像更通用的机器支付协议层，可以覆盖报价、验收、争议和结算。  
SafePay Execution Agent 可以先支持 x402，后续再扩展到 MPP。

## 12. 结论

SafePay Execution Agent 的 profile 应该回答七个问题：

1. 它是谁：一个 Pact-constrained wallet execution agent。
2. 谁维护它：maintainer 地址、GitHub、签名和 registry。
3. 它能做什么：处理 402、校验 Pact、创建支付 payload、记录审计。
4. 如何调用它：MCP tool 或 HTTP endpoint。
5. 如何收费：按成功执行收 agent fee，服务方费用另算。
6. 如何验证它：profile hash、signature、policy hash、settlement receipt、audit trace。
7. 失败如何处理：默认 fail closed，高风险动作必须人工确认。

这个 profile 草图延续 Week 2 主线 **Wallet / Permission / Safe Execution**，也能自然连接 Module B 的 x402 + CAW payment demo。

