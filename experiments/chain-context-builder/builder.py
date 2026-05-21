#!/usr/bin/env python3
"""
Chain Context Builder — AI x Web3 School 最小可交互学习产物

一个 CLI 工具，输入合约地址或交易哈希，输出 AI Agent 可读的结构化上下文包。
直接实践 Handbook 章节：Chain-aware Context + Web3 Tool Use

用法:
    python builder.py                            # 交互模式
    python builder.py --tx 0x1234...             # 交易模式
    python builder.py --contract 0x5678...       # 合约模式
    python builder.py --demo                     # 演示模式（无需输入）

Author: AI-assisted (Claude Code) + Human review (tz-hao)
License: MIT
"""

import sys
import json
import textwrap
import os
from datetime import datetime

# Windows GBK 编码兼容
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ============================================================
# 知识节点定义（Handbook: Chain-aware Context）
# 这部分由 AI 根据 Handbook 内容提取，人工验证
# ============================================================

KNOWLEDGE_NODES = {
    "onchain_data": {
        "name": "On-chain Data",
        "difficulty": "初级",
        "desc": "链上可直接验证的数据：余额、交易、日志、合约状态、区块信息",
        "required_fields": ["chain_id", "block_number", "contract_address", "method", "return_value", "read_time"],
        "risk": "缺少字段会导致跨链、跨时间、跨合约数据混淆"
    },
    "contract_docs": {
        "name": "Contract Docs",
        "difficulty": "初级",
        "desc": "合约设计意图、参数含义、权限边界。ABI 只给函数签名，不给业务语义",
        "required_fields": ["contract_address", "version", "owner", "proxy_implementation", "recent_events"],
        "risk": "文档可能过期，必须用链上数据交叉验证"
    },
    "abi_event": {
        "name": "ABI / Event",
        "difficulty": "中级",
        "desc": "ABI 决定能调什么，Event 记录发生过什么。能调用 ≠ 应该调用",
        "required_fields": ["function_signature", "event_signature", "indexed_params"],
        "risk": "写交易前还需要权限、余额、allowance、simulation 和 policy 检查"
    },
    "tx_history": {
        "name": "Transaction History",
        "difficulty": "中级",
        "desc": "用户或合约过去做过什么，用于判断授权、执行历史、风险交互",
        "required_fields": ["tx_hash", "block_number", "from", "to", "method", "value", "token_transfers", "logs"],
        "risk": "不能只看自然语言总结，证据必须能回到链上"
    },
    "explorer": {
        "name": "Explorer Context",
        "difficulty": "初级",
        "desc": "区块浏览器提供的可视化证据——交易成功？合约验证？源码公开？",
        "required_fields": ["explorer_url", "verification_status", "source_code_available"],
        "risk": "给 explorer link 比 AI 自己说'交易成功'更可靠"
    },
    "citation": {
        "name": "Citation",
        "difficulty": "初级",
        "desc": "每条关键结论都必须有链上来源——tx hash、block number、explorer link",
        "required_fields": ["source_type", "source_value", "source_network"],
        "risk": "没有 citation 的解释只是观点，不是事实"
    }
}

# ============================================================
# 上下文模板（AI 根据 Handbook 设计，人工验证结构合理性）
# ============================================================

CONTEXT_TEMPLATE = """
╔══════════════════════════════════════════════════════════════╗
║            Chain-aware Context Package                     ║
║            AI × Web3 School Learning Tool                  ║
╚══════════════════════════════════════════════════════════════╝

📋 USER GOAL
{user_goal}

🔗 NETWORK
  Chain ID    : {chain_id}
  Network     : {network_name}
  RPC         : {rpc_url}

👤 ENTITY
  Address     : {address}
  Type        : {entity_type}
  ETH Balance : {eth_balance}

📜 CONTRACT (if applicable)
{contract_section}

📊 ON-CHAIN DATA
  Block       : {block_number}
  Timestamp   : {timestamp}
  Data Source : {data_source}
  Freshness   : {data_freshness}

📝 RECENT ACTIVITY
{recent_activity}

🔍 EXPLORER LINKS
{explorer_links}

⚠️  RISK FLAGS
{risk_flags}

📎 CITATIONS
{citations}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️  PROVENANCE LEGEND
  [AI]  = AI-generated (by Chain Context Builder)
  [H✓]  = Human-verified (needs user confirmation)
  [SIM] = Simulated data (replace with real RPC/API call)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# ============================================================
# 核心逻辑
# ============================================================

DEMO_TX = "0x8e4b2a9c1f7d3e5a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"
DEMO_CONTRACT = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"  # Uniswap V2 Router

NETWORKS = {
    "1": {"name": "Ethereum Mainnet", "rpc": "https://eth.llamarpc.com", "explorer": "https://etherscan.io"},
    "137": {"name": "Polygon", "rpc": "https://polygon.llamarpc.com", "explorer": "https://polygonscan.com"},
    "42161": {"name": "Arbitrum One", "rpc": "https://arb1.arbitrum.io/rpc", "explorer": "https://arbiscan.io"},
    "10": {"name": "OP Mainnet", "rpc": "https://mainnet.optimism.io", "explorer": "https://optimistic.etherscan.io"},
    "8453": {"name": "Base", "rpc": "https://mainnet.base.org", "explorer": "https://basescan.org"},
}


def build_context_tx(tx_hash: str, chain_id: str = "1", user_goal: str = "") -> str:
    """[AI] 从交易哈希构建上下文包。当前使用模拟数据——替换为真实 RPC 调用即可接入生产。"""
    net = NETWORKS.get(chain_id, NETWORKS["1"])

    context = CONTEXT_TEMPLATE.format(
        user_goal=user_goal or f"[AI] 分析交易 {tx_hash[:10]}... 的上下文",
        chain_id=f"{chain_id} [AI]",
        network_name=f"{net['name']} [AI]",
        rpc_url=f"{net['rpc']} [SIM]",
        address="0x1234...5678 [SIM]  ← 替换为实际 from 地址",
        entity_type="EOA [AI]",
        eth_balance="1.234 ETH [SIM]  ← 替换为实际 RPC 查询结果",
        contract_section=textwrap.dedent(f"""\
            [AI] 交易中未检测到合约交互。如果交易调用了合约，请补充：
            - Contract Address: [H✓]
            - ABI / Verified: [H✓]
            - Method Called: [H✓]"""),
        block_number="20123456 [SIM]  ← 替换为实际 block number",
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC [AI]"),
        data_source=f"{net['explorer']} [SIM]",
        data_freshness="实时（模拟）[SIM]",
        recent_activity=f"  [SIM] 最近 10 笔交易（模拟数据，需替换为 Etherscan API 查询结果）\n"
                        f"  [H✓] 用户需确认：是否授权过？是否和高风险合约交互过？",
        explorer_links=f"  📎 {net['explorer']}/tx/{tx_hash} [AI]",
        risk_flags=textwrap.dedent("""\
            [AI] 自动检测到以下风险提示（模拟）：
            ⚠️  未验证合约交互 —— 交易可能调用了未验证合约
            ⚠️  数据为模拟数据 —— 生产环境必须使用真实 RPC
            [H✓] 人工确认：没有检测到异常大额转账"""),
        citations=textwrap.dedent(f"""\
            1. [AI]  Explorer: {net['explorer']}/tx/{tx_hash}
            2. [SIM] On-chain data: RPC {net['rpc']} (mock)
            3. [H✓] 人工验证: 此上下文包由 {datetime.now().strftime('%Y-%m-%d')} 生成，需用户交叉验证""")
    )
    return context


def build_context_contract(contract_address: str, chain_id: str = "1", user_goal: str = "") -> str:
    """[AI] 从合约地址构建上下文包。展示 Agent 在交互前需要知道什么。"""
    net = NETWORKS.get(chain_id, NETWORKS["1"])

    context = CONTEXT_TEMPLATE.format(
        user_goal=user_goal or f"[AI] 分析合约 {contract_address[:10]}... 的交互上下文",
        chain_id=f"{chain_id} [AI]",
        network_name=f"{net['name']} [AI]",
        rpc_url=f"{net['rpc']} [SIM]",
        address=f"{contract_address} [AI]",
        entity_type="Contract [AI]",
        eth_balance="N/A（合约地址）[SIM]",
        contract_section=textwrap.dedent(f"""\
            Contract Address : {contract_address} [AI]
            Verified Source  : [H✓] 请在 {net['explorer']}/address/{contract_address}#code 确认
            Proxy?           : [H✓] 需检查是否代理合约及 implementation 地址
            Owner            : [H✓] 需通过 owner() 或类似方法查询
            Recent Upgrade?  : [H✓] 需检查 Upgraded / AdminChanged 事件
            Risk Note        : [AI] 合约信息需人工验证。ABI 只给函数签名，文档补足语义。"""),
        block_number="最新区块 [SIM]  ← 替换为实际查询",
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC [AI]"),
        data_source=f"{net['explorer']} [SIM]",
        data_freshness="需在调用前重新查询 [AI]",
        recent_activity=f"  [SIM] 最近事件（模拟，需替换为真实 event log 查询）\n"
                        f"  [H✓] 关键检查：Transfer / Swap / Deposit / OwnershipTransferred 事件",
        explorer_links=f"  📎 {net['explorer']}/address/{contract_address} [AI]\n"
                       f"  📎 {net['explorer']}/address/{contract_address}#code [AI]",
        risk_flags=textwrap.dedent("""\
            [AI] Agent 交互前检查清单（Handbook: Web3 Tool Use / Contract Write）：
            ⬜ chain id 和目标合约地址确认
            ⬜ ABI method 和 args 已结构化
            ⬜ value 和 token 变化预估已完成
            ⬜ gas 估算已完成
            ⬜ simulation 结果已检查
            ⬜ policy 检查已通过
            ⬜ 用户或 Smart Account 授权已获得
            [H✓] 以上清单需逐项人工确认后方可写链"""),
        citations=textwrap.dedent(f"""\
            1. [AI]  Explorer: {net['explorer']}/address/{contract_address}
            2. [AI]  Handbook: aiweb3.school/zh/handbook/bridge/chain-aware-context/
            3. [H✓] 人工验证: 此上下文包由 {datetime.now().strftime('%Y-%m-%d')} 生成，数据需交叉验证""")
    )
    return context


def interactive_mode():
    """[AI] 交互式问答流——模拟 Agent 在获取上下文前需要收集的信息。"""
    print("\n🧠 Chain Context Builder — Interactive Mode\n")
    print("这个工具帮助你理解：AI Agent 在操作链上之前需要看到什么上下文。\n")

    print("━" * 60)
    print("Step 1: 你的目标是什么？（自然语言即可）")
    print("例: '我想在 Uniswap 上用 100 USDC 换 ETH'")
    user_goal = input("> ").strip()

    print("\n" + "━" * 60)
    print("Step 2: 选择一个网络:")
    for k, v in NETWORKS.items():
        print(f"  [{k}] {v['name']}")
    chain_id = input("> ").strip()
    if chain_id not in NETWORKS:
        chain_id = "1"
        print(f"  → 默认使用 Ethereum Mainnet")

    print("\n" + "━" * 60)
    print("Step 3: 输入合约地址或交易哈希（留空进入演示模式）:")
    target = input("> ").strip()

    print("\n" + "━" * 60)
    print("Step 4: 输入模式？")
    print("  [1] 合约交互上下文（Contract Read/Write 前需要什么）")
    print("  [2] 交易分析上下文（Transaction History 视角）")
    mode = input("> ").strip()

    if not target:
        target = DEMO_CONTRACT
        print(f"\n  📢 演示模式：使用 Uniswap V2 Router 作为示例")

    print("\n⏳ 生成上下文包...\n")

    if mode == "2":
        result = build_context_tx(target, chain_id, user_goal)
    else:
        result = build_context_contract(target, chain_id, user_goal)

    print(result)
    print_knowledge_map()
    print_provenance_summary()


def print_knowledge_map():
    """[AI] 展示生成的上下文包调用了哪些 Handbook 知识节点。"""
    print("━" * 60)
    print("📚 涉及的 Handbook 知识节点:\n")
    for key, node in KNOWLEDGE_NODES.items():
        applied = "✅" if key in ["onchain_data", "contract_docs", "abi_event", "explorer", "citation"] else "⬜"
        print(f"  {applied} {node['name']} ({node['difficulty']}): {node['desc']}")
    print(f"\n  🔗 完整 Handbook: https://aiweb3.school/zh/handbook/bridge/chain-aware-context/")


def print_provenance_summary():
    """[AI] 溯源总结——哪些是 AI 生成的，哪些需要人工验证。"""
    print("━" * 60)
    print("🔍 Provenance 总结（AI 辅助 vs 人工验证）:\n")
    print("  🤖 AI 辅助完成:")
    print("     - 上下文模板结构设计（基于 Handbook 知识节点）")
    print("     - Explorer URL 生成")
    print("     - 风险检查清单生成")
    print("     - 知识节点映射")
    print("     - 输出格式化")
    print()
    print("  🧑 需要人工验证/替换:")
    print("     - 所有 [SIM] 标记的链上数据 → 替换为真实 RPC/Etherscan API 调用")
    print("     - 合约源码验证状态 → 在 Explorer 上确认")
    print("     - Owner / Proxy 信息 → 链上查询确认")
    print("     - 交易历史 → 从真实索引层查询")
    print("     - 写链前的 checklist → 逐项确认")
    print()
    print("  💡 下一步：将 [SIM] 替换为真实 API 调用（viem + Etherscan API），")
    print("     这个工具就可以作为生产级 Agent 的上下文层。")


def main():
    if "--demo" in sys.argv:
        print("📢 演示模式\n")
        print(build_context_contract(DEMO_CONTRACT, "1", "演示：展示 Agent 在和 Uniswap V2 Router 交互前需要的上下文"))
        print_knowledge_map()
        print_provenance_summary()
    elif "--tx" in sys.argv:
        idx = sys.argv.index("--tx")
        tx_hash = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else DEMO_TX
        print(build_context_tx(tx_hash))
    elif "--contract" in sys.argv:
        idx = sys.argv.index("--contract")
        contract = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else DEMO_CONTRACT
        print(build_context_contract(contract))
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
