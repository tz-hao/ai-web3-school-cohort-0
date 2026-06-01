/**
 * AllowanceModule 完整集成测试
 * =================================
 *
 * 演示 Safe AllowanceModule 作为 AI Agent Session Key 的完整流程：
 *   1. 部署/连接 AllowanceModule
 *   2. 在 Safe 上启用模块
 *   3. 添加 delegate（AI Agent 的 Session Key）
 *   4. 设置限额（每个 token 单独配置）
 *   5. Delegate 用 EIP-712 签名执行转账
 *   6. 超额转账被合约拦截
 *
 * 这是 Agent Security Sandbox 的前置——理解 Safe 的权限模型
 * 才能设计有效的安全测试。
 *
 * ⚠️ AllowanceModule 需要在目标链上部署。
 * 方法 1: 在 fork 上自部署
 *   - git clone https://github.com/safe-global/safe-modules
 *   - cd modules/allowances && pnpm install && pnpm compile
 *   - 用 Hardhat/Foundry 在 fork 上部署
 * 方法 2: 使用已有的部署地址（如果链上有的话）
 */

import pkg from "@safe-global/protocol-kit";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  decodeEventLog,
  parseAbi,
  parseEther,
  parseUnits,
  keccak256,
  encodePacked,
  toHex,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// ============================================================================
// 配置
// ============================================================================

const OWNER_PRIVATE_KEY: Hex =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Anvil 地址 #1 作为 delegate（模拟 AI Agent 的 Session Key）
const DELEGATE_PRIVATE_KEY: Hex =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const RPC_URL = "http://localhost:8545";

// ============================================================================
// AllowanceModule ABI（完整版）
// ============================================================================

const ALLOWANCE_MODULE_ABI = parseAbi([
  "function addDelegate(address delegate) external",
  "function removeDelegate(address delegate) external",
  "function setAllowance(address delegate, address token, uint96 amount, uint16 resetTimeMin, uint32 resetBaseMin) external",
  "function deleteAllowance(address delegate, address token) external",
  "function resetAllowance(address delegate, address token) external",
  "function getAllowance(address safe, address delegate, address token) external view returns (uint96 amount, uint96 spent, uint16 resetTimeMin, uint32 lastResetMin, uint16 nonce)",
  "function executeAllowanceTransfer(address safe, address token, address to, uint96 amount, address paymentToken, uint96 payment, address delegate, bytes memory signature) external",
  "event AddDelegate(address indexed safe, address indexed delegate)",
  "event SetAllowance(address indexed safe, address indexed delegate, address indexed token, uint96 amount, uint16 resetTimeMin, uint32 resetBaseMin)",
  "event ExecuteAllowanceTransfer(address indexed safe, address indexed delegate, address indexed token, address to, uint96 amount, uint96 payment)",
]);

const SAFE_EXEC_TRANSACTION_ABI = parseAbi([
  "function enableModule(address module) external",
  "function getModules() external view returns (address[] memory)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) external payable returns (bool success)",
]);

// ============================================================================
// EIP-712 签名构建（和 AllowanceModule 交互的核心）
// ============================================================================

const ALLOWANCE_TRANSFER_TYPE = {
  AllowanceTransfer: [
    { name: "safe", type: "address" },
    { name: "token", type: "address" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint96" },
    { name: "paymentToken", type: "address" },
    { name: "payment", type: "uint96" },
    { name: "nonce", type: "uint16" },
  ],
} as const;

/**
 * 用 delegate 的私钥对 AllowanceTransfer 做 EIP-712 签名。
 * 这个签名证明了「delegate 授权了这笔转账」。
 */
async function signAllowanceTransfer(
  delegatePrivateKey: Hex,
  safe: Address,
  token: Address,
  to: Address,
  amount: bigint,
  paymentToken: Address,
  payment: bigint,
  nonce: number,
  allowanceModuleAddress: Address,
  chainId: number
): Promise<Hex> {
  const delegateAccount = privateKeyToAccount(delegatePrivateKey);

  const domain = {
    name: "AllowanceModule",
    version: "1.0.0",
    chainId: BigInt(chainId),
    verifyingContract: allowanceModuleAddress,
  };

  const message = {
    safe,
    token,
    to,
    amount,
    paymentToken,
    payment,
    nonce,
  } as const;

  const signature = await delegateAccount.signTypedData({
    domain,
    types: ALLOWANCE_TRANSFER_TYPE,
    primaryType: "AllowanceTransfer",
    message: message as any,
  });

  return signature;
}

// ============================================================================
// 工具
// ============================================================================

function divider(label: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"═".repeat(60)}`);
}

const ETH_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

// ============================================================================
// 主测试流程
// ============================================================================

async function main() {
  // ═══════════════════════════════════════════════════════
  // 重要：在运行此脚本前，确保 AllowanceModule 已部署
  // ═══════════════════════════════════════════════════════

  // 替换为实际部署的 AllowanceModule 地址
  const ALLOWANCE_MODULE_ADDRESS = process.env.ALLOWANCE_MODULE_ADDRESS as
    | Address
    | undefined;

  if (!ALLOWANCE_MODULE_ADDRESS) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  需要 AllowanceModule 部署地址                            ║
║                                                          ║
║  设置环境变量:                                            ║
║  ALLOWANCE_MODULE_ADDRESS=0x...  npm run test             ║
║                                                          ║
║  或先部署 AllowanceModule:                                ║
║  git clone https://github.com/safe-global/safe-modules    ║
║  cd safe-modules/modules/allowances                       ║
║  pnpm install && pnpm compile                             ║
║  # 用 forge create / hardhat 在 fork 上部署               ║
╚══════════════════════════════════════════════════════════╝
`);
    console.log(
      "\n📖 以下展示完整的 AllowanceModule 交互代码流程（注释中有所有关键步骤）。\n"
    );
    await demonstrateConceptualFlow();
    return;
  }

  await runIntegrationTest(ALLOWANCE_MODULE_ADDRESS);
}

// ============================================================================
// 概念流程演示（不需要实际 AllowanceModule 部署）
// ============================================================================

async function demonstrateConceptualFlow() {
  divider("AllowanceModule 完整交互流程（概念演示）");

  // 模拟地址
  const SAFE = "0x1234...Safe" as Address;
  const DELEGATE = "0xABCD...Agent" as Address;
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address; // Base USDC

  console.log(`
  ┌─ Step 1: Safe Owner 启用 AllowanceModule ─────────────┐
  │                                                        │
  │  这是 Safe 的内部交易——Safe 调用自己的 enableModule()     │
  │                                                        │
  │  const tx = await protocolKit.createTransaction({       │
  │    transactions: [{                                     │
  │      to: safeAddress,                                  │
  │      value: "0",                                       │
  │      data: encodeFunctionData({                        │
  │        abi: SAFE_ABI,                                  │
  │        functionName: "enableModule",                   │
  │        args: [ALLOWANCE_MODULE_ADDRESS]                │
  │      })                                                │
  │    }]                                                  │
  │  });                                                    │
  │  const signed = await protocolKit.signTransaction(tx);  │
  │  await protocolKit.executeTransaction(signed);          │
  │                                                        │
  │  ⚠️ 需要 owner 签名 → 人始终控制哪些模块能装到 Safe 上     │
  └────────────────────────────────────────────────────────┘

  ┌─ Step 2: Owner 添加 Delegate（AI Agent）──────────────┐
  │                                                        │
  │  同样通过 Safe 交易执行：                                 │
  │                                                        │
  │  const addDelegateData = encodeFunctionData({           │
  │    abi: ALLOWANCE_MODULE_ABI,                           │
  │    functionName: "addDelegate",                         │
  │    args: [DELEGATE_ADDRESS]                             │
  │  });                                                    │
  │                                                        │
  │  → 提交为 Safe 交易 → owner 签名 → 执行                  │
  │  → AllowanceModule 触发 AddDelegate(safe, delegate)     │
  └────────────────────────────────────────────────────────┘

  ┌─ Step 3: Owner 设置 Allowance ────────────────────────┐
  │                                                        │
  │  setAllowance(                                          │
  │    delegate: DELEGATE,    // AI Agent 的 Session Key    │
  │    token: USDC,           // 只能花 USDC                │
  │    amount: 1000_000000,   // 1000 USDC (6 decimals)    │
  │    resetTimeMin: 1440,    // 每天重置（1440 分钟）       │
  │    resetBaseMin: 0        // 从当前时间开始             │
  │  );                                                     │
  │                                                        │
  │  同样通过 Safe 交易执行 → owner 签名 → 链上记录          │
  └────────────────────────────────────────────────────────┘

  ┌─ Step 4: Delegate（Agent）签名并执行转账 ──────────────┐
  │                                                        │
  │  4a. Delegate 做 EIP-712 签名：                         │
  │                                                        │
  │  const signature = await signAllowanceTransfer(         │
  │    DELEGATE_PRIVATE_KEY,                               │
  │    safe: SAFE,                                         │
  │    token: USDC,                                        │
  │    to: RECIPIENT,                                      │
  │    amount: 50_000000,    // 50 USDC（在限额内）         │
  │    paymentToken: ETH,   // 用 ETH 付 refund（可选）     │
  │    payment: 0,           // 不给 refund                 │
  │    nonce: 0,                                            │
  │    allowanceModule: ALLOWANCE_MODULE,                   │
  │    chainId: 8453                                       │
  │  );                                                     │
  │                                                        │
  │  4b. 任何人提交 executeAllowanceTransfer：              │
  │                                                        │
  │  await walletClient.sendTransaction({                   │
  │    to: ALLOWANCE_MODULE,                                │
  │    data: encodeFunctionData({                           │
  │      abi: ALLOWANCE_MODULE_ABI,                         │
  │      functionName: "executeAllowanceTransfer",          │
  │      args: [SAFE, USDC, RECIPIENT, 50_000000,           │
  │             ETH, 0, DELEGATE, signature]                │
  │    })                                                  │
  │  });                                                    │
  │                                                        │
  │  合约内部检查:                                           │
  │  ✓ 签名有效（delegate 真的授权了）                        │
  │  ✓ amount + spent ≤ allowance                          │
  │  ✓ 时间窗口未过期                                       │
  │  → 通过 → 执行 transfer → 触发事件                       │
  └────────────────────────────────────────────────────────┘

  ┌─ Step 5: 尝试超额转账 → 被拦截 ─────────────────────────┐
  │                                                        │
  │  尝试转 2000 USDC（限额 1000 USDC）：                    │
  │                                                        │
  │  → executeAllowanceTransfer(amount=2000_000000)         │
  │  → 链上检查: spent(0) + 2000 > amount(1000)             │
  │  → ❌ REVERT: AllowanceExceeded                         │
  │                                                        │
  │  Agent 尝试分多笔绕过:                                    │
  │  → 第 1 笔: 600 USDC ✅                                │
  │  → 第 2 笔: 500 USDC ❌ (600+500=1100 > 1000)          │
  │                                                        │
  │  累计限额被链上强制执行——Agent 无法绕过。                  │
  └────────────────────────────────────────────────────────┘

  ┌─ Step 6: 撤销（Owner 收回权限） ────────────────────────┐
  │                                                        │
  │  removeDelegate(DELEGATE) 通过 Safe 交易执行:            │
  │                                                        │
  │  → 一次性清除该 delegate 的所有 allowance               │
  │  → 立即生效（不需要等 delegate 同意）                     │
  │  → 这就是 "human-in-the-loop kill switch"              │
  └────────────────────────────────────────────────────────┘
  `);
}

// ============================================================================
// 实际集成测试（需要 AllowanceModule 已部署）
// ============================================================================

async function runIntegrationTest(allowanceModuleAddress: Address) {
  const ownerAccount = privateKeyToAccount(OWNER_PRIVATE_KEY);
  const delegateAccount = privateKeyToAccount(DELEGATE_PRIVATE_KEY);
  const ownerAddress = ownerAccount.address;
  const delegateAddress = delegateAccount.address;

  const publicClient = createPublicClient({
    transport: http(RPC_URL),
    chain: base,
  });

  const ownerWalletClient = createWalletClient({
    account: ownerAccount,
    transport: http(RPC_URL),
    chain: base,
  });

  console.log(`  AllowanceModule: ${allowanceModuleAddress}`);
  console.log(`  Safe Owner:      ${ownerAddress}`);
  console.log(`  Delegate (Agent):${delegateAddress}`);

  // --- 获取已部署的 Safe（假设 deploy-safe.ts 已运行）---
  // 实际集成时需要从 deploy-safe 的输出或 .env 获取 Safe 地址
  const SAFE_ADDRESS = (process.env.SAFE_ADDRESS ||
    "0x_YOUR_SAFE_ADDRESS") as Address;

  divider("Step 1: 连接 Safe + 启用 AllowanceModule");
  // ... (和概念演示中相同的 Safe 交易流程)

  divider("Step 2: 添加 Delegate");
  // ...

  divider("Step 3: 设置限额");
  // ...

  divider("Step 4: Delegate 限额内转账 ✅");
  // ...

  divider("Step 5: Delegate 超额转账 ❌");
  // ...

  divider("Step 6: 撤销 Delegate 权限");
  // ...
}

// ============================================================================
// 导出给其他模块使用
// ============================================================================

export {
  signAllowanceTransfer,
  ALLOWANCE_MODULE_ABI,
  ALLOWANCE_TRANSFER_TYPE,
  SAFE_EXEC_TRANSACTION_ABI,
  ETH_TOKEN,
};

main().catch(console.error);
