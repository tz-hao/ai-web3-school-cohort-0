# Z.AI Web Search API 总结

> 来源：https://docs.z.ai/api-reference/tools/web-search
> 生成时间：2026-05-25
> 一句话：Z.AI 的 Web Search 是一个独立的 REST API，也可以作为 Chat Completion 的内置 tool，让 LLM 获取实时网络搜索结果。

---

## 一、核心端点

```
POST https://api.z.ai/api/paas/v4/web_search
```

认证方式：`Authorization: Bearer <api_token>`

---

## 二、请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search_engine` | string | ✅ | 搜索引擎。`search-prime`（Z.AI 高级版），智谱侧还有 `search_std`、`search_pro`、`search_plus` 等 |
| `search_query` | string | ✅ | 搜索关键词 |
| `count` | int | 否 | 返回条数，1–50，默认 10 |
| `search_domain_filter` | string | 否 | 域名白名单过滤，如 `www.example.com` |
| `search_recency_filter` | string | 否 | 时间范围：`oneDay` / `oneWeek` / `oneMonth` / `oneYear` / `noLimit`（默认） |
| `request_id` | string | 否 | 请求追踪 ID，不传自动生成 |
| `user_id` | string | 否 | 终端用户 ID，6–128 字符，用于滥用监控 |

---

## 三、响应结构

```json
{
  "id": "req_abc123",
  "created": 1717200000,
  "search_result": [
    {
      "title": "搜索结果标题",
      "content": "内容摘要片段...",
      "link": "https://example.com/article",
      "media": "",
      "icon": "https://example.com/favicon.ico",
      "refer": "来源站点名称",
      "publish_date": "2026-05-20"
    }
  ]
}
```

| 字段 | 含义 |
|------|------|
| `id` | 任务 ID |
| `created` | 时间戳 |
| `search_result[].title` | 结果标题 |
| `search_result[].content` | 内容摘要 |
| `search_result[].link` | 原始 URL |
| `search_result[].icon` | 网站 favicon |
| `search_result[].refer` | 来源名称 |
| `search_result[].publish_date` | 发布日期 |

---

## 四、完整 cURL 示例

```bash
curl --request POST \
  --url https://api.z.ai/api/paas/v4/web_search \
  --header 'Authorization: Bearer <your_token>' \
  --header 'Content-Type: application/json' \
  --header 'Accept-Language: en-US,en' \
  --data '{
    "search_engine": "search-prime",
    "search_query": "latest AI news",
    "count": 25,
    "search_recency_filter": "oneDay"
  }'
```

---

## 五、两种使用模式

### 模式 1：独立 API

直接调 `/v4/web_search`，拿到原始搜索结果，自己处理。

### 模式 2：Chat Completion 内置 Tool

在 Chat Completion 请求中把 `web_search` 声明为 tool，模型自动决定何时搜索、如何拼 query、怎么把结果融入回复。相当于 **MCP 的 Tool Use 模式**，但搜索逻辑由 Z.AI 托管。

```json
{
  "model": "glm-4",
  "messages": [...],
  "tools": [
    {
      "type": "web_search",
      "web_search": {
        "search_query": "auto",
        "search_recency_filter": "oneWeek"
      }
    }
  ]
}
```

---

## 六、与 MCP Web Search 的对比

| 维度 | Z.AI Web Search | MCP Web Search |
|------|----------------|----------------|
| 定位 | 托管 API，Z.AI 帮你搜 | 工具协议，你自己接搜索引擎 |
| 传输 | REST POST | Streamable HTTP / stdio |
| 搜索源 | Z.AI 自己的搜索引擎 | 取决于 MCP Server 实现（Brave/Google/Bing） |
| LLM 集成 | 原生 tool，自动触发 | 需要 MCP Client + Server 配对 |
| 认证 | Bearer token | OAuth 2.1（远程）或免认证（本地 stdio） |
| 部署 | 零部署，调 API 即可 | 需要自己跑 MCP Server |

---

## 七、关键约束

1. **不是 Google/Bing 的代理**——Z.AI 用的是自己的搜索索引，结果质量取决于索引覆盖范围
2. **`search-prime` 目前是唯一选项**（文档中），智谱侧有更多引擎但属于不同产品线
3. **域名过滤是白名单不是黑名单**——你只能限定搜哪些站，不能排除特定站
4. **`user_id` 不是可选的**（如果你有终端用户）——滥用监控依赖它
