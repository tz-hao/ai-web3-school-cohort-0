# Week 2 Module F - SafePay Agent Workflow Threat Model

## 1. Workflow 选择

我选择的 workflow 是前面 Week 2 Module B/C/D 延续下来的 **SafePay Execution Agent**：

> Agent 代表用户调用一个受 x402 保护的 API 或 AI 推理服务。服务端返回 `402 Payment Required`。Agent 解析付款要求，交给 Pact / policy 检查预算、收款方、资源、资产、链和时间窗口。在策略允许时，CAW / wallet layer 生成支付 payload 或链上交易，完成 settlement 后重试 API，并记录审计日志。

这个 workflow 的关键风险是：agent 从“读信息”进入“花钱 / 授权 / 链上执行”。因此安全设计必须默认 fail closed。

## 2. Threat Model 总览

| 维度 | 需要保护的对象 | 主要威胁 | 防护思路 |
| --- | --- | --- | --- |
| 资产 | USDC、gas、API credits、用户钱包资产 | 超预算付款、错误收款方、重复支付、恶意授权 | 单次/每日预算、recipient allowlist、nonce、settlement check |
| 权限 | Safe owner、delegate、session key、Pact policy | agent 越权、policy 被修改、delegate 泄露 | Safe 多签、policy hash、权限分层、可撤销 delegate |
| 数据 | prompt、API response、audit log、付款记录 | 敏感数据泄露、日志污染、response 被篡改 | 数据最小化、hash 记录、敏感字段过滤 |
| 工具调用 | x402 parser、CAW signer、RPC、facilitator、audit writer | 工具返回伪造、RPC 欺骗、signer 被滥用 | signer 二次校验、resource hash、chain id 校验、多源验证 |
| 外部依赖 | x402 protected API、facilitator、RPC、Cobo CAW、indexer | 服务不可用、价格变化、错误 settlement | retry policy、价格阈值、超时、人工确认 |
| 失败后果 | 资金损失、重复付款、拿不到服务、错误审计 | 用户资产损失、无法追责、错误自动化继续执行 | fail closed、kill switch、完整审计、人工介入 |

## 3. 资产风险

### 资产

- 用户 Safe / smart account 中的 USDC；
- agent 可用的 daily budget；
- API 服务访问权；
- gas 或 paymaster 额度；
- settlement receipt。

### 威胁

- 服务方把价格从 `0.10 USDC` 改成 `10 USDC`；
- 服务方把 `payTo` 换成攻击者地址；
- agent 被诱导重复支付；
- payment payload 被重放；
- agent 被诱导做 unlimited approval。

### 控制

- `maxAmountPerPayment`；
- `dailyBudget`；
- `recipientAllowlist`；
- `resourceAllowlist`；
- nonce / replay protection；
- forbidden action: `approve_unlimited`；
- settlement 成功后才返回 paid result。

## 4. 权限风险

### 权限

- Safe owner 权限；
- agent delegate 权限；
- CAW / MPC signer 权限；
- Pact policy 修改权限；
- session key / allowance 权限。

### 威胁

- agent 试图修改自己的 policy；
- agent 添加新的 recipient；
- prompt injection 诱导 agent 忽略限制；
- delegate key 泄露后在限额内持续花钱；
- signer 相信被伪造的工具返回。

### 控制

- agent 不能修改 Pact；
- policy 修改必须人确认；
- signer 必须二次校验 policy，不信任 agent 的自然语言解释；
- session key 有时间窗口和预算；
- Safe owner / guardian 可以随时 remove delegate；
- audit log 写入失败则停止执行。

## 5. 数据风险

### 数据

- 用户 prompt；
- API request / response；
- payment requirement；
- policy decision；
- settlement tx；
- audit log；
- profile hash / policy hash。

### 威胁

- prompt 中包含 API key、private key、session key；
- audit log 记录了敏感 secret；
- API response 被篡改但仍被 agent 当作事实；
- provider 返回含 prompt injection 的内容，诱导下一步越权。

### 控制

- 日志只记录 hash 和必要元数据，不记录 secret；
- response hash 进入 audit；
- downstream action 重新走 policy；
- prompt injection 不能直接改变 wallet policy；
- 高风险链上动作必须基于 transaction facts，而不是自然语言。

## 6. 工具调用风险

### 工具

- x402 payment requirement parser；
- Pact evaluator；
- CAW signer；
- RPC / block explorer；
- x402 facilitator；
- audit writer。

### 威胁

- 工具返回被伪造，例如 “policy allowed”；
- parser 漏掉恶意字段；
- RPC 返回错误 chain id；
- facilitator 假装 settlement 成功；
- audit writer 不可用，导致没有证据链。

### 控制

- CAW signer 必须重新 evaluate policy；
- provider verify 阶段检查签名、resource、nonce；
- chain id、resource、recipient 都进入 canonical requirement hash；
- settlement receipt 需要可验证 tx hash；
- audit failure 默认 fail closed。

## 7. 外部依赖风险

| 依赖 | 风险 | 控制 |
| --- | --- | --- |
| x402 protected API | 返回恶意价格、恶意收款方、错误资源 | allowlist + amount cap + resource match |
| CAW / signer | 不可用或策略执行错误 | fail closed + human escalation |
| RPC | 网络错误、错误链、返回不一致 | chain id 校验 + retry + 多源验证 |
| Facilitator | settlement 失败或延迟 | 不返回 paid result，记录 failure |
| Indexer / explorer | 数据滞后 | 不把 indexer 结果当作最终执行依据 |
| AI model provider | hallucination 或 prompt injection | 交易执行只信 policy 和链上事实 |

## 8. 失败后果

| 失败 | 后果 | 处理 |
| --- | --- | --- |
| 超预算付款 | 资金损失 | policy 拦截，超阈值人工确认 |
| 错误收款方 | 资金进入攻击者地址 | recipient allowlist 拦截 |
| 重复付款 | 多次扣款 | nonce + settled payment ledger |
| settlement 成功但 API 失败 | 付钱但没拿到服务 | 记录 dispute / refund evidence |
| audit 写入失败 | 无法追责 | stop execution |
| policy 被修改 | agent 权限扩大 | policy change requires human approval |
| delegate 泄露 | 限额内损失 | revoke delegate + rotate key |

## 9. 低风险自动执行 / 高风险人工确认策略

### 可自动执行

满足全部条件时可以自动执行：

- chain 在 allowlist；
- asset 在 allowlist；
- recipient 在 allowlist；
- API resource 在 allowlist；
- 单次金额小于等于 `0.10 USDC`；
- 今日累计金额小于等于 `1.00 USDC`；
- payment count 小于每日上限；
- Pact 未过期；
- 不涉及 approve、delegatecall、owner change、policy change；
- simulation 成功；
- audit writer 可用。

### 必须人工确认

任一条件触发时必须人工确认：

- 单次金额超过 `0.10 USDC`；
- 今日预算即将耗尽或已经超限；
- 新 recipient；
- 新 API resource；
- 新 chain；
- 新 asset；
- 需要 `approve` 或 `increaseAllowance`；
- unlimited approval；
- 调用未知合约；
- 调用 `upgrade`、`setOwner`、`changePolicy`、`delegatecall`；
- simulation 失败或资产变化无法解释；
- provider 返回的 payment requirement 与用户意图不一致；
- audit log 写入失败；
- CAW signer / facilitator / RPC 出现不一致结果。

### 必须直接拒绝

- policy 变更由 agent 自己发起；
- agent 试图提高自己的预算；
- prompt 要求“忽略 policy”；
- private key / API key / session key 出现在日志或请求里；
- recipient 明显不匹配；
- replay payment payload；
- forged signature。

## 10. 攻击模拟

我在本地 demo 中新增了攻击模拟脚本：

```text
experiments/x402-caw-agent-payment/src/attack-simulation.js
```

运行：

```bash
node experiments/x402-caw-agent-payment/src/attack-simulation.js
```

生成报告：

```text
experiments/x402-caw-agent-payment/attack-simulation-report.json
```

### 模拟攻击列表

| 攻击 | 结果 | 拦截层 |
| --- | --- | --- |
| 正常预算内付款 | 允许 | Pact + provider verify |
| Prompt injection: ignore policy | 不直接改变 policy；付款本身仍按事实校验 | Pact / signer |
| 服务方把金额改成 10 USDC | 拦截 | Pact policy |
| 服务方替换 recipient | 拦截 | Pact policy |
| payment requirement 指向错误 resource | 拦截 | Pact policy |
| 请求错误 chain | 拦截 | Pact policy |
| unlimited approval | 拦截 | Pact policy |
| daily budget exceeded | 拦截 | Pact policy |
| 伪造工具返回 “policy allowed” | 拦截 | signer 二次 policy 校验 |
| tampered payment payload | 拦截 | provider signature verify |
| replay payment payload | 拦截 | provider nonce check |

### 观察

被成功拦截的攻击大多是“可结构化表达”的攻击：金额、收款方、resource、chain、action、nonce、signature。

仍然需要额外防护的部分：

- prompt injection 本身不会被 wallet policy “理解”，只能通过不给自然语言直接执行权来隔离；
- API response 的语义质量仍需要 evaluation / reputation / dispute 机制；
- 如果 allowlist 本身配置错了，policy 会忠实执行错误配置；
- 如果 signer 实现没有二次校验，只相信 agent 或工具返回，就会出现越权风险。

## 11. 结论

SafePay Agent 的安全边界应该是：

```text
AI can suggest.
Policy decides.
Wallet enforces.
Human can revoke.
Audit records.
```

在 agent wallet workflow 中，AI 层不应该拥有最终执行权。真正的安全性来自确定性基础设施：

- Pact / policy 限制预算、范围和时间窗口；
- CAW / signer 在签名前二次校验；
- Safe / smart account 提供撤销和权限分层；
- x402 / settlement 提供支付状态；
- audit log 提供追责和复盘证据。

这套策略延续 Week 2 主线 **Wallet / Permission / Safe Execution**，也补上了从 “能自动付款” 到 “能安全、可审计、可撤销地自动付款” 的威胁建模。

