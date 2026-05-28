# 今日文档总结：Agent 协作接口 + 信任与结算协议

> 2026-05-25
> 覆盖：MCP、A2A、x402、MPP、ERC-8004、ERC-8183
> 一句话：六份文档合在一起，画出了 AI Agent 经济的完整协议栈——从「怎么调用工具」到「怎么信你」到「怎么付钱」到「出事了谁判」。

---

## 一、两条线，六个协议

今天读的东西分两条线，分别回答 Agent 经济的两个根本问题：

```
线 1：Agent 怎么做事？
  ├── MCP  → Agent ↔ 工具（发现 + 调用）
  ├── A2A  → Agent ↔ Agent（通信 + 协作）
  └── Z.AI Web Search → 托管搜索（MCP 的替代/补充方案）

线 2：做事之后怎么结算？
  ├── x402      → 支付（HTTP 层即时付款）
  ├── MPP       → 支付（Session 微支付，Stripe 出品）
  ├── ERC-8004  → 身份 + 声誉（你是谁、可信吗）
  └── ERC-8183  → 交易 + 结算（Escrow + Evaluator + Arbiter）
```

---

## 二、线 1：Agent 怎么调用工具、怎么和其他 Agent 协作

### MCP（Model Context Protocol）

**本质**：Agent 的"USB 接口"——一个标准让任何 Agent 能发现和调用任何工具。

```
三种传输：

stdio                Streamable HTTP        SSE (废弃)
──────                ────────────────       ─────────
本地子进程             远程单端点              远程双端点
Claude Desktop 默认   Lambda/SaaS 首选        2025-03 被取代
免认证                OAuth 2.1              无标准认证
延迟最低              支持 session 恢复        不支持恢复
```

**Streamable HTTP 的关键设计**：
- 一个端点 `POST /mcp` 处理所有 JSON-RPC 请求
- `GET /mcp` 打开 SSE 流接收服务器推送
- `Mcp-Session-Id` 头管理会话
- `Last-Event-ID` 头实现断连续传
- OAuth 2.1：Client Credentials / JWT + PKCE / Dynamic Client Registration

**MCP 解决什么**：工具发现 + 调用标准化。不解决：Agent 身份、支付、交付验证。

### A2A（Agent-to-Agent）

**本质**：Agent 之间的通信协议。如果 MCP 是"Agent 怎么用工具"，A2A 是"Agent 怎么找另一个 Agent 帮忙"。

和 MCP 的分工：
- MCP：Agent → 工具（单向调用，工具是被动的）
- A2A：Agent ↔ Agent（双向协商，双方都有自主权）

A2A 的核心概念：Agent Card（声明能力）、Task（任务生命周期管理）、多轮协商。

### Z.AI Web Search

**本质**：托管搜索 API——不自己跑 MCP Server，直接调 `POST /api/paas/v4/web_search`。

两种用法：
- 独立 API：自己调、自己处理结果
- Chat Completion 内置 tool：模型自动决定何时搜索

和 MCP Web Search 的区别：Z.AI 是托管服务（零部署，用自己的索引），MCP 是协议（需要自己跑 Server，可以接 Google/Bing）。

---

## 三、线 2：做事之后怎么结算——四个协议的接力

把一次 Agent 交易拆成五个环节，四个协议各管一段：

```
环节:   身份        支付         托管&结算       仲裁
       ─────       ────         ────────       ────
问题:  "他是谁?"   "怎么付?"    "钱该给谁?"    "争议谁判?"

解决:  ERC-8004    x402/MPP     ERC-8183       ERC-8183
```

### ERC-8004：身份 + 声誉（"他可信吗？"）

三个注册表，每个是一个链上合约：

| 注册表 | 问题 | 怎么做到的 |
|--------|------|-----------|
| Identity Registry | 这个 Agent 是谁？ | ERC-721 NFT，每个 Agent 一个 token。IPFS 存 Profile JSON。`.well-known/agent-registration.json` 做域名验证。 |
| Reputation Registry | 他的过去可信吗？ | 每次任务结果上链 event。成功/失败/返工/评分——任何人都能从 event log 独立重算。 |
| Validation Registry | 这次推理可信吗？ | 可插拔验证方式：声誉聚合 / 加密经济 / zkML / TEE Oracle / 人工裁判。按任务价值选验证方式。 |

**关键洞察**：ERC-8004 是所有其他协议的前置条件。x402 付款前要查 ERC-8004 确认收款方身份。ERC-8183 的 Provider/Evaluator 都依赖 ERC-8004 的身份。结算完成后结果写入 ERC-8004 的 Reputation Registry。

### x402：HTTP 原生支付（"怎么付钱？"）

```
GET /api/data → HTTP 402 Payment Required (price=0.05 USDC, chain=8453)
POST /api/data + X-Payment: <tx_hash> → Facilitator 验到账 → 200 OK + 数据
```

**核心设计理念**：支付发生在 HTTP 层。不需要注册、不需要 API key、不需要账户。一件事只做一次往返。Facilitator 验证链上到账 + OFAC/KYT 合规。

**适用**：微支付（$0.01-$10），API 调用付费，按次解锁内容。

**不解决**：资金托管（先付款后交货，没有 escrow）、交付验证、争议仲裁、身份管理。

### MPP：Session 微支付（"怎么高频小额付？"）

```
Charge 模式：每笔请求一次链上结算
Session 模式：预授权 → 链下累积凭证 → 结账时一次性链上结算
               整个 Session 只需 2 笔链上交易
```

**MPP vs x402**：
- x402：每笔请求一次支付 → 适合低频调用
- MPP Session：100 次请求只需 2 笔链上交易 → 适合 LLM streaming token、高频计算
- MPP 兼容 x402，并扩展了多支付方式协商 + Session 机制
- MPP 有 Stripe/Visa/OpenAI/Anthropic 背书；x402 有 Coinbase/Linux Foundation 治理

### ERC-8183：链上交易引擎（"钱该给谁？出事了谁判？"）

```
Job 三角色:
  Client    — 下单 + 锁定资金
  Provider  — 执行 + 交付
  Evaluator — 判定通过/不通过

四状态:
  Open → Funded → Submitted → Terminal (complete / reject / timeout)

争议:
  Provider 质押押金 → Arbiter (3/5 多签) → 投票裁决
```

**核心设计理念**：交易不是"打钱→拿货"，而是"约定→执行→判定→结算"。Client/Provider/Evaluator 三权分离——和传统电商"平台说了算"不同。

---

## 四、全部拼在一起：Agent 经济的完整协议栈

```
┌─────────────────────────────────────────────────────────┐
│                     用户 / 另一个 Agent                    │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │  ERC-8004   │ │  A2A     │ │   MCP        │
    │  身份+声誉   │ │ Agent通信 │ │  工具调用     │
    │             │ │          │ │              │
    │ • 你是谁？   │ │ • 协商    │ │ • 发现工具    │
    │ • 可信吗？   │ │ • 委托    │ │ • 调用工具    │
    │ • 做过什么？ │ │ • 协作    │ │ • 流式响应    │
    └──────┬──────┘ └──────────┘ └──────────────┘
           │
           │ 身份验证通过后 → 进入交易
           │
           ▼
    ┌──────────────────────────────────────────────┐
    │              交易层                            │
    │                                              │
    │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
    │  │  x402    │  │   MPP    │  │  ERC-8183   │  │
    │  │ HTTP支付  │  │Session支付│  │ Escrow结算  │  │
    │  │          │  │          │  │             │  │
    │  │ 即时付款  │  │ 微支付    │  │ 托管+验收   │  │
    │  │ 无托管   │  │ 高频场景  │  │ +争议仲裁   │  │
    │  └──────────┘  └──────────┘  └──────┬─────┘  │
    │                                      │        │
    └──────────────────────────────────────┼────────┘
                                           │
                                           │ 结算完成
                                           ▼
                                ┌──────────────────┐
                                │  ERC-8004        │
                                │  Reputation      │
                                │  Registry        │
                                │                  │
                                │  更新声誉数据     │
                                │  → 闭环          │
                                └──────────────────┘
```

---

## 五、怎样选择用哪个协议

```
场景 1: 我要让 Agent 调用一个外部 API
  → MCP（工具发现 + 调用标准化）
  → 或者 Z.AI Web Search（托管搜索，零部署）

场景 2: 我要让两个 Agent 协作完成一个任务
  → A2A（Agent 间通信 + 任务委托）

场景 3: Agent 调用付费 API，每次 $0.05
  → x402（HTTP 402 即时付款，2 秒结算）

场景 4: Agent 做 LLM 流式推理，按 token 计费，一秒几十次
  → MPP Session（预授权 + 链下累积 + 一次链上结算）

场景 5: Agent 接一个 $50 的研究报告任务，需要 2 小时完成
  → ERC-8183（Escrow 锁定资金 + Evaluator 验收 + Arbiter 兜底）

场景 6: 想确认对面这个 Agent 不是骗子
  → ERC-8004 Identity Registry（链上查身份 + IPFS Profile + .well-known 验证）
  → ERC-8004 Reputation Registry（查历史任务成功率、争议率）

场景 7: 以上全部
  → ERC-8004 查身份 → A2A 协商任务 → ERC-8183 锁定资金 → Agent 通过 MCP 调工具
  → 交付 → Evaluator 判定 → x402/MPP 处理支付细节 → ERC-8004 更新声誉
```

---

## 六、六个协议的一句总结

| 协议 | 一句话 |
|------|--------|
| **MCP** | Agent 和工具之间的 USB 接口——发现工具、调用工具、流式返回 |
| **A2A** | Agent 和 Agent 之间的通信协议——协商、委托、协作 |
| **x402** | HTTP 层的即时稳定币支付——付钱、验到账、拿资源，一次往返 |
| **MPP** | Session 微支付——预授权后链下累积，session 结束一次结算 |
| **ERC-8004** | Agent 的身份 + 声誉基础设施——你是谁、做过什么、可信吗 |
| **ERC-8183** | Agent 之间的交易引擎——Escrow 托管、Evaluator 验收、Arbiter 仲裁 |

---

## 七、今天学到的核心认知

1. **Agent 经济的协议栈已经成型了**——不是某个公司在推一套全家桶，而是六个独立协议各管一段，通过标准接口拼在一起。这和互联网的 TCP/IP → HTTP → TLS → OAuth 分层逻辑一样。

2. **身份是最底层的基础设施**——ERC-8004 的 Identity Registry 是所有其他协议的前置条件。x402 付款、ERC-8183 结算、MCP 工具调用——都需要先确认"对面是谁"。

3. **支付有两个分支**：x402 做即时小额支付（HTTP 层），MPP 做高频微支付（Session 机制），ERC-8183 做异步大额结算（Escrow 层）。三者不是竞争——是金额 × 频率 × 时间差的矩阵里各占一个角落。

4. **声誉是闭环的最后一步**——ERC-8183 结算 → 结果写入 ERC-8004 Reputation → 下一位 Client 做决策 → 闭环。没有这个闭环，Agent 经济就是一次性博弈（骗一次就跑，换个身份再来）。
