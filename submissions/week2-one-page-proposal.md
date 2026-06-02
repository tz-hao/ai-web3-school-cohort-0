# Week 2 One-page Project Proposal - SafePay Guard Wallet

## 项目名称

```text
SafePay Guard Wallet
```

## 主方向

```text
Wallet / Permission / Safe Execution
```

## 一句话简介

SafePay Guard Wallet 是一个面向 AI Agent 链上执行场景的安全钱包助手：Agent 可以提出付款、交易或资源采购动作，但必须经过预算、白名单、策略、人工确认和审计日志约束后，钱包才允许执行。

## 目标用户

- 想让 AI Agent 处理低风险链上任务的 Web3 用户；
- 需要执行预算和付款的 DAO treasury operator；
- 正在探索 agent wallet 的钱包产品团队；
- 集成 x402、LI.FI、Safe、ERC-4337、Cobo CAW 的 Web3 builder；
- 希望让 agent 自动购买 API、数据、算力或服务的开发者。

## 真实场景

用户给 agent 一个有限授权：

```text
每天最多花 1 USDC，在 Base 上调用白名单里的付费 AI / 数据 API。
单次超过 0.10 USDC、新收款方、新合约、approve 或高滑点交易必须人工确认。
```

Agent 调用受 x402 保护的 API 或获取 LI.FI quote 后，SafePay 会把工具返回转成结构化事实：

- chain；
- token；
- amount；
- recipient；
- contract；
- method；
- resource；
- slippage；
- approval flag。

然后 policy engine 判断：

```text
allow / deny / needs_human_confirmation
```

## 最小功能

1. **Intent / Tool Facts Normalizer**  
   将 x402 payment requirement 或 LI.FI transactionRequest 转成 policy facts。

2. **Policy Engine**  
   检查预算、chain、token、recipient、resource、contract、method、slippage、approval。

3. **Risk Explainer**  
   用用户能理解的语言说明为什么允许、拒绝或需要人工确认。

4. **Wallet Draft Mode**  
   生成 x402 payment payload draft、Safe transaction draft 或 ERC-4337 UserOperation-style draft，但 Week 4 不直接移动主网资金。

5. **Audit Log**  
   记录 intent、工具返回、policy decision、风险摘要、draft hash、tx / settlement 结果。

6. **Attack Simulation**  
   模拟 prompt injection、超预算、新 recipient、错误 resource、unlimited approval、伪造工具返回、replay 等攻击。

## 验证方式

最小验证不是“真实花钱”，而是证明执行边界有效：

- 正常低风险付款：`allow`
- 超预算付款：`deny`
- 未知收款方：`deny`
- 错误 resource / chain：`deny`
- approve / unlimited approval：`needs_human_confirmation` 或 `deny`
- 高滑点 LI.FI quote：`needs_human_confirmation`
- 伪造工具返回：signer / policy 二次校验拦截
- replay payment payload：nonce / settlement 记录拦截

验证材料：

- policy facts；
- policy decision；
- risk explanation；
- audit log；
- draft hash；
- attack simulation report；
- 可选 tx hash / settlement receipt。

## 风险边界

Week 4 明确不做：

- 不移动主网真实资金；
- 不做完整生产级 CAW / Pact 集成；
- 不做完整 Safe / ERC-4337 live execution；
- LI.FI 先用 quote fixture 或 real quote，但不签名执行；
- 不做无限 policy builder；
- 不做完整 AI 合约审计；
- 不替代 DAO 治理或 Safe signer。

核心安全原则：

```text
Agent proposes.
Policy checks.
Wallet signs.
Human confirms high risk.
Audit records.
```

## 可能赛道

- **Cobo | Agentic Economy x Cobo Agentic Wallet**  
  用 Pact 表达预算、范围、完成条件和 human approval，让 agent 在可控边界内付款、交易和采购资源。

- **Wallet / Permission / Safe Execution**  
  展示 agent wallet 的权限分层、撤销、预算和安全执行边界。

- **AI Security**  
  通过 prompt injection、tool spoofing、越权支付、replay 等攻击模拟验证 policy 层的防护能力。

- **Dev Tooling / Agent Workflow**  
  为 builder 提供一个可复用的 policy evaluation + risk explanation + audit log 工具链。

## Week 3 / Week 4 下一步

```text
Week 3: 完成资料阅读、最小闭环图、Hackathon package、Cobo track fit。
Week 4: 做 CLI / minimal demo，重点实现 normalizeFacts -> evaluatePolicy -> explainRisk -> wallet draft -> audit evidence。
```

## 结论

SafePay Guard Wallet 的价值不是让 AI 自动控制钱包，而是把 AI 的理解能力放进一个可验证、可撤销、可审计的钱包执行边界里。

