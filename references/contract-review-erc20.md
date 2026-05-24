# 合约阅读 + 测试建议：OpenZeppelin ERC20 v5.5.0

> AI × Web3 School · Dev Tooling 实践  
> 核心命题：拿到一份开源 Solidity 合约，AI 辅助阅读、提取关键信息、给出测试建议——但安全结论必须人工复核

---

## 分析对象

| 属性 | 值 |
|------|-----|
| 合约 | OpenZeppelin ERC20.sol |
| 版本 | v5.5.0 |
| License | MIT |
| Solidity | ^0.8.20 |
| 源码 | https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.5.0/contracts/token/ERC20/ERC20.sol |
| 文档 | https://docs.openzeppelin.com/contracts/5.x/erc20 |
| 审计 | OpenZeppelin 合约库经过多次独立审计，是行业标准实现 |

---

## 一、合约职责和关键权限

### 合约职责

实现 ERC-20 同质化代币标准。提供代币的铸造、转账、授权和查询功能。这是一个**抽象基类**——必须被继承并实现代币的初始铸造逻辑。

### 关键权限

| 权限点 | 谁有 | 风险等级 |
|--------|------|----------|
| `_mint`（内部） | 派生合约决定 | 🟠 中——铸造权无限 = 可无限增发 |
| `_burn`（内部） | 派生合约决定 | 🟡 低——只能烧自己的或 approved 的 |
| `approve` | 任何代币持有者 | 🟠 中——approve 之后、花费之前存在 front-running 窗口 |
| `transfer` | 任何代币持有者 | 🟢 低——只能转自己的 |
| `transferFrom` | 被 approve 的 spender | 🟠 中——可以转别人批准的额度 |
| `_update`（内部） | transfer/mint/burn 调用 | 🟢 低——有 balance 检查、overflow 保护 |

### 这个合约没有的权限（继承合约可能添加）

| 缺失的权限控制 | 风险 |
|---------------|------|
| 没有 `onlyOwner` 修饰符 | 这个基类不自带 owner——如果继承合约不加 owner 控制，mint 可能被任何人调用 |
| 没有 `pause`/`unpause` | 无法紧急冻结转账 |
| 没有 `blacklist` | 无法阻止特定地址转账 |
| 没有 `permit` | 不支持无 gas 的 approve（ERC-2612 扩展需要单独引入） |

---

## 二、会移动资产的函数列表

| # | 函数 | 可见性 | 移动谁的资产 | 条件 |
|---|------|--------|-------------|------|
| 1 | `transfer(address to, uint256 value)` | public | 调用者自己的 | 余额 ≥ value，to ≠ address(0) |
| 2 | `transferFrom(address from, address to, uint256 value)` | public | from 的 | 调用者 allowance ≥ value，from 余额 ≥ value |
| 3 | `_update(from, to, value)` | internal | from → to | from=0 时 mint，to=0 时 burn |
| 4 | `_mint(address account, uint256 value)` | internal | 0 → account | 派生合约控制调用 |
| 5 | `_burn(address account, uint256 value)` | internal | account → 0 | 派生合约控制调用 |
| 6 | `approve(address spender, uint256 value)` | public | 不移动，但给 spender 授权 | — |

**关键发现**：`approve` 本身不移动资产，但它授予了 `transferFrom` 的权力。`approve(spender, type(uint256).max)` = 给 spender 永久的无限转移权。

---

## 三、3 个最值得测试的不变量

### 不变量 1：总供应量守恒

```
总供应量 = 所有地址余额之和

每次 mint(+x):   totalSupply += x, balance[account] += x  → 等式保持 ✅
每次 burn(-x):   totalSupply -= x, balance[account] -= x  → 等式保持 ✅
每次 transfer:   balance[from] -= x, balance[to] += x      → 等式保持 ✅

违反条件：如果 _update 中 unchecked 块的数值溢出。
Solidity ^0.8.0 有内置 overflow 检查，但 unchecked 块绕过了。
验证：_update 中 unchecked 块的边界条件是否正确。
```

### 不变量 2：Allowance 不能被绕过

```
任何 spender 只能花 ≤ allowance[owner][spender] 的量。

transferFrom(from, to, value):
  → _spendAllowance(from, spender, value)  // 先减 allowance
  → _transfer(from, to, value)              // 再转账

攻击场景：
  Alice approve Bob 100 tokens
  Bob 调 transferFrom(Alice, Bob, 100) → allowance 减到 0
  Bob 不能调 transferFrom(Alice, Bob, 1) → revert（allowance 不足）

特殊边界：
  approve(spender, type(uint256).max) → "无限" approve
  此时 _spendAllowance 检测到 currentAllowance == max → 不减 allowance
  这意味着 Bob 可以无限次调用 transferFrom

验证：无限 approve 的行为是否符合预期？是否有竞争条件？
```

### 不变量 3：零地址隔离

```
address(0) 不能持有代币，也不能成为 transfer 的 from 或 to。

mint:    _update(0, to, value)    → to ≠ 0  ✅
burn:    _update(from, 0, value)  → from ≠ 0 ✅
transfer: _transfer(from, to, v)  → from ≠ 0, to ≠ 0 ✅

违反条件：如果派生合约重写 _update 且不检查零地址。
验证：_transfer 和 _update 中的零地址检查是否覆盖所有入口。
```

---

## 四、5 条测试用例建议

### 测试 1：approve 的 front-running 攻击

```
场景：
  1. Alice approve Bob 100 tokens（交易在 mempool 中）
  2. Bob 看到这笔交易，抢跑：用自己的地址调 transferFrom(Alice, Bob, 100)
  3. Bob 的交易先上链 → allowance 100 → 转走 100
  4. Alice 的 approve 后上链 → allowance 改成 100（覆盖了旧的 allowance）
  5. Bob 再次 transferFrom(Alice, Bob, 100) → ✅ 又转走 100
  6. Alice 总共丢了 200

测试：
  - 模拟 approve(100) 被 transferFrom(100) 抢跑
  - 验证新 allowance 减去已花费金额后不应可重复花费
  - 测试 increaseAllowance / decreaseAllowance 是否安全替代 approve
```

### 测试 2：无限 approve 的长期风险

```
场景：
  1. Alice approve Uniswap Router type(uint256).max
  2. 6 个月后，Uniswap Router 合约被发现漏洞
  3. 攻击者利用漏洞，通过 Router 转走所有 approved 的 token
  4. Alice 的代币全部丢失（因为 allowance 还是无限）

测试：
  - 验证 type(uint256).max 的 approve 永不减少 allowance
  - 验证用户在不使用后能否 revoke（approve(spender, 0)）
  - 测试长时间不活动后 allowance 是否仍然是 max
```

### 测试 3：transfer 到合约地址的锁死

```
场景：
  1. Alice transfer(合约地址, 100) → ✅ 成功（to ≠ 0，满足条件）
  2. 合约地址不能调 transfer（没有对应函数）
  3. 100 tokens 永久锁死在合约中

测试：
  - transfer 到没有 receive/fallback 的合约地址
  - 验证 token 是否可恢复
  - 对比 ERC-20 标准是否要求检测接收方是合约
  - 测试 safeTransfer 包装方案（如 OpenZeppelin 的 SafeERC20）
```

### 测试 4：mint 到零地址

```
场景：
  - 派生合约调用 _mint(address(0), 1000)
  - _update(0, address(0), 1000):
    - from = 0 → totalSupply += 1000 ✅（通过）
    - to = 0 → _totalSupply -= 1000 ❓（从零地址又烧回去了？）
  - 实际结果：totalSupply 不变，但代币「凭空消失」

测试：
  - 直接调 _mint(0, value)
  - 验证 revert 还是静默丢失
  - 检查 _update 中对 to = 0 的处理逻辑
```

### 测试 5：transferFrom 的 allowance 精确扣减

```
场景：
  1. Alice approve Bob 100
  2. Bob transferFrom(Alice, Bob, 99) → ✅，allowance 减到 1
  3. Bob transferFrom(Alice, Bob, 2) → ❌，revert（allowance 不足）
  4. Alice approve Bob 50（新的 approve，不增量）
  5. Bob transferFrom(Alice, Bob, 50) → ✅

测试：
  - 验证 _spendAllowance 的扣减逻辑：99 → 1 → 50
  - 验证 approve 覆盖旧 allowance 时没有残留
  - 验证 decreaseAllowance 不会 underflow
```

---

## 五、需要人工复核的安全问题

### 🛑 问题 1：派生合约中 `_mint` 的调用者是谁

```
ERC20.sol 中 _mint 是 internal → 只有派生合约能调用。

风险：
  - 如果派生合约把 _mint 暴露为 public 且不加 access control → 任何人都能无限铸造
  - 如果派生合约只在 constructor 中调了一次 _mint → 安全（固定供应量）

人工复核：
  ✅ 检查派生合约中谁可以调 _mint
  ✅ 检查是否有 onlyOwner / 多签 / DAO 投票限制 mint
  ✅ 检查 constructor 后的 mint 是否有总量上限
```

### 🛑 问题 2：`unchecked` 块的正确性

```
_update 中使用了 unchecked:
  unchecked { _balances[from] = fromBalance - value; }
  unchecked { _balances[to] += value; }

依赖前提：
  - value ≤ fromBalance（前面已检查，不会 underflow）
  - balance + value ≤ totalSupply（但 totalSupply 本身可能被 mint 增加）

人工复核：
  ✅ 验证所有 unchecked 块的前置条件是否在所有调用路径上都成立
  ✅ 特别检查 mint（from = 0 的路径）和 burn（to = 0 的路径）中的 unchecked
```

### 🛑 问题 3：`approve` 和 `transferFrom` 的竞争条件

```
已知问题：approve 的 race condition（ERC-20 标准的设计缺陷）。

派生合约的缓解措施：
  - 使用 increaseAllowance / decreaseAllowance 代替 approve
  - 实现 ERC-2612 permit（链下签名授权，无 mempool 暴露）

人工复核：
  ✅ 派生合约是否提供了 increaseAllowance？
  ✅ 如果涉及大额授权，是否实现了 permit？
  ✅ 文档中是否警告了 approve 的 front-running 风险？
```

### 🛑 问题 4：标准函数的返回值

```
transfer / transferFrom / approve 都返回 bool。

但 Solidity ^0.8.0 中 revert 是默认行为（不返回 false）→ bool 返回值在大多数情况下是恒定的 true。

风险：
  - 如果有派生合约覆盖了这些函数并真的返回 false
  - 调用方的代码可能只检查 bool 返回值而没有处理 revert

人工复核：
  ✅ 派生合约是否覆盖了 transfer/transferFrom/approve？
  ✅ 如果覆盖了，返回值语义是否一致？
```

### 🛑 问题 5：继承链中的存储碰撞

```
ERC20 使用 Solidity 的默认存储布局。如果派生合约也在同一 slot 上定义了变量 → 存储碰撞 → 数据被覆盖。

人工复核：
  ✅ 派生合约是否定义了额外的状态变量？
  ✅ 是否使用了 gap 数组（`uint256[50] private __gap`）预留 slot？
  ✅ 升级合约（UUPS / Transparent Proxy）时，存储布局是否兼容？
```

---

## 六、来源链接

| 来源 | 链接 |
|------|------|
| 源码（ERC20.sol） | https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.5.0/contracts/token/ERC20/ERC20.sol |
| 官方文档 | https://docs.openzeppelin.com/contracts/5.x/erc20 |
| ERC-20 标准 | https://eips.ethereum.org/EIPS/eip-20 |
| approve front-running 问题 | https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729 |
| ERC-2612 permit 扩展 | https://eips.ethereum.org/EIPS/eip-2612 |
| SafeERC20 | https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.5.0/contracts/token/ERC20/utils/SafeERC20.sol |
| Solidity ^0.8.0 溢出保护 | https://docs.soliditylang.org/en/v0.8.20/080-breaking-changes.html |
| OpenZeppelin 审计报告 | https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/audits |

---

## 七、这个方法如何用到 AI 工具里

```
用户问：「帮我分析这个 ERC-20 合约」

AI 自动执行：
  ✅ 拉取合约源码（Etherscan API / GitHub）
  ✅ 识别合约类型（ERC-20 / ERC-721 / 自定义）
  ✅ 提取资产移动函数（transfer / approve / mint / burn）
  ✅ 提取权限点（onlyOwner / modifier / internal）
  ✅ 对比标准实现（OZ ERC-20 → 差异分析）
  ✅ 生成不变量列表（balance sum、allowance、zero address）
  ✅ 生成测试建议（按风险优先级排序）
  ✅ 标注需要人工复核的部分（🛑 标记）

AI 不能自动做：
  ❌ 不能说「这个合约安全」
  ❌ 不能替代人工对派生合约的 review
  ❌ 不能保证覆盖了所有边缘情况
```

---

## ⚠️ AI 声明

本分析由 AI 辅助生成。AI 做了以下工作：
- ✅ 从 GitHub 获取合约源码
- ✅ 提取函数列表、权限、状态变量
- ✅ 对比 ERC-20 标准识别差异
- ✅ 生成不变量和测试建议
- ✅ 标注每个安全问题的风险等级

AI **没有**做：
- ❌ AI 没有说「这个合约可以安全使用」
- ❌ AI 没有执行形式化验证
- ❌ AI 没有测试派生合约的具体实现

**本分析中的 🛑 标记项必须由人工 Solidity 开发者逐项复核。**
