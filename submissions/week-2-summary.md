# Week 2 Summary - AI x Web3 Bridge 深挖：安全钱包方向

## 1. 本周主线

Week 2 我从 AI x Web3 的多个交叉方向中，最终选择了：

```text
Wallet / Permission / Safe Execution
```

项目方向进一步收敛为：

```text
SafePay Guard Wallet
```

一句话总结：

> 做一个面向 Web3 用户、DAO 财务人员和 builder 的安全钱包执行助手，在签名、授权、转账和 agent 自动付款前，解释交易意图，检查权限风险，执行预算和白名单策略，并留下可审计记录。

这个方向最吸引我的地方是：它不是单纯让 AI “帮我点按钮”，而是把 AI 放进一个有账户抽象、Safe、多签、guard / policy、session key、预算限制和审计日志约束的执行系统里。

## 2. 本周完成的交付

| 模块 | 文件 | 核心产出 |
| --- | --- | --- |
| Module A | `week2-module-a-ai-web3-map.md` | AI x Web3 问题地图，覆盖 payment、identity、wallet、security、tooling、governance |
| Module B | `week2-module-b-x402-caw-agent-payment.md` | x402 + Cobo CAW agent 自主支付闭环设计 |
| Module B Demo | `week2-module-b-real-demo.md` | 可运行的本地 x402 paywall + CAW/Pact mock demo |
| Module C | `week2-module-c-agent-profile.md` | SafePay Execution Agent 的 profile 草图 |
| Module D | `week2-module-d-agent-wallet-policy.md` | agent wallet 执行流程、权限策略、ERC-4337 / Safe / guard 解释 |
| Module F | `week2-module-f-threat-model.md` | SafePay workflow threat model 与攻击模拟 |
| Module G | `week2-module-g-dao-budget-workflow.md` | DAO budget execution checklist workflow |
| Final | `week2-final-safe-wallet-proposal.md` | 安全钱包方向深挖包与项目初步 proposal |

## 3. 本周最重要的理解

### 3.1 AI x Web3 的核心不是“AI 自动执行”

我这一周最大的认知变化是：

```text
AI can suggest.
Policy decides.
Wallet enforces.
Human can revoke.
Audit records.
```

AI 可以理解意图、解释交易、总结风险、生成 checklist，但它不应该拥有最终执行权。最终执行权应该被 Web3 基础设施约束：

- smart account；
- Safe / multi-sig；
- guard / policy；
- session key；
- budget；
- allowlist；
- audit log；
- human confirmation。

### 3.2 安全钱包不是普通钱包加一个聊天框

如果只是把 AI 接到钱包 UI 上，让它解释交易，这更像 UX improvement。

真正的 agent wallet safety 需要解决：

- agent 能不能发起动作；
- 发起什么动作；
- 花多少钱；
- 调用哪个合约；
- 给谁付款；
- 什么情况必须人工确认；
- 出错后如何停止；
- 如何撤销 agent 权限；
- 如何审计整个执行链路。

这也是为什么我选择安全钱包方向，而不是单独做 payment、identity 或 governance。

### 3.3 Web3 机制提供确定性边界

AI 的输出有概率性，但钱包执行必须是确定性的。

本周我反复用到的确定性机制包括：

- ERC-4337：让账户变成可编程 smart account；
- Safe：把 owner、delegate、module、多签和撤销能力分开；
- guard / policy：在执行前拦截超预算、新合约、新 recipient、危险方法；
- x402：把 API paywall 的付款要求标准化；
- CAW / Pact：把 agent 的预算、范围和时间窗口变成授权策略；
- audit log：保留请求、判断、签名、结算和结果证据。

## 4. 本周 Demo 与实验

我完成了一个本地可运行 demo：

```text
experiments/x402-caw-agent-payment/
```

运行方式：

```bash
node experiments/x402-caw-agent-payment/src/demo.js
```

它跑通了一个最小闭环：

```text
request -> 402 -> Pact check -> CAW mock payment payload -> retry -> verify / settle -> audit log -> protected API result
```

并生成：

- `audit-log.jsonl`
- `settlement-ledger.json`

随后我又增加了攻击模拟：

```bash
node experiments/x402-caw-agent-payment/src/attack-simulation.js
```

攻击模拟结果：

```text
total: 11
blocked: 9
allowed: 2
```

被拦截的攻击包括：

- 超预算付款；
- 未知 recipient；
- 错误 resource；
- 错误 chain；
- unlimited approval；
- daily budget exceeded；
- forged tool return；
- tampered payment payload；
- replay payment payload。

两个允许场景分别是：

- 正常预算内付款；
- prompt injection 文本存在，但没有改变结构化付款事实，因此仍按 policy 执行。

这个结果说明：prompt injection 本身不能靠钱包“理解语义”来解决，关键是不要让自然语言直接进入执行层。

## 5. Week 2 最终项目 Proposal

项目名称：

```text
SafePay Guard Wallet
```

目标用户：

- 使用 AI agent 处理链上任务的 Web3 用户；
- DAO treasury operator；
- 钱包产品团队；
- Web3 builder / hackathon team；
- 需要受控自动付款的 agent service consumer。

真实场景：

> 用户授权一个 agent 每天最多花 1 USDC 调用某些受 x402 保护的 AI / 数据 API。Agent 遇到 `402 Payment Required` 后，可以在白名单、预算和时间窗口内自动付款；如果价格异常、收款地址变化、需要 approve 或调用未知合约，则必须暂停并请求人工确认。

MVP 功能：

1. Payment requirement parser；
2. Policy engine；
3. Risk explainer；
4. CAW / Safe mock signer；
5. Audit log；
6. Attack simulator。

Week 3 目标：

- 把 mock demo 拆成 provider、agent client、policy engine；
- 接入真实 Safe 或 Safe test environment；
- 增加交易 simulation 与 token allowance 检查；
- 做一个签名前风险说明页；
- 把 attack simulation 变成 regression test；
- 准备 demo video / pitch deck。

## 6. 没有选择的方向

### Payment / Commerce / Settlement

这个方向很重要，但范围更大，会涉及报价、托管、验收、争议、退款和商业闭环。我暂时把它作为安全钱包的上层场景，而不是 Week 2 主方向。

### Identity / Reputation / Interoperability

ERC-8004、agent registry、profile 都很关键，但短期 demo 不如安全钱包直观。我后续可以把 SafePay Agent 注册成 agent profile。

### Governance / Coordination / Public Goods

DAO budget checklist 很实用，但更偏组织流程。我本周用 Module G 做了一个 workflow 草图，暂时不作为主项目。

## 7. 本周产出的关键文件

```text
submissions/week2-module-a-ai-web3-map.md
submissions/week2-module-b-x402-caw-agent-payment.md
submissions/week2-module-b-real-demo.md
submissions/week2-module-c-agent-profile.md
submissions/week2-module-d-agent-wallet-policy.md
submissions/week2-module-f-threat-model.md
submissions/week2-module-g-dao-budget-workflow.md
submissions/week2-final-safe-wallet-proposal.md

experiments/x402-caw-agent-payment/src/demo.js
experiments/x402-caw-agent-payment/src/attack-simulation.js
```

## 8. 下周行动计划

### 最小路径

- 整理 SafePay Guard Wallet 的 README；
- 把 demo 拆成清晰模块；
- 写一份 Week 3 project plan。

### 推荐路径

- 接入 Safe test environment；
- 增加交易 simulation；
- 增加 token allowance 检查；
- 做一个前端风险说明页。

### 挑战路径

- 接入真实 x402 flow 或 testnet token；
- 接入 Cobo CAW / Pact 或同类 policy signer；
- 录制完整 demo；
- 做一版 pitch deck。

## 9. 总结

Week 2 的核心成果是：我从 AI x Web3 的问题地图里收敛出了一个更适合自己 Web3 基础的方向，也就是 **安全钱包 / Agent Wallet Safe Execution**。

这个方向的判断依据是：

- 它不是纯 AI，因为需要链上账户、签名、合约、预算和撤销；
- 它不是纯 Web3，因为用户需要 AI 来解释复杂交易和风险；
- 它有真实用户和真实痛点；
- 它能做出可运行 demo；
- 它能连接 x402、CAW、Safe、ERC-4337、guard / policy 和 DAO treasury 场景。

Week 3 我会把这个方向从“方案 + mock demo”推进到更接近真实产品原型的阶段。

