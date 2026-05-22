# Week 1 Proof-of-Work Pack

> **学员：** tz-hao | **时间：** 2026-05-19 ~ 2026-05-22
> **总入口：** https://github.com/tz-hao/ai-web3-school-cohort-0

---

## 一、AI 学习记录

### 1.1 AI 基础篇 11 章全部学完（5/19）
📄 [daily/2026-05-19.md](daily/2026-05-19.md)

LLM → Prompt → Context → RAG → Agent → MCP → Frameworks → Vibe Coding → Evaluation → Fine-tuning → Inference

每个章节沉淀了：核心认知 + Web3 视角注意点 + 最小实践方案

### 1.2 AI 核心概念自整理（5/21）
📄 [daily/2026-05-21.md](daily/2026-05-21.md)

用自己的语言重新梳理了 6 个核心概念（LLM / Prompt / Context Window / Agent / Tool Use / AI Coding），每个包含：反常识点、实际踩坑经历、误区对照。**AI 辅助生成（~2分钟）+ 人工改写（~18分钟），比例约 1:9。**

---

## 二、Web3 学习记录

### 2.1 Chain-aware Context（5/20）
📄 [daily/2026-05-20.md](daily/2026-05-20.md)

核心：链上状态有时间性 → Agent 上下文必须带 chain id / block number / citation。能调用 ≠ 应该调用。

### 2.2 Web3 Tool Use（5/22）
📄 [daily/2026-05-22.md](daily/2026-05-22.md)

核心：读写分离、7 步交易检查链、工具权限分层。Web3 工具风险比普通 API 调用高一量级。

### 2.3 Agent Workflow 入门（5/22）
📄 [daily/2026-05-22.md](daily/2026-05-22.md)

Task Graph / State Machine / Human-in-the-loop 三个核心概念开篇。

---

## 三、AI × Web3 最小交叉实验

### 3.1 链感知上下文包提取器
📂 [experiments/chain-aware-context/](experiments/chain-aware-context/)

用 Python 写的交易上下文提取器——从 Etherscan API 读取交易详情，输出结构化链感知上下文。关键设计：
- 链上事实 vs AI 解释分两个独立字段
- 每条结论带 citation（tx hash、explorer link）
- 元数据带 chain id、block number、读取时间

### 3.2 AI × Web3 工作流流程图（2 个）

| 流程图 | 文件 | 场景 |
|--------|------|------|
| 最小工作流 | [experiments/ai-web3-workflow-simple.excalidraw](experiments/ai-web3-workflow-simple.excalidraw) | AI 生成 → 人审 → 签名 → 广播 → 验证 |
| 带风险标注完整版 | [experiments/ai-web3-minimal-workflow.excalidraw](experiments/ai-web3-minimal-workflow.excalidraw) | 同上 + swimlane 分区 + 5 个风险点 + 颜色图例 |

两张图核心设计原则：
- AI 只管读链 + 出方案，不动钱不动签名
- 人工复核是唯一不可跳过的节点
- 链上执行后验证靠 tx hash + event logs

---

## 四、AI 工具实践记录

### 4.1 Hermes Agent 搭建与日常使用
- 作为个人 Learning Agent，完成每日学习规划、打卡内容生成、Handbook 内容抓取
- 仓库维护：daily notes 自动生成、git commit + push

### 4.2 Claude Code 接入 DeepSeek
- 安装了 Claude Code CLI 并配置接入 DeepSeek 模型
- 用于代码编写辅助

### 4.3 模型切换与延迟优化
- 测试了 Hermes Agent 在不同模型下的响应延迟
- deepseek-v4-pro 经代理 ~5s，排查了网络路径（直连超时 → 代理转发 ~1.4s + 推理时间）

---

## 五、测试网实践

### 5.1 Gas 价格对比测试 — Sepolia 测试网

在 Sepolia 上用高/中/低三种 Gas Price 发送简单 ETH 转账，观察确认速度。

| | 低 Gas | 中 Gas | 高 Gas |
|------|--------|--------|--------|
| **Tx Hash** | `0xf46a9848...373e930` | `0x21bedaab...7aa43abf` | `0x2b1a3d05...2664ea20` |
| **发送金额** | 0.001 ETH | 0.002 ETH | 0.003 ETH |
| **Gas Limit** | 31,500 | 31,500 | 31,500 |
| **Gas Used** | 21,000 | 21,000 | 21,000 |
| **effectiveGasPrice** | 1.842 Gwei | 2.395 Gwei | 2.970 Gwei |
| **总手续费** | 0.000039 ETH | 0.00005 ETH | 0.000062 ETH |
| **发送时间** | 11:39:20 | 11:40:56 | 11:42:03 |
| **确认时间** | 11:39:24 | 11:41:12 | 11:42:24 |
| **确认耗时** | **~4s** | **~16s** | **~21s** |
| **状态** | ✅ Success | ✅ Success | ✅ Success |

### 关键发现

**Gas 越高 ≠ 确认越快。** 这次测试里低 Gas（1.84 Gwei）反而 4 秒确认，高 Gas（2.97 Gwei）等了 21 秒。

原因：
- Sepolia 出块间隔 ~12 秒
- 低 Gas 交易恰好赶在区块即将打包时发出（运气）
- 中/高 Gas 交易虽然付了更多，但需要等下一个区块
- **测试网区块不拥堵时，Gas Price 对确认速度影响很小**——主网拥堵场景下差异才会显著

---

## 六、本周问题 + 人工修正

### 问题：Hermes Telegram Bot 关闭终端后失联
**现象：** 关闭 WSL 终端后 Telegram 消息无响应，已反复尝试修复多次。

**排查过程：**
1. 检查 systemd 服务运行状态 → 服务在跑但日志全是 `httpx.ConnectError`
2. 对比用户级 vs 系统级服务配置 → 发现系统级服务缺失 `HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=1`
3. 根因：Telegram 库缺少该环境变量时，会尝试直连 Telegram IP（全部被墙），绕过代理 `127.0.0.1:23112`

**修正：**
```bash
sudo sed -i '/^Environment="HTTP_PROXY=/i Environment="HERMES_TELEGRAM_DISABLE_FALLBACK_IPS=1"' \
  /etc/systemd/system/hermes-gateway.service
sudo systemctl daemon-reload && sudo systemctl restart hermes-gateway
```

**收获：** 环境变量缺失是静默故障——服务正常启动、日志不报错，但所有 API 请求都在 TCP 超时。排查关键是对比两个配置文件的差异。

---

## 七、本周学习计划 vs 实际

| 计划 | 实际 |
|------|------|
| AI 基础 11 章 | ✅ 5/19 完成 |
| Chain-aware Context | ✅ 5/20 完成 + 代码实验 |
| Web3 Tool Use | ✅ 5/22 完成 |
| Agent Workflow | ✅ 5/22 开篇 |
| Agent Wallet | ⏳ 下周 |

超额产出：AI 概念自整理（5/21）、2 个 Excalidraw 流程图、Hermes 运维修复

---

## 八、待补充

- [x] 测试网 gas 对比的 tx hash ✅
- [x] WCB 平台打卡链接回填 → https://intensivecolearn.ing/programs/AI-Web3-School
- [ ] X 账号关注列表落地（xurl 配置后执行）
