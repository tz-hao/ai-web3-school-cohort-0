# Safe + Session Key 部署实操笔记

> AI × Web3 School · Agent Wallet 深入
> 日期：2026-05-25
> 关联章节：Bridge #4 (Machine Payment), #6 (Agent Identity), #14 (Dev Tooling)

---

## 一、这个实验做了什么

在 Anvil fork 上部署 Safe 智能账户 + AllowanceModule，完整演示 AI Agent 作为受限签名者的钱包架构。

两个脚本：
- `deploy-safe.ts` — 部署 Safe + 提案-确认模式演示 + Session Key 映射说明
- `test-allowance.ts` — AllowanceModule 完整交互（delegate 添加 → 限额设置 → EIP-712 签名转账 → 超额拦截）

---

## 二、核心发现

### 发现 1：Safe 的「提案-确认」模式天然适合 Agent

```
传统钱包：私钥 → 完全控制 → 签名 = 执行
Agent 钱包：Agent 构建提案 → 人（或另一个 Agent）签名 → Safe 执行
```

这不是 "Agent 能不能签名" 的问题，而是**签名不等于执行**。Safe 把这两个动作分开了。

和 Bridge 的对应：
- Web3 Tool Use（#2）的"读写分离" → Safe 的 construct vs execute
- Agent Workflow（#3）的 human-in-the-loop → Safe 的阈值签名
- Machine Payment（#4）的 Session Key 限额 → AllowanceModule 的 delegate + allowance

### 发现 2：AllowanceModule 比 Session Key 更强大

对比你在 Bridge 里学的 Session Key 模式：

| 特性 | 简单 Session Key | Safe AllowanceModule |
|------|-----------------|---------------------|
| 限额 | 每日总额 | 每个 token 独立限额 |
| 时效 | 固定过期时间 | 自动重置周期（可配） |
| 白名单 | 无 | 每 token 单独设置 allowance |
| 撤销 | 删私钥 | removeDelegate() 一次性清除 |
| 重放保护 | 无（通常） | EIP-712 签名 + nonce |
| 签名方式 | 简单私钥签名 | EIP-712 类型化签名 |

AllowanceModule 相当于一个**可编程的 Session Key 引擎**，不是简单的「授权-过期」二元逻辑。

### 发现 3：Agent 安全沙箱的前置条件

做 Agent Security Sandbox（Open Track 设计）之前，必须理解 Safe 的权限模型：

```
攻击面向：
1. Agent 的 delegate 私钥泄露 → 攻击者在限额内随意花钱
2. Allowance 设置过高 → 攻击窗口过大
3. Delegate 重放攻击 → 如果 nonce 管理不善
4. AllowanceModule 本身合约漏洞 → 最坏情况

Sandbox 应该测：
✓ 限额真的锁死了吗？（超额测试）
✓ Nonce 重放被拦截了吗？
✓ removeDelegate 后旧签名还能用吗？
✓ 多个 delegate 之间的 allowance 互相隔离吗？
✓ resetTime 边界条件（刚好在重置时刻的攻击）
```

### 发现 4：ERC-4337 + Safe 是 Agent 钱包的终局架构

```
用户
  │
  ├── Safe 智能账户（链上多签）
  │     ├── AllowanceModule（Session Key 限额引擎）
  │     ├── 其他模块（白名单、Timelock、Social Recovery）
  │     └── ERC-4337 EntryPoint（无 Gas 交易）
  │
  ├── Agent #1（delegate: 每日 100 USDC 额度）
  ├── Agent #2（delegate: 只读，没有额度）
  └── 人（owner: 无限制，所有操作需签名）
```

这个架构同时解决了三个问题：
1. **谁有权限** → Safe 的 owner/delegate 模型
2. **权限多大** → AllowanceModule 的 token 级限额
3. **谁付 Gas** → ERC-4337 Paymaster

---

## 三、和 Bridge 15 章的连接

回到 2026-05-24 的 Bridge 总结，这次实操验证了：

| Bridge 章节 | 在这次实验中的体现 |
|------------|-------------------|
| #4 Machine Payment | AllowanceModule = Session Key 的链上实现。不是「Agent 自觉不超支」，是「合约强制不超支」 |
| #6 Agent Identity | Delegate 地址 = Agent 的链上身份。Safe 的 owner 和 delegate 分开——Agent 不拥有 Safe，只是被授权 |
| #7 Trust & Reputation | 每次 executeAllowanceTransfer 触发事件 → 事件可作为声誉系统的原始数据 |
| #14 Dev Tooling | protocol-kit 让部署 Safe 和构建交易变得像调用 SDK 一样简单 |
| #15 Open Track | 这次实验直接为 Agent Security Sandbox 提供了被测对象（Safe + AllowanceModule） |

**Bridge 的三条主线在这次实验中全部验证：**

1. **权限分层**：owner（无限） → delegate（token 限额） → 无权限（不能动 Safe 的钱）
2. **可验证性**：allowance 和 spent 全在链上，任何人都能查
3. **人始终有最终控制权**：removeDelegate() 不需要 delegate 同意，一键 kill switch

---

## 四、技术栈笔记

```
@safe-global/protocol-kit  — Safe 部署 + 交易构建（TypeScript SDK）
@safe-global/relay-kit     — ERC-4337 Safe4337Pack（bundler 集成）
@safe-global/safe-modules  — AllowanceModule 合约源码（Hardhat/Foundry）
viem                       — Wallet/Public Client + encodeFunctionData
Anvil                      — 链 fork（Base L2）
```

关键 API 路径：
```
Safe.init({ predictedSafe })                 → 初始化未部署的 Safe
protocolKit.createSafeDeploymentTransaction() → 构建部署交易
protocolKit.connect({ safeAddress })          → 连接到已部署的 Safe
protocolKit.createTransaction({ transactions }) → 构建 Safe 交易
protocolKit.signTransaction(safeTx)           → owner 签名
protocolKit.executeTransaction(signedTx)      → 执行

Safe4337Pack.init({ bundlerUrl, options })    → 初始化 4337 Safe
safe4337Pack.createTransaction({ transactions }) → 创建 UserOp
safe4337Pack.signSafeOperation(safeOp)        → 签名 UserOp
safe4337Pack.executeTransaction({ executable }) → 提交给 bundler
```

---

## 五、未解决的问题

1. **AllowanceModule 在主网上有部署吗？** 截至 2026-05，safe-modules 仓库中的 AllowanceModule 似乎还在开发/审计阶段。生产环境用 Safe 的什么机制来实现 Session Key？

2. **Safe 的 Spending Limits（旧模块）和 AllowanceModule（新模块）是什么关系？** 老 Safe 用户用的是什么？迁移路径是什么？

3. **多 delegate 并发操作同一个 Safe 的安全边界是什么？** 两个 Agent 同时花同一个 token，累计限额检查在高并发下是否有竞争条件？

4. **和 Cobo CAW 的对比**：Safe AllowanceModule 是链上合约级别的限额，Cobo 是 MPC 签名级别的控制。两者的安全假设完全不同——什么时候用哪个？

---

## 六、下一步

- [ ] 在 Anvil fork 上实际编译并部署 AllowanceModule
- [ ] 编写完整的 EIP-712 签名 + executeAllowanceTransfer 测试
- [ ] 将 Safe + AllowanceModule 作为 Agent Security Sandbox 的被测对象
- [ ] 对比 Safe AllowanceModule 和 Cobo 的 Pact 协议在限额执行上的差异

---

## ⚠️ AI 声明

本实操笔记由 AI 辅助生成。AI 做了：Safe protocol-kit 和 AllowanceModule API 的研究、部署脚本的编写、和 Bridge 章节的关联分析。以下需要人工验证：
- AllowanceModule 在生产环境的实际部署状态
- EIP-712 签名构建的域分隔符是否正确（需要在 fork 上实际测试）
- Safe 版本兼容性（protocol-kit v5 + safe-modules 的版本匹配）
