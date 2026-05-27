# MCP 远程服务器连接 · 终结归纳

> 来源：https://modelcontextprotocol.io/docs/develop/connect-remote-servers
> 生成时间：2026-05-25
> 一句话：MCP 用 **Streamable HTTP** 单端点 + **OAuth 2.1** 认证，取代了旧的双端点 SSE 方案。三种传输各有明确边界。

---

## 一、三种传输协议

```
stdio                   Streamable HTTP          SSE (旧版，已废弃)
───────                 ────────────────         ──────────────────
本地子进程              远程 HTTP 单端点           远程双端点
无网络依赖              可过防火墙/负载均衡          GET /sse + POST /message
免认证                  支持 OAuth 2.1             需要两个端口
延迟最低                支持 session 恢复           不支持 session 恢复
Claude Desktop 默认     Lambda/SaaS 首选           2024-11 提出，2025-03 被取代
```

### 传输选择决策树

```
服务器在哪里？
  ├── 本地本机 → stdio
  └── 远程/云端
        ├── 自己新写的 → Streamable HTTP（唯一推荐）
        └── 接已有旧服务 → SSE（兼容过渡，计划迁移）
```

---

## 二、Streamable HTTP（推荐，2025-03-26 spec）

### 核心设计：一个端点搞定一切

```
         POST /mcp ──────────────→  服务器
客户端   (JSON-RPC 请求)              │
         ←────────────── 200 OK     │
         Content-Type: application/json
         或 text/event-stream (流式)

         GET /mcp ───────────────→  服务器
客户端   (可选 SSE 流，接收推送)      │
         ←────────────── text/event-stream
```

**两种响应模式**：

| 请求类型 | 服务器返回 | 适用场景 |
|----------|-----------|----------|
| 短响应 | `Content-Type: application/json`，同步返回 | 工具列表查询、简单读操作 |
| 长响应/流式 | `Content-Type: text/event-stream`，SSE 推送 | 长时间推理、流式输出、进度通知 |

### Session 管理

```
首次请求:
  POST /mcp → 服务器返回
    Response Header: Mcp-Session-Id: abc123...

后续请求:
  POST /mcp
    Request Header: Mcp-Session-Id: abc123...
    → 服务器识别会话，复用上下文

Session 断开:
  GET /mcp
    Request Header: Last-Event-ID: 42
    → 从第 42 个事件之后续传，不丢消息
```

**关键点**：
- `Mcp-Session-Id` 是服务器生成的 opaque token
- `Last-Event-ID` 实现 SSE 流的可恢复性
- 客户端实现指数退避重连（exponential backoff）

### TypeScript SDK 用法

```typescript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://my-mcp-server.example.com/mcp"),
  {
    // 可选：OAuth 认证
    authProvider: myOAuthProvider,
    // 可选：重连配置
    reconnectionOptions: {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    },
  }
);

const client = new Client({
  name: "my-client",
  version: "1.0.0",
}, {
  capabilities: {}
});

await client.connect(transport);
```

### 服务器端（概念）

```
POST /mcp 处理:
  1. 读 Mcp-Session-Id（如果有）→ 恢复 session
  2. 解析 JSON-RPC body
  3. 执行工具/资源/提示
  4. 如果结果小 → 返回 JSON
  5. 如果结果大/需流式 → 返回 SSE stream

GET /mcp 处理:
  1. 读 Last-Event-ID → 续传未确认的事件
  2. 打开 SSE stream
  3. 服务器可以主动推送通知
```

---

## 三、SSE（旧版，2024-11-05 spec，已废弃）

```
GET /sse ─────────────→  服务器
←────────── SSE stream   (长期连接，接收服务器消息)

POST /message ────────→  服务器
←────────── 200 OK       (发送客户端请求)
```

**问题**：
- 两个端点 → 部署复杂（防火墙、负载均衡需要两个路由）
- 无 session 恢复 → 断连后消息丢失
- 无标准认证 → 需要自己实现

**为什么还留着**：向后兼容已经在跑的旧 MCP 服务器。

---

## 四、认证：OAuth 2.1（2025-06-18 spec）

### 认证流程

```
客户端                         MCP 服务器
   │                               │
   │  POST /mcp ─────────────────→ │
   │  ←── 401 Unauthorized         │
   │  WWW-Authenticate: Bearer     │
   │  resource_metadata=https://... │
   │                               │
   │  GET resource_metadata ──────→ │  发现 OAuth 端点
   │  ←── authorization_server     │
   │       token_endpoint          │
   │                               │
   │  (可选) Dynamic Client Reg ──→ │  注册客户端 ID
   │  ←── client_id, client_secret │
   │                               │
   │  POST /token ────────────────→ │  获取 token
   │  (client_credentials 或       │
   │   JWT assertion + PKCE)       │
   │  ←── access_token             │
   │                               │
   │  POST /mcp ──────────────────→ │  后续请求
   │  Authorization: Bearer <token> │
   │  ←── 200 OK                   │
```

### 三种认证模式

| 模式 | 适用场景 | SDK 支持 |
|------|---------|---------|
| **Client Credentials** | 服务器到服务器，无用户参与 | `ClientCredentialsProvider` |
| **JWT Assertion + PKCE** | 高安全场景，私钥签名 | `PrivateKeyJwtProvider` |
| **Dynamic Client Registration** | 允许客户端自动注册 | 可选，服务器决定是否开启 |

### Token 管理

- 自动刷新：token 过期前 SDK 自动用 refresh_token 续期
- 钩子函数：`beforeGetToken` / `beforeUseToken` 用于自定义逻辑
- Audience 绑定（RFC 8707）：token 绑定到特定 MCP 服务器，防止 token 重用

---

## 五、服务器发现与注册

### server.json 清单格式

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "我的 MCP 远程服务器",
  "remotes": {
    "production": {
      "url": "https://api.example.com/mcp",
      "transport": "streamable-http",
      "auth": {
        "type": "oauth2",
        "resourceMetadataUrl": "https://api.example.com/.well-known/oauth-protected-resource"
      }
    }
  }
}
```

**`remotes` 字段**：声明远程访问入口。每个 entry 必须包含 `url` 和 `transport`。`auth` 可选。

### 自动能力检测

客户端连接时自动探测服务器能力：
- 发送 `initialize` 请求
- 服务器返回 `capabilities` 对象
- 客户端据此决定用哪些功能

---

## 六、三种传输对比（终结版）

| 维度 | stdio | Streamable HTTP | SSE (legacy) |
|------|-------|-----------------|--------------|
| **端点数量** | 0（子进程） | 1（`/mcp`） | 2（`/sse` + `/message`） |
| **网络要求** | 无 | 需要 HTTP 出站 | 需要 HTTP 出站 |
| **认证** | 不需要 | OAuth 2.1 | 无标准 |
| **Session** | 进程级 | `Mcp-Session-Id` | 无 |
| **断连恢复** | 重启进程 | `Last-Event-ID` 续传 | ❌ |
| **流式推送** | stdout | SSE over GET | SSE over GET /sse |
| **延迟** | 最低 | 低（HTTP 开销） | 低 |
| **部署** | 本地安装 | Lambda / K8s / 任意 HTTP 服务 | 需要双路由 |
| **防火墙穿透** | N/A | ✅ 标准 HTTPS | ⚠️ 可能需要特殊配置 |
| **规范时间** | 初版 | 2025-03-26 | 2024-11-05 |
| **当前状态** | ✅ 稳定 | ✅ **推荐** | ⚠️ 已废弃 |

---

## 七、一条决策链

```
我要部署 MCP 服务器：

Q1: 服务器在本地还是在云端？
    本地 → stdio（Claude Desktop 直接 spawn）
    云端 → Q2

Q2: 是新写的还是已有的旧服务？
    新写 → Streamable HTTP + OAuth 2.1
    已有 SSE 服务 → 先跑着，计划迁移到 Streamable HTTP

Q3: 需要认证吗？
    不需要（内部服务/VPN 内）→ 直接用 Streamable HTTP
    需要（公网服务/SaaS）→ Streamable HTTP + OAuth 2.1
```

---

## 八、与 Agent 架构的关系

MCP 远程连接属于 Agent 的 **Tool Use 层**基础设施：

```
Agent
  │
  ├── LLM (推理)
  ├── Memory (上下文)
  └── Tools (能力)
        │
        ├── 本地工具 (stdio MCP)
        └── 远程工具 (Streamable HTTP MCP)
              │
              ├── 链上数据 (RPC MCP Server)
              ├── 外部 API (Web Search MCP Server)
              └── 其他 Agent (A2A via MCP)
```

EIP-8004 和 MCP 的分工：
- **EIP-8004**：发现 Agent + 验证身份 + 查声誉（链上）
- **MCP**：连接 Agent + 调用工具 + 获取能力（链下）
- 两者互补：EIP-8004 告诉你「这个 Agent 可信」，MCP 让你「调用这个 Agent 的工具」

---

## ⚠️ 关键约束

1. **WebSocket 不被支持**。如果你需要 WebSocket → 自建代理桥接，但会丢失 session 管理和 OAuth 支持
2. **Streamable HTTP ≠ 通用 HTTP**。它是 JSON-RPC over HTTP + 可选 SSE 流，不是 REST
3. **Session 不是永久的**。服务器可以随时废弃 session，客户端必须处理重连
4. **OAuth 是可选的**。如果你的 MCP 服务器只在 VPC 内用，不需要 OAuth
