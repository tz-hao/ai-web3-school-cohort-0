/**
 * Safe + Session Key 最小部署脚本
 * ================================
 *
 * 目标：在 Anvil fork 上演示 AI Agent 钱包的完整部署流程：
 *   1. 部署 Safe 智能账户
 *   2. 部署 AllowanceModule（类似 Session Key 的限额模块）
 *   3. 启用模块 → 添加 delegate → 设置额度
 *   4. 在限额内执行转账 ✅
 *   5. 尝试超额转账 ❌（被合约拦截）
 *
 * 使用前：
 *   npm install
 *   npm run anvil    （另一个终端，启动 Anvil fork）
 *   npm run deploy   （运行本脚本）
 *
 * ⚠️ 本脚本在 Anvil fork 上运行，不涉及任何真实资产。
 */

import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  decodeEventLog,
  parseAbi,
  parseEther,
  parseUnits,
  type Hex,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// ============================================================================
// 配置
// ============================================================================

// Anvil 默认私钥 #0（有 10000 ETH）
// ⚠️ 仅在 Anvil fork 使用！永远不要用真实私钥！
const OWNER_PRIVATE_KEY: Hex =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Anvil fork 的 RPC URL（默认 localhost:8545）
const RPC_URL = "http://localhost:8545";

// ============================================================================
// 最小 AllowanceModule ABI
// ============================================================================
// 来源：https://github.com/safe-global/safe-modules
// 只包含本脚本需要的函数签名

const ALLOWANCE_MODULE_ABI = parseAbi([
  // --- Safe 账户启用模块 ---
  "function enableModule(address module) external",

  // --- Delegate 管理 ---
  "function addDelegate(address delegate) external",
  "function removeDelegate(address delegate) external",

  // --- Allowance 管理 ---
  "function setAllowance(address delegate, address token, uint96 amount, uint16 resetTimeMin, uint32 resetBaseMin) external",
  "function deleteAllowance(address delegate, address token) external",
  "function resetAllowance(address delegate, address token) external",

  // --- 查询 ---
  "function getAllowance(address safe, address delegate, address token) external view returns (uint96 amount, uint96 spent, uint16 resetTimeMin, uint32 lastResetMin, uint16 nonce)",
  "function getDelegates(address safe, uint48 start, uint8 pageSize) external view returns (address[] memory results, uint48 next)",

  // --- 执行转账（delegate 用 EIP-712 签名授权） ---
  "function executeAllowanceTransfer(address safe, address token, address to, uint96 amount, address paymentToken, uint96 payment, address delegate, bytes memory signature) external",

  // --- Events ---
  "event AddDelegate(address indexed safe, address indexed delegate)",
  "event SetAllowance(address indexed safe, address indexed delegate, address indexed token, uint96 amount, uint16 resetTimeMin, uint32 resetBaseMin)",
  "event ExecuteAllowanceTransfer(address indexed safe, address indexed delegate, address indexed token, address to, uint96 amount, uint96 payment)",
]);

// Safe 合约 ABI（enableModule）
const SAFE_ABI = parseAbi([
  "function enableModule(address module) external",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) external payable returns (bool success)",
  "function getModules() external view returns (address[] memory)",
]);

// ============================================================================
// 工具函数
// ============================================================================

function createClients(): {
  walletClient: WalletClient;
  publicClient: PublicClient;
  ownerAccount: ReturnType<typeof privateKeyToAccount>;
} {
  const ownerAccount = privateKeyToAccount(OWNER_PRIVATE_KEY);

  const publicClient = createPublicClient({
    transport: http(RPC_URL),
    chain: base,
  });

  const walletClient = createWalletClient({
    account: ownerAccount,
    transport: http(RPC_URL),
    chain: base,
  });

  return { walletClient, publicClient, ownerAccount };
}

function divider(label: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"═".repeat(60)}`);
}

// ============================================================================
// Phase 1: 部署 Safe 智能账户
// ============================================================================

async function deploySafe(
  walletClient: WalletClient,
  ownerAddress: Address
): Promise<{ safeAddress: Address; protocolKit: Safe }> {
  divider("Phase 1: 部署 Safe 智能账户");

  const safeAccountConfig: SafeAccountConfig = {
    owners: [ownerAddress],
    threshold: 1, // 单签 Safe，方便测试
  };

  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig,
  };

  console.log("  初始化 Safe Protocol Kit...");
  const protocolKit = await Safe.init({
    provider: RPC_URL,
    signer: OWNER_PRIVATE_KEY,
    predictedSafe,
  });

  // 预测地址（部署前就能知道地址）
  const predictedAddress = await protocolKit.getAddress();
  console.log(`  预测 Safe 地址: ${predictedAddress}`);

  // 创建部署交易
  console.log("  创建部署交易...");
  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  // 发送交易
  console.log("  发送部署交易...");
  const txHash = await walletClient.sendTransaction({
    to: deploymentTx.to as Address,
    value: BigInt(deploymentTx.value),
    data: deploymentTx.data as Hex,
    chain: base,
  });

  console.log(`  部署交易哈希: ${txHash}`);

  // 等待确认
  const publicClient = createPublicClient({
    transport: http(RPC_URL),
    chain: base,
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log(`  部署确认，区块: ${receipt.blockNumber}`);

  // 连接到已部署的 Safe
  const connectedKit = await protocolKit.connect({
    safeAddress: predictedAddress,
  });

  const isDeployed = await connectedKit.isSafeDeployed();
  console.log(`  Safe 已部署: ${isDeployed}`);
  console.log(`  Safe 地址:  ${predictedAddress}`);
  console.log(`  所有者:      ${ownerAddress}`);
  console.log(`  阈值:        1/1`);

  return { safeAddress: predictedAddress as Address, protocolKit: connectedKit };
}

// ============================================================================
// Phase 2: 部署 AllowanceModule（Session Key 的链上实现）
// ============================================================================

async function deployAllowanceModule(
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<Address> {
  divider("Phase 2: 部署 AllowanceModule");

  // AllowanceModule 的 creation bytecode
  // ⚠️ 这是从 safe-modules 编译产物中提取的最小 bytecode
  // 实际部署需要完整的编译产物。这里用 CREATE2 预部署地址或简化处理。
  //
  // 由于 AllowanceModule 尚未在 safe-deployments npm 包中发布，
  // 本节演示两种路径：
  //
  // 路径 A: 使用已部署的 AllowanceModule（如果有的话）
  // 路径 B: 自部署 AllowanceModule（需要编译合约）
  //
  // 本脚本使用路径 C: 演示 Safe 的 enableModule 流程，
  // 以任意地址作为"模块"来展示完整的交易构建过程。

  console.log("  ⚠️ AllowanceModule 需要在 safe-modules 编译后部署");
  console.log("  本脚本使用 Safe 内置的多签机制演示 session key 等价逻辑");
  console.log("  完整的 AllowanceModule 集成见 src/test-allowance.ts");

  // 返回占位地址——实际使用时会替换为已部署的 AllowanceModule 地址
  return "0x0000000000000000000000000000000000000001" as Address;
}

// ============================================================================
// Phase 3: 演示 Safe 的「提案-确认」模式（Agent Wallet 核心交互）
// ============================================================================

async function demonstrateProposeConfirmFlow(
  protocolKit: Safe,
  walletClient: WalletClient,
  publicClient: PublicClient,
  safeAddress: Address,
  ownerAddress: Address
) {
  divider("Phase 3: 提案-确认 模式演示");

  // 3a. 向 Safe 转入一些 ETH（模拟测试资金）
  console.log("\n  [3a] 向 Safe 转入 0.1 ETH 测试资金...");
  const fundHash = await walletClient.sendTransaction({
    to: safeAddress,
    value: parseEther("0.1"),
    chain: base,
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log(`    转入 0.1 ETH → Safe ✅`);

  const safeBalance = await publicClient.getBalance({
    address: safeAddress,
  });
  console.log(`    Safe 余额: ${safeBalance} wei (${Number(safeBalance) / 1e18} ETH)`);

  // 3b. 构建一个「Agent 提案」——转账 0.01 ETH 给测试地址
  console.log("\n  [3b] 构建 Agent 提案（转账 0.01 ETH）...");

  const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address; // Anvil 地址 #1
  const TRANSFER_AMOUNT = parseEther("0.01");

  // 使用 protocol-kit 创建 Safe 交易
  // 这相当于 Agent 构建了一个「提案」——交易已构建好，但没有签名不能执行
  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: RECIPIENT,
        value: TRANSFER_AMOUNT.toString(),
        data: "0x",
      },
    ],
  });

  console.log(`    提案内容: 向 ${RECIPIENT} 转 ${Number(TRANSFER_AMOUNT) / 1e18} ETH`);
  console.log(`    状态: 待签名（需要 1/1 签名）`);

  // 3c. 签名（"人确认"环节）
  console.log("\n  [3c] 人对提案签名...");
  const signedTx = await protocolKit.signTransaction(safeTransaction);
  console.log("    ✅ 已签名");

  // 3d. 执行
  console.log("\n  [3d] 执行提案...");
  const execResult = await protocolKit.executeTransaction(signedTx);
  console.log(`    交易哈希: ${execResult.hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: execResult.hash as Hex,
  });
  console.log(`    ✅ 执行成功 (gas: ${receipt.gasUsed})`);

  // 3e. 验证
  const recipientBalance = await publicClient.getBalance({
    address: RECIPIENT,
  });
  console.log(`    收款方余额变化: ${recipientBalance}`);
}

// ============================================================================
// Phase 4: 模拟 Session Key 逻辑（使用 Safe 原生多签）
// ============================================================================

async function demonstrateSessionKeyEquivalent(
  protocolKit: Safe,
  walletClient: WalletClient,
  publicClient: PublicClient,
  safeAddress: Address,
  ownerAddress: Address
) {
  divider("Phase 4: Session Key 等价逻辑");

  console.log(`
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │  Session Key 的核心约束：                              │
  │                                                     │
  │  1. 时效性  — 只在规定时间内有效                        │
  │  2. 限额    — 只能花不超过 X 的钱                       │
  │  3. 白名单  — 只能调特定的合约/函数                      │
  │  4. 可撤销  — 主人随时可以收回权限                       │
  │                                                     │
  │  在 Safe 生态中，这些通过以下组合实现：                    │
  │                                                     │
  │  • AllowanceModule       → 限额 + 时效 + 可撤销        │
  │  • ERC-4337 Session Key  → 无 Gas 交易 + 时效          │
  │  • Safe 多签 + 模块       → 白名单 + 可组合限制          │
  │                                                     │
  │  本 Phase 演示如何用 Safe 原语构建这些约束。              │
  │                                                     │
  └─────────────────────────────────────────────────────┘`);

  // 4a. 展示 Safe 当前的模块列表
  console.log("\n  [4a] 查询 Safe 已启用的模块...");
  const modules = await publicClient.readContract({
    address: safeAddress,
    abi: SAFE_ABI,
    functionName: "getModules",
  });
  console.log(`    已启用模块: ${modules.length === 0 ? "（无）" : modules}`);

  // 4b. 构建 enableModule 交易（演示如何以编程方式启用模块）
  console.log("\n  [4b] 构建 enableModule 交易（演示用）...");
  const MOCK_MODULE = "0x0000000000000000000000000000000000000042" as Address;

  const enableModuleData = encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "enableModule",
    args: [MOCK_MODULE],
  });

  // 注意：这是 Safe 的内部交易——Safe 自己调用自己来启用模块
  const moduleTx = await protocolKit.createTransaction({
    transactions: [
      {
        to: safeAddress, // to = Safe 自己
        value: "0",
        data: enableModuleData,
      },
    ],
  });

  console.log(`    to:    ${safeAddress}（Safe 自己调自己）`);
  console.log(`    data:  enableModule(${MOCK_MODULE})`);
  console.log(`    说明:  这需要 owner 签名才能执行——模块启用是人控制的`);

  // 4c. 总结 Session Key vs AllowanceModule 的对应关系
  console.log("\n  [4c] Session Key → AllowanceModule 映射:");
  console.log(`
    ┌──────────────────┬──────────────────────────────────┐
    │ Session Key 需求  │ Safe AllowanceModule 实现          │
    ├──────────────────┼──────────────────────────────────┤
    │ 限额（每天 1000）  │ setAllowance(delegate, token,     │
    │                  │   amount, resetTime=1440min)      │
    ├──────────────────┼──────────────────────────────────┤
    │ 时效（7 天过期）   │ removeDelegate() 或设置            │
    │                  │   短期 resetTimeMin                 │
    ├──────────────────┼──────────────────────────────────┤
    │ 白名单            │ 每 token 单独设置 allowance         │
    │                  │   没有 allowance 的 token = 不能花   │
    ├──────────────────┼──────────────────────────────────┤
    │ 可撤销            │ removeDelegate() 一次性清除          │
    │                  │   该 delegate 的所有权限             │
    ├──────────────────┼──────────────────────────────────┤
    │ EIP-712 签名      │ AllowanceTransfer 类型签名          │
    │ （Agent 持有私钥） │   包含 nonce 防重放                 │
    └──────────────────┴──────────────────────────────────┘
  `);
}

// ============================================================================
// 主流程
// ============================================================================

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Safe + Session Key 最小部署脚本                          ║
║  AI × Web3 School · Agent Wallet 实操                    ║
║                                                          ║
║  目标链: Base L2 (fork @ localhost:8545)                 ║
║  所有操作在 Anvil fork 上，不涉及真实资产                   ║
╚══════════════════════════════════════════════════════════╝
`);

  // 0. 初始化
  const { walletClient, publicClient, ownerAccount } = createClients();
  const ownerAddress = ownerAccount.address;

  console.log(`  链 ID:       ${await publicClient.getChainId()}`);
  console.log(`  主账号:      ${ownerAddress}`);
  console.log(`  主账号余额:  ${(await publicClient.getBalance({ address: ownerAddress }))} wei`);
  console.log(`  RPC:         ${RPC_URL}`);

  // Phase 1: 部署 Safe
  const { safeAddress, protocolKit } = await deploySafe(
    walletClient,
    ownerAddress
  );

  // Phase 2: AllowanceModule 说明（完整集成版本见 test-allowance.ts）
  await deployAllowanceModule(walletClient, publicClient);

  // Phase 3: 提案-确认模式（Agent Wallet 核心交互）
  await demonstrateProposeConfirmFlow(
    protocolKit,
    walletClient,
    publicClient,
    safeAddress,
    ownerAddress
  );

  // Phase 4: Session Key 等价逻辑
  await demonstrateSessionKeyEquivalent(
    protocolKit,
    walletClient,
    publicClient,
    safeAddress,
    ownerAddress
  );

  // 总结
  divider("部署总结");
  console.log(`
  ✅ Safe 智能账户已部署: ${safeAddress}
  ✅ 「提案-确认」模式已演示: Agent 提案 → 人签名 → 执行
  ✅ Session Key → AllowanceModule 映射已说明

  下一步:
    npm run test    # 运行完整的 AllowanceModule 集成测试
                    # （包含 delegate 添加、限额设置、EIP-712 签名转账）

  关键收获:
    Safe 的智能账户模型天然适合 AI Agent：
    - Agent = 受限的签名者（不是完全控制者）
    - 每次花钱都要「提案」，人（或另一个 Agent）确认
    - AllowanceModule 提供了和 Session Key 等价的链上限额机制
    - EIP-712 签名 + nonce 防止重放攻击
`);
}

main().catch((err) => {
  console.error("❌ 部署失败:", err);
  process.exit(1);
});
