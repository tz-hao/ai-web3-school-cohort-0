# Agent 付费生成报告的 Escrow 流程

> AI × Web3 School · Settlement & Escrow 实践  
> 核心命题：付款和交付有时间差时，如何不用信任、不用中介完成结算

---

## 场景

用户让 Agent 找服务方生成一份链上调研报告。付款和交付之间有 10 分钟时间差——不能先付款等对方自觉交付，也不能先拿报告再付款。**Escrow（托管结算）**解决这个异步信任问题。

---

## 角色

| 角色 | 身份 | 做什么 |
|------|------|--------|
| **Payer** | 用户（EOA） | 锁定资金、确认结果 |
| **Payee** | 报告服务方 | 生成报告、提交证明 |
| **Evaluator** | 独立检查合约 | 验证报告是否含指定字段 |
| **Arbiter** | 3 人多签 | 争议时仲裁（2/3 阈值） |
| **Escrow** | 智能合约 | 资金托管 + 超时退款 + 自动结算 |

---

## 状态机

```
        lockFunds()
  IDLE ─────────────────→ FUNDED
                            │
              submitReport()│        timeout()
                            ↓          ↓
                        SUBMITTED ──→ REFUNDED
                            │
           evaluate(✅)     │  evaluate(❌)
              ↓             ↓
          SETTLED       DISPUTED
                            │
                   arbitrate(✅/❌)
                       ↓        ↓
                   SETTLED  REFUNDED
```

**核心规则**：资金只有在 `SETTLED` 状态才能释放给 Payee，只有 `REFUNDED` 状态才能退回 Payer。

---

## 完整流程：8 步

### Step 1 · 用户锁定资金（🛑 人 + ⛓️ 链）

用户调用 Escrow 合约：

```
Escrow.lockFunds({
    payer: 0xUser...,
    payee: 0xServiceProvider...,
    evaluator: 0xEvaluatorContract...,
    arbiter: [0xArbiter1, 0xArbiter2, 0xArbiter3],  // 3 人多签
    arbiterThreshold: 2,
    amount: 2_000_000,        // 2 USDC = 2,000,000 units
    token: 0xUSDC...,
    deadline: now + 600,      // 10 分钟
    requirement: {            // 报告必须包含的字段
        "fields": ["protocol_name", "contract_address", "audit_status", "risk_score", "summary"],
        "min_words": 200
    },
    requirementHash: keccak256(requirement)  // 链上存 hash，完整字段放 event
})

事件: FundsLocked(payer, payee, amount, deadline, requirementHash)
状态: IDLE → FUNDED
```

**Requirement 为什么存 hash**：完整 JSON 可能很大，存 hash 即可。Evaluator 读取 event log 中的完整 requirement 执行检查。hash 保证 requirement 未被篡改。

---

### Step 2 · 服务方被通知（🤖 Agent）

Agent 监控 `FundsLocked` 事件，通知服务方：

```
Agent → Payee: "新任务：需求 hash=0xreq...，金额 2 USDC，截止 10 分钟"
```

---

### Step 3 · 服务方生成报告并提交证明（⛓️+👤）

服务方完成后：

```
1. 生成报告 JSON：
   {
     "protocol_name": "Uniswap V3",
     "contract_address": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
     "audit_status": "audited_2024",
     "risk_score": 2,
     "summary": "Uniswap V3 是以太坊上最成熟的 DEX...",
     "generated_at": "2026-05-23T14:10:00Z"
   }

2. 上传到 IPFS → 得到 CID：
   ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

3. 调用 Escrow 合约：
   Escrow.submitReport({
       contentHash: "0x..."  // keccak256(报告内容) 或 IPFS CID
   })

事件: ReportSubmitted(contentHash)
状态: FUNDED → SUBMITTED
```

**为什么用 IPFS**：CID 是内容寻址——同一个报告内容永远同一个 CID。Evaluator 通过 CID 取回报告内容，不需要信任服务方「给了什么文件」。

---

### Step 4 · Evaluator 自动检查报告（⛓️+🤖 自动）

Evaluator 合约（或链下 Agent + 链上验证）检查报告：

```
Evaluator 执行：

1. 从 IPFS 拉取报告（通过 CID）
2. 解析 JSON
3. 逐项检查：

   ✅ protocol_name 存在且非空
   ✅ contract_address 符合 0x+40hex 格式
   ✅ audit_status 存在
   ✅ risk_score 是数字且在 1-10 范围
   ✅ summary 存在且字数 ≥ 200
   ✅ 所有字段值匹配 requirement 中定义的类型

4. 调用 Escrow 合约：
   Escrow.evaluate(通过, 评估证据)
```

**Evaluator 是确定性的**：不检查「报告是不是写得好」，只检查「报告有没有包含要求的字段」。主观质量由用户在 Step 6 人工确认。

---

### Step 5 · 自动结算（⛓️ 自动）

```
如果 evaluate() = 通过：

   Escrow 合约自动释放 2 USDC → Payee 地址
   事件: FundsReleased(payee, amount, contentHash)

   状态: SUBMITTED → SETTLED
```

---

### Step 5b · 超时退款（⛓️ 自动）

```
如果 deadline 已过，submitReport() 从未被调用：

   任何人可以调用 Escrow.timeout()
   合约检查 block.timestamp > deadline
   2 USDC 退回 Payer 地址

   事件: FundsRefunded(payer, amount, reason: "timeout")
   状态: FUNDED → REFUNDED
```

**谁都能调用 timeout()**：这是故意的。不让 Payer 或 Payee 单方面控制退款——deadline 是公开时间戳，超时即公共事实。

---

### Step 5c · 争议仲裁（🛑 人）

```
如果 evaluate() 返回「不通过」，且 Payee 不服：
  
  Payee 调用 Escrow.raiseDispute(理由, 证据)
  状态: SUBMITTED → DISPUTED

  3 个 Arbiter 各自审查：
  - 查看 requirement
  - 从 IPFS 取回报告
  - 重新执行 Evaluator 的检查逻辑

  如果 2/3 Arbiter 认为报告合格：
    Escrow.arbitrate(通过)
    → SETTLED

  如果 2/3 Arbiter 认为不合格：
    Escrow.arbitrate(不通过)
    → REFUNDED

  如果 Arbiter 在 24h 内不投票：
    默认 → REFUNDED（保护 Payer）
```

**为什么是多签而不是单个人仲裁**：单个人可能被贿赂、可能不在线。3 人中 2 人同意才能决定——和 Safe 多签原理一样。

---

### Step 6 · 用户获得报告（🛑 人 + 🤖）

```
结算完成 → 用户拿到：
  - IPFS CID → 下载报告
  - tx hash（付款证明）
  - Evaluator 的检查结果

Agent（可选）对报告做进一步处理：
  - 翻译成中文
  - 提取关键数据点
  - 写入 daily note
```

---

### Step 7 · 完整审计记录（🤖 自动）

Escrow 合约内每条操作都有 on-chain event，构成不可篡改的审计链：

```
FundsLocked       → payer, payee, amount, deadline, requirementHash
ReportSubmitted   → contentHash, timestamp
Evaluated         → result, evaluator, evidence
FundsReleased     → payee, amount
FundsRefunded     → payer, amount, reason
DisputeRaised     → raisedBy, reason
Arbitrated        → arbiter, vote, result
```

---

## 费用分析

| 操作 | 估计 Gas（Base） | 费用 |
|------|-------------------|------|
| lockFunds | ~120,000 | ~$0.02 |
| submitReport | ~60,000 | ~$0.01 |
| evaluate | ~80,000 | ~$0.015 |
| release/refund | ~40,000 | ~$0.01 |
| dispute + arbitrate | ~200,000 | ~$0.03 |

**总 Gas 约 $0.06-0.10**，在 2 USDC 的任务费中占比 3-5%。

---

## 风险与边界

| 风险 | 缓解 |
|------|------|
| Payee 提交假报告（格式对但内容胡说） | Evaluator 只检查结构不检查质量。用户拿到报告后人工确认。有证据可发起 dispute |
| Evaluator 合约有 bug（误判） | 测试网充分测试 + Arbiter 可覆盖 Evaluator 的决定 |
| Arbiter 被贿赂 | 3 人中需 2 人串通。Arbiter 自身有声誉抵押（不在本次设计范围） |
| IPFS 文件丢失 | 用户应在结算后立即下载保存。IPFS pinning 服务可延长可用性 |
| deadline 设置太短 | 用户可根据任务复杂度调整。本例设 10 分钟 |
| requirement 被前端篡改 | requirementHash 上链，Evaluator 从 event log 取原始 requirement → hash 比对 |

---

## 和上一个支付流程的对比

| 维度 | API 即时支付 | Escrow 异步结算 |
|------|-------------|-----------------|
| 时机 | 付款→立刻拿结果 | 付款→等待→拿结果→确认→结算 |
| 信任假设 | 服务方在线且诚实 | 服务方可能延迟/不交付 |
| 安全机制 | Session Key + 限额 | 链上托管 + 超时退款 + 仲裁 |
| 适用场景 | API 调用、查询、推理 | 报告生成、人工服务、实物交付 |
| 结算时间 | 秒级 | 分钟-小时级 |
| 争议处理 | tx hash 为证据 | 多签仲裁 |
