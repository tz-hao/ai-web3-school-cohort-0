"""
交易上下文包提取器 (Transaction Context Pack Extractor)
================================================
最小实践：给一笔公开交易做上下文包。

从 Etherscan API 读取交易详情，输出结构化的链感知上下文。
每个关键结论都附上来源（tx hash / explorer link），
并区分「链上事实」和「AI 解释」。

用法：
    python3 extract_tx_context.py <tx_hash> [chain]
    
示例：
    python3 extract_tx_context.py 0x2d1e3b3d8a8c9e0f1a2b3c4d5e6f7a8b9c0d1e2f
"""

import json
import sys
import urllib.request
import urllib.error

# ─── Configuration ───────────────────────────────────────────────────────────

# 免费 Etherscan API: 不需要 key 也能用，但有限速
# 最好换成你自己的 key：https://etherscan.io/myapikey
ETHERSCAN_API_KEY = ""

ETHERSCAN_API_URLS = {
    "ethereum": "https://api.etherscan.io/api",
    "base": "https://api.basescan.org/api",
    "arbitrum": "https://api.arbiscan.io/api",
    "polygon": "https://api.polygonscan.com/api",
    "optimism": "https://api-optimistic.etherscan.io/api",
}

CHAIN_INFO = {
    "ethereum": {"name": "Ethereum Mainnet", "chain_id": 1, "explorer": "https://etherscan.io/tx/"},
    "base": {"name": "Base Mainnet", "chain_id": 8453, "explorer": "https://basescan.org/tx/"},
    "arbitrum": {"name": "Arbitrum One", "chain_id": 42161, "explorer": "https://arbiscan.io/tx/"},
    "polygon": {"name": "Polygon Mainnet", "chain_id": 137, "explorer": "https://polygonscan.com/tx/"},
    "optimism": {"name": "OP Mainnet", "chain_id": 10, "explorer": "https://optimistic.etherscan.io/tx/"},
}


def fetch_from_explorer(params: dict, chain: str) -> dict:
    """调用区块浏览器 API"""
    base_url = ETHERSCAN_API_URLS.get(chain)
    if not base_url:
        raise ValueError(f"Unknown chain: {chain}")
    
    params["apikey"] = ETHERSCAN_API_KEY
    url = base_url + "?" + urllib.parse.urlencode(params)
    
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"⚠️  API 请求失败: {e.code} {e.reason}", file=sys.stderr)
        return {"status": "0", "message": "HTTP error", "result": []}
    except Exception as e:
        print(f"⚠️  请求异常: {e}", file=sys.stderr)
        return {"status": "0", "message": str(e), "result": []}


def fetch_tx_receipt(tx_hash: str, chain: str) -> dict | None:
    """获取交易收据"""
    params = {
        "module": "proxy",
        "action": "eth_getTransactionReceipt",
        "txhash": tx_hash,
    }
    data = fetch_from_explorer(params, chain)
    if data.get("status") == "1" and data.get("result"):
        return data["result"]
    return None


def fetch_tx_by_hash(tx_hash: str, chain: str) -> dict | None:
    """获取交易详情（standard API）"""
    params = {
        "module": "account",
        "action": "txlist",
        "address": "0x0000000000000000000000000000000000000000",  # dummy
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": 1,
        "sort": "asc",
        # Hack: 我们直接用 proxy API
    }
    return None


def fetch_tx_by_proxy(tx_hash: str, chain: str) -> dict | None:
    """通过 proxy API 获取交易详情"""
    params = {
        "module": "proxy",
        "action": "eth_getTransactionByHash",
        "txhash": tx_hash,
    }
    data = fetch_from_explorer(params, chain)
    if data.get("status") == "1" and data.get("result"):
        return data["result"]
    return None


def hex_to_int(hex_str: str) -> int | str:
    """将 hex 值转为人类可读整数"""
    if not hex_str or hex_str == "0x":
        return 0
    try:
        return int(hex_str, 16)
    except (ValueError, TypeError):
        return hex_str


def wei_to_eth(wei: int | str) -> float:
    """Wei → ETH"""
    return int(wei) / 10**18


def decode_method_id(data: str) -> tuple:
    """从交易 input data 提取 method selector"""
    if not data or data == "0x":
        return ("transfer (native)", None)
    
    # 前 4 字节 = method selector
    selector = data[2:10] if len(data) >= 10 else data[2:]
    
    # 常见 method selector 映射
    known_selectors = {
        "0x095ea7b3": ("approve(address,uint256)", "批准授权"),
        "0xa9059cbb": ("transfer(address,uint256)", "转账代币"),
        "0x23b872dd": ("transferFrom(address,address,uint256)", "代付转账"),
        "0x7ff36ab5": ("swapExactETHForTokens(uint256,address[],address,uint256)", "ETH 兑代币"),
        "0x38ed1739": ("swapExactTokensForETH(uint256,uint256,address[],address,uint256)", "代币兑 ETH"),
        "0x5c11d795": ("swapExactTokensForTokens(uint256,uint256,address[],address,uint256)", "代币兑代币"),
        "0xe449022e": ("swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)", "ETH→代币(支持转账税)"),
        "0xb6f9de95": ("swapExactTokensForETHSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)", "代币→ETH(支持转账税)"),
        "0x414bf389": ("deposit()", "WETH 存款"),
        "0x2e1a7d4d": ("withdraw(uint256)", "WETH 取款"),
        "0xfbde5f26": ("addLiquidityETH(address,uint256,uint256,uint256,address,uint256)", "添加 ETH 流动性"),
        "0x125e7a71": ("claimRewards(address[])", "领取奖励"),
        "0xa694fc3a": ("stake(uint256)", "质押"),
        "0x2e17de78": ("unstake(uint256)", "解质押"),
    }
    
    return known_selectors.get("0x" + selector, (f"unknown_0x{selector}", "未知方法"))


def parse_logs(receipt_logs: list) -> list:
    """解析交易事件日志（简化版）"""
    events = []
    for log in receipt_logs or []:
        topics = log.get("topics", [])
        event_sig = topics[0] if topics else "0x"
        
        # 常见事件签名
        known_events = {
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822": "Swap",
        }
        
        event_name = known_events.get(event_sig, f"Unknown({event_sig[:18]}...)")
        
        events.append({
            "event": event_name,
            "address": log.get("address", ""),
            "topics": topics,
            "data": log.get("data", "0x"),
            "log_index": hex_to_int(log.get("logIndex", "0x0")),
        })
    
    return events


def build_context_pack(tx_hash: str, chain: str = "ethereum") -> dict:
    """
    构建完整的链感知上下文包。
    
    返回结构：
    {
        "meta": { chain info, timestamp },
        "tx": { on-chain facts from RPC },
        "events": [ parsed event logs ],
        "interpretation": { human-readable summary },
        "citations": [ all evidence links ],
        "boundaries": { what is fact vs what is interpretation }
    }
    """
    chain_info = CHAIN_INFO.get(chain, {"name": chain, "chain_id": 0, "explorer": ""})
    explorer_link = chain_info["explorer"] + tx_hash
    
    # 第 1 步：读取链上数据（从 RPC/proxy API）
    tx_data = fetch_tx_by_proxy(tx_hash, chain)
    
    context = {
        "meta": {
            "tx_hash": tx_hash,
            "chain": chain_info["name"],
            "chain_id": chain_info["chain_id"],
            "explorer_url": explorer_link,
            "retrieved_at": "2026-05-20 (learning experiment)",
        },
        "onchain_facts": {},
        "events": [],
        "interpretation": "",
        "citations": [],
        "boundaries": {
            "facts_from_rpc": [],
            "ai_interpretation": [],
        },
    }
    
    if not tx_data:
        context["onchain_facts"] = {
            "error": f"无法从 {chain} 的区块浏览器 API 读取交易数据。可能是合约内部交易或索引未覆盖。",
            "tx_hash": tx_hash,
            "explorer_url": explorer_link,
        }
        context["boundaries"]["facts_from_rpc"].append("未获取到 RPC 数据，以下内容仅基于交易哈希")
        return context
    
    # 第 2 步：提取链上事实（RPC 返回的原始数据）
    wei_value = hex_to_int(tx_data.get("value", "0x0"))
    gas_price = hex_to_int(tx_data.get("gasPrice", "0x0"))
    gas_limit = hex_to_int(tx_data.get("gas", "0x0"))
    nonce = hex_to_int(tx_data.get("nonce", "0x0"))
    block_number = hex_to_int(tx_data.get("blockNumber", "0x0"))
    
    method_name, method_desc = decode_method_id(tx_data.get("input", "0x"))
    
    context["onchain_facts"] = {
        "from": tx_data.get("from", ""),
        "to": tx_data.get("to", ""),
        "value_wei": str(wei_value),
        "value_eth": f"{wei_to_eth(wei_value):.6f}",
        "gas_price_gwei": f"{gas_price / 1e9:.2f}",
        "gas_limit": str(gas_limit),
        "nonce": str(nonce),
        "block_number": str(block_number),
        "input_data": tx_data.get("input", "0x")[:100] + "..." if len(tx_data.get("input", "")) > 100 else tx_data.get("input", "0x"),
        "method_selector": tx_data.get("input", "0x")[2:10] if tx_data.get("input", "0x") != "0x" else "N/A (native transfer)",
        "method_name": method_name,
        "method_description": method_desc,
        "r": tx_data.get("r", ""),
        "s": tx_data.get("s", ""),
        "v": tx_data.get("v", ""),
    }
    
    context["boundaries"]["facts_from_rpc"] = [
        f"from/to/value 来自 RPC eth_getTransactionByHash 返回",
        f"method selector 从 input data 前 4 字节解析",
        f"block number 来自交易收据",
    ]
    
    # 第 3 步：读取交易收据（获取事件日志）
    receipt = fetch_tx_receipt(tx_hash, chain)
    if receipt:
        logs = parse_logs(receipt.get("logs", []))
        context["events"] = logs
        
        status = hex_to_int(receipt.get("status", "0x0"))
        context["onchain_facts"]["tx_status"] = "成功" if status == 1 else "失败"
        context["onchain_facts"]["gas_used"] = str(hex_to_int(receipt.get("gasUsed", "0x0")))
        context["onchain_facts"]["block_number"] = str(hex_to_int(receipt.get("blockNumber", "0x0")))
        
        context["boundaries"]["facts_from_rpc"].append("tx status / gas used / logs 来自 eth_getTransactionReceipt")
    
    # 第 4 步：生成 interpretation（模型解释——明确标注这不是链上事实）
    tx_type = "Native ETH Transfer" if context["onchain_facts"]["method_selector"] == "N/A (native transfer)" else "Contract Interaction"
    
    interpretation_parts = [
        f"## 交易摘要（AI 解释 — 仅供参考，请以链上数据为准）",
        f"",
        f"这是一笔 {tx_type} 交易，",
        f"由 {context['onchain_facts']['from'][:10]}... 发起，",
    ]
    
    if tx_type == "Native ETH Transfer":
        interpretation_parts.append(f"向 {context['onchain_facts']['to'][:10]}... 转账 {context['onchain_facts']['value_eth']} ETH。")
    else:
        interpretation_parts.append(f"调用合约 {context['onchain_facts']['to'][:10]}... 。")
        interpretation_parts.append(f"方法：{method_name}（{method_desc}）")
        if float(context['onchain_facts']['value_eth']) > 0:
            interpretation_parts.append(f"附带了 {context['onchain_facts']['value_eth']} ETH。")
    
    gas_cost_eth = hex_to_int(receipt.get("gasUsed", "0x0")) * gas_price / 1e18 if receipt else 0
    interpretation_parts.append(f"")
    interpretation_parts.append(f"Gas 消耗：{context['onchain_facts'].get('gas_used', '?')} / {context['onchain_facts']['gas_limit']} （~{gas_cost_eth:.6f} ETH）")
    interpretation_parts.append(f"交易状态：{context['onchain_facts'].get('tx_status', '未知')}")
    interpretation_parts.append(f"")
    
    if context["events"]:
        interpretation_parts.append(f"### 事件日志（链上事实）")
        for ev in context["events"]:
            interpretation_parts.append(f"- {ev['event']} — 合约 {ev['address'][:10]}... (log index {ev['log_index']})")
    
    interpretation_parts.append(f"")
    interpretation_parts.append(f"> ⚠️ 以上为模型对链上数据的解释，可能包含遗漏或错误。")
    interpretation_parts.append(f"> 所有关键结论均附有链上来源，请点击 explorer 链接自行核验。")
    
    context["interpretation"] = "\n".join(interpretation_parts)
    
    # 第 5 步：citations
    context["citations"] = [
        f"📎 Explorer: {explorer_link}",
        f"📎 From: {chain_info['explorer'].replace('tx/', 'address/')}{context['onchain_facts']['from']}" if context['onchain_facts'].get('from') else "",
        f"📎 To: {chain_info['explorer'].replace('tx/', 'address/')}{context['onchain_facts']['to']}" if context['onchain_facts'].get('to') else "",
    ]
    
    context["boundaries"]["ai_interpretation"] = [
        "method_name 和 method_description 是工具基于 selector 查找的值，不是链上直接存储的",
        "event 名称是工具根据 event signature hash 匹配的，不是链上原始标注",
        '转账金额解释为"向 X 转账 Y"是 AI 对数据的理解，具体是否正确请以 explorer 为准',
        "Gas 只算了 execution gas，实际 cost 取决于 base fee + priority fee（EIP-1559）",
    ]
    
    return context


def print_context_pack(context: dict):
    """美化输出上下文包"""
    print("=" * 72)
    print("  📦 链感知上下文包 (Chain-aware Context Pack)")
    print("=" * 72)
    
    # Meta
    print(f"\n📋 Meta")
    print(f"   Tx Hash:     {context['meta']['tx_hash'][:20]}...{context['meta']['tx_hash'][-8:]}")
    print(f"   Chain:       {context['meta']['chain']} (ID: {context['meta']['chain_id']})")
    print(f"   Explorer:    {context['meta']['explorer_url']}")
    print(f"   Retrieved:   {context['meta']['retrieved_at']}")
    
    # On-chain facts
    print(f"\n🔗 链上事实（从 RPC 读取 — 可验证）")
    facts = context['onchain_facts']
    print(f"   From:         {facts.get('from', '?')}")
    print(f"   To:           {facts.get('to', '?')}")
    print(f"   Value:        {facts.get('value_eth', '?')} ETH ({facts.get('value_wei', '?')} wei)")
    print(f"   Gas Price:    {facts.get('gas_price_gwei', '?')} Gwei")
    print(f"   Gas Limit:    {facts.get('gas_limit', '?')}")
    print(f"   Gas Used:     {facts.get('gas_used', '?')}")
    print(f"   Block:        {facts.get('block_number', '?')}")
    print(f"   Method:       {facts.get('method_name', '?')} — {facts.get('method_description', '')}")
    print(f"   Tx Status:    {facts.get('tx_status', '?')}")
    
    # Events
    if context['events']:
        print(f"\n📜 事件日志 ({len(context['events'])} 个)")
        for ev in context['events']:
            print(f"   [{ev['log_index']}] {ev['event']} @ {ev['address'][:10]}...")
    
    # Interpretation
    print(f"\n🤖 AI 解释（⚠️ 仅供参考）")
    # Only print the summary line
    first_line = context['interpretation'].split('\n')[0]
    print(f"   {first_line}")
    
    # Citations
    print(f"\n📎 来源引用 (Citations)")
    for c in context['citations']:
        if c:
            print(f"   {c}")
    
    # Boundaries
    print(f"\n🚧 事实 vs 解释边界")
    for b in context['boundaries']['facts_from_rpc']:
        print(f"   ✅ {b}")
    for b in context['boundaries']['ai_interpretation']:
        print(f"   ⚠️ {b}")
    
    print("\n" + "=" * 72)


def main():
    # 如果没有参数，使用示例交易
    example_tx = "0x2d1e3b3d8a8c9e0f1a2b3c4d5e6f7a8b9c0d1e2f"
    
    if len(sys.argv) >= 2:
        tx_hash = sys.argv[1]
    else:
        print("ℹ️  未提供交易哈希，使用示例哈希（仅展示结构）\n")
        tx_hash = example_tx
    
    chain = sys.argv[2] if len(sys.argv) >= 3 else "ethereum"
    
    print(f"🔍 正在查询 {chain} 上的交易: {tx_hash[:20]}...")
    
    context = build_context_pack(tx_hash, chain)
    
    print_context_pack(context)
    
    # 保存为 JSON
    import os
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, f"tx_context_{tx_hash[:18]}.json")
    with open(output_path, "w") as f:
        json.dump(context, f, indent=2, ensure_ascii=False)
    print(f"\n💾 已保存到: {output_path}")


if __name__ == "__main__":
    main()
