# Hackathon 项目

> SafePay Guard Wallet — 面向 Web3 用户和 DAO 的安全钱包执行助手

## 项目简介

SafePay Guard Wallet 让 AI Agent 在严格权限边界内执行链上操作：
- Agent 解释交易意图，但不直接持有资金
- Safe 智能账户 + AllowanceModule 提供链上强制限额
- x402 协议实现 Agent 自主小额支付
- 所有操作留审计日志

## MVP 模块

- [ ] Payment requirement parser（x402 解析）
- [ ] Policy engine（预算/白名单/时间窗口检查）
- [ ] Risk explainer（交易前风险说明）
- [ ] CAW / Safe mock signer
- [ ] Audit log
- [ ] Attack simulator → regression test

## 相关文件

- `../submissions/week2-final-safe-wallet-proposal.md`
- `../submissions/week2-module-f-threat-model.md`
- `../experiments/safe-session-key/`
- `../experiments/x402-caw-agent-payment/`
