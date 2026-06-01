# Week 2 Proof-of-Work Pack

> **学员：** tz-hao | **时间：** 2026-05-23 ~ 2026-05-26
> **总入口：** https://github.com/tz-hao/ai-web3-school-cohort-0
> **Week 2 主线：Wallet / Permission / Safe Execution → SafePay Guard Wallet**

---

## 一、学习记录

### 1.1 Handbook Phase 2 收尾（5/23-5/24）

📄 [daily/2026-05-23.md](daily/2026-05-23.md) · [daily/2026-05-24.md](daily/2026-05-24.md)

Bridge 全部 12 章完成。核心章节（Agent Workflow、Agent Wallet、AI Security）理解较深，低优先级章节（AI Privacy、Decentralized AI）快速阅读通过。

### 1.2 深度知识补充（5/25-5/26）

📄 [daily/2026-05-25.md](daily/2026-05-25.md) · [daily/2026-05-26.md](daily/2026-05-26.md)

| 主题 | 核心产出 |
|------|----------|
| Agent 架构模式 | ReAct / Plan-Execute / Multi-Agent 三模式对比 + 安全保障三层防线 |
| Agent Wallet 实操 | Safe + Session Key 部署脚本 + AllowanceModule 源码研究 |
| 记忆系统 | STM/WM/LTM 三层模型 + 向量检索 + 遗忘/冲突处理 |
| Prompt 工程 | System/User 分工 + 结构化输出四层方案 |
| MCP 工具开发 | Tool 结构 + 三种传输方式 + Hermes 集成 |

### 1.3 协议综合（5/25）

📄 [daily/2026-05-25-protocol-synthesis.md](daily/2026-05-25-protocol-synthesis.md) · [daily/2026-05-25-mindmap.md](daily/2026-05-25-mindmap.md)

19 份 Agent 参考设计遍历，统一到「事前约束 → 事中验证 → 事后追责」三层框架。

---

## 二、Week 2 项目交付：SafePay Guard Wallet

### 模块产出

| 模块 | 文件 | 产出 |
|------|------|------|
| Module A | [week2-module-a-ai-web3-map.md](submissions/week2-module-a-ai-web3-map.md) | AI × Web3 问题地图 (Payment/Identity/Wallet/Security/Tooling/Governance) |
| Module B | [week2-module-b-x402-caw-agent-payment.md](submissions/week2-module-b-x402-caw-agent-payment.md) | x402 + Cobo CAW agent 自主支付闭环设计 |
| Module B Demo | [week2-module-b-real-demo.md](submissions/week2-module-b-real-demo.md) | 可运行 x402 paywall + CAW/Pact mock demo |
| Module C | [week2-module-c-agent-profile.md](submissions/week2-module-c-agent-profile.md) | SafePay Execution Agent profile 草图 |
| Module D | [week2-module-d-agent-wallet-policy.md](submissions/week2-module-d-agent-wallet-policy.md) | Agent wallet 执行流程 + ERC-4337/Safe/guard 权限策略 |
| Module F | [week2-module-f-threat-model.md](submissions/week2-module-f-threat-model.md) | SafePay workflow threat model + 攻击面分析 |
| Module G | [week2-module-g-dao-budget-workflow.md](submissions/week2-module-g-dao-budget-workflow.md) | DAO budget execution checklist workflow |
| Final | [week2-final-safe-wallet-proposal.md](submissions/week2-final-safe-wallet-proposal.md) | SafePay Guard Wallet 完整 proposal |

---

## 三、AI × Web3 实验代码

### 3.1 x402 CAW Agent Payment（可运行 demo）

📂 [experiments/x402-caw-agent-payment/](experiments/x402-caw-agent-payment/)

最小闭环：`request → 402 → Pact check → CAW mock payment → retry → verify/settle → audit log → protected API result`

```bash
node experiments/x402-caw-agent-payment/src/demo.js          # 正常流程
node experiments/x402-caw-agent-payment/src/attack-simulation.js  # 攻击模拟
```

攻击模拟结果：**11 种攻击，9 种被拦截**（超预算、未知 recipient、unlimited approval、forged tool return、replay 等）。

### 3.2 Safe Session Key（TypeScript 脚本）

📂 [experiments/safe-session-key/](experiments/safe-session-key/)

- `deploy-safe.ts` — Safe 部署 + 提案-确认模式演示
- `test-allowance.ts` — AllowanceModule 完整交互流程（含 EIP-712 签名构建）

📄 [experiments/safe-session-key/NOTES.md](experiments/safe-session-key/NOTES.md) — 关键洞察：Safe 权限模型本质上就是为「不信任的执行者」设计的，AI Agent 只是这个不信任执行者的另一个实例。

---

## 四、参考研究

新增 4 份 references：

| 文件 | 内容 |
|------|------|
| [references/erc-4337-summary.md](references/erc-4337-summary.md) | ERC-4337 账户抽象：UserOperation + Bundler + EntryPoint 架构总结 |
| [references/mcp-remote-connection-summary.md](references/mcp-remote-connection-summary.md) | MCP 远程连接方案总结 |
| [references/zai-web-search-api.md](references/zai-web-search-api.md) | Z.AI Web Search API 参考 |

累计 **22 份** references。

---

## 五、本周核心认知

```
AI can suggest.
Policy decides.
Wallet enforces.
Human can revoke.
Audit records.
```

AI 不拥有最终执行权。最终执行权被 Web3 基础设施约束：smart account、Safe/multi-sig、guard/policy、session key、budget、allowlist、audit log、human confirmation。

Prompt injection 不能靠钱包「理解语义」来解决——关键是**不要让自然语言直接进入执行层**。

---

## 六、本周学习计划 vs 实际

| 计划 | 实际 |
|------|------|
| Bridge Phase 2 收尾 | ✅ 5/24 完成 |
| Agent 架构模式 | ✅ 5/25 完成 |
| Safe Session Key 实验 | ✅ 脚本完成（Anvil fork 实测待做） |
| x402 CAW 支付 demo | ✅ 可运行 + 攻击模拟 |
| Week 2 7 Modules | ✅ 全部提交 |
| 深度知识补充 | ✅ 记忆系统 + Prompt 工程 + MCP |

超额产出：协议综合 layer、威胁模型、DAO workflow、22 份 references。

---

## 七、待补充

- [ ] X 账号关注列表（Week 1 遗留）
- [ ] Safe 脚本在 Anvil fork 上实测
- [ ] WCB 平台打卡链接回填
- [ ] `handbook-feedback/` 目录初始化（Handbook 阅读中发现的 issues 沉淀）

---

## 八、Week 3 计划

- 把 x402 demo 拆成 provider / agent client / policy engine 模块
- 接入真实 Safe test environment
- 增加交易 simulation 与 token allowance 检查
- attack simulation 转 regression test
- 准备 demo video / pitch deck
