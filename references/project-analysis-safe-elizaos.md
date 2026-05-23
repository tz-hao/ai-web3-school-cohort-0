# AI × Web3 项目拆解（二）

> 训练识别真实问题、技术路径和 proof-of-work 的能力
> 第二组：基础设施层（Safe）+ 框架层（ElizaOS）

---

## 项目 1：Safe（原 Gnosis Safe）

### 它在解决什么问题

Web3 资产管理的根本矛盾：一个人控制风险太大（丢私钥全没），人太多效率为零（凑不够签名钱锁死）。Safe 用 **M-of-N 多签智能账户** 解决。更进一步，Safe 正在成为 **AI Agent 钱包的默认基础设施**——Agent 可以发起交易提案，但必须人或其他 Agent 共同签名才执行。

### AI 部分是什么

- **AI 交易构建器**：Agent 生成交易草稿（calldata + 参数），以「提案」形式提交，不自动执行
- **Agent 作为签名者**：多个 AI Agent 可以各自持有一个签名席位，Agent A 提案 → Agent B 审查 → 人做最终确认。共识在 Safe 层面强制执行
- **AI 风险评分**：第三方（如 Sigil Security）在 Safe 之上加了一层 AI 沙箱——交易发出前，AI 先模拟并打分，高风险自动阻拦
- **Prompt 影响防护**：Safe 官方文档明确提到 "many AI agents can be influenced by specific prompts"，因此 Agent 只能提案不能独断

### Web3 部分是什么

- **多签智能合约账户**（2017 年至今，$100B+ 资产保护，零安全事故）
- **ERC-4337 兼容**：通过 EntryPoint 合约 + EIP4337Manager 实现 Gas 赞助、批量交易
- **模块化插件**：Session Key（定时定额授权）、Spending Limits（额度上限）、Whitelist（白名单合约）、Timelock（延迟执行）
- **Counterfactual 部署**：还没部署就知道地址，所有 EVM 链同一地址
- **Social Recovery**：Guardian 机制，无需助记词即可恢复

### 生态项目（在 Safe 之上构建）

| 项目 | 做什么 |
|------|--------|
| **NodPay** | 2/3 多签：人 + AI Agent 共享钱包。CLI 操作，Agent 提案人批准 |
| **Sigil Security** | 3 层防护：规则引擎 → 交易模拟 → AI 风险打分，Agent 零管理权限 |
| **Echooo** | MPC + AI + ERC-4337，AI 路由最优兑换 + 安全引擎实时监控 |

### 可验证材料

| 类型 | 具体 |
|------|------|
| 产品 | [Safe{Wallet}](https://safe.global)，$100B+ 累计资产，2017 年运行至今 |
| 代码 | [safe-core-sdk](https://github.com/safe-global/safe-core-sdk)，[safe-contracts](https://github.com/safe-global/safe-smart-account) |
| AI 文档 | [Safe AI Overview](https://docs.safe.global/home/ai-overview) — 官方 AI Agent 集成指南 |
| 生态 | NodPay CLI、Sigil Security API、Echooo Wallet 均在生产中 |
| 论文 | ERC-4337 标准、Safe 多签形式化验证报告 |

### 我学到什么

1. **Safe 的智能账户模型本质上就是为「不信任的执行者」设计的**——这不只是说多个人，也包括 AI Agent。Agent 是另一个需要被限制的「签名者」。
2. **「提案-确认」模式比「授权-执行」模式更适合 Agent**。Session Key 是「我授权你在一段时间内随便花」，Safe 提案模式是「你每次花钱都提案，我每次确认」。后者更安全但更慢——这是安全性和敏捷性的经典取舍。
3. **生态位分工清晰**：Safe 做账户层（链上合约），Sigil/NodPay 做中间件层（AI 策略 + 风险评分），Agent 框架做应用层——三层各司其职。

### 疑问

- 如果要让 Agent 高频操作（每秒几十笔），Safe 的多签提案模式明显太慢。Safe 有没有计划做 Layer 2 批量确认？
- Session Key + Safe 多签怎么组合？Session Key 本质上是单签逻辑，和多签阈值可能冲突。

---

## 项目 2：ElizaOS（ai16z）

### 它在解决什么问题

搭建一个能发推、能回 Discord、能查链上数据、能调合约的 AI Agent，过去需要从零写几百行胶水代码。ElizaOS 把 Agent = **角色文件 + 插件 + 模型** 标准化了。你写一个 JSON 定义 Agent 人格，加载插件（Twitter/Solana/Discord），它就活了。被称作「AI Agent 界的 WordPress」。

### AI 部分是什么

- **多模型支持**：OpenAI、Claude、DeepSeek、Llama（本地）、NEAR AI、Mistral——Agent 可以用任何模型
- **Character File**：JSON 定义 Agent 人格（bio、lore、knowledge、style、对话示例），模型据此生成回复
- **Evaluators**：Agent 的「判断层」——收到消息后决定要不要行动、怎么行动
- **Provider**：注入实时数据（时间、行情、链上状态），Agent 的「感官系统」
- **多平台客户端**：Twitter/X、Discord、Telegram、WhatsApp，一个 Agent 同时跑多个平台

### Web3 部分是什么

- **Solana 插件**：钱包创建、代币查询、交易发送、NFT 操作
- **多链扩展**：Sei Network、MultiversX、Hyperliquid、Lens Network
- **TEE 插件**：结合 Phala 实现 Agent 私钥的可信执行
- **链上身份**：Agent 有自己的钱包地址，可以作为独立链上实体
- **DAO 集成**：ai16z 本身就是这个概念的第一个实验品——AI 驱动的投资 DAO

### 架构核心：「Everything is a Plugin」

```
Agent Runtime（协调层）
  ├── Character File（人格定义）
  ├── Model Provider（LLM 后端）
  ├── Plugins
  │   ├── Client Plugins（Twitter, Discord, Telegram...）
  │   ├── Chain Plugins（Solana, Sei, MultiversX...）
  │   ├── Service Plugins（TEE, Browser, PDF...）
  │   └── Custom Plugins（任何人都可以写）
  ├── Actions（Agent 可以做的事）
  ├── Evaluators（Agent 怎么判断该做什么）
  └── Memory（短期 + 长期记忆）
```

每个插件在独立 repo 下单独发版，CI/CD 独立——插件生态不耦合核心框架。

### 可验证材料

| 类型 | 具体 |
|------|------|
| 代码 | [github.com/elizaOS/eliza](https://github.com/elizaOS/eliza)，14.7k+ stars，MIT 开源 |
| 论文 | [arXiv:2501.06781](https://arxiv.org/abs/2501.06781) — "Eliza: A Web3 friendly AI Agent Operating System" |
| 插件 | [elizaos-plugins](https://github.com/elizaos-plugins) 独立 org，20+ 官方插件 |
| 社区 | 366+ 贡献者，Discord/Twitter 活跃 |
| 产品案例 | ai16z DAO、Spore.fun（通过 Eliza + Phala TEE 创建）、大量 Twitter/Discord bot |

### 我学到什么

1. **Agent 框架的分层很清晰**：人格定义（Character File）→ 感知层（Provider）→ 判断层（Evaluator）→ 行动层（Action）→ 记忆（Memory）。这和我们在 Agent 概念笔记里写的「Agent = LLM + 工具 + 循环」完全对应，但工程实现上多了人格持久化、平台适配和记忆管理。
2. **「Everything is a Plugin」不是口号，是底层架构决策**。插件独立 repo 独立发版意味着生态贡献者不需要碰核心代码——这对开源项目增长至关重要。
3. **ElizaOS 的定位是「Agent 操作系统」不是「Agent 本身」**。它不告诉你 Agent 应该做什么——它提供的是让 Agent 跑起来的基础设施。这解释了为什么它的典型使用场景是 Twitter KOL bot、Discord 客服机器人——因为这些人格驱动的场景最适合开箱即用。

### 疑问

- 已知限制：没有自适应学习、没有层级规划、Agent 之间没有共享记忆。这些是 ElizaOS v2 的方向，还是有其他项目在做？
- ElizaOS 的 Agent 在链上操作时（比如调 Solana 合约），模型本身有多大的幻觉风险？框架层有没有类似 Cobo Recipe 那样的验证机制？
- 论文里提到的 Evaluator 组件——Agent「判断该不该行动」——这个判断本身依赖 LLM。如果 LLM 判断错了（比如不该发推的时候发了），有什么兜底？

---

## 对比与关联

| 维度 | Safe | ElizaOS |
|------|------|---------|
| 层级 | 账户基础设施 | Agent 应用框架 |
| 解决的问题 | 谁能签名、谁能花钱 | Agent 怎么跑起来 |
| AI 的角色 | AI 是签名者之一（受限） | AI 是 Agent 的大脑 |
| Web3 的角色 | 链上多签 + 智能账户 | 多链插件 + 链上交互 |
| 安全哲学 | 默认为不信任，逐笔确认 | 默认为信任人格，靠平台限制 |
| 和我学的章节 | Agent Wallet, Web3 Tool Use | Agent, Frameworks, AI Security |
| GitHub | [safe-global](https://github.com/safe-global) | [elizaOS](https://github.com/elizaOS) |

---

## Safe + Cobo + Phala + ElizaOS 全景

```
         应用层  ──  ElizaOS（Agent 框架）
                      │
         中间件层 ──  Sigil Security（AI 风险评分）
                      NodPay（人+Agent 多签）
                      │
         执行层  ──  Phala TEE（可验证执行环境）
                      Cobo CAW（MPC 签名 + Pact 协议）
                      │
         账户层  ──  Safe（多签智能账户）
```

四个项目合在一起，正好覆盖了 AI × Web3 Bridge 的全链路：
- **Safe** 管「账户怎么建」
- **Cobo** 管「私钥怎么分」
- **Phala** 管「执行在哪跑」
- **ElizaOS** 管「Agent 怎么搭」

这不是巧合——这四层分别对应了 Bridge 章节的核心问题：Agent Wallet、Web3 Tool Use、Verifiable AI、Agent Frameworks。

---

## 对我的意义

之前的拆解（Cobo + Phala）偏向安全基础设施，这次（Safe + ElizaOS）补上了**账户层和框架层**。四个项目在一起，构成了一个可操作的认知地图：

- **如果我想做 Agent 钱包**：看 Safe 的智能账户 + Cobo 的 MPC 方案
- **如果我想做可验证 Agent**：看 Phala 的 TEE
- **如果我想快速搭一个 Agent 原型**：用 ElizaOS 的插件系统
