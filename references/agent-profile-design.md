# Agent Profile 设计：链上身份 + 可验证 Endpoint

> AI × Web3 School · Agent Identity + Agent Trust & Reputation 实践  
> 核心命题：Agent 是谁、能做什么、如何证明这个 endpoint 确实是它的、谁有权限改 profile

---

## 一、Agent 基本信息

```json
{
  "agent_id": "agent_0x9f42...a1b3",
  "name": "ChainLens",
  "description": "链上数据聚合 Agent。提供合约分析、交易溯源、地址画像和风险评分。",
  "version": "1.2.0",
  "owner": "0xUserEOA...",
  "owner_type": "smart_account",
  "endpoint": "https://api.chainlens.xyz/agent/v1",
  "registered_chain": 8453,
  "registration_tx": "0xRegistrationTxHash...",
  "created_at": "2026-05-01T00:00:00Z"
}
```

---

## 二、3 个 Capability

### Capability 1：合约分析

```json
{
  "id": "cap_001",
  "name": "analyze_contract",
  "description": "分析指定合约地址的功能、权限、风险和最近活动",
  
  "input": {
    "contract_address": "0x...（必填，42 字符 hex）",
    "chain_id": "8453（必填，1/137/42161/10/8453）",
    "depth": "basic | full（可选，默认 basic）"
  },
  "output": {
    "protocol_name": "string",
    "contract_type": "string（DEX/Lending/Staking/NFT/Other）",
    "verified_source": "boolean",
    "proxy_status": "string",
    "owner_address": "0x...",
    "risk_score": "integer（1-10）",
    "recent_activity": ["last 10 tx summaries"],
    "explorer_link": "https://basescan.org/address/0x..."
  },
  
  "pricing": {
    "model": "per_call",
    "amount": 0.05,
    "token": "USDC",
    "chain_id": 8453
  },
  "limits": {
    "rate_limit": "60 calls/minute",
    "daily_limit": "1000 calls/day",
    "min_payment_confirmations": 1
  }
}
```

### Capability 2：地址画像

```json
{
  "id": "cap_002",
  "name": "profile_address",
  "description": "生成 EVM 地址的链上行为画像",
  
  "input": {
    "address": "0x...（必填）",
    "chain_ids": "[8453, 1, 42161]（可选，默认 Base+Ethereum+Arbitrum）",
    "lookback_days": "30 | 90 | 365（可选，默认 90）"
  },
  "output": {
    "address_type": "EOA | Contract | SmartAccount",
    "age_days": "integer",
    "total_tx_count": "integer",
    "interacted_protocols": ["protocol_name"],
    "defi_score": "integer（1-10，DeFi 参与度）",
    "risk_flags": ["high_risk_interactions"],
    "explorer_link": "https://basescan.org/address/0x..."
  },
  
  "pricing": {
    "model": "per_call",
    "amount": 0.08,
    "token": "USDC",
    "chain_id": 8453
  },
  "limits": {
    "rate_limit": "30 calls/minute",
    "daily_limit": "500 calls/day",
    "min_payment_confirmations": 1
  }
}
```

### Capability 3：交易溯源

```json
{
  "id": "cap_003",
  "name": "trace_transaction",
  "description": "深度解析单笔交易的调用链、资产流向和 MEV 影响",
  
  "input": {
    "tx_hash": "0x...（必填，66 字符 hex 含 0x）",
    "include_internal_calls": "boolean（可选，默认 true）",
    "include_mev_analysis": "boolean（可选，默认 false）"
  },
  "output": {
    "status": "success | failed | pending",
    "block_number": "integer",
    "timestamp": "ISO 8601",
    "from": "0x...",
    "to": "0x...",
    "value_eth": "float",
    "internal_calls": [{"to": "0x...", "method": "string", "value": "float"}],
    "token_transfers": [{"token": "0x...", "from": "0x...", "to": "0x...", "amount": "float"}],
    "mev_type": "sandwich | arbitrage | liquidation | none",
    "explorer_link": "https://basescan.org/tx/0x..."
  },
  
  "pricing": {
    "model": "per_call",
    "amount": 0.12,
    "token": "USDC",
    "chain_id": 8453
  },
  "limits": {
    "rate_limit": "20 calls/minute",
    "daily_limit": "300 calls/day",
    "min_payment_confirmations": 1
  }
}
```

---

## 三、Profile URI

Profile 完整 JSON 上传到 IPFS，内容寻址，不可篡改。URI 格式：

```
ipfs://bafybeihwj...abc123/agent-profile.json
```

或通过 HTTPS 网关访问：

```
https://ipfs.io/ipfs/bafybeihwj...abc123/agent-profile.json
https://chainlens.xyz/profile.json（DNSLink，指向最新 IPFS CID）
```

**为什么用 IPFS**：
- CID 是内容的 hash → Profile 改了哪怕一个字，CID 就变 → 版本不可否认
- 任何人都能通过 CID 验证「我拿到的是不是原始 Profile」
- DNSLink 让 `chainlens.xyz/profile.json` 总是指向最新版本，但历史 CID 仍然可查

---

## 四、Profile 更新机制

### 谁能更新

| 操作 | 权限 | 说明 |
|------|------|------|
| 修改 name/description | Owner EOA 签名 | 品牌信息，Owner 控制 |
| 修改 endpoint | Owner EOA 签名 + DNS 验证 | 改 endpoint 需要同时证明控制 DNS |
| 新增/修改 capability | Owner EOA 签名 | 能力变更 |
| 修改 pricing | Owner EOA 签名 | 价格变更 |
| 修改 limits | Owner EOA 签名 | 限流变更 |

**更新流程**：

```
1. Owner 生成新 Profile JSON
2. Owner 对新 JSON 的 keccak256 hash 做 EIP-712 签名
3. 上传新 JSON 到 IPFS → 得到新 CID
4. 调用链上 Registry 合约：
   Registry.updateProfile(agent_id, new_ipfs_cid, owner_signature)
5. 更新 DNSLink（如果使用了 DNS 入口）
6. 发送事件：ProfileUpdated(agent_id, old_cid, new_cid, timestamp)
```

### 更新后如何通知用户

三层通知：

| 方式 | 机制 | 到达率 |
|------|------|--------|
| **链上事件** | `ProfileUpdated` event → 订阅者（Agent、前端、钱包）实时感知 | 100%（任何人可监听） |
| **API header** | 每个请求返回 `X-Agent-Profile-CID: bafy...`，客户端检测 CID 变化 | 和 API 调用频率一致 |
| **可选推送** | Agent 维护订阅列表（callback URL / Telegram bot），推送变更通知 | 按需 |

---

## 五、证明 Endpoint 确实属于该 Agent

这是最核心的安全问题：**我怎么知道 `api.chainlens.xyz` 真的是链上注册的那个 ChainLens Agent，而不是别人搭的钓鱼站？**

### 方案：链上注册 + TLS 签名挑战

**Step 1 · 链上注册**

Agent Owner 在 Registry 合约中注册 Agent 身份时，同时提交 endpoint 的域名：

```
Registry.registerAgent({
    agent_id: "agent_0x9f42...",
    owner: 0xUserEOA...,
    endpoint: "https://api.chainlens.xyz/agent/v1",
    ipfs_cid: "bafy..."
})
```

**Step 2 · Endpoint 提供签名证明**

Agent endpoint 必须实现一个标准验证接口：

```
GET https://api.chainlens.xyz/agent/v1/.well-known/agent-proof
```

返回：

```json
{
  "agent_id": "agent_0x9f42...",
  "endpoint": "https://api.chainlens.xyz/agent/v1",
  "chain_id": 8453,
  "registry_address": "0xRegistryContract...",
  "challenge": {
    "nonce": "a1b2c3d4...",
    "timestamp": "2026-05-23T15:00:00Z",
    "signature": "0x...（用 Agent 的注册私钥对 nonce+timestamp 的签名）"
  },
  "tls_fingerprint": "sha256:abc...（当前 TLS 证书指纹）"
}
```

**Step 3 · 客户端三重验证**

客户端（或调用方 Agent）在每次调用前，执行验证：

```
验证 1：DNS → 域名确实指向该 IP ✅
验证 2：TLS → 证书有效，domain 匹配 ✅
验证 3：挑战签名 → 用链上 Registry 中的 agent_public_key 验签 ✅

三项全通过 → Endpoint 确实属于 Agent ❌ 任何一项失败 → 拒绝调用
```

**为什么三重验证缺一不可**：

| 如果只验证 | 可能被绕过 |
|------------|-----------|
| 只验证 DNS | DNS 可以被劫持 |
| 只验证 TLS | 攻击者可以给自己的域名签 TLS |
| 只验证签名 | 旧签名可能被重放 |
| **三重组合** | 攻击者需要同时控制 DNS + TLS 私钥 + Agent 私钥 → 不现实 |

### 方案补充：TLS 证书钉扎（可选高级方案）

除了签名挑战，还可以在链上存储 Agent endpoint 的 TLS 证书指纹（SHA256）。客户端验证时对比链上指纹和实际证书指纹——不一致说明 endpoint 被替换或中间人攻击。

---

## 六、完整 Profile JSON

```json
{
  "agent_id": "agent_0x9f42...a1b3",
  "name": "ChainLens",
  "description": "链上数据聚合 Agent。提供合约分析、交易溯源、地址画像和风险评分。",
  "version": "1.2.0",
  
  "owner": {
    "address": "0xUserEOA...",
    "type": "smart_account",
    "chain_id": 8453
  },
  
  "endpoint": {
    "url": "https://api.chainlens.xyz/agent/v1",
    "proof_endpoint": "https://api.chainlens.xyz/agent/v1/.well-known/agent-proof",
    "tls_fingerprint": "sha256:abc..."
  },
  
  "registry": {
    "chain_id": 8453,
    "contract_address": "0xRegistryContract...",
    "registration_tx": "0xRegistrationTxHash..."
  },
  
  "capabilities": [
    { /* analyze_contract */ },
    { /* profile_address */ },
    { /* trace_transaction */ }
  ],
  
  "update_policy": {
    "who_can_update": "owner_only",
    "signature_required": true,
    "notification_channels": ["onchain_event", "api_header"],
    "last_updated": "2026-05-23T15:00:00Z",
    "previous_cid": "bafy...old"
  },
  
  "proof": {
    "method": "onchain_registry + tls_challenge_signature",
    "verification_instructions": [
      "1. 从 Registry 获取 agent 的公钥",
      "2. 访问 .well-known/agent-proof 获取挑战签名",
      "3. 用公钥验签",
      "4. 对比 TLS 证书指纹和链上注册指纹"
    ]
  }
}
```

---

## 七、这个设计和我们之前学的内容怎么连

| 之前学的 | 这个设计里怎么用 |
|----------|-----------------|
| Safe 智能账户 | Owner 是 Safe 多签地址，改 profile 需要多人确认 |
| Cobo Pact | Capability 的 pricing + limits 就是 Pact 的动态权限定义 |
| 链上 Registry | Service Registry 模式（API 支付流里用过） |
| IPFS CID | Escrow 流程里用过——内容寻址保证不可篡改 |
| Evaluator | `.well-known/agent-proof` 的验证逻辑本质上是 Evaluator |
| 三重验证 | 和 Escrow 的 Evaluator + Arbiter 一样——不信任任何单一方 |

---

## 八、开放问题

- **DNS 仍然是中心化依赖**。如果 DNS 被劫持，三重验证中的第一重就破了。ENS（Ethereum Name Service）+ IPFS 可以替代 DNS，但用户端支持尚未普及。
- **Agent 私钥管理**。`.well-known/agent-proof` 需要 Agent 用自己的私钥签名——这个私钥存在哪？如果用 Session Key，过期了 proof 就失效。如果用 MPC（Cobo 方案），需要在 proof 接口调用 MPC 签名——增加延迟。
- **客户端执行验证的成本**。每个 API 调用前都走三重验证 → 增加延迟。实践中可能缓存「已验证」状态（比如 1 小时内有效），降低频繁调用的验证成本。
