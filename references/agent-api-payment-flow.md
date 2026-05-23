# Agent 购买 API 的支付流程

> AI × Web3 School · Machine Payment + Agent Wallet 实践
> 核心命题：Agent 如何在预算约束下自主完成小额支付并留下完整审计记录

---

## 场景

用户授权 Agent 调用一个付费 API（比如 AI 模型推理接口）。Agent 需要：查报价 → 核对预算 → 确认方身份 → 付款 → 拿到结果 → 记账。

全程不上滑到人。但受预算约束。

---

## 角色

| 角色 | 身份 |
|------|------|
| 用户 | EOA 持有者，设置预算 |
| Agent | 智能账户的 Session Key 持有者 |
| API 服务方 | 链上注册的服务提供商 |
| 链 | Base（低 gas + USDC 支持） |

---

## 前置条件

1. 用户已部署智能账户，存入 3 USDC
2. 用户已签发 Session Key：额度 ≤ 3 USDC/天、有效期 24h、白名单合约包含 USDC transfer
3. API 服务方已注册链上身份（Service Registry 合约中有记录）

---

## 完整流程：7 步

### Step 1 · 用户授权（🛑 人）

用户打开钱包，向智能账户的 Policy 合约签名一笔授权：

```
Policy 参数：
  每日预算       : 3 USDC
  Session Key    : 0xAgentSessionKey...
  有效期         : 24 小时
  白名单收款方    : 任意（或限定白名单）
  单笔上限       : 1 USDC
```

**之后的所有步骤由 Agent 自主完成，不需要人工确认。**

---

### Step 2 · API 返回 Quote（⛓️+🤖）

Agent 向 API 服务方请求报价：

```
Agent → API: GET /api/v1/inference/quote?model=gpt-4o-mini
API → Agent: {
    "quote_id": "q_abc123",
    "price": 0.1,           // USDC
    "token": "USDC",
    "chain_id": 8453,       // Base
    "recipient": "0xServiceWallet...",
    "service_name": "InferenceAPI",
    "service_registry_id": "reg_001",
    "expires_at": "2026-05-23T14:05:00Z",  // 5 分钟有效
    "signature": "0xServiceSig..."          // 服务方对 quote 的签名
}
```

**Agent 解析什么**：price、recipient、expires_at、signature。结构化输入，和 Web3 Tool Use 的「参数结构化」原则一致。

---

### Step 3 · Agent 检查预算和方身份（🤖 自动）

Agent 执行三项检查，全部通过才继续：

```
检查 1：预算
  今日已用：  0.8 USDC
  本次需付：  0.1 USDC
  合计：      0.9 USDC ≤ 3 USDC ✅

检查 2：方身份
  查 Service Registry（链上合约）：
  registry.getService("reg_001")
  → { status: "active", owner: "0xProvider...", reputation: 98 }
  → 活跃 + 声誉 98/100 ✅

检查 3：Quote 有效性
  当前时间 < expires_at ✅
  签名有效（用服务方公钥验签）✅
```

**三项全部通过 → 进入付款。任何一项失败 → 拒绝并记录到日志。**

---

### Step 4 · Agent 完成付款（⛓️+🤖）

Agent 使用 Session Key 签名并发送 USDC transfer：

```
交易：
  from:  0xSmartAccount...（智能账户地址）
  to:    USDC 合约 (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
  data:  transfer(0xServiceWallet..., 100000)  // 0.1 USDC = 100000 单位
  value: 0

Session Key 检查（智能账户合约自动执行）：
  ✅ 单笔 0.1 ≤ 限额 1 USDC
  ✅ 今日累计 0.9 ≤ 预算 3 USDC
  ✅ Session Key 未过期
  ✅ 收款方在允许范围

交易发送 → 等待确认
```

**为什么 Session Key 能工作**：智能账户的 Policy 合约在链上强制执行这些检查，Agent 的 Session Key 绕不过去。这不是「Agent 自觉遵守」，是「链上代码不让你违反」。

---

### Step 5 · API 确认付款并返回结果（⛓️+🤖）

API 服务方监控链上事件，确认付款后返回结果：

```
API 监控到：
  USDC.Transfer(from=0xSmartAccount, to=0xServiceWallet, value=100000)

API 验证：
  ✅ 收款方是自己
  ✅ 金额 = 0.1 USDC
  ✅ quote_id 匹配（通过 payment reference 关联）
  ✅ 在 quote 有效期内

API → Agent: {
    "status": "paid",
    "tx_hash": "0xPaymentTxHash...",
    "result": "推理结果：...",
    "receipt": {
        "receipt_id": "r_xyz789",
        "quote_id": "q_abc123",
        "amount_paid": 0.1,
        "tx_hash": "0xPaymentTxHash...",
        "timestamp": "2026-05-23T14:02:30Z"
    }
}
```

---

### Step 6 · Agent 验证并记录（🤖 自动）

Agent 交叉验证 API 返回的交易哈希：

```
Agent 查询链上：
  etherscan: tx 0xPaymentTxHash... 
  → ✅ 已确认，6 个区块确认
  → to: USDC 合约
  → data: transfer(0xServiceWallet, 100000)
  → 金额和收款方与 quote 一致

Agent 更新内部状态：
  今日已用：0.9 USDC
  剩余预算：2.1 USDC
```

---

### Step 7 · 系统记录完整审计日志（🤖 自动）

Agent 将本次支付的全部信息写入日志：

```json
{
  "payment_id": "pay_20260523_001",
  "timestamp": "2026-05-23T14:02:30Z",
  "quote": {
    "quote_id": "q_abc123",
    "price": 0.1,
    "service": "InferenceAPI",
    "service_registry_id": "reg_001",
    "expires_at": "2026-05-23T14:05:00Z"
  },
  "payment": {
    "tx_hash": "0xPaymentTxHash...",
    "chain_id": 8453,
    "token": "USDC",
    "amount": 0.1,
    "from": "0xSmartAccount...",
    "to": "0xServiceWallet..."
  },
  "budget": {
    "daily_limit": 3.0,
    "spent_today": 0.9,
    "remaining": 2.1
  },
  "result": {
    "status": "success",
    "receipt_id": "r_xyz789",
    "result_hash": "sha256_of_result..."
  },
  "verification": {
    "quote_signature_valid": true,
    "service_registry_verified": true,
    "onchain_tx_confirmed": true,
    "confirmations": 6
  }
}
```

---

## 安全边界

| 做什么 | 谁控制 | 如何保证 |
|--------|--------|----------|
| 设预算 | 🛑 人 | Policy 合约，只有 Owner 能改 |
| 查报价 | 🤖 Agent | 只读请求，无风险 |
| 验身份 | 🤖 Agent | Service Registry 链上查询 |
| 付款 | 🤖 Agent + ⛓️ 链 | Session Key 签名，Policy 合约强制执行限额 |
| 拿结果 | 🤖 Agent | 只读，API 返回 |
| 记账 | 🤖 Agent | 本地 + 链上双记录 |

**Agent 永远不能做的事**：改预算、提额度、绕过 Session Key 限制、使用 Owner 私钥。

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| API 收了钱不给结果 | 上链的 tx hash 是公开证据，可向 Service Registry 举报降信誉 |
| Quote 过期后 Agent 仍付款 | Quote 带链上时间戳，付款前 Agent 检查 expires_at |
| Agent 幻觉拼错收款地址 | Service Registry 提供验证过的地址，Agent 不从自然语言提取地址 |
| Session Key 泄露 | 单日限额 3 USDC 兜底；Policy 合约可设置异常检测（短时间大量小额交易） |
| 链上确认慢（> quote 有效期） | 使用 Base 等快速 L2；API 可接受「tx 已广播但未确认」作为付款证明（需信誉系统支撑） |
| 预算用完后 Agent 降级 | 预算归零 → Agent 自动切换免费 API 或暂停服务，不尝试超额付款 |

---

## 这个流程的关键设计选择

1. **预算在链上强制执行，不是 Agent 自觉** — Policy 合约的代码拒绝超额交易，Agent 绕过不了。
2. **Service Registry 解决「方身份」问题** — Agent 不靠自然语言或 URL 识别收款方，而是查链上注册表。
3. **付款即证据** — tx hash 公开可查，不需要第三方托管或仲裁。
4. **完整的审计日志** — quote → payment intent → tx hash → receipt → remaining budget 全部可追溯。
