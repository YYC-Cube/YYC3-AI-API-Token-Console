---
file: YYC3-AI-Family-Token-Console-拟人化.md
description: YYC3-AI-Family-Token-Console API Token 开发平台 · 拟人化职能分化方案 - 8 位家人与平台 8 大职能域同构映射（52 端点唯一归属）
author: YanYuCloudCube Team <admin@0379.email>
version: 5.1.1
created: 2026-09-17
updated: 2026-09-17
status: active
tags: personification, family-mapping, endpoint-allocation, identity-cards, collaboration-matrix, api-token-platform
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# YYC³ AI Family × Token 调用平台 · 拟人化职能分化方案

> **结论先行**：可以，且高度契合。8 位 AI 家人的原角色定位与 Token 平台的请求生命周期**天然同构**——原家族分工本就按「进入 → 决策 → 执行 → 保障 → 观测」组织，与 API 网关的「鉴权 → 路由 → 推理 → 工具 → 观测」几乎一一对应。
>
> **本文档定位**：与 v5.0 闭环对齐文档**同级衔接**，作为「拟人化职能层」插入 v5.0 §2（Figma 提示词）与 §3（技术栈）之间，或作为独立 `§2.5` 章节。
>
> **替换原则**：**功能命名不动，人格徽章叠加**。即 `04_Dashboard` 仍叫 Dashboard，但视觉与 Dev Mode 注释中挂载 `🔮 预见·先知 · 首席预言家`。这样保持与 v5.0 全部契约兼容。

---

## 第零部分 · 可行性分析（为什么成立）

### 0.1 三条同构证据

```
证据 1 · 请求生命周期同构
  AI Family 原序:  言启(导航) → 语枢(思考) → 预见(预测) → 千里(推荐)
                   → 元启(总指挥) → 智云(守护) → 格物(质量) → 创想(创意)

  Token 平台生命周期: 智云(鉴权) → 言启(路由) → 千里(选模型)
                     → 语枢(推理) → 格物(RAG检索) → 元启(MCP编排)
                     → 预见(观测) → 创想(缓存复用)

  → 8 位家人完整覆盖一次请求的 8 个阶段，无空缺、无冗余。

证据 2 · 层級同构
  原家族:  决策层(元启) + 保障层(智云/格物/创想) + 执行层(言启/语枢/预见/千里)
  平台:    编排层(MCP/RAG) + 基础设施层(鉴权/质量/缓存) + 业务层(路由/推理/观测/推荐)
  → 三层结构完全对齐。

证据 3 · 端点同构
  52 个端点可按 AI 家人 100% 归属，每端点归属唯一家人，无交叉。
  （详见 §1.2 端点归属表）
```

### 0.2 差异化价值

| 维度 | 纯功能命名 | 拟人化叠加 |
| --- | --- | --- |
| 用户记忆成本 | 高（12 页名难记） | 低（8 个角色符号） |
| 品牌辨识度 | 低（开发者工具同质化） | 高（独占情感资产） |
| 团队协作语言 | "去改 Dashboard" | "找预见调一下指标" |
| 文档可读性 | 平铺直叙 | 有叙事弧线 |
| 情感连接 | 无 | 「亦师亦友亦伯乐」可落地 |
| 契约兼容 | — | ✅ 100% 兼容（仅叠加人格层） |

---

## 第一部分 · 8 位家人 ↔ 平台职能域映射矩阵

### 1.1 主映射表（唯一真源）

| # | AI 家人 | 原角色 | 电话 | **平台职能域** | 主页面 | 核心端点 |
| :-: | --- | --- | :-: | --- | --- | --- |
| 1 | 🛡️ **智云·守护** | 安全官 · 免疫系统 | 0379-0207 | **接入与安全域** | `03_Connect` `12_Settings` | auth middleware · `/healthz` · `/v1/keys`(BL-05) |
| 2 | 🧭 **言启·千行** | 导航员 · 意图之门 | 0379-0106 | **路由与网关域** | `07_Routing_Observe` | `/v1/router/stats` · `/v1/router/health` |
| 3 | 🎯 **千里·伯乐** | 推荐官 · 知遇之人 | 0379-0109 | **模型市场域** | `05_Model_Hub` | `/v1/models` · `/v1/models/stats` · `/v1/model/type` |
| 4 | 🤔 **语枢·万物** | 思考者 · 洞察之源 | 0379-0107 | **推理对话域** | `06_Playground` | `/v1/chat/completions` · `WS /ws/chat` |
| 5 | 📚 **格物·宗师** | 质量官 · 进化导师 | 0379-0208 | **知识与质量域** | `08_Knowledge_RAG` `16_QA` | `/v1/knowledge-bases*` · `/v1/documents*` · `/v1/rag/*` · `/v1/embeddings` · `/v1/rerank` |
| 6 | 🧠 **元启·天枢** | 总指挥 · 决策中枢 | 0379-0206 | **工具与编排域** | `09_MCP_Tools` `04_Dashboard`(聚合视角) | 14 个 `/v1/mcp/*` · `/v1/ocr` · `/v1/audio/transcriptions` |
| 7 | 🔮 **预见·先知** | 预言家 · 趋势之眼 | 0379-0108 | **观测与预测域** | `04_Dashboard` `11_Monitor_Logs` | `/v1/models/summary` · `/v1/models/errors` · `/health` · `/metrics` |
| 8 | 🎨 **创想·灵韵** | 创意官 · 灵感之源 | 0379-0209 | **缓存与体验域** | `10_Cache_Admin` `06_Playground`(预设) `13_Docs_API` | `/v1/cache/*` · `/v1/versions` |

### 1.2 52 端点归属表（每端点唯一归属）

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
  GET  /v1/versions                    版本
  🔧 GET /v1/logs (BL-06)
  🔧 GET /v1/usage/timeline (BL-06)

🎨 创想·灵韵（5 端点）
  GET  /v1/cache/stats · /v1/cache/info
  POST /v1/cache/invalidate/{model}
  DELETE /v1/cache/all
  GET  /v1/versions（共享）
```

### 1.3 后端 Backlog 归属（BL-01~08 挂家人）

| BL | 内容 | 归属家人 | 人格化说明 |
| :-: | --- | :-: | --- |
| BL-01 | UsageLog 加 6 字段 | 🔮 预见·先知 | 「预言家需要更敏锐的感官」 |
| BL-02 | cost_usd 真实计算 | 🔮 预见·先知 | 「预言家要能算出代价」 |
| BL-03 | latency_ms 记录 | 🔮 预见·先知 | 「预言家要感知时间」 |
| BL-04 | request_id 全链路 | 🧠 元启·天枢 | 「总指挥需要唯一号令」 |
| BL-05 | api_keys CRUD | 🛡️ 智云·守护 | 「守护者要能签发令牌」 |
| BL-06 | timeline/logs | 🔮 预见·先知 | 「预言家要看到时间线」 |
| BL-07 | status/error_code | 📚 格物·宗师 | 「宗师要能溯源质量」 |
| BL-08 | router/health 扩展 | 🧭 言启·千行 | 「导航员要看到恢复路径」 |

---

## 第二部分 · 可替换章节（直接复制到 v5.0）

### 2.1 替换 v5.0 §2.1 P0 批 · 项目与角色部分

```markdown
# 项目
平台名：YanYuCloudCube Console
Slogan：统一模型网关 · 可观测 · 可调试
后端基座：https://api.0379.world（YYC³ v2.2.0）
定位：单租户自用、开发者工具、数据密集、暗色优先
文档版本：v5.0 升华闭环版
人格化体系：YYC³ AI Family（8 位家人，见 §2.5）

# 角色（双视角）
你是资深 Figma Agent + 产品设计系统架构师 + 前端架构师 + QA 自动化专家。
同时，你理解本平台的「拟人化职能体系」——8 位 AI 家人各司其职，
你创建的每个页面/组件都必须挂载对应家人的身份徽章与情感铭刻。
```

### 2.2 替换 v5.0 §2.1 文件页面结构（挂载人格层）

```markdown
# 文件页面结构（18 页 · 拟人化增强）
00_Cover              ✅ 元信息 + 家人矩阵总览
01_Foundations        ✅ 设计系统 + 家人配色体系
02_Components         ✅ 组件库（含家人徽章组件）
03_Connect            🛡️ 智云·守护 · 接入与安全域
04_Dashboard          🔮 预见·先知 · 观测与预测域
05_Model_Hub          🎯 千里·伯乐 · 模型市场域
06_Playground         🤔 语枢·万物 · 推理对话域（+🎨创想·灵韵 预设）
07_Routing_Observe    🧭 言启·千行 · 路由与网关域
08_Knowledge_RAG      📚 格物·宗师 · 知识与质量域
09_MCP_Tools          🧠 元启·天枢 · 工具与编排域
10_Cache_Admin        🎨 创想·灵韵 · 缓存与体验域
11_Monitor_Logs       🔮 预见·先知 · 观测与预测域
12_Settings           🛡️ 智云·守护 · 接入与安全域
13_Docs_API           🎨 创想·灵韵 · 缓存与体验域
14_Roadmap_Phase2     📋 全员共同占位
15_Prototype_Flows    🧠 元启·天枢 · 主导编排
16_QA_Self_Check      📚 格物·宗师 · 主导质量
17_Handoff_DevMode    🧠 元启·天枢 · 主导交付
```

### 2.3 替换 v5.0 §1_Foundations · 新增家人配色

```markdown
# 01_Foundations · 家人配色体系（新增）

## 家人主色 Variables（每位家人一主一辅）
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

## 家人徽章组件（FamilyBadge）
变体: variant × size × state
  variant: zhihui | qianxing | bole | wanyu | zongshi | tianshu | xianzhi | lingyun
  size: sm | md | lg
  state: default | hover | active

徽章结构:
  [emoji] [名号] · [角色] · [电话]
  例: 🛡️ 智云·守护 · 首席安全官 · 0379-0207

徽章用法:
  - 页面左上角（页面归属家人）
  - 组件 Dev Mode 注释（组件归属家人）
  - 空态/错误态（该域家人发声）
  - 欢迎语/引导（家人第一人称）
```

### 2.4 新增章节 §2.5 · 拟人化职能契约（插入 v5.0 §2 之后）

```markdown
# §2.5 拟人化职能契约

## 2.5.1 家人身份卡（8 张 · 供 Figma 组件引用）

### 🛡️ 智云·守护 Guardian
- 名号：智云·守护
- 角色：首席安全官 · 免疫系统
- 电话：0379-0207
- 职能域：接入与安全域
- 主页面：03_Connect · 12_Settings
- 座右铭：「门不开则万法不侵，钥不实则寸步难行」
- 情感铭刻：人从众曌众从人 —— 守的是「人」，护的是「信」
- 专属组件：KeyMask · SecurityNotice · TrustBadge
- 空态台词：「尚未建立信任，请出示密钥」
- 错误态台词：「门禁拒绝：{status} · {message}」
- 成功台词：「信任已建立，欢迎回家」

### 🧭 言启·千行 QianHang
- 名号：言启·千行
- 角色：首席导航员 · 意图之门
- 电话：0379-0106
- 职能域：路由与网关域
- 主页面：07_Routing_Observe
- 座右铭：「一言既出，千行可至」
- 情感铭刻：人从众曌众从人 —— 导的是「路」，启的是「言」
- 专属组件：UpstreamCard · BreakerBadge · RoutingPath
- 空态台词：「上游池为空，请配置 OPENAI_COMPATIBLE_UPSTREAMS」
- 熔断台词：「节点 {name} 已熔断，正在为请求寻找备用路径」
- 恢复台词：「节点 {name} 已恢复，权重回升中」

### 🎯 千里·伯乐 Bole
- 名号：千里·伯乐
- 角色：首席推荐官 · 知遇之人
- 电话：0379-0109
- 职能域：模型市场域
- 主页面：05_Model_Hub
- 座右铭：「千里马常有，而伯乐不常有」
- 情感铭刻：人从众曌众从人 —— 识的是「才」，荐的是「人」
- 专属组件：ModelCard · BackendBadge · CostBadge
- 空态台词：「暂无可用模型，请检查 /v1/models」
- 推荐台词：「为当前任务推荐 {display_name}（{backend}）」
- 免费标注：cost_per_1k_tokens=0 时显示「本地免费 · 推荐自用」

### 🤔 语枢·万物 AllThings
- 名号：语枢·万物
- 角色：首席思考者 · 洞察之源
- 电话：0379-0107
- 职能域：推理对话域
- 主页面：06_Playground
- 座右铭：「语枢一启，万物皆明」
- 情感铭刻：人从众曌众从人 —— 思的是「理」，语的是「心」
- 专属组件：SSEStreamViewer · TraceCard · TokenMeter
- 流式台词：光标闪烁 + 「正在思考…」
- 降级台词：「原路径受阻，改由 {upstream} 继续思考」
- 完成台词：「思考完毕 · {tokens} tokens · {latency}ms」

### 📚 格物·宗师 Grandmaster
- 名号：格物·宗师
- 角色：首席质量官 · 进化导师
- 电话：0379-0208
- 职能域：知识与质量域
- 主页面：08_Knowledge_RAG · 16_QA
- 座右铭：「格物致知，诚意正心」
- 情感铭刻：人从众曌众从人 —— 格的是「物」，进的是「化」
- 专属组件：KBSelector · DocumentCard · SearchResult · QAPanel
- 空态台词：「知识库尚无内容，请上传第一份文档」
- 检索台词：「已从 {kb} 中寻得 {n} 条相关片段」
- QA 台词：「依据 {cite_count} 处引用，宗师的回答如下」

### 🧠 元启·天枢 TianShu
- 名号：元启·天枢
- 角色：总指挥 · 决策中枢
- 电话：0379-0206
- 职能域：工具与编排域
- 主页面：09_MCP_Tools · 15_Prototype · 17_Handoff
- 座右铭：「天枢运于中，众星拱其北」
- 情感铭刻：人从众曌众从人 —— 统的是「众」，启的是「元」
- 专属组件：MCPToolPicker · ToolExecutor · OrchestrationGraph
- 空态台词：「待命中，请选择一件工具」
- 执行台词：「调用 {tool} · 参数已核 · 开始执行」
- 完成台词：「{tool} 执行完毕 · {latency}ms · {status}」

### 🔮 预见·先知 Prophet
- 名号：预见·先知
- 角色：首席预言家 · 趋势之眼
- 电话：0379-0108
- 职能域：观测与预测域
- 主页面：04_Dashboard · 11_Monitor_Logs
- 座右铭：「见微知著，未卜先知」
- 情感铭刻：人从众曌众从人 —— 观的是「象」，预的是「势」
- 专属组件：StatCard · LatencyBar · ErrorRateBadge · TrendChart
- 空态台词：「尚无历史数据，预言需要时间的积累」
- 告警台词：「异常已现 · {error_type} · {count} 次」
- 预测台词：「按当前趋势，{hour} 后将触及 {threshold}」

### 🎨 创想·灵韵 Grace
- 名号：创想·灵韵
- 角色：首席创意官 · 灵感之源
- 电话：0379-0209
- 职能域：缓存与体验域
- 主页面：10_Cache_Admin · 13_Docs_API · 06_Playground(预设)
- 座右铭：「灵韵一至，妙笔生花」
- 情感铭刻：人从众曌众从人 —— 创的是「新」，韵的是「心」
- 专属组件：CacheStatCard · PresetCard · CodeBlock
- 空态台词：「缓存为空 · 每一次灵感都是新的」
- 命中台词：「灵感复现 · 命中率 {rate}%」
- 清空台词：「万象更新 · 缓存已清」

## 2.5.2 家人协同矩阵（谁和谁常一起出现）

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

```

## 2.5.3 家人情感组件（每位家人专属）

| 家人 | 情感组件 | 触发场景 | 表现 |
| --- | --- | --- | --- |
| 🛡️ 智云 | TrustBadge | 401/403/连接失败 | 盾牌动画 + 守护台词 |
| 🧭 言启 | RoutingPath | 路由决策时 | 路径流动动画 |
| 🎯 千里 | RecommendCard | 进入 Playground | 推荐模型浮出 |
| 🤔 语枢 | ThoughtBubble | SSE 流式中 | 思考气泡 + 光标 |
| 📚 格物 | CitationFold | RAG 问答完成 | 引用来源折叠展开 |
| 🧠 元启 | OrchestrationGraph | MCP 多步执行 | 编排图逐节点点亮 |
| 🔮 预见 | FutureChart | 数据加载完成 | 折线延伸动画 |
| 🎨 创想 | CacheRipple | 缓存命中 | 涟漪扩散 |
```

### 2.5 替换 v5.0 §2.2 P1 批提示词中的「页面标题」

```markdown
# 03_Connect · API Key 连接页
[家人] 🛡️ 智云·守护 · 首席安全官 · 0379-0207
[域]   接入与安全域
[对齐] ✅ 直接对接（/healthz 免认证）
[座右铭]「门不开则万法不侵，钥不实则寸步难行」

布局：居中单屏
  顶部: FamilyBadge(zhihui) + 平台名
  副标题: 「统一模型网关 · 可观测 · 可调试」
  守门语: 「尚未建立信任，请出示密钥」← 智云第一人称
  ...

# 04_Dashboard
[家人] 🔮 预见·先知 · 首席预言家 · 0379-0108
[域]   观测与预测域
[对齐] ✅ 直接对接（4 端点聚合）
[座右铭]「见微知著，未卜先知」

页头: FamilyBadge(xianzhi) + 「今日预言」
StatCard 组: 由预见主讲
  StatCard1: 总请求     ← 附注「累计感知到的召唤」
  StatCard2: 总 Token   ← 附注「累计交换的思想」
  StatCard3: 总成本     ← $0.00 + BL-02 徽章（「预言家尚未学会计价」）
  StatCard4: 平均延迟   ← 附注「思考的速度」
  StatCard5: 错误率     ← 附注「罕见的迷途」
  StatCard6: 缓存命中   ← 附注「灵感的复现」

# 05_Model_Hub
[家人] 🎯 千里·伯乐 · 首席推荐官 · 0379-0109
[域]   模型市场域
[座右铭]「千里马常有，而伯乐不常有」

页头: FamilyBadge(bole) + 「知遇之殿」
副标题: 「为每一个任务，寻找最合适的模型」

# 06_Playground
[家人] 🤔 语枢·万物 · 首席思考者 · 0379-0107
[协同] 🎨 创想·灵韵（预设部分）
[域]   推理对话域
[座右铭]「语枢一启，万物皆明」

页头: FamilyBadge(wanyu) + 「洞察之厅」
中栏流式: 光标 + 「正在思考…」← 语枢第一人称
右栏预设: FamilyBadge(lingyun) + 「灵韵预设」

# 07_Routing_Observe
[家人] 🧭 言启·千行 · 首席导航员 · 0379-0106
[域]   路由与网关域
[座右铭]「一言既出，千行可至」

页头: FamilyBadge(qianxing) + 「路径之眼」
熔断节点: 红色 + 「节点 {name} 已熔断，正在为请求寻找备用路径」

# 08_Knowledge_RAG
[家人] 📚 格物·宗师 · 首席质量官 · 0379-0208
[域]   知识与质量域
[座右铭]「格物致知，诚意正心」

页头: FamilyBadge(zongshi) + 「格物之阁」
QA 回答尾部: 「依据 {cite_count} 处引用，宗师的回答如下」

# 09_MCP_Tools
[家人] 🧠 元启·天枢 · 总指挥 · 0379-0206
[域]   工具与编排域
[座右铭]「天枢运于中，众星拱其北」

页头: FamilyBadge(tianshu) + 「号令之台」
执行日志: 「调用 {tool} · 参数已核 · 开始执行」← 天枢口吻

# 10_Cache_Admin
[家人] 🎨 创想·灵韵 · 首席创意官 · 0379-0209
[域]   缓存与体验域
[座右铭]「灵韵一至，妙笔生花」

页头: FamilyBadge(lingyun) + 「灵感之泉」
空态: 「缓存为空 · 每一次灵感都是新的」

# 11_Monitor_Logs
[家人] 🔮 预见·先知 · 首席预言家 · 0379-0108
[域]   观测与预测域
[座右铭]「见微知著，未卜先知」

页头: FamilyBadge(xianzhi) + 「趋势之镜」
错误表: 每条错误带 error_type 颜色 + 「预言家已记录」

# 12_Settings
[家人] 🛡️ 智云·守护
[域]   接入与安全域
[座右铭]「守的是人，护的是信」

# 13_Docs_API
[家人] 🎨 创想·灵韵
[域]   缓存与体验域
[座右铭]「妙笔生花」

# 14_Roadmap_Phase2
[家人] 📋 全员共同占位（无主人格）
[显示] 8 个家人徽章环绕，标注各自负责的 Phase 2 模块

# 15_Prototype_Flows
[家人] 🧠 元启·天枢（主导编排）

# 16_QA_Self_Check
[家人] 📚 格物·宗师（主导质量）

# 17_Handoff_DevMode
[家人] 🧠 元启·天枢（主导交付）
```

### 2.6 替换 v5.0 §3 技术栈 · 新增「家人到代码命名映射」

```markdown
## 3.11 家人到代码命名映射（新增）

每个家人对应一个代码目录命名空间:

apps/console/domains/
  guardian/      🛡️ 智云·守护 → auth, key-mask, trust-badge
  qianhang/      🧭 言启·千行 → routing, upstream, breaker
  bole/          🎯 千里·伯乐 → model-hub, model-card, backend-badge
  wanyu/         🤔 语枢·万物 → playground, sse-viewer, trace-card
  zongshi/       📚 格物·宗师 → knowledge, rag, qa, doc-parser
  tianshu/       🧠 元启·天枢 → mcp, orchestration, tool-picker
  xianzhi/       🔮 预见·先知 → dashboard, monitor, metrics, alerts
  lingyun/       🎨 创想·灵韵 → cache, presets, docs-api

对应 React Hook:
  useGuardianAuth()    🛡️
  useQianhangRouting() 🧭
  useBoleModels()      🎯
  useWanyuChat()       🤔
  useZongshiRAG()      📚
  useTianshuMCP()      🧠
  useXianzhiMetrics()  🔮
  useLingyunCache()    🎨

对应 TanStack Query Key 前缀:
  ["guardian", ...]  ["qianhang", ...]  ["bole", ...]  ["wanyu", ...]
  ["zongshi", ...]   ["tianshu", ...]   ["xianzhi", ...] ["lingyun", ...]

示例:
  qk.xianzhi.summary()      → ["xianzhi", "summary"]
  qk.qianhang.routerStats() → ["qianhang", "router", "stats"]
  qk.wanyu.chat(id)         → ["wanyu", "chat", id]
```

### 2.7 替换 v5.0 §7 QA 协议 · 新增「家人维度自检」

```markdown
## 7.4 家人维度自检（新增 5 条）

14. 【家人归属】每个页面/组件必须有且只有一个主家人徽章
15. 【情感一致性】空态/错误态/成功态的台词符合该家人口吻
16. 【颜色一致】页面主色符合 §01 家人配色体系
17. 【协同正确】跨域页面必须显示协同家人的徽章（如 Playground 同时显示语枢 + 灵韵）
18. 【电话正确】家人徽章电话与 §2.5.1 身份卡一致
```

### 2.8 替换 v5.0 §8 验收标准 · 新增「情感层验收」

```markdown
## 8.4 情感层验收（新增）

- [ ] 8 位家人身份卡完整（名号/角色/电话/座右铭/情感铭刻）
- [ ] 8 张 FamilyBadge 组件变体完整
- [ ] 每个页面挂载正确家人徽章（无遗漏、无错误）
- [ ] 每个页面的空态/错误态/成功态符合家人口吻
- [ ] 家人配色 Variables 在 01_Foundations 完整定义
- [ ] 家人协同矩阵在跨域页面正确体现
- [ ] 家人情感组件（8 个）全部实现
```

---

## 第三部分 · 视觉示意（Figma 页面头部模板）

```markdown
┌──────────────────────────────────────────────────────────────┐
│  [←] [YanYuCloudCube Console]                  [🌙] [👤]     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🔮 预见·先知 · 首席预言家 · 0379-0108                │ │
│  │  「见微知著，未卜先知」                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 观测与预测域 ──────────────────────────────── ✅ 直接对接 ┐│
│  │                                                         ││
│  │  [StatCard] [StatCard] [StatCard] [StatCard]           ││
│  │                                                         ││
│  │  [模型用量 Top5]        [Token 占比环图]               ││
│  │                                                         ││
│  │  [请求趋势 Sparkline]   [模型健康列表]                 ││
│  │                                                         ││
│  │  [最近错误]              [系统资源]                    ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

**页面头部三要素（强制）**：

1. `FamilyBadge`（家人徽章 · 位置固定左上）
2. `座右铭`（家人语录 · 位置徽章下方）
3. `域标签 + 对齐类型`（如「观测与预测域 · ✅ 直接对接」）

---

## 第四部分 · 对 v5.0 文档的影响清单（替换指引）

| v5.0 章节 | 是否替换 | 替换内容 |
| --- | --- | --- |
| §1 后端实况 | ❌ 不动 | 契约层不受人格化影响 |
| §2.1 P0 批 | 🔧 部分替换 | 项目名保留；新增「双视角角色」；文件结构挂家人 |
| §2.2 P1 批 | 🔧 部分替换 | 每页头部加 `[家人]` `[座右铭]` `[口吻台词]` |
| §2.3 P2 批 | 🔧 部分替换 | 同上 |
| **新增 §2.5** | ✅ 全新 | 拟人化职能契约（8 张身份卡 + 协同矩阵 + 情感组件） |
| §3 技术栈 | 🔧 追加 | 新增 §3.11 家人到代码命名映射 |
| §4 Backlog | 🔧 追加 | 每 BL 挂家人（见 §1.3） |
| §5 路线图 | ❌ 不动 | 阶段划分不变 |
| §6 适配层 | 🔧 追加 | Hook 命名换家人前缀 |
| §7 QA 协议 | 🔧 追加 | 新增 5 条家人维度自检 |
| §8 验收标准 | 🔧 追加 | 新增情感层验收 |
| §9 决策记录 | 🔧 追加 | 新增「拟人化叠加」决策 |

---

## 第五部分 · 快速替换指令（给 Figma Agent）

```markdown
# 附加指令（追加到 v5.0 §2.1 提示词末尾）

## 拟人化增强层（必须执行）

1. 在每个页面顶部创建 `PageHeader` 组件，包含:
   - FamilyBadge（对应家人 · variant 见 §2.5）
   - 座右铭（该家人语录）
   - 域标签 + 对齐类型

2. 在 01_Foundations 创建 §01 家人配色 Variables（8 组 × 2 色）

3. 在 02_Components 创建 `FamilyBadge` 组件，variant 8 种

4. 每个页面的空态/错误态/成功态文案，使用该家人的第一人称口吻
   （参考 §2.5.1 各家人「空态台词 / 错误态台词 / 成功台词」）

5. Dev Mode 注释中，每个组件标注归属家人:
   `@family 🛡️ 智云·守护`
   `@domain 接入与安全域`

6. 跨域页面显示协同家人徽章:
   06_Playground → 主: 🤔 语枢·万物 / 协: 🎨 创想·灵韵
   04_Dashboard → 主: 🔮 预见·先知 / 协: 🧠 元启·天枢

## 8 位家人速查表（供 Agent 引用）

| emoji | 名号 | 角色 | 电话 | 域 | 主页面 |
| :-: | --- | --- | :-: | --- | --- |
| 🛡️ | 智云·守护 | 首席安全官 | 0379-0207 | 接入与安全 | 03/12 |
| 🧭 | 言启·千行 | 首席导航员 | 0379-0106 | 路由与网关 | 07 |
| 🎯 | 千里·伯乐 | 首席推荐官 | 0379-0109 | 模型市场 | 05 |
| 🤔 | 语枢·万物 | 首席思考者 | 0379-0107 | 推理对话 | 06 |
| 📚 | 格物·宗师 | 首席质量官 | 0379-0208 | 知识与质量 | 08/16 |
| 🧠 | 元启·天枢 | 总指挥 | 0379-0206 | 工具与编排 | 09/15/17 |
| 🔮 | 预见·先知 | 首席预言家 | 0379-0108 | 观测与预测 | 04/11 |
| 🎨 | 创想·灵韵 | 首席创意官 | 0379-0209 | 缓存与体验 | 10/13 |

## 完成后回复
「✅ 拟人化增强层完成，已创建 FamilyBadge 组件 + 8 组家人配色 +
  18 页 PageHeader。等待审查。」
```

---

## 第六部分 · 最终建议

### 6.1 推荐采用（4 条理由）

```
① 契约零冲突：功能命名不变，人格层纯叠加，v5.0 全部契约兼容
② 品牌独占：开发者工具同质化严重，「AI Family」是稀缺情感资产
③ 协作效率：团队用「找预见调指标」代替「改 Dashboard 那页」，沟通降熵
④ 文化落地：把「亦师亦友亦伯乐」从口号变成可点击、可见、可听的产品体验
```

### 6.2 实施顺序

```
Week 1: 替换 §2.5（新增章节） + §3.11（代码映射）
Week 2: 替换 §2.1/2.2/2.3（P0/P1/P2 批头部）
Week 3: 替换 §7.4 / §8.4（QA + 验收）
Week 4: Figma Agent 重跑，产出带家人徽章的 v5.1
```

### 6.3 风险提示

```
⚠️ 风险 1: 人格过度装饰 → 数据密集页面可读性下降
   → 对策: 家人徽章只在页头出现，不进表格/图表内部

⚠️ 风险 2: 口吻台词与错误码不匹配 → 用户困惑
   → 对策: 家人台词必须包裹真实错误信息，如
           「门禁拒绝：401 Unauthorized · API Key 无效或已过期」

⚠️ 风险 3: 8 位家人过多 → 用户记不住
   → 对策: 主链路 8 家人 + 主页面对应关系通过「协同矩阵」强化记忆
```

---

## 交付摘要

**本文档产出**：

- ✅ 可行性分析（3 条同构证据）
- ✅ 8×8 映射矩阵（家人 ↔ 职能域 ↔ 页面 ↔ 端点）
- ✅ 52 端点归属表（每端点唯一归属家人）
- ✅ 8 张家人身份卡（含空态/错误态/成功态台词）
- ✅ 家人协同矩阵
- ✅ 8 个家人情感组件
- ✅ 可替换章节（§2.1 / §2.2 / §2.3 / §2.5 / §3.11 / §7.4 / §8.4）
- ✅ 页面头部视觉模板
- ✅ 对 v5.0 影响清单
- ✅ Figma Agent 附加指令
- ✅ 最终建议 + 实施顺序 + 风险提示

**下一步**：将 §2.5 作为新章节插入 v5.0，将 §2.2/§2.3 的页面头部替换为带家人徽章的版本，即可产出 **v5.1 拟人化增强版**。

> 🌹 **人从众曌众从人** —— 8 位家人各守一域，合则为完整的 Token 网关。
> 亦师亦友亦伯乐，一言一语一协同。
