# Agent 主权检查表

> AI × Web3 School · AI Sovereignty 实践  
> 核心命题：用户对 Agent 有几分控制权——不是「能不能用」，而是「能不用、能离开、能验证」

---

## 检查表总览

| # | 主权维度 | 一句话 |
|---|---------|--------|
| 1 | 数据可导出 | 我的数据能不能带走？ |
| 2 | 模型可切换 | 我能不用某家的模型吗？ |
| 3 | 权限可撤销 | 我能随时收回 Agent 的权力吗？ |
| 4 | 身份可验证 | 我能确认对面确实是这个 Agent 吗？ |
| 5 | 执行可审计 | 出事了能查到是谁、做了什么、为什么吗？ |

---

## 一、数据可导出

### 1.1 聊天记录

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否导出完整对话？ | `agent data export chats --format jsonl` | ✅ |
| 导出格式是否标准？ | JSONL（每行一条消息，标准格式） | ✅ |
| 是否包含时间戳和消息来源？ | 每条消息带 `timestamp` + `role`（user/agent/tool） | ✅ |
| 是否包含工具调用记录？ | `tool_calls` 字段记录每次工具调用的 name + input + output | ✅ |
| 导出后是否可从其他 Agent 导入？ | 标准 JSONL → 任何兼容 Agent 可导入 | ✅ |
| 是否可选择性导出？ | `--from` `--to` `--topic` 过滤 | ✅ |

### 1.2 记忆

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否导出所有记忆？ | `agent data export memory --format json` | ✅ |
| 能否逐条查看？ | `agent memory list` 列出所有条目 | ✅ |
| 能否逐条删除？ | `agent memory forget <id>` | ✅ |
| 记忆是否可迁移？ | 导出 JSON → 导入到另一个 Agent 实例 | ✅ |

### 1.3 任务记录

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否导出任务历史？ | `agent data export tasks --format csv` | ✅ |
| 是否含输入/output/tx hash？ | 每条记录含 task_id、input_hash、delivery_hash、payment_tx | ✅ |
| 是否含 review 和 validation？ | 含 accuracy、timeliness、needs_rework、validator | ✅ |

### 1.4 工具日志

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否导出工具调用日志？ | `agent data export tool-logs --format jsonl` | ✅ |
| 是否记录每次调用的 input/output/error？ | 每条含 tool_name、input、output、error、timestamp、chain_id | ✅ |
| 是否记录调用来源？ | `triggered_by`: user / agent / scheduled | ✅ |

### 1.5 导出命令汇总

```bash
agent data export chats      --from 2026-05-01 --to 2026-05-24 --format jsonl
agent data export memory     --format json
agent data export tasks      --format csv
agent data export tool-logs  --format jsonl
agent data export all        --output ./my-agent-data-20260524/
```

---

## 二、模型可切换

### 2.1 模型选择

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否切换 LLM 模型？ | `agent config set model claude-sonnet-4-7` | ✅ |
| 是否支持多个 Provider？ | Anthropic / OpenAI / DeepSeek / 本地 Llama | ✅ |
| 切换后是否需要重新配置？ | 不需要——Agent 接口统一 | ✅ |
| 能否为不同任务指定不同模型？ | `--model claude-opus-4` 用于复杂任务，默认用 sonnet | ✅ |

### 2.2 本地推理

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否完全离线运行？ | `agent config set provider local --model llama-3.1-70b` | ✅ |
| 本地推理时数据是否离开本机？ | 不离开——纯本地推理 | ✅ |
| 哪些功能离线不可用？ | 链上查询依赖 RPC（仍需网络），但不依赖云端 LLM | ⚠️ |

### 2.3 云端推理控制

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否禁用云端推理？ | `agent config set provider local --only` | ✅ |
| 能否查看哪些数据发给了云端？ | `agent data show third-party` 列出所有外发数据 | ✅ |
| 能否设置「敏感任务只用本地模型」？ | `agent config set privacy-policy high-value-task=local-only` | ✅ |

---

## 三、权限可撤销

### 3.1 Wallet / Session Key

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否查看当前所有授权？ | `agent permission list` | ✅ |
| 能否查看 Session Key 的额度/有效期/白名单？ | 每条含 limits、expires_at、allowed_contracts | ✅ |
| 能否撤销单个 Session Key？ | `agent permission revoke session-key <id>` | ✅ |
| 能否一键撤销所有授权？ | `agent permission revoke --all`（调用 Safe 或智能账户的 kill switch） | ✅ |
| 撤销后是否立即生效？ | 链上交易确认后立即生效（1 个区块 ≈ 2 秒） | ✅ |
| 能否查看历史授权记录？ | 链上 Event `SessionKeyCreated` / `SessionKeyRevoked` | ✅ |

### 3.2 Token Allowance

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 能否查看当前所有 token approve？ | `agent permission list allowances` | ✅ |
| 能否撤销单个 approve？ | `agent permission revoke allowance <token> <spender>` | ✅ |
| 能否检测无限额度 approve？ | 标记 ⚠️ `allowance == type(uint256).max` 的授权 | ✅ |

### 3.3 权限视图示例

```
$ agent permission list

┌─────────────────────────────────────────────────────────┐
│ 🔐 当前权限                                              │
│                                                         │
│ Session Keys (2 active):                                 │
│   #1: 0xSessionKey...a1b2                                │
│       额度: 3 USDC/天 | 单笔最大: 1 USDC                   │
│       白名单: USDC transfer, Uniswap swap                 │
│       过期: 2026-05-25 00:00 UTC                         │
│       状态: ✅ active                                     │
│                                                         │
│   #2: 0xSessionKey...c3d4                                │
│       额度: 0.1 ETH/天 | 单笔最大: 0.05 ETH               │
│       白名单: 任意                                        │
│       过期: 2026-05-24 12:00 UTC（已过期 ⚠️）             │
│       状态: ⚠️ expired — 建议撤销                          │
│                                                         │
│ Token Allowances (3 active):                              │
│   USDC → Uniswap Router: 1,000 USDC ✅                    │
│   USDC → Aave Pool: 500 USDC ✅                           │
│   USDT → 0xUnknown...: ⚠️ UNLIMITED — 建议立即撤销         │
│                                                         │
│ 一键撤销所有: agent permission revoke --all                │
└─────────────────────────────────────────────────────────┘
```

---

## 四、身份可验证

### 4.1 跨平台验证

| 检查项 | 实现 | 状态 |
|--------|------|------|
| Agent 是否有链上注册身份？ | AgentRegistry 合约中注册的 agent_id + public_key | ✅ |
| 能否通过 endpoint 验证 Agent 身份？ | `.well-known/agent-proof` 返回签名挑战 | ✅ |
| 能否通过 Telegram/Discord 验证 Agent？ | Bot 在 `/verify` 命令中返回由 Agent 私钥签名的声明 | ✅ |
| 能否通过 X/Twitter 验证 Agent？ | Profile bio 中含链上 agent_id + ENS 域名 | ✅ |

### 4.2 验证流程（用户端）

```
1. 用户从任何平台遇到声称是「ChainLens」的 Agent

2. 打开 https://api.chainlens.xyz/agent/v1/.well-known/agent-proof
   → 拿到 agent_id: "agent_0x9f42..." + 签名挑战

3. 在 AgentRegistry 合约中查 agent_id
   → 拿到 public_key + ipfs_cid（Profile）

4. 用 public_key 验签
   → ✅ 签名有效 → endpoint 确实属于 ChainLens

5. 在 Telegram/Discord/Twitter 上发 /verify
   → Bot 返回相同的 agent_id + 签名
   → 和 registry 中一致 → 跨平台身份确认
```

### 4.3 验证失败的处理

```
如果验证失败 → 你正在交互的不是真正的 Agent
  → 立即停止交互
  → 不发送任何交易
  → 不提供任何个人信息
  → 向 AgentRegistry 举报该 endpoint
```

---

## 五、执行可审计

### 5.1 审计日志覆盖

| 检查项 | 是否覆盖 | 存储位置 |
|--------|----------|----------|
| 用户输入了什么 | ✅ | 本地日志 + 链上 Event `UserRequested(task_hash)` |
| Agent 调用了什么工具 | ✅ | 本地日志 + 链上 Event `ToolCalled(tool_name_hash, input_hash)` |
| 工具返回了什么 | ✅ | 本地日志 |
| 是否发生了链上交易 | ✅ | 链上 tx hash（公开永久） |
| 交易前是否经过 simulation | ✅ | 本地日志 + 链上 Event `TxSimulated(tx_hash, result)` |
| simulation 结果是什么 | ✅ | 本地日志 |
| 谁确认了交易 | ✅ | 链上签名（EOA signature / Session Key） |
| Agent 的推理过程 | ✅ | 本地日志（发给 LLM 的上下文 + 返回的输出） |
| 是否有安全告警 | ✅ | 本地日志 + 链上 Event `SecurityAlert(alert_type, severity)` |

### 5.2 审计查询

```bash
# 查某天的完整操作
agent audit show 2026-05-24

# 查某笔交易的完整上下文
agent audit trace 0xTxHash...

# 查 Agent 对某个决策的推理过程
agent audit reasoning task_0xTaskId...

# 导出完整审计报告
agent audit export --from 2026-05-01 --to 2026-05-24 --format pdf
```

### 5.3 链上记录的结构

每次操作有两条链上 Event，不可篡改：

```
ToolCalled(
    tool_name_hash: keccak256("CONTRACT_READ"),  // 操作类型（hash 节省 gas）
    input_hash: keccak256(full_input),           // 参数 hash（可验证但隐藏原文）
    timestamp: block.timestamp,
    triggered_by: keccak256("AUTO")              // user / agent / scheduled
)

SecurityAlert(
    alert_type: INJECTION_DETECTED,
    severity: HIGH,
    source_hash: keccak256(offending_document),  // 追溯到源
    action_taken: BLOCKED
)
```

---

## 六、主权自检命令

用户随时可以跑：

```bash
agent sovereignty check
```

输出：

```
┌─────────────────────────────────────────────────────────┐
│ 🏴 Agent 主权自检                                        │
│                                                         │
│ 1. 数据可导出:                                            │
│    ✅ 聊天: 1,247 条可导出                                │
│    ✅ 记忆: 89 条可导出                                   │
│    ✅ 任务: 12 条可导出                                   │
│    ✅ 工具日志: 2,341 条可导出                            │
│                                                         │
│ 2. 模型可切换:                                            │
│    ✅ 当前模型: claude-sonnet-4-7（云端）                  │
│    ✅ 可用模型: 5 个云端 + 2 个本地                        │
│    ⚠️ 本地模型未下载（如需离线，运行 agent model pull）     │
│                                                         │
│ 3. 权限可撤销:                                            │
│    ✅ Session Key: 2 个（1 个已过期 ⚠️）                   │
│    ✅ Token Allowance: 3 个（1 个无限额度 🔴）             │
│    ✅ 一键撤销: 可用                                      │
│                                                         │
│ 4. 身份可验证:                                            │
│    ✅ 链上注册: Base chain, tx 0xRegTx...                 │
│    ✅ Endpoint 验证: .well-known/agent-proof 在线          │
│    ✅ 跨平台: Telegram / API 身份一致                      │
│                                                         │
│ 5. 执行可审计:                                            │
│    ✅ 链上 Event: 89 条                                   │
│    ✅ 本地日志: 2,341 条                                  │
│    ✅ 推理记录: 每次调用可追溯                              │
│                                                         │
│ 🔴 立即处理:                                              │
│    • 撤销无限额度 USDT allowance                           │
│    • 撤销已过期的 Session Key #2                           │
│                                                         │
│ 综合主权评分: 88/100 ⚠️                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 七、主权的五个层级

```
Level 1: 能用         用户可以使用 Agent，但数据和模型都锁在平台里
Level 2: 能导出       数据可以带走（标准化格式）
Level 3: 能切换       可以换模型、换 Provider、甚至离线运行
Level 4: 能撤销       随时收回 Agent 的全部链上权限，一键 kill switch
Level 5: 能验证       可以独立验证 Agent 的身份、执行过程、安全边界

当前设计: Level 4 ✅
差距: Level 5 需要 ZK 证明或 TEE 证明来自动化验证（目前依赖人工审查）
```

---

## 八、和之前设计的连接

| 设计模块 | 主权检查表中的位置 |
|----------|-------------------|
| Agent Profile | 四.身份可验证 — 链上注册 + endpoint proof |
| 声誉系统 | 五.执行可审计 — 链上 Event 不可篡改 |
| Escrow 流程 | 三.权限可撤销 — token allowance revoke |
| 数据流图 | 一.数据可导出 — 7 项数据的导出路径 |
| Prompt Injection 防护 | 五.执行可审计 — SecurityAlert Event |
| Session Key（API 支付流） | 三.权限可撤销 — session key revoke |
