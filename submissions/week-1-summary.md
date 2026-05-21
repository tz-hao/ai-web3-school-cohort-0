# Week 1 学习总结 — AI × Web3 School

> 2026-05-21 · 发布平台：X / Twitter
> 可直接复制发布，每段之间建议配图或空行分隔

---

AI × Web3 School Week 1 结束，最大的收获不是「学到了什么新名词」，而是**终于把 Agent 这个概念从 buzzword 变成了可操作的理解**。

之前一直听别人提 Agent，不懂到底是什么。现在明白了：

Agent ≠ 更聪明的 LLM。
Agent = LLM + 工具 + 循环。

打个比方：LLM 是被关在黑屋里的打印机——能生成文本但对外界一无所知。Agent 是这间屋子开了几扇窗户——它可以调 RPC、读合约、查浏览器、请求签名，然后根据返回结果决定下一步。

这个理解对我做开发方向特别重要：Agent 的能力边界不是模型决定的，是**工具权限**决定的。

---

本周的另一个收获是重新理解了钱包。

钱包不是「装币」的地方。MetaMask 弹出确认窗口时，币一直在链上没动过。钱包只是签名器——证明你有权移动它们。

那问题来了：Agent 要操作链上，私钥给不给它？

不给，Agent 就是个只读问答机。
给，Agent 被你攻破 = 全部资产归零。

所以 Agent 钱包不能是 EOA（一把私钥全或无），必须是智能账户——用 Session Key 让 Agent 在「有限时间 × 有限额度 × 白名单合约」内自动操作。

---

一个 AI × Web3 交叉问题：

Agent 可以发起支付吗？

技术上可以。但关键不是「能不能」，而是「什么条件下能」。
- 只读查询 → 自动允许
- 小额白名单支付 → Session Key 允许
- 大额转账 → 必须人工确认
- 任意合约调用 → 默认禁止

Web3 Tool Use 章节的核心原则就一句：模型可以选择工具，但工具必须用确定性边界限制模型。

---

本周 Proof-of-Work：

1. GitHub 学习仓库：github.com/tz-hao/ai-web3-school-cohort-0
2. Chain Context Builder — 一个 Python CLI 工具，输入合约地址输出 Agent 结构化上下文包
3. EOA vs 智能账户 vs 多签对比
4. 9 个 Web3 核心概念笔记 + AI↔Web3 概念对应关系

---

还没解决的问题：

下一步想探索钱包插件安全——Agent 在浏览器环境里操作钱包时，插件注入、恶意 dApp 弹窗、签名混淆这些攻击面怎么防。

这是 Week 2 的方向。

---

#AIxWeb3School #Web3 #AIAgent #SmartAccount #Week1

---

## 发布清单

- [ ] 复制以上内容到 X/Twitter 发布
- [ ] 可选：配一张 repo 截图或 Chain Context Builder 输出截图
- [ ] 发布后把链接回填到 `daily/2026-05-21.md` 的打卡链接栏
- [ ] 手动在 WCB 平台提交打卡
