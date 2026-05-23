# AI × Web3 项目拆解

> Agent Workflow + Verifiable AI 章节实践
> 训练识别真实问题、技术路径和 proof-of-work 的能力

---

## 项目 1：Cobo Agentic Wallet（CAW）

### 它在解决什么问题

AI Agent 要操作链上资产，面临一个死结：给 Agent 私钥 → 全或无风险；不给私钥 → Agent 只能读不能写。CAW 用一个 MPC 方案拆开这个结：**私钥分成三片，分别由用户、Agent、Cobo 持有，必须达到阈值才能签名。单个片被攻破也没用。**

### AI 部分是什么

- **Pact Protocol**：AI Agent 每执行一个任务前，生成一份加密签名的 Pact（意图 + 执行计划 + 权限边界 + 完成条件）。这不是静态策略，而是每次任务动态签发的「合同」。
- **Recipe 库**：预验证的执行路径（Aave 借贷、Uniswap 交换、Polymarket 预测市场等）。Agent 沿着已验证路径执行，不用自己拼 calldata——从根本上减少了幻觉风险。
- **审计日志**：每次操作记录 Agent 的推理过程、信号来源、置信度、策略验证结果——Agent 行为可追溯。

### Web3 部分是什么

- **MPC 分片签名**（不是软件承诺，是数学保证）
- **80+ 链 + 3000+ token 支持**
- **50 个 Sub-Wallet** 隔离不同策略风险
- **ERC-8004** 链上 Agent 身份标准
- **x402**（Coinbase 的 HTTP 层稳定币支付协议）
- **移动端一键撤销**所有子钱包授权

### 可验证材料

| 类型 | 具体内容 |
|------|----------|
| 产品 | [Cobo Agentic Wallet](https://www.cobo.com/agentic-wallet)，2026-04-20 上线 |
| 文档 | [Launch Post](https://www.cobo.com/post/cobo-launches-agentic-wallet-how-ai-agents-interact-on-chain) |
| SDK | LangChain / OpenAI Agents SDK / Claude MCP / Agno / CrewAI |
| 安全记录 | 8 年零事故，$3.8T 累计资产托管，99.97% 在线率 |
| 第三方报道 | [KuCoin](https://www.kucoin.com/blog/how-cobo-s-agentic-wallet-gives-ai-agents-enforceable-autonomy-without-giving-up-control), [Gate Learn](https://www.gate.com/en-us/learn/articles/cobo-introduces-agentic-wallet-architecture-to-enable-controlled-ai-interaction-with-blockchain-assets/12516) |

### 我学到什么

1. **私钥问题不是「能不能给 Agent」，而是「怎么给才能让单点不崩」**。MPC 分片方案把这个问题从信任问题变成了数学问题——这比 Session Key 方案更深一层。
2. **Pact 协议是对 Web3 Tool Use 章节「工具权限分层」的产品级实现**。不是简单的「读/写/签名」三级，而是每次任务动态定义边界，任务完成自动过期。
3. **Recipe 库是反幻觉的工程方案**。不让 Agent 自由拼 calldata，而是沿着预验证路径走——相当于给 Agent 铺了轨道，不是给它一片旷野。

### 疑问

- Pact 的动态生成本身依赖 LLM 理解任务意图——如果 LLM 理解错了意图，过宽或过窄的 Pact 怎么检测？有没有人类打回的机制？
- 50 个 Sub-Wallet 的管理复杂度——Agent 自己决定用哪个子钱包吗？跨子钱包的资产调度怎么处理？

---

## 项目 2：Phala Network（TEE × AI Agent）

### 它在解决什么问题

**Agent 信任三角**：社区不相信 Agent 的行为没被开发者操控。Agent 说我按策略交易了，谁信？Agent 说我没偷私钥，谁验证？Phala 的方案是把 Agent 放进 TEE（可信执行环境）——私钥在 TEE 里生成、永不离境，所有操作有密码学证明，开发者自己也无法篡改。

### AI 部分是什么

- **Confidential GPU VM**：LLM 推理在 TEE 加密环境运行，模型输入输出均不可见
- **AI Agent Contracts**：EVM 合约直接调用链下 TEE 内 Agent
- **ElizaOS TEE 插件**：ai16z 生态的 Agent 框架，通过 Phala 获得安全私钥管理和可验证执行
- **Spore.fun / aiPool**：完全自治的 AI Agent——自己管理钱包、发行 Token、执行策略，开发者无法干预

### Web3 部分是什么

- **Intel TDX + NVIDIA Confidential Computing**（不是只有 CPU，GPU 推理也在 TEE 里）
- **双远程证明**（Intel + NVIDIA 各自出证明）
- **链上验证**：TEE 证明上链，任何人都能查验
- **PHA token 价值捕获**：Agent 空投 token 给 PHA 持有者
- **以太坊 L2 迁移**（从 Polkadot 平行链迁出）
- **ZK + TEE 多证明**（与 Succinct Labs 合作）

### 可验证材料

| 类型 | 具体内容 |
|------|----------|
| 产品 | [Phala Cloud](https://phala.com)，Confidential GPU VM 已在运行 |
| 链上证据 | 813 个活跃 CVM，1.34B+ LLM tokens 日处理 |
| 开源 | [dstack](https://github.com/dstack) 已捐献给 Linux Foundation |
| 合规 | SOC 2 Type I + HIPAA |
| Agent 案例 | Spore.fun 自治发币 Agent、aiPool AI 预售 |
| 合作伙伴 | ai16z (ElizaOS)、NEAR、Vana、Sentient、Succinct Labs、Newton |
| 年度报告 | [Phala 2025 Report](https://phala.com/posts/phala-2025-report) |

### 我学到什么

1. **TEE 不是「更安全的服务器」，而是「即使我跑这个服务器我也看不到里面在干嘛」**。这解决了 AI × Web3 的一个根本悖论：AI 需要私钥才能操作，但 AI 的开发者不应该能偷私钥。TEE 把两者分开了。
2. **Spore.fun 是真正的自治 Agent Proof-of-Work**——不是 demo，是 Agent 自己在 Pump.fun 上发币、管理、运营。这类案例比白皮书有力得多。
3. **dstack 捐献给 Linux Foundation 是个聪明的开源策略**——不绑在自己的 token 上，降低开发者信任成本。

### 疑问

- TEE 硬件依赖 Intel 和 NVIDIA——如果芯片有后门或漏洞（比如前几年的 SGX 侧信道攻击），整个信任模型怎么应对？双证明方案能兜底吗？
- Spore.fun 的 Agent 如果做了恶意行为（比如发了 scam token），谁负责？「Agent 自治」的法律边界在哪？

---

## 对比与关联

| 维度 | Cobo CAW | Phala Network |
|------|----------|---------------|
| 核心问题 | Agent 拿什么签名？ | Agent 执行谁能验证？ |
| 方案 | MPC 分片签名 | TEE 加密执行 |
| 信任基础 | 数学（阈值签名） | 硬件（芯片级隔离） |
| Agent 自主权 | Pact 动态授权 | TEE 不可干预 |
| 反幻觉 | Recipe 预验证路径 | 不直接解决幻觉 |
| 可撤销 | 一键 kill switch | 取决于 Agent 设计 |
| 和我学的章节 | Agent Wallet, Web3 Tool Use | Verifiable AI, AI Security, Decentralized AI |

**共同点**：两个项目都在解决同一个问题——**如何在不给 Agent 无限权力的情况下，让 Agent 能做事**。Cobo 从签名层入手（怎么签），Phala 从执行层入手（在哪儿跑）。

**不同点**：Cobo 偏向「人始终有最终控制权」，Phala 偏向「Agent 可以真正自治，但可验证」。前者适合资产管理场景，后者适合开放 Agent 经济。

---

## 对我的意义

- **这两个项目分别覆盖了 Bridge 后半程的核心章节**：Cobo → Agent Wallet + Agent Identity；Phala → Verifiable AI + Decentralized AI + AI Security
- **它们的 Proof-of-Work 风格不同**：Cobo 靠 8 年安全记录 + $3.8T 托管量 + 已上线产品；Phala 靠开源代码 + 链上数据 + 已运行的自治 Agent 案例
- **判断一个 AI × Web3 项目是否靠谱的一个标准**：它是解决了「AI 和 Web3 真正交叉才会产生的困难问题」，还是只是把两个 buzzword 贴在一起
