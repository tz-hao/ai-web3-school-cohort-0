# EIP-8004：Trustless Agents 摘要

> 来源：https://eips.ethereum.org/EIPS/eip-8004
> 状态：Draft · Standards Track: ERC
> 创建：2025-08-13
> 作者：Marco De Rossi (MetaMask)、Davide Crapis (Ethereum Foundation)、Jordan Ellis (Google)、Erik Reppel (Coinbase)

---

## 一句话

**让任何人在链上发现 Agent、验证 Agent、信任 Agent——不需要预先建立关系。** 这是 AI Agent 经济的身份和声誉基础设施标准。

---

## 三个核心注册表

```
Identity Registry      →  这个 Agent 是谁？
Reputation Registry    →  这个 Agent 过去表现怎么样？
Validation Registry    →  这个 Agent 的这次推理可信吗？
```

三个合约可以部署在任何 L2 或主网上，作为每条链的单例。

---

## 重点 1：Identity Registry（身份注册表）

**基于 ERC-721**，每个 Agent 就是一个 NFT。这意味着：
- Agent 身份可以用任何 NFT 钱包/浏览器查看
- Agent 所有权可以转移（`transferFrom`）
- 每个 Agent 有全局唯一 ID：`eip155:1:0xRegistry...` + `tokenId`

**Agent Registration File**（存 IPFS / HTTPS / 链上）：

```json
{
  "name": "myAgent",
  "description": "这个 Agent 做什么、怎么交互、价格多少",
  "services": [
    {"name": "A2A", "endpoint": "https://agent.eth/.well-known/agent-card.json"},
    {"name": "MCP", "endpoint": "https://mcp.agent.eth/"},
    {"name": "ENS",  "endpoint": "vitalik.eth"},
    {"name": "DID",  "endpoint": "did:method:foobar"},
    {"name": "email","endpoint": "mail@myagent.com"}
  ],
  "supportedTrust": ["reputation", "crypto-economic", "tee-attestation"]
}
```

**和我们的 Agent Profile 设计高度一致**——多服务端点、IPFS 存 profile、`supportedTrust` 声明。区别在于 EIP-8004 把它标准化了。

---

## 重点 2：Endpoint 域名验证

Agent 声明了自己的 endpoint，但怎么证明 endpoint 真的属于它？

```
Agent 在 https://{domain}/.well-known/agent-registration.json
发布一份包含 registrations 列表的文件

用户对比：
  链上 agentRegistry + agentId ↔ .well-known 文件中的 registry + id
  匹配 → 域名验证通过
```

**这和我们的 `.well-known/agent-proof` 三重验证设计思路一致。**

---

## 重点 3：Agent Wallet 验证

Agent 的收款地址不能随便设。改 wallet 需要：

- **EOA**：EIP-712 签名证明私钥控制权
- **合约钱包（Safe 等）**：ERC-1271 签名验证

Agent 被转移（NFT transfer）→ `agentWallet` 自动清空 → 新 owner 必须重新验证。

**这个设计很聪明**：换 owner = 旧 wallet 自动失效 = 钱不会打错。

---

## 重点 4：Reputation Registry（声誉注册表）

标准接口用于提交和查询反馈信号：

- **链上**：评分和汇总可以链上算（可组合，其他合约可读）
- **链下**：复杂算法（机器学习排序、反作弊）在链下跑

设计理念：不规定怎么算分，只规定怎么记录分。**和我们声誉系统设计的「原始数据上链 + 聚合算法可替换」一致。**

---

## 重点 5：Validation Registry（验证注册表）

通用钩子，支持四种验证方式：

| 方式 | 怎么验证 | 安全级别 |
|------|---------|----------|
| 声誉 | 历史反馈聚合 | 低（适合小额任务） |
| 加密经济 | 质押 + 重新执行 + 罚没 | 中高 |
| zkML | 零知识证明推理正确 | 高（技术前沿） |
| TEE Oracle | 硬件远程证明 | 高 |
| 人工裁判 | 争议时人介入 | 兜底 |

**信任模型可插拔**——开发者按任务价值选验证方式。点披萨用声誉，医疗诊断用 zkML。

---

## 重点 6：协议层级关系

EIP-8004 明确定位：

```
MCP（模型-工具协议）     → Agent 能提供什么能力
A2A（Agent-to-Agent）   → Agent 之间怎么通信和协作
EIP-8004               → 怎么发现 Agent 并信任它们
x402                   → Agent 怎么支付（可选集成）
```

四层独立。EIP-8004 只做发现和信任，不做通信和支付。

---

## 和我们的设计对比

| 我们的设计 | EIP-8004 对应 |
|-----------|--------------|
| Agent Profile（IPFS + 链上注册） | Identity Registry + Registration File |
| `.well-known/agent-proof` 验证 | `.well-known/agent-registration.json` |
| Agent Wallet（Session Key + 智能账户） | `setAgentWallet()` + EIP-712/1271 验证 |
| 声誉系统（链上 event + 聚合） | Reputation Registry |
| AI Oracle（挑战窗口 + 仲裁） | Validation Registry（四种模式可选） |
| Service Registry | Identity Registry 的 `services` 列表 |

**我们的设计和 EIP-8004 思路一致，但它是标准——这意味着未来不同 Agent 之间可以互操作。**

---

## 为什么这个 EIP 重要

1. **作者阵容**：MetaMask + EF + Google + Coinbase → 大概率会成为行业标准
2. **时机**：2025-08 提出，正好是 Agent 经济从概念到落地的转折点
3. **不重不轻**：只定义身份+声誉+验证，不碰通信和支付 → 和其他协议互补不冲突
4. **直接和我们学的一切相关**：Agent Identity、Trust & Reputation、AI Oracle、Agent Wallet——全在这个标准里
