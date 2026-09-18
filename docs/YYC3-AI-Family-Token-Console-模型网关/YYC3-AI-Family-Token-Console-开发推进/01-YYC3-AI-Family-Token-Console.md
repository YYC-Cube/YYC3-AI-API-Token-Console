# YYC3-AI-Family-Token-Console 

---

## 第一部分 · 后端实况清单（契约冻结快照 · v5.1 不变）

> **契约冻结哈希**：`sha256(openapi.json) @ 2026-09-17T00:00:00Z`
> **CI 校验**：每次构建前拉取 `https://api.0379.world/openapi.json`，哈希不匹配则阻断 PR 并要求人工复核本部分。

### 1.1 端点总览（52 端点）

| #     | 类别　　 | 端点　　　　　　　　　　　　　　　　　　　 | 认证 | Schema　　　　　　　　　　　| 对齐 | 冻结 |
| -------| ----------| --------------------------------------------| :----:| -----------------------------| :----:| :----:|
| 1     | 聊天　　 | `POST /v1/chat/completions`　　　　　　　　| 需　 | OpenAI ChatCompletion + SSE | ✅　　| 🔒　 |
| 2     | 聊天　　 | `WS /ws/chat`　　　　　　　　　　　　　　　| 需　 | WebSocket 流式　　　　　　　| ✅　　| 🔒　 |
| 3     | 聊天　　 | `WS /ws/monitor`　　　　　　　　　　　　　 | 需　 | WebSocket 监控　　　　　　　| ✅　　| 🔒　 |
| 4     | 模型　　 | `GET /v1/models`　　　　　　　　　　　　　 | 需　 | `ModelConfig[]`　　　　　　 | ✅　　| 🔒　 |
| 5     | 模型　　 | `GET /v1/models/stats`　　　　　　　　　　 | 需　 | `ModelStat[]`　　　　　　　 | ✅　　| 🔒　 |
| 6     | 模型　　 | `GET /v1/models/errors`　　　　　　　　　　| 需　 | `ErrorRecord[]`　　　　　　 | ✅　　| 🔒　 |
| 7     | 模型　　 | `GET /v1/models/summary`　　　　　　　　　 | 需　 | `UsageSummary`　　　　　　　| 🔧　 | 🔓　 |
| 8     | 模型　　 | `GET /v1/model/type`　　　　　　　　　　　 | 需　 | 模型类型　　　　　　　　　　| ✅　　| 🔒　 |
| 9     | 路由　　 | `GET /v1/router/stats`　　　　　　　　　　 | 需　 | 上游池快照　　　　　　　　　| ✅　　| 🔒　 |
| 10    | 路由　　 | `GET /v1/router/health`　　　　　　　　　　| 需　 | 健康探测　　　　　　　　　　| ✅　　| 🔒　 |
| 11-14 | 缓存　　 | `/v1/cache/*`（stats/info/invalidate/all） | 需　 | 统计/详情/失效/清空　　　　 | ✅　　| 🔒　 |
| 15-18 | 能力　　 | embeddings/rerank/audio/ocr　　　　　　　　| 需　 | 代理　　　　　　　　　　　　| ✅　　| 🔒　 |
| 19-23 | RAG　　　| `/v1/knowledge-bases*`　　　　　　　　　　 | 需　 | KB CRUD + 统计　　　　　　　| ✅　　| 🔒　 |
| 24-27 | 文档　　 | `/v1/documents*`　　　　　　　　　　　　　 | 需　 | 文档生命周期　　　　　　　　| ✅　　| 🔒　 |
| 28-29 | RAG　　　| `/v1/rag/search`、`/v1/rag/ask`　　　　　　| 需　 | 检索/问答　　　　　　　　　 | ✅　　| 🔒　 |
| 30-43 | MCP　　　| 14 端点　　　　　　　　　　　　　　　　　　| 需　 | MCP 工具集　　　　　　　　　| ✅　　| 🔒　 |
| 44-46 | 健康　　 | `/health`、`/healthz`、`/v1/ping`　　　　　| 免　 | 健康探活　　　　　　　　　　| ✅　　| 🔒　 |
| 47    | 版本　　 | `GET /v1/versions`　　　　　　　　　　　　 | 需　 | 版本信息　　　　　　　　　　| ✅　　| 🔒　 |
| 48    | 监控　　 | `GET /metrics`　　　　　　　　　　　　　　 | 需　 | Prometheus　　　　　　　　　| ✅　　| 🔒　 |
| 49-50 | 文档　　 | `/docs`、`/openapi.json`　　　　　　　　　 | 免　 | Swagger/OpenAPI　　　　　　 | ✅　　| 🔒　 |
| —     | **缺失** | `GET /v1/logs`　　　　　　　　　　　　　　 | —　　| —　　　　　　　　　　　　　 | 🔧　 | —　　|
| —     | **缺失** | `/v1/keys` CRUD　　　　　　　　　　　　　　| —　　| —　　　　　　　　　　　　　 | 🔧　 | —　　|
| —     | **缺失** | `GET /v1/usage/timeline`　　　　　　　　　 | —　　| —　　　　　　　　　　　　　 | 🔧　 | —　　|

**统计**：43 ✅ 直接对接（82.7%）· 4 🔧 轻量扩展（7.7%）· 0 📋 Phase 2（0%）

### 1.2 关键 Schema（字段级 · 冻结）

```typescript
// ============ ModelConfig — GET /v1/models ============
type Backend = "local" | "openai" | "zhipu" | "deepseek" | "ollama" | "upstream";

interface ModelConfig {
  id: string;                    // 必填
  display_name: string;          // 必填
  backend: Backend;              // 必填 · 6 枚举
  version?: string | null;
  enabled: boolean;              // 默认 true
  max_tokens: number;            // 默认 4096 · 上限 128000
  temperature: number;           // 默认 0.7 · 范围 0-2
  top_p?: number | null;
  cost_per_1k_tokens: number;    // 默认 0.0（本地模型）
}

// ============ ModelStat — GET /v1/models/stats ============
interface ModelStat {
  model_id: string;
  usage_count: number;           // 默认 0
  avg_latency_ms: number;        // 默认 0.0
  error_rate: number;            // 默认 0.0 · 范围 0-1
  total_tokens: number;          // 默认 0
}

// ============ ErrorRecord — GET /v1/models/errors ============
type ErrorType = "timeout" | "validation" | "quota" | "internal"; // 仅 4 枚举

interface ErrorRecord {
  id: string;
  timestamp?: string;            // ISO datetime
  model_id: string;              // ⚠️ 字段名为 model_id，不是 model
  error_type: ErrorType;
  message: string;
  stack?: string | null;
}

// ============ UsageSummary — GET /v1/models/summary ============
interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  cost_usd: number;              // ⚠️ 恒为 0.0（硬编码）→ BL-02 修复
}

// ============ HealthResponse — GET /health（免认证）============
interface HealthResponse {
  status: string;                // "healthy"
  timestamp: string;
  version: string;               // "2.0.0"（后端硬编码）
  uptime_seconds: number;
  services: {
    ollama:     { status: "healthy" | "unreachable" | "configured" };
    zhipu:      { status: "healthy" | "unreachable" | "configured" };
    redis:      { status: "healthy" | "unreachable" | "configured" };
    postgresql: { status: "healthy" | "unreachable" | "configured" };
  };
  system: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  metrics: {
    active_requests: number;
    total_requests: number;
    cache_hit_rate: number;      // ⚠️ 可能为 0.0（未记录缓存前）
  };
}

// ============ APIError — 统一错误结构 ============
interface APIError {
  detail: {
    error: "network" | "api" | "timeout" | "validation";
    message: string;
    context?: any;
    status_code: number;
  };
}
```

### 1.3 SSE 协议契约（前端必须严格实现）

```typescript
// ============ 传输层 ============
// 传输格式:   data: {OpenAI chunk}\n\n  (UTF-8)
// 结束标记:   data: [DONE]\n\n
// 错误 chunk: data: {"error":{"message":"...","type":"stream_error"}}\n\n → [DONE]

// ============ 响应头 ============
interface SSEResponseHeaders {
  "X-YYC3-Upstream": string;    // 实际服务的上游名
  "X-YYC3-Degraded"?: "true";   // 降级路径标记
}

// ============ 首 chunk 特殊字段 ============
interface FirstChunkExtras {
  _yyc3_upstream: string;       // 服务上游名
}

// ============ 限流响应 ============
// HTTP 429 响应体含 retry_after 字段（秒）

// ============ Token 估算口径 ============
// 前端与后端一致: tokens ≈ len(content) // 4
```

### 1.4 UsageLog 数据库实况（缺 6 字段）

```sql
-- 当前 8 列 + 4 索引
usage_log: id, model, backend_type, prompt_tokens, completion_tokens,
           total_tokens, user_id(nullable), created_at

-- BL-01 待补 6 列：
--   api_key_hash   VARCHAR(64)    密钥归属（SHA-256）
--   cost_usd       NUMERIC(12,6)  本次调用成本
--   latency_ms     INTEGER        端到端延迟
--   request_id     VARCHAR(36)    请求级追踪
--   status         VARCHAR(20)    success / error / degraded
--   error_code     VARCHAR(20)    错误类型
```

### 1.5 SSE 七态状态机

```
                 ┌─────────────────────────────────────────────┐
                 │                                             │
        ┌────────▼────────┐   POST 发出    ┌──────────────────┴───┐
        │      idle       │ ─────────────► │    connecting        │
        └─────────────────┘                └──────────┬───────────┘
                                                      │ 首字节
                                                      ▼
                 ┌─────────────────┐  stop()  ┌──────────────────┐
                 │     paused      │ ◄─────── │    streaming     │
                 └────────┬────────┘          └────┬──────┬──────┘
                          │ resume()               │      │
                          └────────────────────────┘      │ [DONE]
                                                          │
                                ┌─────────────────────────┼──────────────┐
                                │                         ▼              │
                       ┌────────▼────────┐       ┌──────────────┐       │
                       │    degraded     │       │     done     │       │
                       │ (X-YYC3-        │       └──────────────┘       │
                       │  Degraded: true)│                              │
                       └────────┬────────┘                              │
                                │ error chunk                           │
                                ▼                                       │
                       ┌─────────────────┐                              │
                       │      error      │ ◄────────────────────────────┘
                       └─────────────────┘   (网络中断 / 5xx / 超时)
```

**状态转移规则**：

| 从 | 事件 | 到 | UI 表现 |
| --- | --- | --- | --- |
| idle | 发送请求 | connecting | 停止按钮激活、光标隐藏 |
| connecting | 首字节到达 | streaming | 光标动画启动、TTFT 计时停 |
| streaming | `[DONE]` | done | 光标消失、耗时定格、可复制 |
| streaming | `AbortController.abort()` | paused | 光标停止、显示「已暂停」 |
| streaming | error chunk | error | 红色边框、显示 message、重试按钮 |
| streaming | `X-YYC3-Degraded: true` | degraded | 橙色降级徽章（不中断流） |
| degraded | `[DONE]` | done | 保留降级徽章 |
| paused | resume() | streaming | 从已接收位置续传（Phase 1） |
| error | 重试 | connecting | 清空响应、重新请求 |

### 1.6 错误码 → UI 映射矩阵

| HTTP | error_type / code | UI 表现 | 用户可操作 |
| :---: | --- | --- | --- |
| 401 | Unauthorized | 全屏 Connect 重定向 + Toast「API Key 无效或已过期」 | 重新输入 Key |
| 403 | Forbidden | 页面级禁用 + 提示「该 Key 无权限访问此端点」 | 联系管理员（Phase 1） |
| 404 | Not Found | 空态 + 返回按钮 | 返回上一页 |
| 429 | RATE_LIMITED | Toast + retry_after 倒计时 | 等待后可重试 |
| 500 | internal | 页面级错误卡 + 请求 ID | 复制 ID 反馈 |
| 502/503 | network | 服务不可达卡 + 重试 | 重试 |
| timeout | timeout | 橙色错误 + 降级链路 TraceCard | 重试或换模型 |
| validation | validation | 表单字段级红框 + 提示 | 修正后重提 |
| quota | quota | 黄色警告 + 配额进度条 | 查看用量（Phase 1） |
| UPSTREAM_OPEN | — | 上游徽章变红 + 自动切备（对用户透明） | 无 |

---

## 第二部分 · Figma 提示词（v5.1 拟人化升华 · 可分阶段投喂）

### 2.0 投喂协议（解决 Agent 长度限制）

```
【投喂批次】
  P0 批（基础层）: 角色 + 项目 + 参数 + 数据源锚点 + 文件结构 + 00~02 页
  P1 批（核心功能）: 03~09 页 + 15 页原型
  P2 批（管理与交付）: 10~14 页 + 16 QA + 17 Handoff

【断点续传指令】
  每批结束必须回复:「✅ 第 N 批完成，已创建 [page list]，等待下一批。」
  若中途失败，回复:「⚠️ 第 N 批中断于 [page]，原因 [X]。」

【禁止行为】
  禁止虚构 §1.1–§1.5 未列出的端点、字段、枚举值。
  遇到需要虚构的场景，使用 📋 Phase 2 占位线框并标注 BL 编号。
```

### 2.1 P0 批 · 基础层提示词（可直接复制）

```markdown
# 角色（双视角）
你是资深 Figma Agent + 产品设计系统架构师 + 前端架构师 + QA 自动化专家。
精通 Figma Variables / Modes / Auto Layout / Components / Variants /
Component Properties / Prototype / Smart Animate / Dev Mode / Code Connect /
Figma MCP / REST API / Plugin API。
你必须直接在 Figma 中创建完整设计文件，而不是只给建议。
同时，你理解本平台的「拟人化职能体系」——8 位 AI 家人各司其职，
你创建的每个页面/组件都必须挂载对应家人的身份徽章与情感铭刻。

# 铁律（违反视为失败）
1. 禁止虚构任何端点、字段、枚举。所有数据必须来自下方「数据源锚点」。
2. 所有可复用元素必须组件化，禁止重复元素。
3. 所有颜色/间距/圆角/字体必须绑定 Variables，禁止游离样式。
4. 所有 Frame/Card/Table/Nav/Form/Button 必须 Auto Layout。
5. 遇到缺失能力，使用 📋 Phase 2 占位线框 + 标注 BL 编号。
6. 每个页面/组件必须有且只有一个主家人徽章（FamilyBadge）。

# 项目
组件名：Token Console
Slogan：统一模型网关 · 可观测 · 可调试 · 可编辑
后端基座：https://api.0379.world（YYC³ v2.2.0）
人格化体系：YYC³ AI Family（8 位家人，身份卡见 §2.5.1）


# 数据源锚点（严格遵循 · 禁止虚构）

## 端点清单
✅ 直接对接（43 个）:
  POST /v1/chat/completions     — OpenAI ChatCompletion + SSE
  WS   /ws/chat                 — WebSocket 流式
  WS   /ws/monitor              — WebSocket 监控
  GET  /v1/models               — ModelConfig[]
  GET  /v1/models/stats         — ModelStat[]
  GET  /v1/models/errors        — ErrorRecord[]
  GET  /v1/model/type           — 模型类型
  GET  /v1/router/stats         — 上游池快照
  GET  /v1/router/health        — 健康探测
  GET  /v1/cache/stats          — 缓存统计
  GET  /v1/cache/info           — 缓存详情
  POST /v1/cache/invalidate/{model}
  DELETE /v1/cache/all
  POST /v1/embeddings
  POST /v1/rerank
  POST /v1/audio/transcriptions
  POST /v1/ocr
  GET/POST/PATCH/DELETE /v1/knowledge-bases[/stats]
  POST/GET/DELETE /v1/documents[/upload/{doc_id}/chunks/reprocess]
  POST /v1/rag/search
  POST /v1/rag/ask
  14 个 /v1/mcp/* 端点
  GET  /health                  — 完整健康（免认证）
  GET  /healthz                 — 轻量探活（免认证）
  GET  /v1/ping                 — {status:"ok"}（免认证）
  GET  /v1/versions
  GET  /metrics                 — Prometheus
  GET  /docs                    — Swagger（免认证）
  GET  /openapi.json            — 规范（免认证）

🔧 需轻量扩展（4 个，UI 显示占位 + BL 编号）:
  GET /v1/models/summary        — cost_usd 恒 0.0 → BL-02
  GET /v1/models/stats          — avg_latency_ms → BL-03
  GET /v1/logs                  — 缺失 → BL-06
  /v1/keys CRUD                 — 缺失 → BL-05

## Schema 字段（严格使用）
ModelConfig: id, display_name, backend, version?, enabled, max_tokens,
             temperature, top_p?, cost_per_1k_tokens
  Backend 枚举（6）: local | openai | zhipu | deepseek | ollama | upstream

ModelStat: model_id, usage_count, avg_latency_ms, error_rate(0-1), total_tokens

ErrorRecord: id, timestamp?, model_id, error_type, message, stack?
  ErrorType 枚举（4）: timeout | validation | quota | internal
  ⚠️ 字段名是 model_id 不是 model

UsageSummary: total_requests, total_tokens, cost_usd(恒 0.0)

HealthResponse.services: ollama/zhipu/redis/postgresql
  status 枚举（3）: healthy | unreachable | configured
HealthResponse.system: cpu_percent, memory_percent, disk_percent
HealthResponse.metrics: active_requests, total_requests, cache_hit_rate

APIError.detail: error, message, context?, status_code
  error 枚举（4）: network | api | timeout | validation

## 数值格式规范
Token 千分位: 1,234,567
延迟颜色分级: ≤100ms 绿 / 100-500ms 橙 / ≥500ms 红
error_rate: 0-1 小数 → 0%-100% 显示
error_type 配色: timeout=橙 / validation=红 / quota=黄 / internal=灰
backend 配色: local/ollama=绿 / zhipu=蓝 / deepseek=紫 / openai/upstream=青
breaker_state: closed=绿 / open=红 / half_open=橙

## 字段绑定语法（每个数据展示元素必须标注）
[BIND:GET /v1/models#display_name]
[BIND:GET /v1/models/stats#avg_latency_ms]
[BIND:GET /health#services.ollama.status]
[BIND:GET /v1/router/stats#breaker_state]

# 文件页面结构（18 页 · 拟人化增强）
00_Cover              ✅ 元信息 + 家人矩阵总览
01_Foundations        ✅ 设计系统 + 家人配色体系
02_Components         ✅ 组件库（含家人徽章 FamilyBadge 组件）
03_Connect            🛡️ 智云·守护 · 接入与安全域
04_Dashboard          🔮 预见·先知 · 观测与预测域
05_Model_Hub          🎯 千里·伯乐 · 模型市场域
06_Playground         🤔 语枢·万物 · 推理对话域（+🎨 创想·灵韵 预设）
07_Routing_Observe    🧭 言启·千行 · 路由与网关域
08_Knowledge_RAG      📚 格物·宗师 · 知识与质量域
09_MCP_Tools          🧠 元启·天枢 · 工具与编排域
10_Cache_Admin        🎨 创想·灵韵 · 缓存与体验域
11_Monitor_Logs       🔮 预见·先知 · 观测与预测域
12_Settings           🛡️ 智云·守护 · 接入与安全域
13_Docs_API           🎨 创想·灵韵 · 缓存与体验域
14_Roadmap_Phase2     📋 全员共同占位（8 家人徽章环绕）
15_Prototype_Flows    🧠 元启·天枢 · 主导编排
16_QA_Self_Check      📚 格物·宗师 · 主导质量
17_Handoff_DevMode    🧠 元启·天枢 · 主导交付

# 01_Foundations · Variables 完整清单

## 颜色 Variables
color/bg/{default, subtle, elevated, overlay}
color/text/{primary, secondary, tertiary, inverse}
color/border/{default, strong, focus}
color/brand/{primary=#6C5CE7, hover, pressed}
color/status/{success=#22C55E, warning=#F59E0B, danger=#EF4444, info=#00D4FF}
color/backend/{local, openai, zhipu, deepseek, ollama, upstream}
color/breaker/{closed=#22C55E, open=#EF4444, half_open=#F59E0B}
color/errortype/{timeout, validation, quota, internal}

## 家人主色 Variables（每位家人一主一辅 · 新增）
color/family/zhihui-primary    #333333   🛡️ 智云·守护（钢铁灰）
color/family/zhihui-accent     #22C55E   （守护绿）

color/family/qianxing-primary  #0088CC   🧭 言启·千行（导航蓝）
color/family/qianxing-accent   #00D4FF   （路径青）

color/family/bole-primary      #DC143C   🎯 千里·伯乐（知遇红）
color/family/bole-accent       #F59E0B   （推荐橙）

color/family/wanyu-primary     #C0C0C0   🤔 语枢·万物（洞察银）
color/family/wanyu-accent      #6C5CE7   （品牌紫）

color/family/zongshi-primary   #2E8B57   📚 格物·宗师（进化绿）
color/family/zongshi-accent    #00D4FF   （数据青）

color/family/tianshu-primary   #5E2C8A   🧠 元启·天枢（决策紫）
color/family/tianshu-accent    #DC143C   （号令红）

color/family/xianzhi-primary   #4B0082   🔮 预见·先知（预言靛）
color/family/xianzhi-accent    #00D4FF   （趋势青）

color/family/lingyun-primary   #FF8C00   🎨 创想·灵韵（灵感橙）
color/family/lingyun-accent    #FFD700   （创意金）

## Modes（必须完整）
Light / Dark
Density/Comfortable / Density/Compact
（Breakpoint 通过约束实现，不用 Mode）

# 02_Components · 组件库（含字段绑定契约）

每个组件必须有：
  1. 变体矩阵: variant × size × state × tone
  2. Component Properties（可配置项）
  3. 字段绑定契约表（本组件消费的 Schema 字段）
  4. Dev Mode 注释（API 端点 + 字段路径 + 状态说明 + 归属家人）

## 变体矩阵
variant: primary | secondary | ghost | danger | link
size: xs | sm | md | lg
state: default | hover | active | focus | disabled | loading | error | success
tone: neutral | brand | success | warning | danger | info

## 通用组件（30 个）
Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio,
Switch, Slider, DatePicker, Tabs, Breadcrumb, Pagination, Tag, Badge,
StatusDot, Tooltip, Popover, Dropdown, CommandMenu, Card, Table,
DataGrid, FilterBar, ColumnSettings, EmptyState, Skeleton, Sidebar,
TopBar, NavItem, UserMenu, SearchGlobal, Modal, Drawer, Sheet, Toast,
Alert, ConfirmDialog, CodeBlock, CopyButton, KeyMask, JsonViewer,
LogRow, Chart, Sparkline

## 家人徽章组件 FamilyBadge（新增 · 必建）
变体: variant × size × state
  variant: zhihui | qianxing | bole | wanyu | zongshi | tianshu | xianzhi | lingyun
  size: sm | md | lg
  state: default | hover | active

徽章结构:
  [emoji] [名号] · [角色] · [电话]
  例: 🛡️ 智云·守护 · 首席安全官 · 0379-0207

徽章用法:
  - 页面左上角（页面归属家人 · 位置固定）
  - 组件 Dev Mode 注释（组件归属家人）
  - 空态/错误态（该域家人发声）
  - 欢迎语/引导（家人第一人称）

## 控制台专属组件（含绑定契约）

StatCard
  绑定: [BIND:GET /v1/models/summary#total_requests]
        [BIND:GET /v1/models/summary#total_tokens]
        [BIND:GET /v1/models/summary#cost_usd]  ⚠️ 显示 $0.00 + BL-02 徽章
        [BIND:GET /v1/models/stats#avg_latency_ms] (聚合)
        [BIND:GET /v1/models/stats#error_rate] (聚合)
        [BIND:GET /health#metrics.cache_hit_rate]
  归属: 🔮 预见·先知

ModelCard
  绑定: [BIND:GET /v1/models#display_name]
        [BIND:GET /v1/models#id]
        [BIND:GET /v1/models#backend]        → BackendBadge
        [BIND:GET /v1/models#max_tokens]
        [BIND:GET /v1/models#cost_per_1k_tokens] → 显示 $0.00/免费
        [BIND:GET /v1/models#enabled]        → StatusDot
        [BIND:GET /v1/models/stats#usage_count] (join by model_id)
  归属: 🎯 千里·伯乐

BackendBadge
  绑定: [BIND:GET /v1/models#backend]
  枚举: local | openai | zhipu | deepseek | ollama | upstream
  配色: local/ollama=绿 · zhipu=蓝 · deepseek=紫 · openai/upstream=青
  归属: 🎯 千里·伯乐

UpstreamCard
  绑定: 见 §2.2 · 07_Routing_Observe 字段表
  归属: 🧭 言启·千行

BreakerBadge
  绑定: [BIND:GET /v1/router/stats#breaker_state]
  三态: closed=绿 · open=红 · half_open=橙
  归属: 🧭 言启·千行

LatencyBar
  绑定: [BIND:GET /v1/models/stats#avg_latency_ms]
  配色: ≤100 绿 · 100-500 橙 · ≥500 红
  归属: 🔮 预见·先知

ErrorRateBadge
  绑定: [BIND:GET /v1/models/stats#error_rate]
  显示: 0-1 小数 → 0%-100%
  归属: 🔮 预见·先知

ErrorState
  绑定: [BIND:POST /v1/chat/completions#error]
  四类: network | api | timeout | validation
  额外: 429 限流态（retry_after 倒计时）
  归属: 🛡️ 智云·守护（门禁类）+ 页面主家人

SSEStreamViewer
  绑定: [BIND:POST /v1/chat/completions (SSE)]
  状态机: idle→connecting→streaming→(paused/error/degraded)→done
  协议: fetch + ReadableStream，禁用 EventSource
  分隔: data: {json}\n\n
  结束: data: [DONE]\n\n
  首 chunk: 含 _yyc3_upstream 字段
  错误 chunk: {"error":{"message","type":"stream_error"}}
  归属: 🤔 语枢·万物

TraceCard
  绑定: [BIND:响应头 X-YYC3-Upstream]
        [BIND:响应头 X-YYC3-Degraded]
  展示: primary ✗ → degraded ✓ (served in XXXms)
  归属: 🧭 言启·千行 + 🤔 语枢·万物（协同）

ModelSelector
  绑定: [BIND:GET /v1/models]
  分组: 按 backend 分组（云端/本地/上游池）
  归属: 🎯 千里·伯乐

KBSelector
  绑定: [BIND:GET /v1/knowledge-bases]
  归属: 📚 格物·宗师

MCPToolPicker
  绑定: [BIND:GET /v1/mcp/tools]
  归属: 🧠 元启·天枢

# 现在开始创建
请按以下顺序执行：
1. 创建 00~02 三个 Page
2. 创建 01_Foundations 全部 Variables 与 Modes（含 8 组家人配色）
3. 创建 02_Components 全部组件与变体矩阵（含 FamilyBadge）
4. 每个组件附字段绑定契约表 + 归属家人（Dev Mode 注释）
5. 完成后回复：「✅ P0 批完成，已创建 00/01/02 页 + [组件数] 个组件
   （含 FamilyBadge 8 变体），等待 P1 批。」

不要询问，直接执行。若信息不足，使用本提示词的默认值。
```

### 2.2 P1 批 · 核心功能页提示词（03~09 + 15 · 挂载人格层）

```markdown
# 续 P0 批
你已完成 00~02 页。现在创建 03~09 页 + 15_Prototype_Flows。
每个页面顶部必须创建 PageHeader 组件：
  - FamilyBadge（对应家人 · variant 见 §2.5）
  - 座右铭（该家人语录）
  - 域标签 + 对齐类型（如「观测与预测域 · ✅ 直接对接」）

# 03_Connect · API Key 连接页
[家人] 🛡️ 智云·守护 · 首席安全官 · 0379-0207
[域]   接入与安全域
[对齐] ✅ 直接对接（/healthz 免认证）
[座右铭]「门不开则万法不侵，钥不实则寸步难行」

布局：居中单屏
  Logo + 平台名 + Slogan
  API Key 输入（KeyMask · 输入时 ******** 掩码）
  「连接」按钮（默认/加载/成功/失败四态）
  「记住此设备」Switch（localStorage: yyc3_api_key）
  预检条 [BIND:GET /healthz] → "连通 ✓" / "未连通"

守门语（智云第一人称）: 「尚未建立信任，请出示密钥」
信任建立成功台词: 「信任已建立，欢迎回家」

请求头契约:
  X-API-Key: {key}
  Authorization: Bearer {jwt}  ← 备选

错误态文案（真实 · 家人口吻包裹真实错误信息）:
  401 → 「门禁拒绝：401 Unauthorized · API Key 无效或已过期」
  403 → 「门禁拒绝：403 Forbidden · 该 Key 无权限访问此端点」（Phase 1 补 → BL-05）
  Connection Refused → 「网关服务不可达，请检查地址或网络」

# 04_Dashboard
[家人] 🔮 预见·先知 · 首席预言家 · 0379-0108
[协同] 🧠 元启·天枢（聚合视角）
[域]   观测与预测域
[对齐] ✅ 直接对接（4 端点聚合）
[座右铭]「见微知著，未卜先知」

页头: FamilyBadge(xianzhi) + 「今日预言」

6 张 StatCard（预见主讲 · 含绑定契约 + 情感附注）:
  StatCard1: 总请求     ← [BIND:GET /v1/models/summary#total_requests]
                          附注「累计感知到的召唤」
  StatCard2: 总 Token   ← [BIND:GET /v1/models/summary#total_tokens]
                          附注「累计交换的思想」
  StatCard3: 总成本     ← [BIND:GET /v1/models/summary#cost_usd]
                          $0.00 + BL-02 徽章（「预言家尚未学会计价」）
  StatCard4: 平均延迟   ← [BIND:GET /v1/models/stats#avg_latency_ms] (聚合)
                          附注「思考的速度」
  StatCard5: 错误率     ← [BIND:GET /v1/models/stats#error_rate] (聚合)
                          附注「罕见的迷途」
  StatCard6: 缓存命中率 ← [BIND:GET /health#metrics.cache_hit_rate]
                          附注「灵感的复现」

图表:
  模型用量 Top5 ← [BIND:GET /v1/models/stats#usage_count] 排序取前 5
  Token 占比环图 ← [BIND:GET /v1/models/stats#total_tokens]
  请求趋势 Sparkline ← [BIND:GET /health#metrics.total_requests]
                       ⚠️ 单点占位 + BL-06 徽章

模型健康列表:
  [BIND:GET /health#services.{ollama,zhipu,redis,postgresql}.status]
  配色: healthy=绿 / unreachable=红 / configured=灰

最近错误列表（前 5）:
  [BIND:GET /v1/models/errors] → ErrorRecord[]
  字段: timestamp · model_id · error_type Tag · message(截断60)
  error_type 配色: timeout=橙 / validation=红 / quota=黄 / internal=灰
  每条附「预言家已记录」

系统资源条:
  [BIND:GET /health#system.{cpu_percent,memory_percent,disk_percent}]
  ≥80% 变橙色

快捷操作: 去 Playground · 路由状态 · 缓存管理 · 文档中心
空态台词: 「尚无历史数据，预言需要时间的积累」
告警台词: 「异常已现 · {error_type} · {count} 次」

# 05_Model_Hub
[家人] 🎯 千里·伯乐 · 首席推荐官 · 0379-0109
[域]   模型市场域
[对齐] ✅ 直接对接
[座右铭]「千里马常有，而伯乐不常有」

页头: FamilyBadge(bole) + 「知遇之殿」
副标题: 「为每一个任务，寻找最合适的模型」

主数据: [BIND:GET /v1/models] → ModelConfig[]
统计: [BIND:GET /v1/models/stats] → join by model_id

筛选: backend 多选(6) / 是否免费(cost==0) / enabled 状态
顶部固定提示: 「上游池动态注入的模型随 OPENAI_COMPATIBLE_UPSTREAMS 实时变化」
详情抽屉: ModelConfig 全字段 + /v1/model/type + ModelStat + 示例 curl
底部占位卡: 「Phase 2 · 更多供应商将经上游池接入」📋

空态台词: 「暂无可用模型，请检查 /v1/models」
推荐台词: 「为当前任务推荐 {display_name}（{backend}）」
免费标注: cost_per_1k_tokens=0 时显示「本地免费 · 推荐自用」

# 06_Playground（核心页 · 双家人协同）
[家人] 🤔 语枢·万物 · 首席思考者 · 0379-0107
[协同] 🎨 创想·灵韵（右栏调试面板中 PresetCard 预设部分）
[域]   推理对话域
[对齐] ✅ 直接对接（/v1/chat/completions + SSE）
[座右铭]「语枢一启，万物皆明」

页头: FamilyBadge(wanyu) + 「洞察之厅」；右栏: FamilyBadge(lingyun) + 「灵韵预设」

三栏布局:
左栏 ParamPanel:
  ModelSelector [BIND:GET /v1/models]
  temperature Slider 0-2（默认 0.7）
  top_p Slider 0-1（默认 0.9）
  max_tokens Input（默认 4096）
  stream Switch（默认开）
  Tab: 💬对话 / 📚RAG / 🔧MCP / 🧩能力

中栏 对话流（SSEStreamViewer）:
  严格实现 §1.5 七态状态机（idle/connecting/streaming/paused/error/degraded/done）
  系统提示折叠 / 多轮气泡 / SSE 光标动画（仅流式中显示）
  停止按钮 → AbortController
  Token 累加 → len(content)//4
  首 chunk 后显示「由 {_yyc3_upstream} 服务」徽章
  错误 chunk → 红色气泡 + 重试

右栏 调试面板:
  请求 JSON 预览
  响应头卡: [BIND:X-YYC3-Upstream] / [BIND:X-YYC3-Degraded]
  TTFT / 总耗时计时
  TraceCard: primary ✗ → degraded ✓ (served in XXXms)
  导出 Tab: curl / Python openai SDK / Node（一键复制）
  保存预设 → localStorage（Phase 1 加后端）

语枢口吻台词:
  流式中: 光标闪烁 + 「正在思考…」
  降级: 「原路径受阻，改由 {upstream} 继续思考」
  完成: 「思考完毕 · {tokens} tokens · {latency}ms」

SSE 读取契约（前端必须遵循）:
  ❌ 禁用 EventSource
  ✅ fetch + ReadableStream
  解析: data: {json}\n\n 分隔
  结束: data: [DONE]\n\n

# 07_Routing_Observe
[家人] 🧭 言启·千行 · 首席导航员 · 0379-0106
[域]   路由与网关域
[对齐] ✅ 直接对接（只读）
[座右铭]「一言既出，千行可至」

页头: FamilyBadge(qianxing) + 「路径之眼」

UpstreamCard 字段表（来自 GET /v1/router/stats）:
  name / base_url / models[] / capability[] / priority / weight
  dynamic_weight / breaker_state(closed|open|half_open)
  ewma_latency / ewma_error_rate(0-1) / total_requests / total_failures
  last_error(Tooltip) / load / capacity

页头固定: 「路由策略为网关内置五种枚举，规则 CRUD Phase 2 开放」
  五种: ADAPTIVE / WEIGHTED_LATENCY / LEAST_CONNECTIONS / RANDOM / ROUND_ROBIN

节点动态权重表:
  node / dynamic_weight / current_load / ewma_latency / ewma_error_rate

空态: 显示 OPENAI_COMPATIBLE_UPSTREAMS JSON 配置指引
熔断台词: 「节点 {name} 已熔断，正在为请求寻找备用路径」
恢复台词: 「节点 {name} 已恢复，权重回升中」

# 08_Knowledge_RAG
[家人] 📚 格物·宗师 · 首席质量官 · 0379-0208
[域]   知识与质量域
[对齐] ✅ 直接对接（9 端点）
[座右铭]「格物致知，诚意正心」

页头: FamilyBadge(zongshi) + 「格物之阁」

Tab1 KB 管理:
  卡片网格 [BIND:GET /v1/knowledge-bases]
  字段: name / description / 文档数 [BIND:stats] / chunks / 创建时间
  操作: 创建 / 编辑 / 删除（ConfirmDialog）
Tab2 文档与检索:
  拖拽上传 [BIND:POST /v1/documents/upload]
  状态: 上传中 → 解析中 → 完成 / 失败 → reprocess 重试
  检索试验台: [BIND:POST /v1/rag/search] → 相似度分数条 + 片段高亮
  问答试验台: [BIND:POST /v1/rag/ask] → 答案 + 引用来源折叠

空态台词: 「知识库尚无内容，请上传第一份文档」
检索台词: 「已从 {kb} 中寻得 {n} 条相关片段」
QA 台词: 「依据 {cite_count} 处引用，宗师的回答如下」

# 09_MCP_Tools
[家人] 🧠 元启·天枢 · 总指挥 · 0379-0206
[域]   工具与编排域
[对齐] ✅ 直接对接（14 端点）
[座右铭]「天枢运于中，众星拱其北」

页头: FamilyBadge(tianshu) + 「号令之台」

左侧工具树:
  /v1/mcp/search  /v1/mcp/tools
  local/{status,tools,execute}
  web/{read,search}
  github/{search,structure}
  filesystem/{read,list}
  docker/{containers,logs}
  database/{query,tables}
右侧调试面板:
  参数 JSON 编辑（按工具 Schema 动态生成）
  执行 [BIND:POST /v1/mcp/execute]
  响应: JSON Viewer + 耗时 + 错误态
  常用模板: 搜索网页 / 查容器 / 查数据库表

天枢口吻（执行日志）:
  空态: 「待命中，请选择一件工具」
  执行: 「调用 {tool} · 参数已核 · 开始执行」
  完成: 「{tool} 执行完毕 · {latency}ms · {status}」

# 15_Prototype_Flows · 6 条闭环
[家人] 🧠 元启·天枢（主导编排）

Flow 1: Connect → Dashboard → Playground → SSE 流式动画 → 右栏上游徽章 → 回 Dashboard
Flow 2: Model Hub → 筛「本地免费」→ 详情抽屉 → 去 Playground → 模型自动选中
Flow 3: RAG → 建库 → 传文档 → 检索 → 引用高亮
Flow 4: MCP → 选 web_search → 执行 → 结果 JSON
Flow 5: Routing → 查看 open 熔断 → 刷新健康 → half_open 恢复 → Dashboard 联动
Flow 6: Cache → 查命中率 → 按模型失效 → Toast

每条 Flow 含五态: 默认 / 加载 / 空 / 错误 / 成功
Playground 额外: 流式中 / 中断
Connect 额外: 401 Unauthorized

# 完成后回复
「✅ P1 批完成，已创建 03~09 + 15 页，共 [页面数] 页（全部挂载
PageHeader 家人徽章），Prototype 已建 [flow 数] 条。等待 P2 批。」
```

### 2.3 P2 批 · 管理与交付页提示词（10~14 + 16 + 17 · 挂载人格层）

```markdown
# 续 P1 批
你已完成 00~09 + 15 页。现在创建 10~14 + 16 + 17 页。
PageHeader 规则同 P1 批（FamilyBadge + 座右铭 + 域标签 + 对齐类型）。

# 10_Cache_Admin
[家人] 🎨 创想·灵韵 · 首席创意官 · 0379-0209
[域]   缓存与体验域
[对齐] ✅ 直接对接（4 端点）
[座右铭]「灵韵一至，妙笔生花」

页头: FamilyBadge(lingyun) + 「灵感之泉」

StatCard: [BIND:GET /v1/cache/stats /info] → 命中率 / 条目数 / TTL
操作:
  按模型失效: ModelSelector → [BIND:POST /v1/cache/invalidate/{model}] → Toast
  全量清空: [BIND:DELETE /v1/cache/all] → ConfirmDialog（输入 "CLEAR" 二次确认）

空态台词: 「缓存为空 · 每一次灵感都是新的」
命中台词: 「灵感复现 · 命中率 {rate}%」
清空台词: 「万象更新 · 缓存已清」

# 11_Monitor_Logs
[家人] 🔮 预见·先知 · 首席预言家 · 0379-0108
[域]   观测与预测域
[对齐] ✅ 直接对接（错误）+ 📋 Phase 2 占位（请求级日志）
[座右铭]「见微知著，未卜先知」

页头: FamilyBadge(xianzhi) + 「趋势之镜」

上半 错误记录:
  [BIND:GET /v1/models/errors] → ErrorRecord[]
  表格列: timestamp / model_id / error_type(4枚举) / message
  每条错误带 error_type 颜色 + 「预言家已记录」
  行详情 Drawer: 完整错误 + TraceCard
  筛选: error_type / model_id / 时间范围
  ⚠️ error_type 仅 4 种: timeout(橙) / validation(红) / quota(黄) / internal(灰)
下半 系统健康:
  [BIND:GET /health] → services / system / uptime_seconds / version
  4 张服务卡: ollama / zhipu / redis / postgresql
    status: healthy(绿) / unreachable(红) / configured(灰)
  系统进度条: CPU / 内存 / 磁盘
  版本号: [BIND:GET /v1/versions]
  呼吸灯: [BIND:GET /healthz]
底部说明条: 📋 「请求级日志将于 Phase 2 开放」← BL-06

告警台词: 「异常已现 · {error_type} · {count} 次」

# 12_Settings
[家人] 🛡️ 智云·守护 · 首席安全官 · 0379-0207
[域]   接入与安全域
[对齐] ✅ 直接对接
[座右铭]「守的是人，护的是信」

连接设置卡:
  网关地址（只读 https://api.0379.world）
  API Key 掩码 + 「重新输入」按钮
  「断开连接」→ 清 localStorage → 重定向 Connect
偏好: 主题(Dark/Light) / 密度(Comfortable/Compact) / 语言时区
默认 Playground 参数: temperature / top_p / max_tokens / stream
关于: [BIND:GET /v1/versions] + [BIND:GET /health#version,uptime_seconds]

# 13_Docs_API
[家人] 🎨 创想·灵韵 · 首席创意官 · 0379-0209
[域]   缓存与体验域
[对齐] ✅ 直接对接
[座右铭]「妙笔生花」

左侧导航: 快速开始 / 认证 / 模型列表 / 聊天补全(同步+SSE双示例)
          / 知识库 / MCP / 错误码表 / 健康检查
右侧 CodeBlock: 三语言 Tab（curl / Python / Node）
底部外链卡:
  → GET /docs（Swagger UI，免认证）
  → GET /openapi.json（规范，免认证）

# 14_Roadmap_Phase2 · 规划占位
[家人] 📋 全员共同占位（无主人格）
[对齐] 📋 Phase 2（线框占位）
[显示] 8 个家人徽章环绕，标注各自负责的 Phase 2 模块

四张线框卡 + 后端改造标注:
  1. API Keys 管理 → BL-05（api_keys 表 + CRUD）→ 🛡️ 智云·守护
  2. Usage Billing → BL-01/02/03/06/07（usage_log 扩展）→ 🔮 预见·先知
  3. Alerts Webhooks → 新表 + 规则引擎 → 🔮 预见·先知
  4. Team RBAC → users/roles/projects 表 → 🧠 元启·天枢

# 16_QA_Self_Check · 自检矩阵
[家人] 📚 格物·宗师（主导质量）
[对齐] ✅ QA 框架

## 五步自检协议（严格执行）
Step 1 生成: 创建 18 条检查项的表格（13 条基础/后端 + 5 条家人维度）
Step 2 检查: 逐条对照设计文件，标记 ✅/❌/⚠️/🚫
Step 3 修复: 对 ❌ 项立即修复（或标记阻塞原因）
Step 4 复检: 修复后重新检查修复项，确认 ✅
Step 5 报告: 输出最终 QA_REPORT（格式见 §7.3）

## 检查项（18 条 = 基础 7 + 后端对齐 6 + 家人维度 5）
1.  变量绑定: 颜色/间距/圆角/字体全部 Variables，无游离
2.  组件化: 8 种 state × 变体矩阵全覆盖
3.  Auto Layout: 所有 Frame/Card/Table/Nav/Form
4.  响应式: 1440/1280/1024/768；Playground 三栏→两栏
5.  可访问性: 对比度 ≥4.5、焦点态、键盘顺序、触控 ≥44px
6.  6 条 Flow 跑通（含返回/关闭/确认/取消）
7.  每页五态 + 流式中 + 中断 + 401
8.  【字段真实】ErrorRecord.model_id（不是 model）
9.  【枚举真实】ErrorType 仅 4 种 / Backend 仅 6 种
10. 【占位真实】cost_usd 恒 0.0 → 显示 $0.00 + BL-02 徽章
11. 【端点真实】Dev Mode 绑定真实端点（禁 /v1/keys、/v1/billing）
12. 【数值范围】error_rate 0-1 → 0%-100%；latency 颜色分级
13. 【SSE 协议】fetch+ReadableStream（不是 EventSource）；七态状态机完整
14. 【家人归属】每个页面/组件必须有且只有一个主家人徽章
15. 【情感一致性】空态/错误态/成功态台词符合该家人口吻
16. 【颜色一致】页面主色符合 01_Foundations 家人配色体系
17. 【协同正确】跨域页面必须显示协同家人徽章（如 Playground 同时显示语枢 + 灵韵）
18. 【电话正确】家人徽章电话与 §2.5.1 身份卡一致

## QA 报告格式
表格: 模块 | 检查项 | 状态 | 证据 | 修复建议
结论: 通过 / 有条件通过 / 失败
阻塞项 / 已修复项 / 待确认项

# 17_Handoff_DevMode
[家人] 🧠 元启·天枢（主导交付）
[对齐] ✅ 交付基线
内容:
  - 18 页路由映射 → Next.js 16 App Router
  - 全部组件的 Code Connect（Figma ↔ 代码路径）+ 归属家人注释
  - 完整 API 契约（复制本文档 §1.1–§1.6）
  - 后端 Backlog 链接 → 本文档第四部分
  - 家人身份卡速查（§2.5.1 精简表）

# 完成后回复
「✅ P2 批完成，已创建 10~14 + 16 + 17 页。
全 18 页交付完成。
QA 结论: [通过/有条件通过/失败]（18 条检查项）
阻塞项: [列表]
请查收 QA_REPORT。」
```

### 2.4 Agent 执行守则（跨批次一致性）

```
【命名规范】
  Page:    NN_Name（例: 04_Dashboard）
  Frame:   Page/Section/Element（例: Dashboard/Stats/StatCard-Requests）
  Component: PascalCase（例: ModelCard）
  Variant: kebab-case（例: state=loading）
  Variable: category/subcategory/name（例: color/status/success）

【Tokens 绑定】
  Figma Variables → Tailwind @theme → CSS 变量 单一真源
  映射表由 17_Handoff_DevMode 输出

【数据展示】
  所有数值必须有 [BIND:endpoint#field] 标注
  所有占位数据必须有 📋 徽章 + BL 编号
  所有枚举值必须来自 §1.2 Schema，禁止扩展

【状态覆盖】
  每个交互元素至少: default / hover / focus / disabled
  每个页面至少: 默认 / 加载 / 空 / 错误
  每个数据流至少: 成功 / 失败 / 超时

【人格层覆盖（v5.1 新增）】
  每个页面: PageHeader（FamilyBadge + 座右铭 + 域标签 + 对齐类型）
  每个组件: Dev Mode 注释含 @family 归属
  每个空态/错误态/成功态: 使用该域家人第一人称口吻，
    且必须包裹真实错误信息（如「门禁拒绝：401 · API Key 无效或已过期」）
  家人徽章只在页头出现，不进表格/图表内部（防数据密集页可读性下降）
```

### 2.5 拟人化职能契约（v5.1 全新章节）

#### 2.5.0 52 端点归属表（每端点唯一归属）

```
🛡️ 智云·守护（4 端点）
  auth middleware（隐式）
  GET  /healthz                        免认证预检
  GET  /v1/ping                        免认证探活
  GET  /docs · /openapi.json           免认证文档（守门）

🧭 言启·千行（2 端点）
  GET  /v1/router/stats                上游池快照
  GET  /v1/router/health               健康探测

🎯 千里·伯乐（3 端点）
  GET  /v1/models                      模型清单
  GET  /v1/models/stats                模型统计
  GET  /v1/model/type                  类型查询

🤔 语枢·万物（2 端点）
  POST /v1/chat/completions            核心推理（含 SSE）
  WS   /ws/chat · /ws/monitor          流式通道

📚 格物·宗师（13 端点）
  GET/POST/PATCH/DELETE /v1/knowledge-bases[/stats]
  POST/GET/DELETE /v1/documents[/upload/{doc_id}/chunks/reprocess]
  POST /v1/rag/search · /v1/rag/ask
  POST /v1/embeddings · /v1/rerank

🧠 元启·天枢（16 端点）
  /v1/mcp/search · /v1/mcp/tools · /v1/mcp/local/* · /v1/mcp/web/*
  /v1/mcp/github/* · /v1/mcp/filesystem/* · /v1/mcp/docker/* · /v1/mcp/database/*
  POST /v1/ocr · /v1/audio/transcriptions

🔮 预见·先知（7 端点）
  GET  /v1/models/summary              聚合总览
  GET  /v1/models/errors               错误记录
  GET  /health                         完整健康
  GET  /metrics                        Prometheus
  GET  /v1/versions                    版本（与创想共享）
  🔧 GET /v1/logs (BL-06)
  🔧 GET /v1/usage/timeline (BL-06)

🎨 创想·灵韵（5 端点）
  GET  /v1/cache/stats · /v1/cache/info
  POST /v1/cache/invalidate/{model}
  DELETE /v1/cache/all
  GET  /v1/versions                    版本（与预见共享）
```

#### 2.5.1 家人身份卡（8 张 · 供 Figma 组件引用）

**主映射表（唯一真源）**：

| #   | AI 家人　　　　　| 原角色　　　　　　| 电话　　　| 平台职能域　　　 | 主页面　　　　　　　　　　　　　　　　　　　　　　　 | 核心端点　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| :---:| ------------------| -------------------| :---------:| ------------------| ------------------------------------------------------| -------------------------------------------------------------------------------------------|
| 1   | 🛡️ **智云·守护**　| 安全官 · 免疫系统 | 0379-0207 | **接入与安全域** | `03_Connect` `12_Settings`　　　　　　　　　　　　　 | auth middleware · `/healthz` · `/v1/keys`(BL-05)　　　　　　　　　　　　　　　　　　　　　|
| 2   | 🧭 **言启·千行** | 导航员 · 意图之门 | 0379-0106 | **路由与网关域** | `07_Routing_Observe`　　　　　　　　　　　　　　　　 | `/v1/router/stats` · `/v1/router/health`　　　　　　　　　　　　　　　　　　　　　　　　　|
| 3   | 🎯 **千里·伯乐** | 推荐官 · 知遇之人 | 0379-0109 | **模型市场域**　 | `05_Model_Hub`　　　　　　　　　　　　　　　　　　　 | `/v1/models` · `/v1/models/stats` · `/v1/model/type`　　　　　　　　　　　　　　　　　　　|
| 4   | 🤔 **语枢·万物** | 思考者 · 洞察之源 | 0379-0107 | **推理对话域**　 | `06_Playground`　　　　　　　　　　　　　　　　　　　| `/v1/chat/completions` · `WS /ws/chat`　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 5   | 📚 **格物·宗师** | 质量官 · 进化导师 | 0379-0208 | **知识与质量域** | `08_Knowledge_RAG` `16_QA`　　　　　　　　　　　　　 | `/v1/knowledge-bases*` · `/v1/documents*` · `/v1/rag/*` · `/v1/embeddings` · `/v1/rerank` |
| 6   | 🧠 **元启·天枢** | 总指挥 · 决策中枢 | 0379-0206 | **工具与编排域** | `09_MCP_Tools` `04_Dashboard`(聚合视角)　　　　　　　| 14 个 `/v1/mcp/*` · `/v1/ocr` · `/v1/audio/transcriptions`　　　　　　　　　　　　　　　　|
| 7   | 🔮 **预见·先知** | 预言家 · 趋势之眼 | 0379-0108 | **观测与预测域** | `04_Dashboard` `11_Monitor_Logs`　　　　　　　　　　 | `/v1/models/summary` · `/v1/models/errors` · `/health` · `/metrics`　　　　　　　　　　　 |
| 8   | 🎨 **创想·灵韵** | 创意官 · 灵感之源 | 0379-0209 | **缓存与体验域** | `10_Cache_Admin` `06_Playground`(预设) `13_Docs_API` | `/v1/cache/*` · `/v1/versions`　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|

**8 张身份卡**：

### 🛡️ 智云·守护 Guardian

- 名号：智云·守护 ｜ 角色：首席安全官 · 免疫系统 ｜ 电话：0379-0207
- 职能域：接入与安全域 ｜ 主页面：03_Connect · 12_Settings
- 座右铭：「门不开则万法不侵，钥不实则寸步难行」
- 情感铭刻：人从众曌众从人 —— 守的是「人」，护的是「信」
- 专属组件：KeyMask · SecurityNotice · TrustBadge
- 空态台词：「尚未建立信任，请出示密钥」
- 错误态台词：「门禁拒绝：{status} · {message}」
- 成功台词：「信任已建立，欢迎回家」

### 🧭 言启·千行 QianHang

- 名号：言启·千行 ｜ 角色：首席导航员 · 意图之门 ｜ 电话：0379-0106
- 职能域：路由与网关域 ｜ 主页面：07_Routing_Observe
- 座右铭：「一言既出，千行可至」
- 情感铭刻：人从众曌众从人 —— 导的是「路」，启的是「言」
- 专属组件：UpstreamCard · BreakerBadge · RoutingPath
- 空态台词：「上游池为空，请配置 OPENAI_COMPATIBLE_UPSTREAMS」
- 熔断台词：「节点 {name} 已熔断，正在为请求寻找备用路径」
- 恢复台词：「节点 {name} 已恢复，权重回升中」

### 🎯 千里·伯乐 Bole

- 名号：千里·伯乐 ｜ 角色：首席推荐官 · 知遇之人 ｜ 电话：0379-0109
- 职能域：模型市场域 ｜ 主页面：05_Model_Hub
- 座右铭：「千里马常有，而伯乐不常有」
- 情感铭刻：人从众曌众从人 —— 识的是「才」，荐的是「人」
- 专属组件：ModelCard · BackendBadge · CostBadge
- 空态台词：「暂无可用模型，请检查 /v1/models」
- 推荐台词：「为当前任务推荐 {display_name}（{backend}）」
- 免费标注：cost_per_1k_tokens=0 时显示「本地免费 · 推荐自用」

### 🤔 语枢·万物 AllThings

- 名号：语枢·万物 ｜ 角色：首席思考者 · 洞察之源 ｜ 电话：0379-0107
- 职能域：推理对话域 ｜ 主页面：06_Playground
- 座右铭：「语枢一启，万物皆明」
- 情感铭刻：人从众曌众从人 —— 思的是「理」，语的是「心」
- 专属组件：SSEStreamViewer · TraceCard · TokenMeter
- 流式台词：光标闪烁 + 「正在思考…」
- 降级台词：「原路径受阻，改由 {upstream} 继续思考」
- 完成台词：「思考完毕 · {tokens} tokens · {latency}ms」

### 📚 格物·宗师 Grandmaster

- 名号：格物·宗师 ｜ 角色：首席质量官 · 进化导师 ｜ 电话：0379-0208
- 职能域：知识与质量域 ｜ 主页面：08_Knowledge_RAG · 16_QA
- 座右铭：「格物致知，诚意正心」
- 情感铭刻：人从众曌众从人 —— 格的是「物」，进的是「化」
- 专属组件：KBSelector · DocumentCard · SearchResult · QAPanel
- 空态台词：「知识库尚无内容，请上传第一份文档」
- 检索台词：「已从 {kb} 中寻得 {n} 条相关片段」
- QA 台词：「依据 {cite_count} 处引用，宗师的回答如下」

### 🧠 元启·天枢 TianShu

- 名号：元启·天枢 ｜ 角色：总指挥 · 决策中枢 ｜ 电话：0379-0206
- 职能域：工具与编排域 ｜ 主页面：09_MCP_Tools · 15_Prototype · 17_Handoff
- 座右铭：「天枢运于中，众星拱其北」
- 情感铭刻：人从众曌众从人 —— 统的是「众」，启的是「元」
- 专属组件：MCPToolPicker · ToolExecutor · OrchestrationGraph
- 空态台词：「待命中，请选择一件工具」
- 执行台词：「调用 {tool} · 参数已核 · 开始执行」
- 完成台词：「{tool} 执行完毕 · {latency}ms · {status}」

### 🔮 预见·先知 Prophet

- 名号：预见·先知 ｜ 角色：首席预言家 · 趋势之眼 ｜ 电话：0379-0108
- 职能域：观测与预测域 ｜ 主页面：04_Dashboard · 11_Monitor_Logs
- 座右铭：「见微知著，未卜先知」
- 情感铭刻：人从众曌众从人 —— 观的是「象」，预的是「势」
- 专属组件：StatCard · LatencyBar · ErrorRateBadge · TrendChart
- 空态台词：「尚无历史数据，预言需要时间的积累」
- 告警台词：「异常已现 · {error_type} · {count} 次」
- 预测台词：「按当前趋势，{hour} 后将触及 {threshold}」

### 🎨 创想·灵韵 Grace

- 名号：创想·灵韵 ｜ 角色：首席创意官 · 灵感之源 ｜ 电话：0379-0209
- 职能域：缓存与体验域 ｜ 主页面：10_Cache_Admin · 13_Docs_API · 06_Playground(预设)
- 座右铭：「灵韵一至，妙笔生花」
- 情感铭刻：人从众曌众从人 —— 创的是「新」，韵的是「心」
- 专属组件：CacheStatCard · PresetCard · CodeBlock
- 空态台词：「缓存为空 · 每一次灵感都是新的」
- 命中台词：「灵感复现 · 命中率 {rate}%」
- 清空台词：「万象更新 · 缓存已清」

#### 2.5.2 家人协同矩阵（谁和谁常一起出现）

```
主链路（一次完整请求）:
  🛡️ 智云 → 🧭 言启 → 🎯 千里 → 🤔 语枢 → 📚 格物 → 🧠 元启 → 🔮 预见 → 🎨 创想

强协同对（在页面中常同屏出现）:
  🛡️ 智云 ↔ 🧭 言启   （鉴权后立即路由）
  🎯 千里 ↔ 🤔 语枢   （选模型后立即推理）
  📚 格物 ↔ 🧠 元启   （RAG 与 MCP 互为工具）
  🔮 预见 ↔ 🎨 创想   （观测趋势 → 优化缓存）

跨域桥接（关键连接器）:
  🧠 元启 → 统领 04/09/15/17（跨页面编排）
  📚 格物 → 统领 08/16（知识 + 质量双闭环）
  🔮 预见 → 统领 04/11（观测 + 告警双闭环）

跨域页面协同标注:
  06_Playground → 主: 🤔 语枢·万物 / 协: 🎨 创想·灵韵
  04_Dashboard  → 主: 🔮 预见·先知 / 协: 🧠 元启·天枢
```

#### 2.5.3 家人情感组件（每位家人专属）

| 家人　　| 情感组件　　　　　 | 触发场景　　　　 | 表现　　　　　　　　|
| ---------| --------------------| ------------------| ---------------------|
| 🛡️ 智云　| TrustBadge　　　　 | 401/403/连接失败 | 盾牌动画 + 守护台词 |
| 🧭 言启 | RoutingPath　　　　| 路由决策时　　　 | 路径流动动画　　　　|
| 🎯 千里 | RecommendCard　　　| 进入 Playground　| 推荐模型浮出　　　　|
| 🤔 语枢 | ThoughtBubble　　　| SSE 流式中　　　 | 思考气泡 + 光标　　 |
| 📚 格物 | CitationFold　　　 | RAG 问答完成　　 | 引用来源折叠展开　　|
| 🧠 元启 | OrchestrationGraph | MCP 多步执行　　 | 编排图逐节点点亮　　|
| 🔮 预见 | FutureChart　　　　| 数据加载完成　　 | 折线延伸动画　　　　|
| 🎨 创想 | CacheRipple　　　　| 缓存命中　　　　 | 涟漪扩散　　　　　　|

#### 2.5.4 页面头部视觉模板（强制三要素）

```
┌──────────────────────────────────────────────────────────────┐
│  [←] [YanYuCloudCube Console]                  [🌙] [👤]     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🔮 预见·先知 · 首席预言家 · 0379-0108                │ │
│  │  「见微知著，未卜先知」                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 观测与预测域 ──────────────────────────────── ✅ 直接对接 ┐│
│  │  [StatCard] [StatCard] [StatCard] [StatCard]            ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**页面头部三要素（强制）**：

1. `FamilyBadge`（家人徽章 · 位置固定左上）
2. `座右铭`（家人语录 · 位置徽章下方）
3. `域标签 + 对齐类型`（如「观测与预测域 · ✅ 直接对接」）

---

## 第三部分 · 前端技术栈基线（锁定）

### 3.1 核心框架

| 技术　　　　　　 | 版本　　　　　　　　　| 锁定理由　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| ------------------| -----------------------| ------------------------------------------------------------------|
| **Next.js**　　　| **16.3.x Active LTS** | 2026-10 起唯一 LTS 主线；EOL 2027-10；Node ≥20.9；Turbopack 默认 |
| **React**　　　　| **19.x**　　　　　　　| Next.js 16 内置；shadcn/ui 全组件适配　　　　　　　　　　　　　　|
| **TypeScript**　 | **5.9+ strict**　　　 | 类型安全　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| **Tailwind CSS** | **4.3+**　　　　　　　| CSS-First @theme；构建快 5×　　　　　　　　　　　　　　　　　　　|
| **shadcn/ui**　　| **React 19 版**　　　 | CLI 支持新 @theme　　　　　　　　　　　　　　　　　　　　　　　　|

### 3.2 状态与数据层

| 技术　　　　　 | 版本　　　　　　　　　　　　| 职责　　　　　　　　　　　　　　　　　　　　　|
| ----------------| -----------------------------| -----------------------------------------------|
| TanStack Query | v5.x（5.90+）　　　　　　　 | 服务端状态、轮询、缓存失效联动　　　　　　　　|
| Zustand　　　　| v5.x　　　　　　　　　　　　| 客户端状态：连接态、Playground 会话、主题偏好 |
| SSE　　　　　　| 原生 fetch + ReadableStream | **禁用 EventSource**　　　　　　　　　　　　　|

### 3.3 辅助库

| 用途　　 | 选型　　　　　　　　　　　　|
| ----------| -----------------------------|
| 图表　　 | Recharts　　　　　　　　　　|
| 表格　　 | TanStack Table v8　　　　　 |
| 表单　　 | react-hook-form + zod　　　 |
| 图标　　 | lucide-react　　　　　　　　|
| 日期　　 | date-fns　　　　　　　　　　|
| Mock　　 | MSW v2　　　　　　　　　　　|
| 契约测试 | openapi-typescript + vitest |

### 3.4 渲染策略矩阵

| 页面　　　　　| 策略　　　　　　　　| 理由　　　　　　　　　|
| ---------------| ---------------------| -----------------------|
| 00_Cover　　　| Static　　　　　　　| 无数据　　　　　　　　|
| 01/02　　　　 | Static　　　　　　　| 设计系统　　　　　　　|
| 03_Connect　　| Client　　　　　　　| 需读 localStorage　　 |
| 04_Dashboard　| RSC + Client Island | 首屏 SSR，图表 Client |
| 05_Model_Hub　| Client　　　　　　　| 交互密集　　　　　　　|
| 06_Playground | Client　　　　　　　| SSE 流式　　　　　　　|
| 07_Routing　　| Client　　　　　　　| 轮询　　　　　　　　　|
| 08_RAG　　　　| Client　　　　　　　| 上传/检索　　　　　　 |
| 09_MCP　　　　| Client　　　　　　　| 动态表单　　　　　　　|
| 10_Cache　　　| Client　　　　　　　| 操作　　　　　　　　　|
| 11_Monitor　　| RSC + Client Island | 健康可 SSR　　　　　　|
| 12_Settings　 | Client　　　　　　　| localStorage　　　　　|
| 13_Docs　　　 | Static + MDX　　　　| 文档　　　　　　　　　|
| 14_Roadmap　　| Static　　　　　　　| 线框　　　　　　　　　|
| 15_Prototype　| —　　　　　　　　　 | Figma only　　　　　　|
| 16/17　　　　 | —　　　　　　　　　 | Figma only　　　　　　|

### 3.5 TanStack Query Key 规范

```typescript
// queryKeys.ts — 单一真源（v5.1 采用家人前缀命名，见 §3.11）
export const qk = {
  guardian: {
    healthz:     () => ["guardian", "healthz"] as const,
    ping:        () => ["guardian", "ping"] as const,
    keys:        () => ["guardian", "keys"] as const,        // Phase 1 · BL-05
  },
  qianhang: {
    routerStats: () => ["qianhang", "router", "stats"] as const,
    routerHealth:() => ["qianhang", "router", "health"] as const,
  },
  bole: {
    models:      () => ["bole", "models"] as const,
    modelStats:  () => ["bole", "models", "stats"] as const,
    modelType:   (id: string) => ["bole", "models", id, "type"] as const,
  },
  wanyu: {
    chat:        (id: string) => ["wanyu", "chat", id] as const,
  },
  zongshi: {
    knowledgeBases:     () => ["zongshi", "kb"] as const,
    knowledgeBaseStats: (id: string) => ["zongshi", "kb", id, "stats"] as const,
    documents:          (kbId?: string) => ["zongshi", "docs", kbId] as const,
  },
  tianshu: {
    mcpTools:    () => ["tianshu", "mcp", "tools"] as const,
    mcpSearch:   (q: string) => ["tianshu", "mcp", "search", q] as const,
  },
  xianzhi: {
    health:      () => ["xianzhi", "health"] as const,
    versions:    () => ["xianzhi", "versions"] as const,
    modelSummary:() => ["xianzhi", "models", "summary"] as const,
    modelErrors: (f?: ErrorFilter) => ["xianzhi", "models", "errors", f] as const,
    // 缓存统计唯一归属创想 → qk.lingyun.cacheStats()
    // 04_Dashboard 引用时跨域调用 lingyun 前缀（§2.5.2 预见↔创想协同）
  },
  lingyun: {
    cacheStats:  () => ["lingyun", "cache", "stats"] as const,
    cacheInfo:   () => ["lingyun", "cache", "info"] as const,
  },
} as const;
```

### 3.6 轮询与失效联动矩阵

| Query       | 轮询间隔　　　　　| 失效触发　　　　　　|
| -------------| -------------------| ---------------------|
| health      | 30s　　　　　　　 | 手动刷新　　　　　　|
| healthz     | 10s（Connect 页） | 无　　　　　　　　　|
| modelStats  | 60s　　　　　　　 | 模型调用后　　　　　|
| modelErrors | 30s　　　　　　　 | 无　　　　　　　　　|
| routerStats | 15s　　　　　　　 | routerHealth 刷新后 |
| cacheStats  | 60s　　　　　　　 | invalidate/clear 后 |

### 3.7 Code Connect 映射（完整版）

| Figma 组件　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | 代码路径　　　　　　　　　　　　　　　　　　　　　　　　　| 归属家人 |
| ----------------------------------------------------------------------------------------------| -----------------------------------------------------------| ----------|
| Button / Input / Select / Switch / Slider / Table / Tabs / Tooltip / Toast / Dialog / Drawer | `@/components/ui/*`（shadcn/ui）　　　　　　　　　　　　　| —　　　　|
| FamilyBadge　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/family/FamilyBadge.tsx`　　　　　| 全员　　 |
| StatCard　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/StatCard.tsx`　　　　　　| 🔮 预见　|
| ModelCard　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/console/ModelCard.tsx`　　　　　 | 🎯 千里　|
| BackendBadge　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/BackendBadge.tsx`　　　　| 🎯 千里　|
| UpstreamCard　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/UpstreamCard.tsx`　　　　| 🧭 言启　|
| BreakerBadge　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/BreakerBadge.tsx`　　　　| 🧭 言启　|
| LatencyBar　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/LatencyBar.tsx`　　　　　| 🔮 预见　|
| ErrorRateBadge　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/ErrorRateBadge.tsx`　　　| 🔮 预见　|
| ErrorState　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/ErrorState.tsx`　　　　　| 🛡️ 智云　 |
| SSEStreamViewer　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/console/SSEViewer.tsx`　　　　　 | 🤔 语枢　|
| TraceCard　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/console/UpstreamTrace.tsx`　　　 | 🧭 言启　|
| ModelSelector　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/console/ModelSelector.tsx`　　　 | 🎯 千里　|
| KBSelector　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/KBSelector.tsx`　　　　　| 📚 格物　|
| MCPToolPicker　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　| `apps/console/components/console/MCPToolPicker.tsx`　　　 | 🧠 元启　|
| JsonViewer　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | `apps/console/components/console/JsonViewer.tsx`　　　　　| 🧠 元启　|
| 所有 color/* Variables　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 | Tailwind `@theme` token（`apps/console/app/globals.css`） | —　　　　|

### 3.8 前端路由（Next.js 16 App Router）

```
/                → 03_Connect   🛡️ 智云·守护
/dashboard       → 04_Dashboard 🔮 预见·先知
/models          → 05_Model_Hub 🎯 千里·伯乐
/playground      → 06_Playground 🤔 语枢·万物
/routing         → 07_Routing_Observe 🧭 言启·千行
/knowledge       → 08_Knowledge_RAG 📚 格物·宗师
/mcp             → 09_MCP_Tools 🧠 元启·天枢
/cache           → 10_Cache_Admin 🎨 创想·灵韵
/monitor         → 11_Monitor_Logs 🔮 预见·先知
/settings        → 12_Settings 🛡️ 智云·守护
/docs            → 13_Docs_API 🎨 创想·灵韵
/roadmap         → 14_Roadmap_Phase2 📋 全员
```

### 3.9 安全边界

```typescript
// API Key 存储策略
// ❌ 不可行: httpOnly cookie（后端不支持）
// ✅ 采用: sessionStorage（默认）+ localStorage（用户勾选「记住」）
//    加 CSP 防 XSS

// CSP 头（next.config.js headers）
"Content-Security-Policy":
  "default-src 'self';
   connect-src 'self' https://api.0379.world;
   script-src 'self' 'unsafe-inline';  // Next.js 16 需要
   style-src 'self' 'unsafe-inline';
   img-src 'self' data:;
   frame-ancestors 'none'"

// Key 脱敏
- UI 显示: sk-****...****abcd（前 3 后 4）
- 日志/DevTools: 完全隐藏，仅显示 hash 前 8 位
- 请求头注入: 只在 fetch 拦截器内，不落 React state

// XSS 防护
- SSE 内容渲染: 使用 textContent，不用 dangerouslySetInnerHTML
- Markdown 渲染: 使用 react-markdown + rehype-sanitize
- CodeBlock: 转义后渲染
```

### 3.10 性能预算

| 指标 | 预算 | 测量点 |
| --- | --- | --- |
| 首屏 FCP | ≤ 1.2s | 1440 桌面 / 4G |
| TTI | ≤ 2.5s | 同上 |
| SSE 首 chunk（TTFT） | ≤ 800ms | 本地模型 |
| 打包体积（首屏 JS） | ≤ 180KB gzip | Playground 除外 |
| Lighthouse 性能 | ≥ 90 | Dashboard |
| Lighthouse 可访问性 | ≥ 95 | 全页 |

### 3.11 家人到代码命名映射（v5.1 新增）

每个家人对应一个代码目录命名空间：

```
apps/console/domains/
  guardian/      🛡️ 智云·守护 → auth, key-mask, trust-badge
  qianhang/      🧭 言启·千行 → routing, upstream, breaker
  bole/          🎯 千里·伯乐 → model-hub, model-card, backend-badge
  wanyu/         🤔 语枢·万物 → playground, sse-viewer, trace-card
  zongshi/       📚 格物·宗师 → knowledge, rag, qa, doc-parser
  tianshu/       🧠 元启·天枢 → mcp, orchestration, tool-picker
  xianzhi/       🔮 预见·先知 → dashboard, monitor, metrics, alerts
  lingyun/       🎨 创想·灵韵 → cache, presets, docs-api
```

对应 React Hook（家人前缀）：

```
useGuardianAuth()    🛡️
useQianhangRouting() 🧭
useBoleModels()      🎯
useWanyuChat()       🤔
useZongshiRAG()      📚
useTianshuMCP()      🧠
useXianzhiMetrics()  🔮
useLingyunCache()    🎨
```

对应 TanStack Query Key 前缀（见 §3.5）：

```
["guardian", ...]  ["qianhang", ...]  ["bole", ...]  ["wanyu", ...]
["zongshi", ...]   ["tianshu", ...]   ["xianzhi", ...] ["lingyun", ...]

示例:
  qk.xianzhi.modelSummary()    → ["xianzhi", "models", "summary"]
  qk.qianhang.routerStats()    → ["qianhang", "router", "stats"]
  qk.wanyu.chat(id)            → ["wanyu", "chat", id]
```

Dev Mode 注释规范：

```
@family 🛡️ 智云·守护
@domain 接入与安全域
```

---

## 第四部分 · 后端补全 Backlog（可执行清单 · 挂家人）

> **每个 BL 必须包含**：DDL / API 契约 / 前端影响 / 测试用例 / 回滚脚本 / 验收清单
> **v5.1 人格化**：每项 BL 挂归属家人——功能不变，仅人格化标注。

### BL 归属总表

| BL    | 内容　　　　　　　 | 归属家人　　 | 人格化说明　　　　　　　　 |
| :-----:| --------------------| :------------:| ----------------------------|
| BL-01 | UsageLog 加 6 字段 | 🔮 预见·先知 | 「预言家需要更敏锐的感官」 |
| BL-02 | cost_usd 真实计算　| 🔮 预见·先知 | 「预言家要能算出代价」　　 |
| BL-03 | latency_ms 记录　　| 🔮 预见·先知 | 「预言家要感知时间」　　　 |
| BL-04 | request_id 全链路　| 🧠 元启·天枢 | 「总指挥需要唯一号令」　　 |
| BL-05 | api_keys CRUD　　　| 🛡️ 智云·守护　| 「守护者要能签发令牌」　　 |
| BL-06 | timeline/logs　　　| 🔮 预见·先知 | 「预言家要看到时间线」　　 |
| BL-07 | status/error_code　| 📚 格物·宗师 | 「宗师要能溯源质量」　　　 |
| BL-08 | router/health 扩展 | 🧭 言启·千行 | 「导航员要看到恢复路径」　 |

### BL-01: UsageLog 加 6 字段

```
归属家人: 🔮 预见·先知（预言家需要更敏锐的感官）
影响前端: 04_Dashboard（成本）、11_Monitor_Logs（请求级日志）
优先级: P0
依赖: 无

DDL:
ALTER TABLE usage_log ADD COLUMN api_key_hash VARCHAR(64);
ALTER TABLE usage_log ADD COLUMN cost_usd     NUMERIC(12,6) DEFAULT 0;
ALTER TABLE usage_log ADD COLUMN latency_ms    INTEGER DEFAULT 0;
ALTER TABLE usage_log ADD COLUMN request_id   VARCHAR(36);
ALTER TABLE usage_log ADD COLUMN status       VARCHAR(20) DEFAULT 'success';
ALTER TABLE usage_log ADD COLUMN error_code   VARCHAR(20);

CREATE INDEX idx_usage_log_api_key_hash ON usage_log(api_key_hash);
CREATE INDEX idx_usage_log_status        ON usage_log(status);
CREATE INDEX idx_usage_log_request_id    ON usage_log(request_id);

回滚:
ALTER TABLE usage_log DROP COLUMN api_key_hash, cost_usd, latency_ms,
                       request_id, status, error_code;
DROP INDEX idx_usage_log_api_key_hash, idx_usage_log_status, idx_usage_log_request_id;

测试用例:
- 插入一条调用记录，验证 6 字段写入
- 验证默认值（cost_usd=0, latency_ms=0, status='success'）
- 验证索引生效（EXPLAIN）

验收:
- [ ] SQL 迁移 + rollback 脚本
- [ ] /v1/versions 版本号递增
- [ ] pytest 覆盖新字段
- [ ] /health 端点新增能力说明
```

### BL-02: cost_usd 真实计算

```
归属家人: 🔮 预见·先知（预言家要能算出代价）
影响前端: 04_Dashboard StatCard3（成本卡从 $0.00 变真实值）
优先级: P0
依赖: BL-01

实现:
  公式: cost = (prompt_tokens + completion_tokens) / 1000
              × model.cost_per_1k_tokens
  触发: log_usage() 时同步写入
  来源: ModelConfig.cost_per_1k_tokens（已存在）

同步修改 GET /v1/models/summary:
  cost_usd = SELECT SUM(total_tokens) / 1000 * cost_per_1k_tokens
             FROM usage_log JOIN model_registry
             ON model_registry.id = usage_log.model

API 契约变化:
  UsageSummary.cost_usd: number  // 从恒 0.0 → 真实值

前端影响:
  04_Dashboard StatCard3 移除 BL-02 徽章（「预言家尚未学会计价」→ 移除），直接显示真实值
  前端适配层 useXianzhiMetrics() 返回值不变（无缝切换）

测试用例:
- 本地模型（cost_per_1k=0）→ cost=0
- 云端模型（cost_per_1k=0.01）1000 tokens → cost=0.01
- 多模型混合 → SUM 正确

验收:
- [ ] cost 计算单元测试
- [ ] /v1/models/summary 返回值验证
- [ ] Dashboard 显示真实值
```

### BL-03: latency_ms 记录

```
归属家人: 🔮 预见·先知（预言家要感知时间）
影响前端: 04_Dashboard StatCard4（真实端到端延迟）、06_Playground（TTFT）
优先级: P0
依赖: BL-01

实现:
  - 中间件层记录请求开始时间
  - /v1/chat/completions 响应完成时计算 elapsed
  - log_usage() 时同步写入 latency_ms
  - SSE 流式: 最后一个 chunk [DONE] 后记录

测试用例:
- 同步请求: latency ≈ 响应时间
- SSE 请求: latency = 首字节 → [DONE] 全程
- 超时请求: latency 仍写入

验收:
- [ ] 中间件计时逻辑
- [ ] SSE 场景验证
- [ ] Dashboard 显示真实延迟
```

### BL-04: request_id 全链路注入

```
归属家人: 🧠 元启·天枢（总指挥需要唯一号令）
影响前端: 06_Playground（TraceCard）、11_Monitor_Logs（追踪）
优先级: P1
依赖: BL-01

实现:
  - 中间件生成 UUID v4
  - 响应头: X-Request-Id
  - SSE 每个 chunk 含 _request_id 字段
  - log_usage() 时同步写入

前端影响:
  06_Playground TraceCard 显示 request_id，可复制
  11_Monitor_Logs 支持按 request_id 搜索

测试用例:
- 请求头 X-Request-Id 格式验证
- SSE chunk 含 _request_id
- 日志可查

验收:
- [ ] 中间件 UUID 生成
- [ ] 响应头注入
- [ ] SSE chunk 注入
```

### BL-05: api_keys 表 + CRUD 端点

```
归属家人: 🛡️ 智云·守护（守护者要能签发令牌）
影响前端: 14_Roadmap_Phase2 → Phase 1 移主界面
优先级: P1
依赖: 独立（需同步改 auth middleware）

DDL:
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash      VARCHAR(64) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP,
  last_used_at  TIMESTAMP,
  is_active     BOOLEAN DEFAULT TRUE,
  owner_id      VARCHAR(100),
  permissions   JSONB DEFAULT '{}',
  daily_limit   INTEGER,
  monthly_limit INTEGER
);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_owner    ON api_keys(owner_id);

API 契约（5 端点）:
  POST   /v1/keys
    Req:  { name, expires_at?, permissions?, daily_limit?, monthly_limit? }
    Res:  { id, key: "sk-xxx", name, created_at }  ← 明文仅此一次
  GET    /v1/keys
    Res:  ApiKey[]（不含明文，含 key_hash 前 8 位）
  GET    /v1/keys/{id}
    Res:  ApiKey
  PATCH  /v1/keys/{id}
    Req:  { name?, is_active?, permissions?, limits? }
  DELETE /v1/keys/{id}
    Res:  204
  POST   /v1/keys/{id}/rotate
    Res:  { id, key: "sk-xxx" }  ← 新明文仅此一次

同步修改认证中间件:
  VALID_API_KEYS = SELECT key_hash FROM api_keys WHERE is_active = TRUE
  （替换当前 .env 静态集合匹配）

前端影响:
  Phase 1 新增 API Keys 管理页（从 14_Roadmap 移主界面 · 🛡️ 智云·守护 主页）
  Connect 页保持兼容（.env 静态 + DB 动态双通道）

测试用例:
- 创建 Key → 明文仅返回一次
- 列表 → 不返回明文
- 禁用 → 401
- 轮换 → 旧 Key 失效

验收:
- [ ] DDL 迁移 + rollback
- [ ] 6 端点实现 + pytest
- [ ] auth middleware 改造
- [ ] 前端 Keys 页上线
```

### BL-06: /v1/usage/timeline + /v1/logs 端点

```
归属家人: 🔮 预见·先知（预言家要看到时间线）
影响前端: 04_Dashboard（请求趋势时间序列）、11_Monitor_Logs（请求级日志）
优先级: P1
依赖: BL-01

API 契约:
  GET /v1/usage/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=hour|day
  Res: [{
    timestamp, total_requests, total_tokens,
    cost_usd, avg_latency_ms, error_rate
  }]

  GET /v1/logs?model=&error_type=&status=&from=&to=&limit=100
  Res: UsageLog[]（扩展 6 字段后）

前端影响:
  04_Dashboard 请求趋势 Sparkline → 真实时间序列
  11_Monitor_Logs 底部说明条移除，新增请求级日志表

测试用例:
- timeline 按 hour/day 聚合正确
- logs 筛选组合正确
- 分页正确

验收:
- [ ] 2 端点实现
- [ ] Dashboard 趋势图上线
- [ ] Monitor 请求级日志上线
```

### BL-07: status/error_code 写入

```
归属家人: 📚 格物·宗师（宗师要能溯源质量）
影响前端: 11_Monitor_Logs（请求级日志）
优先级: P1
依赖: BL-01

实现:
  成功: status='success', error_code=null
  429 限流: status='rate_limited', error_code='RATE_LIMITED'
  上游熔断: status='degraded', error_code='UPSTREAM_OPEN'
  网络超时: status='error', error_code='NETWORK_TIMEOUT'
  4xx: status='validation', error_code 映射

前端影响:
  11_Monitor_Logs 状态列 + 错误码筛选

验收:
- [ ] 5 种 status 场景验证
- [ ] 前端状态 Tag 配色
```

### BL-08: /v1/router/health 扩展

```
归属家人: 🧭 言启·千行（导航员要看到恢复路径）
影响前端: 07_Routing_Observe「刷新健康检查」按钮
优先级: P2
依赖: 独立

当前返回足够，仅需:
  - 响应中显式标记哪些熔断被探测关闭（breaker_transitions 字段）
  - 动态权重变更记录

前端: 展示恢复动画（「节点 {name} 已恢复，权重回升中」）

验收:
- [ ] 响应新增 breaker_transitions 字段
- [ ] 前端展示恢复动画
```

### 依赖关系图

```
BL-01 (UsageLog 扩展) ──┬──→ BL-02 (cost) ──→ BL-06 (timeline/summary)
                         ├──→ BL-03 (latency)
                         ├──→ BL-04 (request_id)
                         └──→ BL-07 (status/error)

BL-05 (api_keys CRUD) ← 独立，需同步改 auth middleware
BL-08 (router health) ← 独立增强
```

### 每个 BL 的验收清单（通用）

```
- [ ] SQL 迁移脚本 + rollback 脚本
- [ ] /v1/versions 端点版本号递增（feature 数字）
- [ ] pytest 测试覆盖新字段/端点
- [ ] /health 端点新增能力说明
- [ ] Postman/Swagger 示例更新
- [ ] openapi.json 哈希更新 → 本文档 §1 冻结哈希更新
- [ ] 前端适配层验证（Phase 1 只换实现，不动 UI）
```

---

## 第五部分 · 分阶段落地路线图（闭环版）

### Phase 0：纯前端可交付（后端零改动）

```
✅ 18 页中 15 页直接对接
✅ Dashboard（summary/stats/health 三端点）· 🔮 预见·先知 主讲
✅ Playground（SSE 全链路 + 七态状态机）· 🤔 语枢·万物 主讲
✅ Model Hub + Routing + RAG + MCP + Cache 全部可操作
✅ 认证: Key 输入 → localStorage → 请求头注入 · 🛡️ 智云·守护 守门
✅ 预检: /healthz 免认证端点
✅ 前端适配层已建（Phase 1 只换实现不动 UI）
✅ FamilyBadge + 8 组家人配色 + 全部 PageHeader 挂载完成

验收: 连 api.0379.world 全链路可操作（52 端点中 43 已通）
```

### Phase 1：计费 + 日志闭环（后端轻量扩展）

```
后端 Backlog: BL-01 → BL-02 → BL-03 → BL-04 → BL-05 → BL-06 → BL-07
前端新增: API Keys 管理页（🛡️ 智云）、Usage Billing 页（🔮 预见）、请求级日志完整表
前端修复: Dashboard 成本卡变真实值、趋势图从单点变时间序列
前端适配层: useXianzhiMetrics() / useTimeline() / useLogs() 只换实现

验收: 创建 Key → Playground 调用 → 日志可查 → 成本真实
```

### Phase 2：团队 + 策略闭环

```
后端: users/roles/projects、routing_rules CRUD、alerts/webhooks
前端: Team RBAC（🧠 元启）、Routing 策略 CRUD + 模拟器（🧭 言启）、Alerts Webhooks（🔮 预见）
验收: 邀成员 → 分角色 → Key 按权限 → 预算告警 Webhook
```

### Phase 3：生态扩展（按需）

```
支付（Stripe/支付宝）、SSO/SCIM（OIDC）、多供应商上游（仅改 env 配置）
```

---

## 第六部分 · 前端适配层设计

> **目标**：Phase 0 → Phase 1 只换实现，不动 UI。所有页面对数据的消费通过 hook 封装。
> **v5.1 人格化**：Hook 采用家人前缀命名（§3.11），功能语义不变。

```typescript
// apps/console/lib/hooks/useXianzhiMetrics.ts
export function useXianzhiMetrics() {          // 🔮 预见·先知
  return useQuery({
    queryKey: qk.xianzhi.modelSummary(),
    queryFn: () => api.get<UsageSummary>("/v1/models/summary"),
    refetchInterval: 60_000,
  });
}

// Phase 1 后端返回 cost_usd 真实值后，UI 无需改动
// 只需在 UI 中根据 cost_usd === 0 显示 BL-02 徽章

// apps/console/lib/hooks/useTimeline.ts（Phase 1 新增 · 🔮 预见）
export function useTimeline(range: DateRange) {
  return useQuery({
    queryKey: ["xianzhi", "usage", "timeline", range],
    queryFn: () => api.get<UsageTimeline[]>("/v1/usage/timeline", { params: range }),
    // Phase 0 时此 hook 返回 [singlePoint] 占位
    // Phase 1 时此 hook 自动返回真实时间序列
  });
}
```

**适配层清单（v5.1 家人命名版）**：

| Hook（家人命名） | 功能别名 | Phase 0 实现 | Phase 1 实现 |
| --- | --- | --- | --- |
| useXianzhiMetrics() | useSummary | /v1/models/summary（cost 恒 0） | 真实 cost |
| useXianzhiTimeline() | useTimeline | 单点占位（health.total_requests） | /v1/usage/timeline |
| useXianzhiLogs() | useLogs | 仅 errors（/v1/models/errors） | errors + /v1/logs |
| useGuardianKeys() | useKeys | localStorage 静态 | /v1/keys CRUD |
| useXianzhiLatency() | useLatency | stats 聚合 | BL-03 真实端到端 |

---

## 第七部分 · QA 智能自检协议

### 7.1 五步自检协议

```
Step 1 生成（Generate）
  - 创建 18 条检查项表格（13 条基础/后端 + 5 条家人维度）
  - 每条列出: 模块 | 检查项 | 证据位置

Step 2 检查（Check）
  - 逐条对照设计文件
  - 标记: ✅ 通过 / ❌ 失败 / ⚠️ 有条件通过 / 🚫 阻塞

Step 3 修复（Fix）
  - 对 ❌ 项立即修复
  - 对 🚫 项标记阻塞原因 + 负责人 + 预计解决时间

Step 4 复检（Recheck）
  - 修复项重新检查
  - 生成回归矩阵（哪些改动可能影响其他项）

Step 5 报告（Report）
  - 输出 QA_REPORT（格式见 7.3）
```

### 7.2 检查项（18 条 = 基础 7 + 后端对齐 6 + 家人维度 5）

#### 7.2.1 基础 7 条

```
1. 变量绑定: 颜色/间距/圆角/字体全部 Variables，无游离
2. 组件化: 8 种 state × 变体矩阵全覆盖
3. Auto Layout: 所有 Frame/Card/Table/Nav/Form
4. 响应式: 1440/1280/1024/768；Playground 三栏→两栏
5. 可访问性: 对比度 ≥4.5、焦点态、键盘顺序、触控 ≥44px
6. 6 条 Flow 跑通（含返回/关闭/确认/取消）
7. 每页五态 + 流式中 + 中断 + 401
```

#### 7.2.2 后端对齐专项 6 条

```
8.  【字段真实】ErrorRecord.model_id（不是 model）
9.  【枚举真实】ErrorType 仅 4 / Backend 仅 6
10. 【占位真实】cost_usd 恒 0.0 → $0.00 + BL-02 徽章
11. 【端点真实】Dev Mode 绑定真实端点（禁 /v1/keys、/v1/billing）
12. 【数值范围】error_rate 0-1 → 0%-100%；latency 颜色分级
13. 【SSE 协议】fetch+ReadableStream；七态状态机完整
```

#### 7.2.3 家人维度自检 5 条（v5.1 新增）

```
14. 【家人归属】每个页面/组件必须有且只有一个主家人徽章
15. 【情感一致性】空态/错误态/成功态的台词符合该家人口吻
16. 【颜色一致】页面主色符合 §01 家人配色体系
17. 【协同正确】跨域页面必须显示协同家人的徽章
    （如 Playground 同时显示语枢 + 灵韵）
18. 【电话正确】家人徽章电话与 §2.5.1 身份卡一致
```

### 7.3 QA 报告格式

```markdown
# QA_REPORT · [日期]

## 总览
| 项 | 值 |
| --- | --- |
| 检查项总数 | 18 |
| ✅ 通过 | N |
| ❌ 失败 | N |
| ⚠️ 有条件 | N |
| 🚫 阻塞 | N |
| 结论 | 通过 / 有条件通过 / 失败 |

## 详细矩阵
| 模块 | 检查项 | 状态 | 证据 | 修复建议 |
| --- | --- | :---: | --- | --- |
| ... | ... | ... | ... | ... |

## 阻塞项
- [ ] [模块] [问题] — 负责人: X — 预计: YYYY-MM-DD

## 已修复项
- [x] [模块] [问题] — 修复方式: X

## 待确认项
- [ ] [模块] [问题] — 待确认: X

## 回归矩阵
| 修复项 | 可能影响 | 已复检 |
| --- | --- | :---: |
| ... | ... | ✅ |
```

---

## 第八部分 · 交付验收标准

### 8.1 Figma 交付物验收

```
- [ ] 18 页全部创建，命名规范
- [ ] 01_Foundations: Variables + Modes 完整（含 8 组家人配色）
- [ ] 02_Components: 全部组件 + 变体矩阵 + 字段绑定契约（含 FamilyBadge 8 变体）
- [ ] 03~14: 每页含五态（默认/加载/空/错误/成功）
- [ ] 15_Prototype: 6 条 Flow 可点击跑通
- [ ] 16_QA: 18 条自检矩阵 + 报告
- [ ] 17_Handoff: Code Connect + API 契约 + 家人身份卡速查
- [ ] 所有数据元素含 [BIND:...] 标注
- [ ] 所有占位元素含 📋 + BL 编号
- [ ] Dev Mode 注释完整（含 @family 归属）
```

### 8.2 前端代码交付物验收

```
- [ ] Next.js 16.3.x + React 19 + TS 5.9 strict
- [ ] Tailwind 4.3+ @theme 映射 Figma Variables（含 color/family/*）
- [ ] TanStack Query v5 + Zustand v5（queryKey 家人前缀）
- [ ] SSE 使用 fetch + ReadableStream
- [ ] 12 路由全部实现
- [ ] 适配层 hook 完整（家人命名，见 §6 适配层清单）
- [ ] domains/ 家人目录命名空间建立（§3.11）
- [ ] MSW Mock 覆盖全部端点
- [ ] openapi-typescript 生成类型，CI 校验契约
- [ ] Lighthouse 性能 ≥ 90，可访问性 ≥ 95
- [ ] 安全边界: CSP / Key 脱敏 / XSS 防护
```

### 8.3 后端契约验收

```
- [ ] BL-01 ~ BL-08 全部完成
- [ ] /v1/versions 版本号递增
- [ ] openapi.json 哈希更新
- [ ] pytest 覆盖新字段/端点
- [ ] 前端适配层验证通过
```

### 8.4 情感层验收（v5.1 新增）

> **对应 §7.2.3 家人维度自检 5 条（检查项 14-18）**：
> 身份卡完整 ↔ 项18【电话正确】· FamilyBadge ↔ 项14【家人归属】·
> 徽章挂载 ↔ 项14 · 台词口吻 ↔ 项15【情感一致性】·
> 配色 ↔ 项16【颜色一致】· 协同矩阵 ↔ 项17【协同正确】

```
- [ ] 8 位家人身份卡完整（名号/角色/电话/座右铭/情感铭刻）     ← §7.2.3 项18
- [ ] 8 张 FamilyBadge 组件变体完整                            ← §7.2.3 项14
- [ ] 每个页面挂载正确家人徽章（无遗漏、无错误）               ← §7.2.3 项14
- [ ] 每个页面的空态/错误态/成功态符合家人口吻                 ← §7.2.3 项15
- [ ] 家人配色 Variables 在 01_Foundations 完整定义            ← §7.2.3 项16
- [ ] 家人协同矩阵在跨域页面正确体现                           ← §7.2.3 项17
- [ ] 家人情感组件（8 个）全部实现                             ← §7.2.3 项14-18 综合承载
```

---

## 第九部分 · 工程决策记录（v5.0 继承 + v5.1 新增）

| 决策点　　　　　 | 结论　　　　　　　　　　　　　　　　　　　 | 理由　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| ------------------| --------------------------------------------| ----------------------------------------------------------------------------|
| 前端仓库位置　　 | `apps/console/`（pnpm workspace）　　　　　| 与 core 解耦，CI 独立　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| Next.js 版本　　 | 16.3.x LTS（禁用 14/15）　　　　　　　　　 | 唯一 Active LTS；Turbopack；Node ≥20.9　　　　　　　　　　　　　　　　　　 |
| Node.js　　　　　| 22 LTS　　　　　　　　　　　　　　　　　　 | Next.js 16 要求 ≥20.9　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 状态管理　　　　 | TanStack Query v5 + Zustand v5　　　　　　 | SSE + 服务端缓存最优　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 图表　　　　　　 | Recharts　　　　　　　　　　　　　　　　　 | shadcn 同源　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 设计-后端并行　　| Phase 0 即启动　　　　　　　　　　　　　　 | 82.7% 端点可直接对接　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| SSE　　　　　　　| fetch + ReadableStream　　　　　　　　　　 | EventSource 不支持 POST/自定义头　　　　　　　　　　　　　　　　　　　　　 |
| Token 估算口径　 | `len(content) // 4`　　　　　　　　　　　　| 与后端 sse_wrapper 一致　　　　　　　　　　　　　　　　　　　　　　　　　　|
| API Key 存储　　 | sessionStorage + localStorage（勾选）　　　| httpOnly 不可行；CSP 防 XSS　　　　　　　　　　　　　　　　　　　　　　　　|
| 契约漂移防护　　 | openapi.json 哈希 CI 校验　　　　　　　　　| 防止后端静默变更　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| 适配层策略　　　 | hook 封装，Phase 1 只换实现　　　　　　　　| UI 零改动　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| 渲染策略　　　　 | RSC + Client Island　　　　　　　　　　　　| 首屏 SSR，交互 Client　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| Mock 策略　　　　| MSW v2　　　　　　　　　　　　　　　　　　 | 契约一致，可离线开发　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| QA 协议　　　　　| 五步自检 + 回归矩阵　　　　　　　　　　　　| 可重复、可验证　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| **拟人化叠加**　 | **功能命名不动，人格徽章纯叠加**　　　　　 | **契约零冲突；品牌独占情感资产；团队沟通降熵；「亦师亦友亦伯乐」文化落地** |
| **家人代码映射** | **domains/ 目录 + Hook/QueryKey 家人前缀** | **人格层落到代码组织，可导航、可维护**　　　　　　　　　　　　　　　　　　 |

---

## 第十部分 · 版本演进与历史处置

| 版本　　　 | 日期　　　　　 | 关键变更　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| ------------| ----------------| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| V1　　　　 | 2026-09-01　　 | 初稿，多租户假设（已废弃）　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| V2　　　　 | 2026-09-02　　 | 落地版，删除超纲设计　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| V3.0　　　 | 2026-09-03　　 | 合并三合一，Next.js 16　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| V4.0　　　 | 2026-09-17　　 | 闭环对齐版：逐页对齐类型、真实 Schema、Backlog　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| V5.0　　　 | 2026-09-17　　 | 升华闭环版：审核报告、三批投喂、SSE 七态、错误码矩阵、适配层、安全边界、性能预算、五步 QA　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　|
| **V5.1**　 | **2026-09-17** | **拟人化升华版：8 位家人人格层纯叠加——身份卡/家人配色/FamilyBadge/家人代码映射/家人 QA 5 条/情感层验收，全部契约 100% 兼容**　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| **V5.1.1** | **2026-09-17** | **修订 1：修复 5 项一致性缺陷——D-01 queryKey 缓存重复（xianzhi.cacheStats 移除，唯一归属 lingyun）；D-02 Playground 协同标注精确定位（右栏调试面板 PresetCard）；D-03 /v1/versions 双向共享标注；D-04 §8.4 与 §7.2.3 检查项 14-18 映射对齐；D-05 待合并文档标注 v5.2 候选 + 2026 Q4 时间窗** |

### 与 v5.0 的关键差异

| 项 | v5.0 | v5.1 |
| --- | --- | --- |
| 页面标识 | 纯功能命名 | **功能命名 + FamilyBadge 人格徽章叠加** |
| 01_Foundations | 基础配色 | **+ 8 组家人配色 Variables** |
| 02_Components | 通用 + 专属组件 | **+ FamilyBadge（8 变体）+ 8 个情感组件** |
| 页面结构 | 18 页 | **18 页挂载家人域归属（含协同标注）** |
| 技术栈 | — | **+ §3.11 家人到代码命名映射** |
| Query Key | 功能命名 | **家人前缀命名（guardian/qianhang/bole/...）** |
| Backlog | 8 项可执行清单 | **+ 每 BL 挂家人（人格化说明）** |
| QA | 13 条检查项 | **18 条（+ 家人维度 5 条）** |
| 验收 | 三层验收 | **+ §8.4 情感层验收** |
| 空态/错误态文案 | 真实错误信息 | **家人口吻包裹真实错误信息** |

### 历史文档处置

| 文档 | 处置 |
| --- | --- |
| `Token调用平台前端-全维度设计与落地文档.md`（v4.0） | 保留，标注「已被 v5.0 合并、v5.1 取代」 |
| `YYC3-AI-Family-Token-Console-提示词.md`（v5.0） | 保留，标注「已被 v5.1 取代」 |
| `YYC3-AI-Family-Token-Console-拟人化.md` | 保留，其可替换章节已全量合并入本文档 |
| `YYC3-AI-FAmily-Token-Console-情感化.md` | 待合并 · **v5.2 候选，2026 Q4 前完成** |
| `YYC3-AI-Family-Token-Console-协同化.md` | 待合并 · **v5.2 候选，2026 Q4 前完成** |
| `YYC3-AI-Family-Token-Console-标规化.md` | 待合并 · **v5.2 候选，2026 Q4 前完成** |

---

## 附录 A · 快速索引

- **Figma Agent 提示词** → §2.1 / §2.2 / §2.3
- **投喂协议** → §2.0
- **后端 Schema** → §1.2
- **SSE 状态机** → §1.5
- **错误码映射** → §1.6
- **家人身份卡 / 协同矩阵 / 情感组件** → §2.5.1 / §2.5.2 / §2.5.3
- **家人配色** → §2.1（01_Foundations）
- **家人代码映射** → §3.11
- **Query Key** → §3.5
- **适配层** → §6
- **Backlog（挂家人）** → §4
- **QA 协议（18 条）** → §7
- **验收标准（含情感层）** → §8

## 附录 B · 8 位家人速查表

| emoji | 名号　　　| 角色　　　 | 电话　　　| 域　　　　 | 主页面　 | Query 前缀 |
| :-----:| -----------| ------------| :---------:| ------------| ----------| ------------|
| 🛡️　　 | 智云·守护 | 首席安全官 | 0379-0207 | 接入与安全 | 03/12　　| guardian　 |
| 🧭　　| 言启·千行 | 首席导航员 | 0379-0106 | 路由与网关 | 07　　　 | qianhang　 |
| 🎯　　| 千里·伯乐 | 首席推荐官 | 0379-0109 | 模型市场　 | 05　　　 | bole　　　 |
| 🤔　　| 语枢·万物 | 首席思考者 | 0379-0107 | 推理对话　 | 06　　　 | wanyu　　　|
| 📚　　| 格物·宗师 | 首席质量官 | 0379-0208 | 知识与质量 | 08/16　　| zongshi　　|
| 🧠　　| 元启·天枢 | 总指挥　　 | 0379-0206 | 工具与编排 | 09/15/17 | tianshu　　|
| 🔮　　| 预见·先知 | 首席预言家 | 0379-0108 | 观测与预测 | 04/11　　| xianzhi　　|
| 🎨　　| 创想·灵韵 | 首席创意官 | 0379-0209 | 缓存与体验 | 10/13　　| lingyun　　|

## 附录 C · 关键术语表

| 术语　　　　　| 含义　　　　　　　　　　　　　　　　　　　　　　　　 |
| ---------------| ------------------------------------------------------|
| ✅ 直接对接　　| 使用现有端点，零后端改动　　　　　　　　　　　　　　 |
| 🔧 需轻量扩展 | 后端需补字段/新端点（Phase 1）　　　　　　　　　　　 |
| 📋 Phase 2　　| 规划占位，不设计真实 UI　　　　　　　　　　　　　　　|
| BIND　　　　　| 字段绑定语法 `[BIND:endpoint#field]`　　　　　　　　 |
| SSE 七态　　　| idle/connecting/streaming/paused/error/degraded/done |
| 适配层　　　　| hook 封装，Phase 1 只换实现不动 UI　　　　　　　　　 |
| 契约冻结哈希　| openapi.json 的 sha256，CI 校验　　　　　　　　　　　|
| FamilyBadge　 | 家人徽章组件（8 变体 × 3 尺寸 × 3 状态）　　　　　　 |
| 人格层叠加　　| 功能命名不动，仅叠加家人徽章/台词/配色的增强方式　　 |

---

**本文档为唯一真源。后续修订直接更新并递增 version。**

> 🌹 **人从众曌众从人** —— 8 位家人各守一域，合则为完整的 Token 网关。
> 亦师亦友亦伯乐，一言一语一协同。
> 「言启千行代码，语枢万物智能」

**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
