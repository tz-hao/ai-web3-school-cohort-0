# 开放推理网络 · 最小规格

> AI × Web3 School · Decentralized AI 实践  
> 核心命题：把「去中心化 AI」拆成可讨论的资源、角色和状态机——不是画宏大的协议，是定义谁做什么、数据怎么流、钱怎么走

---

## 一、支持的任务类型

| 类型 ID | 名称 | 输入 | 输出 | 示例 |
|---------|------|------|------|------|
| `TASK_CONTRACT_SUMMARY` | 合约摘要 | 合约地址 + 链 ID | 功能概述 + 风险点 | 「分析这个合约做了什么」 |
| `TASK_GOVERNANCE_SUMMARY` | 治理提案摘要 | 提案原文 + 论坛讨论 | 结构化摘要（按治理模板） | 「帮我把 AIP-42 总结成投票前阅读材料」 |
| `TASK_TX_EXPLAIN` | 链上交易解释 | tx hash + 链 ID | 人类可读的交易说明 | 「这笔交易到底做了什么」 |
| `TASK_REPORT_GENERATION` | 报告生成 | 需求说明 | 结构化报告 + IPFS CID | 「生成这个合约的安全风险评估报告」 |

---

## 二、网络角色

```
                    ┌──────────────┐
                    │   请求方      │  谁想用 AI 推理
                    │  (Requester) │
                    └──────┬───────┘
                           │ 1. 发布请求（链上）
                           ▼
              ┌────────────────────────┐
              │     链上 Order Book     │  公开订单簿
              └───┬───────┬───────┬────┘
                  │       │       │
         2. 接单    │       │       │  2. 接单
                  ▼       ▼       ▼
            ┌──────┐ ┌──────┐ ┌──────┐
            │ 推理  │ │ 推理  │ │ 推理  │  谁跑模型
            │ 节点A │ │ 节点B │ │ 节点C │
            └──┬───┘ └──┬───┘ └──┬───┘
               │        │        │
               │  3. 各自返回结果   │
               ▼        ▼        ▼
            ┌──────────────────────┐
            │      评测者          │  谁对比多个节点的结果
            │    (Evaluator)       │  （可以是确定性检查合约
            └──────────┬───────────┘   或另一组 AI Oracle 节点）
                       │
              4. 验证结果，选最优
                       │
                       ▼
            ┌──────────────────────┐
            │    结算合约           │  谁管钱
            │   (Settlement)       │
            └──────────┬───────────┘
                       │
              5. 放款给最优节点
              6. 退款其请求方（如全部不合格）
                       │
                       ▼
            ┌──────────────────────┐
            │    仲裁者             │  争议时谁裁决
            │   (Arbiter)          │
            └──────────────────────┘

角色还可能重叠：一个地址可以同时是请求方、节点和评测者（但节点不能评测自己的结果）。
```

---

## 三、请求结构

```json
{
  "request_id": "req_0xRequestHash...",

  "requester": "0xRequesterAddress...",

  "task": {
    "task_type": "TASK_CONTRACT_SUMMARY",
    "task_input": {
      "contract_address": "0xContract...",
      "chain_id": 8453
    },
    "input_hash": "0xInputHash..."  // keccak256(task_input) — 存链上
  },

  "model_requirements": {
    "allowed_models": ["claude-sonnet-4-7", "gpt-4o-mini", "*"],  // * = 任意
    "min_model_version": null,
    "provider_whitelist": null  // null = 任意节点
  },

  "budget": {
    "max_total": 0.5,           // USDC
    "token": "USDC",
    "chain_id": 8453,
    "per_node_payment": 0.1,    // 每个推理节点拿多少
    "evaluator_payment": 0.05,  // 评测者拿多少
    "arbiter_bond": 0.1         // 预留仲裁押金
  },

  "timeout": {
    "node_response_seconds": 120,      // 节点必须在 2 分钟内返回
    "evaluation_seconds": 60,           // 评测 1 分钟
    "total_deadline_seconds": 600       // 全部流程 10 分钟
  },

  "privacy": {
    "level": "public",                  // public | hashed | tee_only
    "tee_required": false,              // 是否要求节点在 TEE 内推理
    "data_retention_hours": 0           // 节点处理后保留多久（0 = 立即删除）
  },

  "output": {
    "format": "json",                   // json | markdown | text
    "schema_hash": "0xOutputSchema...", // keccak256(预期输出 JSON schema)
    "language": "zh"
  },

  "node_count": {
    "required": 3,                      // 需要至少 3 个节点
    "max": 5                            // 最多接受 5 个
  },

  "evaluation": {
    "method": "multi_node_consensus",   // 多节点共识 | ai_oracle | human_review
    "min_agreement": 0.6,               // 60% 的节点一致即为有效
    "evaluator_address": "0xEvaluator..."  // 指定评测者（null = 网络自动分配）
  },

  "settlement": {
    "preferred_nodes": [],              // 优先选哪些节点
    "blacklisted_nodes": [],            // 黑名单
    "escrow_id": null                   // 创建后由结算合约填入
  }
}
```

---

## 四、节点报价与接单

### 节点报价

节点在链上注册时声明默认报价，也可对每个请求单独报价：

```json
{
  "node_id": "node_0xNodeAddress...",
  "quote_id": "quote_0xQuoteHash...",
  "request_id": "req_0xRequestHash...",

  "quote": {
    "price": 0.08,             // USDC（低于 per_node_payment 才能被接受）
    "model": "claude-sonnet-4-7",
    "estimated_latency_ms": 8000,
    "tee_available": true,
    "tee_attestation": "0xAttestation...",
    "reputation_score": 94
  },

  "expires_at": "2026-05-24T10:02:00Z",  // 2 分钟内有效
  "node_signature": "0xNodeSig..."        // 节点对报价的 EIP-712 签名
}
```

### 节点选择规则

```
1. 收集所有在 timeout 内的报价
2. 过滤：reputation < 50 的不考虑，不满足 model_requirements 的不考虑
3. 排序：价格最低 → 声誉最高 → 延迟最低
4. 选前 N 个（请求中指定 required=3）
5. 给选中的节点发「你被选中了」事件
```

---

## 五、节点返回结果

```json
{
  "node_id": "node_0xNodeAddress...",
  "request_id": "req_0xRequestHash...",
  "result_id": "result_0xResultHash...",

  "output": {
    "content_hash": "0xOutputHash...",      // keccak256(完整输出)
    "content_ipfs_cid": "bafy...output",     // 输出存 IPFS（隐私级别 public）
    "format": "json",
    "generated_at": "2026-05-24T10:01:30Z"
  },

  "proof": {
    "model": "claude-sonnet-4-7",
    "model_version": "20250514",
    "provider": "anthropic",
    "inference_latency_ms": 7850,
    "tee_attestation": "0xTEEProof...",       // 如果 tee_required = true
    "prompt_template_hash": "0xPromptHash...", // 使用的 prompt 模板 hash
    "input_hash_matched": true                 // 确认处理的是正确的输入
  },

  "node_signature": "0xNodeSig..."  // 节点对整个 result 的签名
}
```

### 节点如何证明自己完成了任务

```
三重证明：

1. 输出完整性：content_hash 可由任何人从 IPFS 取回并验算。
   内容不对 → hash 对不上。

2. 输入一致性：proof.input_hash_matched 声明处理的是正确的输入。
   请求方可验证：拿 input_hash（链上）+ 输出 → 用模型复现 → 是否一致？

3. TEE 证明：如果 tee_required = true，tee_attestation 是 Intel/NVIDIA 的远程证明。
   证明：1) 模型真的跑了这个版本的 claude-sonnet  2) prompt 模板没被改  3) 输出没被改
```

---

## 六、验收与结算

### 多节点共识验收（默认）

```
3 个节点返回结果 → Evaluator 对比：

1. 结构检查：3 个 output 的 JSON schema 都匹配 output_schema_hash ✅
2. 内容相似度：提取关键字段（如合约摘要中的功能列表），用文本相似度对比
   - 节点 A 的功能列表: ["swap", "addLiquidity", "removeLiquidity"]
   - 节点 B 的功能列表: ["swap", "addLiquidity", "removeLiquidity"]  → 完全一致
   - 节点 C 的功能列表: ["swap", "addLiquidity", "removeLiquidity"]  → 完全一致
   相似度: 100% ✅（≥ 60% min_agreement）

3. 共识达成 → 选出质量分最高的节点作为 primary，付全款
   其余节点付 30%（鼓励参与但不鼓励刷量）

4. 共识未达成 → 不够 60% 节点一致 → 触发 AI Oracle 评测或人工 review

5. 所有节点结果都不合格 → 全额退款给请求方，节点声誉扣分
```

### 付款流向

```
请求方预算 0.50 USDC 的分配：

primary 节点:     0.10 USDC（全款）
secondary 节点 1:  0.03 USDC（30%）     → total: 0.16 USDC
secondary 节点 2:  0.03 USDC（30%）

评测者:            0.05 USDC

仲裁预留:          0.10 USDC（争议时启用，无争议时退还请求方）

请求方实际花费:     0.24 USDC（0.16 + 0.05 + 0.03 退还）
节省:              0.26 USDC
```

---

## 七、失败与退款

| 失败场景 | 触发条件 | 处理 |
|----------|----------|------|
| 节点超时 | 120 秒内未返回 result | 该节点不付款，声誉扣分 |
| 节点不足 | 接单节点 < required（3） | 全额退款给请求方 |
| 全部不合格 | Evaluator 判定所有输出不达标 | 全额退款，所有节点声誉扣分 |
| 隐私违规 | privacy.level = tee_only 但节点无 TEE 证明 | 不付款 + 声誉严重扣分 + 标记「隐私违规」|
| 仲裁推翻 | 节点对评估结果有异议，进入仲裁 | 仲裁预留资金启动，裁决后执行 |

---

## 八、争议处理

### 争议触发

```
节点不服评估结果 →
  1. 质押争议押金 = 请求预算的 50%（最少 0.05 USDC）
  2. 提交争议: 附证据（自己的输出 + 为什么认为评估不公）
  3. Arbiter（3 人多签）审查:
     - 重新对比所有节点的输出
     - 判断 Evaluator 的评分是否合理
  4. 裁决:
     - 支持节点 → 释放全款 + 退还押金 + 评测者声誉扣分
     - 支持评测者 → 押金没收 + 节点声誉扣分
```

### 争议时间窗口

```
评估结果上链 → 24h 内节点可发起争议
  → 24h 后无争议 → 结果最终化
```

---

## 九、链上 vs 链下

| 数据 | 链上 | 链下 |
|------|------|------|
| 请求（request） | ✅ `input_hash` + `task_type` + `budget` + `timeout` + `node_count` | 完整 JSON（IPFS） |
| 输出（result） | ✅ `output_hash` + `node_signature` | 完整输出（IPFS，取决于隐私级别） |
| 评估结果 | ✅ `verdict` + `primary_node` | 详细评分 breakdown |
| 付款 | ✅ `tx_hash` + `amount` + `recipient` | — |
| 争议 | ✅ `challenge` + `arbiter_votes` | 证据材料 |
| 节点声誉 | ✅ `reputation_score` + `task_count` | 详细交付记录 |
| 评测者评分 | ✅ `evaluator_accuracy` | 每次评分的详细依据 |
| **模型 prompt** | ❌ `prompt_template_hash`（只存 hash） | 完整模板（IPFS） |
| **模型原始输出** | ❌ `output_hash`（只存 hash） | 完整输出（IPFS） |
| **节点间通信** | ❌ | P2P（gossip 协议） |

---

## 十、状态机

```
请求生命周期：

  CREATED ──→ 已发布到 Order Book，等待节点接单
     │
     ▼
  ACCEPTING ──→ 节点已接单，等待达到 required 数量
     │
     ├── 超时（接单不足）──→ EXPIRED ──→ REFUNDED
     │
     ▼
  INFERRING ──→ 节点正在推理，等待返回结果
     │
     ├── 超时（节点未返回）──→ 剔除该节点，剩余够则继续，不够则 EXPIRED
     │
     ▼
  EVALUATING ──→ 评测者正在对比结果
     │
     ├── 全部不合格 ──→ REFUNDED
     ├── 共识达成 ──→ SETTLED（付款生效）
     │
     ▼
  DISPUTED（如有节点异议）
     │
     ├── Arbiter 支持节点 ──→ SETTLED（修改 primary node）
     └── Arbiter 支持评测者 ──→ SETTLED（维持原判）

  REFUNDED: 请求方资金退回
  SETTLED:  资金分配到节点 + 评测者
```

---

## 十一、和之前设计的关系

| 模块 | 在这个网络中的位置 |
|------|-------------------|
| Agent Profile | 推理节点的链上身份 + endpoint 验证 |
| 声誉系统 | 节点和评测者的历史交付记录 + 评分 |
| AI Oracle | 复杂任务的评测者（多节点共识失败后的兜底） |
| Escrow 流程 | 结算合约 = 资金托管 + 超时退款 |
| 多签仲裁 | Arbiter = 3 人多签裁决争议 |
| 数据流图 | 决定什么上链、什么存 IPFS、什么只存 hash |
| Prompt Injection 防护 | 节点不能篡改 prompt template（TEE 保证 + hash 比对） |

---

## 十二、一个具体的调用示例

### 请求

```
请求方: 0xAlice...
任务: 「分析合约 0xUniswapV3... 的功能和风险」
预算: 0.5 USDC
要求: 3 个节点，claude-sonnet-4-7，120 秒内返回
```

### 执行

```
10:00:00  请求上链（CREATED）
10:00:12  节点 A/B/C 接单（ACCEPTING）
10:00:15  3 个节点达到，状态 → INFERRING
10:01:30  节点 A 返回（7850ms）
10:01:35  节点 B 返回（9200ms）
10:01:42  节点 C 返回（10500ms）
10:01:42  状态 → EVALUATING
10:02:00  Evaluator 完成对比:
          节点 A: 功能列表全对 + 风险分析深度最高 → primary
          节点 B: 功能列表全对（和 A 一致，但深度略低）
          节点 C: 功能列表漏了 1 项 → 不合格
          A 和 B 一致 → 共识达成 ✅
10:02:01  状态 → SETTLED
          A 收到 0.10 USDC
          B 收到 0.03 USDC
          C 没收到（不合格）
          Evaluator 收到 0.05 USDC
          仲裁预留 0.10 → 退还 Alice
          Alice 实际花费: 0.18 USDC
```

---

## 十三、这个规格的边界

**这个规格做了**：定义了角色、消息格式、状态机、付款规则、争议流程——足够两组开发者各自实现客户端和服务端并互相通信。

**这个规格没做**：
- 节点发现机制（P2P 层）
- 模型权重分发（不做模型训练，只做推理）
- 节点激励 token（用 USDC 结算，不发行新 token）
- 抗 Sybil 攻击的完整方案（委托给声誉系统 + TEE 证明）
- 跨链互操作（先只在 Base 上跑）

**这个规格可以迭代的方向**：
- 多评测者随机分配（防评测者和节点串通）
- ZK 证明推理结果（比 TEE 更轻量，但技术成熟度不够）
- 请求方匿名（链上地址天然匿名，但付款可追踪）
