# Agent 帮人完成任务并收款：最小支付/商业流程设计

> AI × Web3 School · Week 2 Module B
> 场景：用户下单让 Agent 研究一份 DeFi 协议风险报告，Agent 完成、验收、收款——全程链上约束
> 覆盖：报价 → 预算授权 → 执行 → 交付 → 验收 → 付款/退款/争议 → 记录证明

---

## 一、场景设定

```
用户 Alice 想要一份 Uniswap V4 的风险评估报告。
她不想自己花 3 小时查文档、审计报告、社区讨论。
她在链上 Agent Marketplace 找到 ChainLens Agent（声誉 94/100，40 次任务无争议）。

Alice 下单 → ChainLens 接单 → 生成报告 → 验收 → 收款。
全程 Alice 只做两件事：确认报价 + 最终查看报告。
```

---

## 二、角色定义

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client     │     │    Provider       │     │   Evaluator     │
│   (Alice)    │     │  (ChainLens Agent) │     │  (AI Oracle)    │
│              │     │                   │     │                  │
│ 下单 + 付款   │     │ 接单 + 执行 + 交付  │     │ 验收 + 判定       │
│ 最终确认      │     │                   │     │                  │
└──────┬───────┘     └────────┬──────────┘     └────────┬─────────┘
       │                      │                          │
       │         ┌────────────┴────────────┐             │
       │         │    Escrow 合约 (链上)     │             │
       │         │                         │             │
       │         │  资金锁定 → 验收通过 → 释放 │             │
       │         │  超时 → 退款              │             │
       │         │  争议 → Arbiter 介入      │             │
       │         └─────────────────────────┘             │
       │                                                 │
       └──────────────┬──────────────────────────────────┘
                      │
             ┌────────┴────────┐
             │    Arbiter      │
             │  (3/5 多签)      │
             │                 │
             │ 争议最终裁决      │
             └─────────────────┘
```

---

## 三、完整流程：7 个阶段

### Phase 1：报价

```
Alice 在 Marketplace 看到 ChainLens 的报价：

┌─────────────────────────────────────────────┐
│ ChainLens Agent                             │
│ ✅ 身份验证: ERC-8004 Identity Registry      │
│ 📊 声誉: 94/100 (40 次任务, 0 争议)          │
│                                             │
│ 服务: DeFi 协议风险评估报告                    │
│ 价格: 3 USDC                                │
│ 交付: IPFS JSON + Markdown                   │
│ 交付时间: 10 分钟                             │
│ 验收标准:                                     │
│   ✅ 覆盖 6 个必需章节                         │
│   ✅ AI Oracle 质量分 ≥ 3/5                   │
│   ✅ 含来源引用                                │
│                                             │
│ [下单]                                       │
└─────────────────────────────────────────────┘

报价包含:
  • service_name: "defi_risk_report"
  • price: 3.0 USDC
  • token: USDC (Base, 0x833589fC...)
  • provider: agent_0xChainLens...
  • deadline: 600 秒
  • acceptance_criteria: 6 个必需字段 + min_score 3
  • quote_signature: 0xChainLens_sig... (Provider 对报价的 EIP-712 签名)
```

**谁来验证报价的真实性？** ERC-8004 Identity Registry 提供 Provider 的公钥 → 验签 → `quote_signature` 有效 → 报价确实来自 ChainLens，不是别人冒充。

---

### Phase 2：预算授权

```
Alice 确认后，链上执行:

1. Alice 的智能账户调用 Escrow 合约:

   Escrow.createJob({
     client: 0xAlice_SmartAccount...,
     provider: 0xChainLens_Agent...,
     evaluator: 0xAIOracle_Node...,
     arbiter: [0xArb1, 0xArb2, 0xArb3, 0xArb4, 0xArb5],  // 3/5 多签
     arbiterThreshold: 3,
     token: 0xUSDC_Base...,
     amount: 3_000_000,          // 3 USDC = 3,000,000 units (6 decimals)
     deadline: now + 600,        // 10 分钟
     requirement: {
       fields: ["protocol_name", "contract_address", "audit_status",
                "privileged_functions", "risk_score", "recommendations"],
       min_score: 3,
       min_words_per_section: 50,
       require_citations: true,
       output_format: "json"
     },
     requirementHash: keccak256(abi.encode(requirement))
   })

2. 合约内部:
   ✅ USDC.transferFrom(Alice, Escrow, 3_000_000) → 资金已锁定
   ✅ 事件: JobCreated(jobId, client, provider, evaluator, amount, deadline)

   ┌──────────────────────────────────┐
   │ 此刻：3 USDC 在 Escrow 合约里     │
   │ Alice 不能取回                    │
   │ ChainLens 不能拿走                │
   │ 只有 Evaluator 判定通过后释放      │
   │ 或 deadline 超时后退款            │
   └──────────────────────────────────┘
```

**关键设计选择**：资金先锁进合约，不是 Alice 直接打给 ChainLens。这和买东西时"先付款等发货"不同——Escrow 是裁判，钱在裁判手里，双方都要靠表现来拿。

---

### Phase 3：执行

```
ChainLens Agent 监控到 JobCreated 事件 → 自动开始工作:

1. 从 event log 获取完整 requirement（链上只存 hash，完整 JSON 在 event 的 data 字段）
2. 查 Uniswap V4 文档/审计/GitHub/社区 → 收集信息
3. 生成报告:

   {
     "protocol_name": "Uniswap V4",
     "contract_address": "0xUniswapV4...",
     "audit_status": "audited_2025 (3 firms)",
     "privileged_functions": ["governance_upgrade", "fee_parameter_update", "emergency_pause"],
     "risk_score": 3,
     "risk_factors": [
       "hook_contract_risk: 自定义 hook 可能引入未审计逻辑",
       "governance_concentration: 3/5 多签控制升级",
       "fee_parameter_centralization: 费率可由治理单方调整"
     ],
     "recommendations": [
       "使用 hook 前验证合约源码 + 审计状态",
       "监控治理多签的签名活动",
       "大额 LP 考虑分散到多个池子"
     ],
     "citations": [
       "https://github.com/Uniswap/v4-core/audits/2025-01.pdf",
       "https://docs.uniswap.org/contracts/v4/overview",
       "https://gov.uniswap.org/t/v4-governance-parameters/..."
     ],
     "generated_at": "2026-05-25T10:08:00Z",
     "generator": "ChainLens v1.2.0"
   }

4. 上传到 IPFS → CID: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
5. 调用 Escrow 合约提交:

   Escrow.submitDelivery(jobId, ipfsCid, contentHash)

   ✅ 事件: DeliverySubmitted(jobId, ipfsCid, contentHash, timestamp)
   ✅ 状态: FUNDED → SUBMITTED
```

**Agent 怎么保证自己不瞎编？** 这就是为什么报告中每个风险点都有 `citations`——来源可追溯。验收阶段 Evaluator 会检查引用是否真实存在。

---

### Phase 4：交付确认

```
DeliverySubmitted 事件触发后:

1. AI Oracle Node 从 IPFS 取回报告内容 (CID: bafy...)
2. 对比 requirement:
   ✅ protocol_name 存在 → 通过
   ✅ contract_address 格式正确 (0x+40hex) → 通过
   ✅ audit_status 存在 + 引用了 3 家审计 → 通过
   ✅ privileged_functions 非空数组 → 通过
   ✅ risk_score 在 1-10 范围 → 通过
   ✅ recommendations 非空 + 每条可操作 → 通过
   ✅ citations 含可访问 URL → 通过
3. 调用 LLM 做质量评估:
   - 分析是否有逻辑漏洞
   - 风险因素是否有遗漏
   - 评分: 4/5 (扣分: 未讨论 Hooks 的 gas 限制风险)
4. 生成 Oracle 判定:

   {
     accepted: true,
     score: 4,
     reason: "覆盖全部 6 个必需章节。风险分析合理，引用可追溯。扣分：未讨论 Hook 的 gas 限制。总体满足质量要求。"
   }

5. 在 TEE 内对判定签名 → 上链
```

---

### Phase 5：验收 & 结算

```
AI Oracle 调用 Escrow 合约:

Escrow.evaluate(jobId, accepted=True, score=4, evidence=oracleSignature)

合约检查:
  ✅ 调用者是 job 中指定的 evaluator 地址
  ✅ accepted = true + score (4) ≥ min_score (3)
  ✅ 当前时间 < deadline

→ 自动释放资金:

  USDC.transfer(0xChainLens_Agent_wallet..., 3_000_000)

  事件: JobCompleted(jobId, evaluator, score, paymentReleased)

  ┌──────────────────────────────────────────┐
  │ 此刻：                                    │
  │ ✅ ChainLens 收到 3 USDC                  │
  │ ✅ Alice 拿到报告 IPFS CID                │
  │ ✅ Oracle 判定 + 签名 存链上可查           │
  │ ✅ 全程 Alice 只点了两下：确认报价 + 看报告  │
  └──────────────────────────────────────────┘
```

---

### Phase 5b：超时退款

```
如果 deadline 已过，submitDelivery() 从未被调用:

  任何人可以调用: Escrow.timeout(jobId)

  合约检查:
    ✅ block.timestamp > deadline
    ✅ 当前状态 = FUNDED (未交付)

  → USDC.transfer(0xAlice_SmartAccount..., 3_000_000)

  事件: JobRefunded(jobId, reason: "timeout")

为什么"任何人"都能触发退款？
→ 不让 Alice 或 ChainLens 单方面控制退款。
→ deadline 是公开链上时间戳，超时 = 客观事实。
→ 让任何人触发确保退款不会因为 Alice 不在线而卡住。
```

---

### Phase 5c：争议处理

```
如果 AI Oracle 判定 rejected，但 ChainLens 认为误判:

1. ChainLens 质押争议押金 = 任务费的 50% = 1.5 USDC
2. 调用: Escrow.raiseDispute(jobId, evidence, challengeDeposit)

   状态: SUBMITTED → DISPUTED

3. 5 个 Arbiter 各自审查:
   - 阅读 requirement
   - 从 IPFS 取回报告
   - 重新执行 Oracle 的检查逻辑
   - 各自投票: uphold_evaluator | overturn_evaluator

4. 如果 3/5 投票推翻 Oracle:
   → USDC.transfer(ChainLens, 3_000_000)         // 付款
   → USDC.transfer(ChainLens, 1_500_000)          // 退还押金
   → Oracle 节点保证金扣除 10% → 赔给 ChainLens
   → 本条 Oracle 记录标记 overturned = true

5. 如果 3/5 投票维持 Oracle:
   → USDC.transfer(Alice, 3_000_000)              // 退款
   → 争议押金 1.5 USDC 罚没
   → ChainLens 声誉扣分

  事件: JobDisputeResolved(jobId, result, arbiterVotes)
```

---

### Phase 6：记录证明 —— 声誉闭环

```
每次任务完成（无论成功/失败/争议），Escrow 合约自动调用:

ReputationRegistry.recordTask({
  jobId: "job_0x...",
  provider: agent_0xChainLens...,
  client: 0xAlice...,
  taskType: "defi_risk_report",
  requirementHash: 0xreq...,
  deliveryCid: "bafy...",       // null if timeout
  paymentAmount: 3_000_000,
  evaluatorScore: 4,
  accepted: true,
  disputed: false,
  overturned: false
})

链上事件:
  TaskRecorded(jobId, provider, client, taskType, accepted, score, timestamp)

任何人都能通过 event log 聚合 ChainLens 的声誉:
  总任务:      41 (之前 40 + 本次 1)
  成功率:      95.1% (39/41)
  平均分:      4.2/5
  争议率:      0%
  平均交付:    8.2 分钟 (准时率 100%)

这条声誉记录:
  ✅ 不可篡改 (在链上)
  ✅ 可独立验算 (任何人都能从 event log 重算)
  ✅ 和 ERC-8004 Reputation Registry 标准兼容
  ✅ 作为未来 Client 选择 Agent 时的决策输入
```

---

## 四、完整状态机

```
                    createJob(requirement, payment)
    IDLE ─────────────────────────────────────────→ FUNDED
                                                       │
                              submitDelivery(cid, hash) │          timeout()
                                                       ↓             ↓
                                                   SUBMITTED ────→ REFUNDED
                                                       │
                          evaluate(accepted, score)     │
                              ↓              ↓          │
                          SETTLED ←    evaluate(       │
                          (付款)       rejected)        │
                                          │             │
                                    raiseDispute()       │
                                          ↓             │
                                      DISPUTED ────────→│
                                          │
                               arbitrate(3/5 votes)
                              ↓                    ↓
                          SETTLED              REFUNDED
                     (推翻 Oracle)          (维持 Oracle)
```

---

## 五、x402 vs ERC-8183：各自解决哪一段

```
一个完整的 Agent 支付/商业流程，按时间线拆成五段：

  支付段          验证段          身份段          结算段          仲裁段
  ──────         ──────         ──────         ──────         ──────
  "怎么付钱"      "钱到哪了"     "对方是谁"      "谁该拿钱"     "争议谁判"
```

### x402（Coinbase / Linux Foundation）

**x402 解决：支付段 + 验证段**

```
Client (Agent/App)
  │
  │ GET /api/v1/data ────────────────→  Resource Server
  │ ←── HTTP 402 Payment Required      │
  │     X-Payment-Info:                 │
  │       price=0.05 USDC               │
  │       chain=eip155:8453             │
  │       recipient=0xServer...
  │
  │ POST /api/v1/data ───────────────→
  │ X-Payment: <signed_tx_hash>        │
  │                                     │
  │                           Facilitator 验证:
  │                             ✅ tx 已上链
  │                             ✅ 金额正确
  │                             ✅ 收款方正确
  │                             ✅ OFAC/KYT 合规
  │
  │ ←── 200 OK + 数据                   │
```

**x402 的核心设计理念**：支付发生在 HTTP 层——不需要注册、不需要 API key、不需要账户。Client 把钱打过去，Facilitator 验证到账，Server 返回资源。**一件事只做一次 HTTP 往返。**

适用场景：
- API 调用付费（Agent 调用付费推理 API）
- 按次计费内容（解锁一篇文章 0.01 USDC）
- Agent 之间的微支付（Agent A 买 Agent B 的数据）

**x402 不解决什么**：
- ❌ 不托管资金（先付款后交货，没有 escrow）
- ❌ 不验证交付质量（只验证付款到账）
- ❌ 不处理争议（没有仲裁机制）
- ❌ 不管理身份（Facilitator 验的是交易，不是 Agent 身份）

一句话：**x402 = HTTP 原生支付层。你付钱，我验到账，你拿资源。如果对方收了钱不给资源——x402 管不了。**

---

### ERC-8183（Ethereum Foundation dAI + Virtuals Protocol）

**ERC-8183 解决：结算段 + 仲裁段 + 身份段（间接）**

```
Client ──→ createJob(requirement, 3 USDC lock)
               │
               │  资金锁在 Escrow 合约（不是打给对方）
               │
Provider ←── JobCreated(jobId)
               │
               │  执行任务...
               │
Provider ──→ submitDelivery(jobId, ipfsCid)
               │
Evaluator ←── DeliverySubmitted
               │
               │  结构检查 + 质量评估
               │
Evaluator ──→ complete(jobId)    → 3 USDC → Provider ✅
          ──→ reject(jobId)      → 3 USDC → Client   ❌
          ──→ (timeout)          → 3 USDC → Client   ⏰
               │
(如有争议):
Provider ──→ raiseDispute(evidence, deposit)
Arbiter  ──→ vote → 3/5 majority decides
               │
               │  → 付款 or 退款
               │  → 声誉记录更新
```

**ERC-8183 的核心设计理念**：交易不是"打钱→拿货"，而是"约定→执行→判定→结算"。Job 的三个角色（Client/Provider/Evaluator）分离了提案权、执行权和判定权——和传统电商"平台说了算"不同，Evaluator 是独立第三方。

适用场景：
- Agent 接任务（研究报告、代码审计、内容创作）
- 异步交付（付款和交付有 10 分钟到几天的时间差）
- 需要判定质量的场景（不是给钱就行，要做得好才给钱）

**ERC-8183 不解决什么**：
- ❌ 不解决 HTTP 层支付（创建 Job 时怎么转 USDC 到 Escrow——那是 x402 或钱包的事）
- ❌ 不发布 Agent 身份（Provider/Evaluator 是地址，不是身份——那是 ERC-8004 的事）
- ❌ 不定义 Evaluator 怎么判定（Evaluator 只是一个地址——是 AI、是合约、是多签，自己决定）

一句话：**ERC-8183 = 链上交易引擎。你约定、我锁钱、他判定、自动结算。如果判定有问题——进仲裁。**

---

### 对比表

| 维度 | x402 | ERC-8183 |
|------|------|----------|
| **解决哪段** | 支付 + 验证 | 结算 + 仲裁 |
| **资金流动** | Client → Provider（即时） | Client → Escrow → Provider（需判定） |
| **交付验证** | 无（付钱 = 相信会给） | 有（Evaluator 判定后才放款） |
| **争议机制** | 无 | 有（3/5 多签 Arbiter） |
| **时间线** | 同步（2 秒） | 异步（分钟到天） |
| **适用金额** | 微支付（$0.01-$10） | 中高金额（$1-$1000+） |
| **协议层** | HTTP 层 | 合约层 |
| **典型场景** | API 调用、按次解锁 | 任务外包、内容交付、异步服务 |
| **身份依赖** | 无（地址即身份） | 依赖 ERC-8004 提供身份 |
| **与 ERC-8004 的关系** | 互补（身份 + 支付分离） | 继承（结算完成后更新声誉） |
| **推出时间** | 2025-05（Coinbase） | 2026-03（EF + Virtuals） |
| **治理** | Linux Foundation | Ethereum EIP 流程 |

---

### 它们怎么拼在一起

```
实际场景中，三个标准形成调用链：

Alice 在 Marketplace 找到 ChainLens
  │
  │ ERC-8004 Identity Registry:
  │   → ChainLens 是谁？可信吗？声誉 94/100？
  │   → ✅ 身份验证通过
  │
  ├──→ 确认报价，创建 Job
  │
  │ ERC-8183 Escrow:
  │   → 3 USDC 锁进合约
  │   → ChainLens 接单、交付
  │   → AI Oracle 判定
  │   → 自动结算：付款 or 退款
  │
  │ (如果 Alice 的智能账户需要付 USDC 到 Escrow)
  │ x402:
  │   → HTTP 402 → 签名 → Facilitator 验证 → USDC 到账
  │
  └──→ 任务完成
      │
      ERC-8183 → ERC-8004 Reputation Registry:
        → 记录本次任务结果
        → ChainLens 声誉: 94 → 95
        → 下一位 Client 受益
```

**三个标准的分工**：

```
ERC-8004:  "他是谁？他可信吗？"  → Identity + Reputation
x402:      "怎么付钱？"          → HTTP Payment
ERC-8183:  "钱该给谁？"          → Escrow + Settlement + Arbitration
```

**不是竞争关系——是上下游关系。** ERC-8004 告诉你该不该下单，x402 帮你完成支付动作，ERC-8183 保证交付和收款公平执行。

---

## 六、这个设计的关键取舍

1. **Escrow 不是免费的**——每次锁资金都有 gas 成本（≈ $0.02-0.05）。对于 0.10 USDC 的微任务不划算——那种场景用 x402 直接付更合适。本设计的阈值大概是任务费 ≥ $1 时值得走 Escrow。

2. **Evaluator 是单点信任**——AI Oracle 节点可能误判。24h 挑战窗口 + 5 人多签 Arbiter 是兜底，但增加了时间成本和复杂度。对于确定性任务（字段检查），Evaluator 直接写成纯合约即可消除这个单点。

3. **声誉不是免费的**——每次任务上链一笔 `TaskRecorded` event 有 gas 成本。高频低价任务可能选择批量上链（10 条合并 1 条）来降低声誉记录成本。

4. **身份和支付是分离的**——ERC-8004 告诉你 ChainLens 是 ChainLens，x402 帮你付钱。但如果攻击者注册了一个看起来很像的 agent_id（ChainLens vs ChainIens），ERC-8004 的身份验证也救不了——这需要用户端做 visual identity（ENS 域名、已验证徽章等）。

---

## ⚠️ AI 声明

本设计由 AI 辅助生成。AI 做了：流程设计、角色定义、状态机、协议对比分析。以下需要人工验证：
- Escrow 合约的 `requirementHash` 编码是否和 Evaluator 的解码逻辑一致
- AI Oracle 的 TEE 环境是否能远程证明（依赖 Phala 或等价的 TEE 基础设施）
- 3/5 Arbiter 是否具备足够的领域知识来裁决「风险报告是否合格」
- x402 Facilitator 的合规要求（KYT/OFAC）在实际部署中的延迟影响
