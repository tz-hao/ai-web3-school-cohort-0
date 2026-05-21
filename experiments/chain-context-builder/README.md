# Chain Context Builder

> AI × Web3 School 最小可交互学习产物 — Experiments/001

## 这是什么

一个 CLI 工具，输入合约地址或交易哈希，输出 AI Agent 可读的**结构化链感知上下文包**。

直接实践 Handbook 章节：
- [Chain-aware Context](https://aiweb3.school/zh/handbook/bridge/chain-aware-context/)
- [Web3 Tool Use](https://aiweb3.school/zh/handbook/bridge/web3-tool-use/)

## 为什么做这个

学完这两章后，核心问题是：**Agent 在操作链上之前到底需要看到什么？**

这个工具把抽象的「知识节点」变成可运行的输出——让学习者直观感受上下文包的结构，理解每个字段为什么必须存在。

## 怎么用

```bash
# 演示模式（无需输入，用 Uniswap V2 Router 作为示例）
python builder.py --demo

# 合约模式
python builder.py --contract 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D

# 交易模式
python builder.py --tx 0x1234...

# 交互模式（推荐）
python builder.py
```

## Provenance

| 部分 | 来源 | 说明 |
|------|------|------|
| 上下文模板结构 | [AI] 设计 | 基于 Handbook 知识节点 |
| 知识节点定义 | [AI] 提取 + [H✓] 验证 | 来自 Handbook 原文 |
| 链上数据 | [SIM] 模拟 | 需替换为真实 RPC/API 调用 |
| Explorer URL | [AI] 生成 | 基于网络 ID 拼接 |
| 风险检查清单 | [AI] 生成 | 基于 Contract Write 安全规范 |
| 代码实现 | [AI] 编写 + [H✓] 审核 | tz-hao 审核 |

## 演进路线

- [ ] 接入 Etherscan API → 替换 [SIM] 数据
- [ ] 接入 viem → 真实 RPC 查询
- [ ] 输出 JSON 格式 → 对接 Agent 工作流
- [ ] 加入 simulation 结果展示
