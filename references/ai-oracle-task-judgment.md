# AI Oracle：任务完成判断

> AI × Web3 School · AI Oracle 实践  
> 核心命题：当验收标准涉及主观判断时，AI Oracle 如何给出可挑战、可回滚的判定结果

---

## 一、为什么需要 AI Oracle

确定性 Evaluator（之前设计的）能检查「报告有没有包含 `protocol_name` 字段」。但不能判断「这段风险分析写得有没有道理」。

**需要 AI 介入的场景**：
- 「报告的逻辑是否自洽？」
- 「推荐方案是否合理？」
- 「翻译质量是否达到专业水准？」
- 「生成的文章是否符合给定风格？」

这些问题没有确定性答案，但 Agent 经济的结算又需要二元判定（付钱 or 退款）。AI Oracle 是这道桥——把主观判断变成链上可用的、可挑战的、可回滚的判定信号。

---

## 二、系统架构

```
                    ┌──────────────┐
                    │  Escrow 合约  │ ← 资金锁在这里
                    └──────┬───────┘
                           │ 需要判定「交付合格吗？」
                           ↓
                    ┌──────────────┐
                    │ AI Oracle    │
                    │ 合约          │ ← 链上接口
                    └──────┬───────┘
                           │ 调用链下 AI
                           ↓
         ┌─────────────────────────────────┐
         │     Oracle Node（TEE 内运行）     │
         │                                 │
         │  1. 从 IPFS 取交付物              │
         │  2. 组装 prompt                  │
         │  3. 调用 LLM（GPT-4o / Claude）   │
         │  4. 解析结构化输出                 │
         │  5. 对输出签名                    │
         │  6. 上链回写结果                  │
         └─────────────────────────────────┘
```

**为什么 Oracle Node 跑在 TEE 里**：保证 prompt 模板没有被篡改、模型输出没有被节点运营者修改、整个过程可远程证明——和 Phala 的架构一致。

---

## 三、输入定义

```json
{
  "oracle_request_id": "oracle_req_0xa1b2...c3d4",

  "input": {
    "task_description": "分析 Uniswap V3 合约的安全风险，输出结构化风险评估报告。要求覆盖：合约所有权结构、可升级性、特权函数、资金托管风险、已知漏洞、依赖风险。",
    "task_description_hash": "0xTaskDescHash...",

    "deliverable": {
      "ipfs_cid": "bafy...report",
      "content_hash": "0xContentHash...",
      "format": "application/json",
      "submitted_at": "2026-05-23T15:08:00Z"
    },

    "acceptance_criteria": {
      "required_sections": [
        "ownership_structure",
        "upgradeability",
        "privileged_functions",
        "custody_risk",
        "known_vulnerabilities",
        "dependency_risk"
      ],
      "min_section_length_words": 50,
      "require_citations": true,
      "require_risk_scores": true,
      "quality_threshold": 3,
      "quality_scale": "1-5",
      "quality_description": "3 = 分析基本合理但缺少深度。4 = 分析合理且有一定深度。5 = 分析深入且提供可操作建议。"
    },

    "context": {
      "escrow_id": "escrow_0xEscrow...",
      "amount_locked": 5.0,
      "token": "USDC",
      "payer": "0xUserEOA...",
      "payee_agent_id": "agent_0x9f42...a1b3"
    }
  },

  "requested_by": "0xEscrowContract...",
  "requested_at": "2026-05-23T15:08:30Z",
  "chain_id": 8453
}
```

---

## 四、输出定义

```json
{
  "oracle_request_id": "oracle_req_0xa1b2...c3d4",

  "result": {
    "accepted": true,
    "overall_score": 4,
    "reason": "报告覆盖了全部 6 个要求章节。所有权结构分析准确，可升级性评估引用了 proxy admin 地址。特权函数列举了 4 个高权限 entry point，但漏掉了紧急暂停功能。已知漏洞部分引用了 2023 年的审计报告且标注了版本号。建议部分具有可操作性。由于遗漏了紧急暂停功能，扣 1 分。总体质量满足验收标准。"
  },

  "section_scores": [
    {"section": "ownership_structure", "score": 5, "comment": "准确识别了 2/3 多签 owner，附 explorer 链接"},
    {"section": "upgradeability", "score": 4, "comment": "正确识别 proxy 模式，但未讨论时间锁"},
    {"section": "privileged_functions", "score": 3, "comment": "列举了 4 个特权函数，但遗漏了紧急暂停"},
    {"section": "custody_risk", "score": 4, "comment": "分析了 TVL 和合约余额，但未讨论资金流出路径"},
    {"section": "known_vulnerabilities", "score": 5, "comment": "引用了 3 个来源，标注了时间版本"},
    {"section": "dependency_risk", "score": 4, "comment": "分析了 Oracle 和库依赖，但未讨论治理依赖"}
  ],

  "model": {
    "model_version": "claude-sonnet-4-7-20250514",
    "provider": "anthropic",
    "inference_timestamp": "2026-05-23T15:09:15Z"
  },

  "oracle_node": {
    "node_id": "node_0xOracleNode...",
    "tee_attestation": "0xTEEAttestation...",
    "tee_provider": "phala",
    "attestation_verifiable_at": "https://proof.phala.com/verify/0x..."
  }
}
```

---

## 五、链上记录

每次 Oracle 调用在链上存一条不可篡改的记录：

```solidity
struct OracleRecord {
    bytes32 requestId;           // oracle_req_0x...
    bytes32 inputHash;           // keccak256(完整输入 JSON)
    bytes32 promptTemplateHash;  // keccak256(prompt 模板)——用于复现
    bytes32 outputHash;          // keccak256(完整输出 JSON)
    bytes32 modelVersion;        // keccak256("claude-sonnet-4-7-20250514")
    uint256 inferenceTimestamp;  // 模型推理时间
    address oracleNode;          // 执行推理的节点地址
    bytes teeAttestation;        // TEE 远程证明
    bool accepted;               // 判定结果
    uint8 score;                 // 质量分
    uint256 recordedAt;          // 上链时间（block.timestamp）
    uint256 challengeDeadline;   // recordedAt + 24h
    bool challenged;             // 是否被挑战
    bool overturned;             // 判定是否被推翻
}
```

---

## 六、Prompt 模板（关键——保证可复现）

Prompt 模板本身存 IPFS，链上只存 hash。任何人可以取回模板 + 输入 → 重跑 → 验证输出是否合理。

```
System: 你是一个智能合约安全审计专家。你的任务是评估一份合约风险分析报告的质量。

评估标准：
1. 检查报告是否覆盖了所有要求的章节
2. 评估每个章节的分析深度和准确性
3. 逐节打分（1-5）
4. 给出总体判定：通过（≥3 分）或 不通过（<3 分）

注意：
- 只评估报告质量，不验证链上数据（由确定性 Evaluator 完成）
- 如果报告引用了外部信息，确认报告内有来源标注
- 你的判定必须是可辩护的——写出具体理由

输出格式（严格遵守）：
{
  "accepted": true/false,
  "overall_score": 1-5,
  "reason": "string（用中文，不超过 300 字）",
  "section_scores": [
    {"section": "section_name", "score": 1-5, "comment": "扣分或加分原因"}
  ]
}

User: 
任务说明：{task_description}
要求章节：{required_sections}
质量标准：{quality_threshold} 分以上通过

报告内容：
{deliverable_content}
```

**为什么 prompt 模板要存 IPFS**：
- 链上只存 hash → 省 gas
- 模板改了 → hash 变 → 自动检测到「这次用的模板和上次不一样」
- 任何人都能用 IPFS CID 取回模板 → 可复现

---

## 七、Challenge Window（24 小时挑战期）

### 为什么需要挑战期

AI 的判定可能错误。报告可能确实有深度，但模型在那一刻「没看出来」。Oracle 的判定不是最终——24 小时内任何人可以提交反证挑战。

### 挑战流程

```
Oracle 判定「不通过」
  →
  challengeDeadline = block.timestamp + 86400  // 24h
  →
  Escrow 资金仍在锁定状态，既不释放也不退款
  →
  [24h 内]
    ├── 无人挑战 → 判定生效 → 退款给 Payer
    └── Payee 提交挑战
         →
         Escrow.challengeOracleResult(oracleRequestId, evidence)
         →
         状态进入 DISPUTED
         →
         进入多签仲裁流程（3 个 Arbiter, 2/3 阈值）
         →
         Arbiter 审查：
           - 对比 AI Oracle 的判定理由
           - 阅读原始报告
           - 评估是否合理
         →
         裁定：
           ├── Oracle 判定维持 → 退款生效
           └── Oracle 判定推翻 → 释放付款 + 标记本条 Oracle 记录为 overturned
```

### 挑战者需要提交什么

```json
{
  "challenge": {
    "oracle_request_id": "oracle_req_0xa1b2...c3d4",
    "challenger": "0xPayeeAddress...",
    "reason": "AI Oracle 误判：第 4 节（privileged_functions）遗漏了紧急暂停功能，但该功能在附录 A 中有详细分析。Oracle 只检查了正文，未读附录。",
    "evidence": {
      "ipfs_cid": "bafy...report",          // 指向同一个交付物
      "specific_section": "appendix_a_pause_function",
      "missed_content": "合约包含紧急暂停函数，调用者为 owner，可暂停所有 swap..." ,
      "reproducible": true                    // 任何人可以打开报告验证
    },
    "challenge_deposit": 2.5                  // 挑战者质押 50% 的任务费（防恶意挑战）
  }
}
```

### 挑战押金

| 挑战结果 | 押金处理 |
|----------|----------|
| 挑战成功（Oracle 判定被推翻） | 押金全额退还 + 从 Oracle 节点的保证金中提取奖励给挑战者 |
| 挑战失败（Oracle 判定维持） | 押金被罚没，50% 给 Oracle 节点，50% 给 Payer（补偿时间损失） |

**押金防恶意挑战**：不设押金 → 任何人可以零成本发起挑战 → 每次 Oracle 判定都可能被拖 24 小时进入仲裁。设押金 → 只有真的认为 Oracle 错了才会挑战。

---

## 八、输出错误时的资金处理

### 错误路径 1：Oracle 判定在挑战期内被推翻

```
时序：

T0: Oracle 判定「不通过」
T0+10min: Payee 提交挑战 + 质押 2.5 USDC
T0+1h:    Arbiter 介入，审查证据
T0+3h:    2/3 Arbiter 裁定「Oracle 误判，报告合格」

资金流：
  Escrow 中的 5 USDC → 释放给 Payee ✅
  挑战押金 2.5 USDC → 退还 Payee ✅
  Oracle 节点保证金 → 扣除 10%（ ≈ 50 USDC）→ 2.5 USDC 奖励挑战者
  本条 Oracle 记录 → 标记 overturned = true
```

### 错误路径 2：连续误判 → 暂停 Oracle 节点

```
Oracle 节点被挑战且被推翻的次数：
  1 次  → 警告标记
  3 次  → 自动暂停 24h，所有使用该节点的 Escrow 暂停结算
  5 次  → 暂停 7 天，节点需要重新质押双倍保证金才能恢复
  10 次 → 永久除名，剩余保证金分配给历史受害者
```

### 错误路径 3：紧急冻结

```
如果发现系统性问题（比如某个模型版本对所有任务都给出错误的「不通过」）：

Admin 多签（3/5）→ 调用 OracleRegistry.emergencyFreeze(nodeId)
  →
  所有依赖该 Oracle 节点的 Escrow 合约：
    - 新请求暂停
    - 已有判定但未过挑战期的 → 暂停结算
    - 已过挑战期的 → 不受影响
```

---

## 九、Oracle 节点的运行要求

| 要求 | 说明 |
|------|------|
| TEE 运行 | 必须提供远程证明——保证 prompt 和模型输出没有被篡改（和 Phala 方案一致） |
| 保证金 | 至少 500 USDC（覆盖潜在的错误赔付） |
| 模型版本声明 | 必须在链上声明使用的模型版本——改模型就改版本 hash，用户可以选择信任哪个版本 |
| 推理记录公开 | 每次推理的 input hash + prompt 模板 hash + 输出 hash 存链上，任何人可复现 |
| 延时上链 | 判定结果上链后，延迟 10 分钟才触发 Escrow 结算——给挑战者一点反应时间（可在客户端层面扫描） |

---

## 十、和之前设计的连接

```
Agent Profile    → Oracle 节点本身就是一种 Agent，有自己的 Profile 和声誉记录
Agent Reputation → Oracle 的声誉记录用同一套系统，但多了 overturned 字段
Escrow 流程      → AI Oracle 取代了确定性 Evaluator，但挑战期 + 仲裁保留了人工兜底
Agent API 支付   → Oracle 节点的调用本身也是付费的（0.01 USDC/次），形成了 Agent 经济闭环
```

---

## 十一、边界和未解决问题

- **Oracle 节点中心化风险**：目前只有 1 个 Oracle 节点做判定。去中心化方案是多节点 + 聚合（3 个独立节点各自判定，取多数）→ 成本和延迟翻 3 倍
- **模型版本漂移**：同一个模型，不同时间推理同一份报告，结果可能不同（temperature 随机性）→ 可以通过 `temperature=0` + 固定 `seed` 缓解
- **Prompt 注入**：交付物内容可能包含试图操纵 AI Oracle 的指令 → 需要在 prompt 模板中做输入隔离（用分隔符包裹用户内容，明确指示模型只评估，不执行指令）
- **Oracle 判定和用户 review 冲突**：AI 判了「通过」，用户觉得质量差。→ 挑战窗口允许用户挑战，但用户不一定是专家。Arbiter 在争议中的权重更高
