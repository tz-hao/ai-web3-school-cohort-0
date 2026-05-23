# Agent 任务声誉记录系统

> AI × Web3 School · Agent Trust & Reputation 实践  
> 核心命题：Agent 做完任务后，怎么留下不可篡改、可验证、可聚合的声誉记录

---

## 一、为什么需要声誉记录

Agent A 说「我准确率 98%」→ 谁信？
Agent B 说「我从不超时」→ 证据在哪？

**声誉必须可验证**：不是 Agent 自己说的，是链上记录聚合出来的。每次任务完成都在链上留一条记录——成功多少次、失败多少次、返工多少次——任何人都能算出来。

---

## 二、任务定义

### 示例任务：生成一份合约风险摘要

```json
{
  "task_type": "contract_risk_summary",
  "description": "分析指定合约的安全风险，输出结构化风险评估报告",

  "requirement": {
    "fields": ["contract_address", "audit_status", "owner_type", "proxy_status",
               "privileged_functions", "risk_score", "risk_summary", "recommendations"],
    "min_risk_factors": 5,
    "max_turnaround_seconds": 600
  },

  "requirement_hash": "0xabc123..."  // keccak256 存链上，防篡改
}
```

---

## 三、声誉记录核心字段

```json
{
  "task_id": "task_0xd4e5...f6a7",

  "agent": {
    "agent_id": "agent_0x9f42...a1b3",
    "profile_cid": "bafy...agent-profile",  // IPFS 上的 Agent Profile
    "public_key": "0xAgentPublicKey..."
  },

  "user": {
    "user_id": "0xUserEOA...",
    "chain_id": 8453
  },

  "task_definition": {
    "task_type": "contract_risk_summary",
    "requirement_hash": "0xabc123...",
    "input_hash": "0xdef456..."  // keccak256(合约地址 + 链 ID + 分析深度)
  },

  "delivery": {
    "content_hash": "0x789abc...",        // keccak256(报告内容)
    "ipfs_cid": "bafy...report",          // 交付物 IPFS 地址
    "submitted_at": "2026-05-23T15:08:00Z",
    "deadline": "2026-05-23T15:10:00Z",
    "on_time": true                        // submitted_at < deadline
  },

  "payment": {
    "escrow_tx": "0xEscrowLockTxHash...",
    "release_tx": "0xReleaseTxHash...",
    "amount": 2.0,
    "token": "USDC",
    "chain_id": 8453,
    "status": "released"
  },

  "review": {
    "accuracy": {
      "score": 4,                          // 1-5
      "criteria": [
        {"field": "contract_address", "correct": true},
        {"field": "audit_status", "correct": true},
        {"field": "risk_score", "correct": true, "deviation": 0},
        {"field": "privileged_functions", "correct": true, "missed": []},
        {"field": "risk_factors_identified", "expected": 5, "delivered": 6, "extra": ["flash_loan_exposure"]}
      ]
    },
    "timeliness": {
      "score": 5,                          // 1-5
      "submitted_in_seconds": 480,
      "deadline_seconds": 600,
      "buffer_percent": 20                 // 提前了 20%
    },
    "needs_rework": false,
    "rework_count": 0,
    "reviewer": "0xUserEOA...",
    "review_submitted_at": "2026-05-23T15:12:00Z",
    "review_hash": "0xReviewSignature..."   // reviewer 对评分做 EIP-712 签名
  },

  "validation": {
    "validator": "0xEvaluatorContract...",  // 链上 Evaluator 合约地址
    "validation_method": "deterministic_field_check",
    "validation_details": {
      "fields_checked": 8,
      "fields_passed": 8,
      "type_checks_passed": true,
      "format_checks_passed": true,
      "content_hash_matched": true
    },
    "validation_tx": "0xValidationTxHash...",
    "reproducible": true,                   // 任何人用 requirement + 交付物 → 重新跑 Evaluator → 得到相同结果
    "reproduction_instructions": [
      "ipfs get bafy...report",
      "call Evaluator.check(bafy...report, requirement_hash)",
      "compare result with this record"
    ]
  },

  "failure_handling": {
    "failed": false,
    "failure_type": null,                  // timeout | invalid_delivery | exceeded_budget | dispute_lost
    "refund_triggered": false,
    "refund_tx": null,
    "slashing": {
      "slashed": false,
      "slash_amount": null,
      "slash_tx": null
    }
  },

  "onchain_record": {
    "chain_id": 8453,
    "reputation_contract": "0xReputationContract...",
    "event_tx": "0xReputationRecordTxHash...",
    "block_number": 20123456,
    "timestamp": "2026-05-23T15:12:30Z"
  }
}
```

---

## 四、Review 字段详解

### 准确性（accuracy）

| 评分 | 含义 |
|------|------|
| 5 | 所有字段正确，额外补充了有价值的发现 |
| 4 | 核心字段正确，有 1-2 个小疏漏 |
| 3 | 基本信息对，但有遗漏或轻微错误 |
| 2 | 多处错误，需要返工 |
| 1 | 完全错误或内容不相关 |

**为什么用逐字段评分而不是一个主观分数**：`score: 4` 没有意义。`contract_address 正确、risk_score 偏差 0、漏了 1 个特权函数` 有意义——后来用户可以自己判断「这个漏掉的地方对我重不重要」。

### 及时性（timeliness）

| 评分 | 含义 |
|------|------|
| 5 | 提前 20%+ 交付 |
| 4 | 准时交付（0-20% 提前） |
| 3 | 卡点交付（deadline 前 5% 以内） |
| 2 | 超时但仍在合理范围（< 2x deadline） |
| 1 | 严重超时（> 2x deadline） |

### 是否需要返工

```
needs_rework: true → rework_count: 2 → 用户申请了 2 次修改才通过
needs_rework: false → rework_count: 0 → 一次通过
```

**返工次数是声誉的关键信号**。一个 Agent 准确率 95% 但每次要返工 3 次——比准确率 90% 一次通过的 Agent 实际更差。

---

## 五、Validation 字段详解

### 谁来验证

| 验证者类型 | 适用场景 | 信任假设 |
|------------|----------|----------|
| **链上 Evaluator 合约** | 可确定性检查的任务（字段存在、类型匹配） | 信任合约代码 |
| **用户直接 review** | 质量、准确性等主观评价 | 信任用户 |
| **第三方 Auditor** | 高价值任务 | 信任 Auditor |
| **随机采样验证** | 批量任务 | 统计信任 |

### 怎么验证

```
确定性验证（Evaluator 合约）：
  1. 从 IPFS 取交付物
  2. 解析 JSON
  3. 逐字段对比 requirement
  4. 所有字段存在 + 类型正确 → 通过
  5. 验证过程和结果写入链上

主观验证（用户 review）：
  1. 阅读交付物
  2. 人工判断准确性
  3. 对评分做 EIP-712 签名（证明这个评分确实来自用户，不是伪造）
  4. 评分 hash + 签名上链
```

### 是否可复现

**可复现是声誉可信的基础**：

```
任何人、任何时间，拿 requirement_hash + 交付物 CID →
重新跑 Evaluator 合约 →
得到的验证结果必须和链上记录一致

不一致 → 这条声誉记录可能被篡改，标记为「争议中」
一致 → 声誉记录可信
```

---

## 六、失败处理：Refund 或 Slashing

### Refund 条件

| 失败类型 | 触发条件 | 处理 |
|----------|----------|------|
| **超时** | `block.timestamp > deadline` 且 `submitReport()` 未被调用 | 全额退款 → 1x 退还给用户 |
| **交付无效** | Evaluator 检查不通过（缺少指定字段/类型错误） | 全额退款 → 记录 invalid_delivery |
| **争议裁决失败** | Arbiter 裁定 Payee 违约 | 全额退款 + 可能的 slashing |

### Slashing 条件

Slashing 是 Agent 需要质押的机制——Agent 在注册时锁定一笔保证金。如果任务失败且责任在 Agent，部分保证金被罚没。

```
Slashing 规则：

超时未交付           → 保证金扣 5%（轻微）
交付无效             → 保证金扣 10%（中等）
连续 3 次以上失败     → 保证金扣 20%（严重，说明系统性问题）
争议裁决认定欺诈      → 保证金扣 50% + Agent 标记为「高风险」
```

**Slashing 的钱去哪**：

```
50% → 赔付给受影响的用户
30% → 进入社区保险池（用于赔付未来的受害者）
20% → 烧掉或归入协议金库
```

### 保证金要求

```
Agent 初始注册时需质押：
  task_fee × 50 倍（如果单次任务 2 USDC → 质押 100 USDC）

每次任务完成后：
  成功 → 释放对应比例（可以取回部分保证金）
  失败 → 触发 slashing

保证金不足时：
  Agent 自动被标记为「未投保」→ 用户收到警告 → 可以选择是否继续使用
```

---

## 七、声誉聚合：从单条记录到综合评分

单条任务记录是原始数据。声誉聚合把历史记录变成一个可以比较的分数：

```
ChainLens 的聚合声誉：

总任务数：        127
成功率：          94.5%  （120 成功 / 127 总）
平均准确性：       4.3/5
平均及时性：       4.6/5
返工率：          8.7%   （11 次需要返工）
平均返工次数：     1.4
总 slashing 次数： 0
保证金余额：       500 USDC（健康）
争议中任务：       0         

综合声誉分：      92/100
```

**每个字段可独立验证**：任何人可以从链上 Reputation 合约的 event log 中重新计算这些数字，不需要信任任何中间服务。

---

## 八、链上实现

### Reputation 合约核心接口

```solidity
interface IAgentReputation {
    // 写入（只允许 Evaluator / Escrow 合约调用）
    function recordTask(
        bytes32 taskId,
        bytes32 agentId,
        bytes32 userId,
        bytes32 requirementHash,
        bytes32 deliveryHash,
        uint256 paymentAmount
    ) external;

    function recordReview(
        bytes32 taskId,
        Review calldata review,
        bytes calldata userSignature
    ) external;

    function recordFailure(
        bytes32 taskId,
        FailureType failureType,
        uint256 refundAmount,
        uint256 slashAmount
    ) external;

    // 读取（任何人可调用）
    function getAgentStats(bytes32 agentId)
        external view returns (AgentStats memory);

    function getTaskRecord(bytes32 taskId)
        external view returns (TaskRecord memory);
}

struct AgentStats {
    uint256 totalTasks;
    uint256 successCount;
    uint256 failureCount;
    uint256 totalSlashed;
    uint256 avgAccuracy;     // scaled by 100 (4.3 → 430)
    uint256 avgTimeliness;   // scaled by 100
    uint256 reworkRate;      // scaled by 100 (8.7% → 870)
}
```

### 事件

```
TaskRecorded(taskId, agentId, userId, requirementHash, timestamp)
ReviewSubmitted(taskId, accuracy, timeliness, needsRework, reviewer)
TaskFailed(taskId, failureType, refundAmount, slashAmount)
```

---

## 九、和之前设计的连接

| 之前的模块 | 声誉系统怎么用 |
|------------|---------------|
| Agent Profile | Profile CID 存在声誉记录里 → 每次任务关联一个版本号的 Agent 身份 |
| Escrow 流程 | Escrow 结算时自动调用 `recordTask()` + `recordFailure()` |
| Evaluator 合约 | Evaluator 的验证结果写入 `validation` 字段 |
| 多签 Arbiter | 争议裁决的结果触发 `recordFailure()` 和 slashing |
| API 支付流 | 小额支付的声誉可以独立记录，降低 Escrow 的链上成本 |
| Service Registry | 声誉分高的 Agent 在 Registry 中排名靠前 |

---

## 十、边界与未解决问题

- **刷评分**：Agent 可以用小号给自己下任务刷高分。缓解：任务金额越高权重越大（2 USDC 任务的 review 比 0.01 USDC 的权重高 200 倍）
- **恶意差评**：竞争对手给 Agent 下任务然后故意打低分。缓解：用户 review 需要链上身份，有声誉的用户评分权重更高
- **声誉可迁移吗**：Agent 换了个链上 identity，旧声誉带不带？→ 这是 Agent Identity 互操作性问题，目前无标准解决方案
- **隐私**：用户可能不想公开自己用了哪个 Agent。缓解：user_id 可做零知识处理（只暴露「有真实用户使用了」而不暴露是谁）
