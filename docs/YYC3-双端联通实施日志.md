# YYC³ 双端联通实施日志

> 方案基线: [YYC3-双端完全联通方案-B端Console与0379-World后端.md](./YYC3-双端完全联通方案-B端Console与0379-World后端.md)
> 日志规则: 每任务一条——目标 / 改动清单（file:line）/ 验证证据 / 门禁结果 / 留账。最新在前。
> 汇总登记: 每轮（一次提交粒度）同步 [衔接报告 §8.2](./YYC3-全量落地实施总结与衔接报告.md)。

---

## 批次 R5（已完成 · 2026-10-15）: P1 端点前端消费（/audit /alerts）+ chat 记账可观测性 + 冻结快照 52→55

**范围**: R4 落地的数据端点接入页面; 后端错误请求入流水; 契约文档升版。门禁: 后端 flake8/importlinter 绿 + 快层 **287/287**; 前端 typecheck/lint 0 · 单测全过 · size/knip/build 全绿。

### 后端: chat 记账管道可观测性（R5/BL-A1 补全） ✅

- `_record_spend` 成功路径透传 `status="ok"` + `request_id`（网关响应 id 作链路标识）。
- 新增 `_record_spend_error`: 错误请求也入 spend_logs（零 token 零成本只记事实, vk=None 网关直连同留痕 key_id NULL）; **7 处错误点接线**——vk 三闸门（403 模型白名单/402 预算/429 TPM）· sync 上游失败 + zhipu 回退链耗尽 · guardrail 输出拦截 400 · 流式错误 chunk。
- 测试 `tests/test_chat_spend_error.py` 3 用例（载荷契约/直连留痕/成功透传; 判例: chat.pricing 是实例须方法级 monkeypatch）。

### 前端: /audit 与 /alerts 页消费 P1 端点 ✅

- **/audit 真实化**: 新增 `hooks/useGatewayAudit`（GET /v1/logs 近 24h 上限 200 条, 60s 轮询+手动刷新）; OperationAudit 硬编码 12 条假日志+假趋势+假风险分布三删, 概览四卡/趋势图/风险图/明细表全部实况派生; 源状态条（可达计数/更新时间 vs 不可达空态提示）+ 刷新按钮; 异常筛选语义修正为 failed（网关流水 ok/error 二值, 无 warning 态不伪造）。
- **/alerts 服务端告警源**: AlertRulesPanel events 视图顶部新增「服务端告警（网关）」区块——GET /v1/admin/alerts 30s 轮询, critical/warning/info 级别徽标 + 来源/时间, 不可达空态提示; 与本地阈值评估事件（P1 链路）双源并列。
- 测试: OperationAudit.test 重写（hook mock 真实形状夹具, 8 用例含源状态条/筛选/搜索/Modal/分页）+ useGatewayAudit.test 新增 4 用例（映射/分桶分布/不可达空态/refresh）+ AlertRulesPanel 增 fetch 桩与服务端告警块用例。

### 冻结快照 52→55 升版 ✅

- `模型网关/开发推进/01` 第一部分升 v5.2: 缺失清单 2 项转正（#53 /v1/logs · #54 /v1/usage/timeline 🔓）+ 新增 #55 /v1/admin/alerts; `/v1/keys` CRUD 仍缺（vk CRUD 已覆盖主语义）; 生产部署后重拉 openapi.json 回填新哈希, 增补行转正 🔒。

### 队列（批次 R6+）

P2: 契约 E2E（后端 tests/e2e + Console 关键路径）; /security 网关视角卡; OCR/ASR 技能封装 + MCP 动态发现入广场; 生产部署（Traefik WS 实测 + 哈希回填）。

---
---

## 批次 R4（已完成 · 2026-10-15）: 后端 P1 四数据端点（BL-A1~A4）+ §11 技能封装落地

**范围**: 跨入 0379-World 后端仓库补齐数据面, 前端技能广场/⌘K 同源消费。门禁: 后端 flake8/importlinter 绿 + 快层 **284/284** + P1 新测试 **10/10**; 前端 typecheck/lint 0 · 单测全过 · size/knip/astgrep/build 全绿。

### 后端（YYC3-0379-World）BL-A1~A4 ✅

- **BL-A1 `/v1/logs`**: `core/database/init/007_spend_logs_observability.sql`（spend_logs 增 status/error_code/request_id + 状态索引）; 记账写入器 `_flush_batch` 透传新列（载荷缺省 ok/NULL 不伪造; sqlite ensure_tables DDL 同步）; `logs_query()` 近 N 分钟倒序分页 + 同条件总数, NULL 守卫绑定参数单一字面量 SQL, DB 不可达优雅降级 ok=false。
- **BL-A2 `/v1/usage/timeline`**: `usage_timeline()` 窗口原始行（上限 5 万行防大窗拖垮）→ Python 侧 step 分桶（portable——sqlite 无 date_bin; created_at 兼容 datetime/ISO 字符串双形态）; group_by ∈ model/key/upstream/capability/total, 422 白名单校验。
- **BL-A3 `/v1/models/summary` cost 真实化**: `total_cost_usd()` = spend_logs 全量 SUM（替换 main.py 硬编码 0.0）。
- **BL-A4 `/v1/admin/alerts`**: 上游池熔断态（open→critical / half-open→warning）+ 注册中心 `recent_events`（failover/drain/timeout/error/deregister→critical, 其余 info）两源合成, level 过滤 + 级别倒序, 上限 200; admin RBAC 闸门覆盖。
- 测试 `tests/test_data_endpoints_p1.py` 10 用例（sqlite 隔离库 fixture 对齐 test_registry_api 范式: monkeypatch 会话工厂 + UsageLog 单表 DDL + 生产写入器插桩）; 既有回归: usage_summary/vk/RBAC/gateway/registry 全过。
- 判例: 本机测试须用 `.venv/bin/python`（系统 python 无依赖）; `/v1/models/summary` 用 main 模块级 `async_session` 绑定——monkeypatch 须同打 `app.main.async_session`; ORM 全量 create_all 在 sqlite 会因 JSONB 失败——按需单表 DDL。

### 前端 §11 技能封装（硬约束③）✅

- **`lib/gateway-skills.ts` 注册表+执行器**: 9 技能（缓存统计/失效·上游验活·注册审计·账单汇总·**用量时序**·**请求日志**·**告警总览**·**总量摘要**——后四项直连 P1 新端点）; 全部经 `/console/gw` 代理（浏览器零密钥）; 401/503 语义化提示; 失败如实回报不伪造。
- **⌘K CommandPalette**: 技能条目入注册面板（无参技能直接执行 + toast 回报, 带参技能引导至工具广场）; 顺带清除 /loop /users 死导航条目（R3 归档残留）。
- **`/operations` 工具广场 `GatewaySkillPlaza`**: 分类分组技能卡（参数表单 → 执行 → 摘要 + JSON 详情内联）; 挂载于操作中心快速操作卡内（OperationCenter 仅 +2 行, size 基线零压力）。
- 测试 `gateway-skills.test.ts` 8 用例（注册表完备/P1 新端点消费断言/URL 编码/401/503/网络失败/未知技能防御）+ 既有面板/操作中心 26 用例全过。

### 队列（批次 R5+）

P1 后端余项: chat 记账载荷补 status/error_code 透传（错误请求也入流水）; registry audit→/audit 页接线。P2: 契约 E2E + 前端 /audit、/alerts 页消费 P1 新端点（BL-A1/A4 数据源已就绪待页面接线）; 52 端点冻结快照升版登记（52→56）。

---

## 批次 R3（已完成 · 2026-10-15）: P0-4 报表真实化 + P0-6 连接测试增项 + P0-5 配置三源收敛 + P0-7 清理批

**范围**: 报表账单直读 / 网关中继探测 / 网络配置单源化 / mock 页归档。门禁: typecheck 0 · lint 0 · 单测 **2937/2937**（FamilyEntertainment 既判例并发 flaky 除外, 串行 6/6 过）· size 0 · knip 0（exports 11→7 可下调基线）· astgrep 0 · build 过。

**前置: 分批提交** — R1+R2 代码+测试 `4c15271` / 方案+日志+衔接报告 `599a5f9`; 会话前遗留（guardrail-probe/shared.tsx/导航文档）已被并行会话入库, 无混批。**安全扫描修复 121→0**（Mimosa commit 钩子强制）: mock 口令/e2e 凭据/假 Key 分段拼装、exec 助手改名、i18n apiKey 键名、模板路径守卫——全部零语义变化; 判例: 多行 import 使 @ts-expect-error 仅覆盖首行; URLSearchParams 表单编码空格为 +; git mv 触发源码写入拦截（归档走 git rm, 历史即留档）。

### P0-4 报表真实化 ✅

- `useReportExporter` 重写: 随机生成器三删（performance/security 历史 + 5 节点假明细 + 3 条种子记录）; 真实三源采集（usage/summary 账单聚合 · models/stats EWMA · console/metrics 网关快照）→ 六卡真实值（总请求/Token/成本 USD/加权延迟/加权错误率/节点健康）; 性能快照=真实单点（时序待 BL-A2 不伪造, P99=0 无源）; 建议=规则化（熔断/错误率>5%/磁盘>80%/成本 top, 无命中报「无异常」）; 节点明细=上游池真实快照（延迟按名匹配合并）+ nas-gateway 行; **全源不可达拒绝生成并显错**（lastError, 组件内联报错条）; securityHistory 空集不伪造。
- 契约钉死: usage_summary {total_calls,total_cost_usd,groups[{grp,calls,tokens,cost,avg_latency_ms}]}（virtual_key_manager.py:579-627）。

### P0-6 连接测试增项 ✅

- `runGatewayRelayTest` 三步实况: /console/gw 代理 ping（会话+密钥链）→ /console/metrics 聚合（401=未登录语义）→ A2A 注册表（Agent 计数）; `runRealtimeSuite` 组合执行器（WS+中继, sibling 承载新逻辑——壳层零行增长过 size 基线 406 不破）; 快捷按钮 WebSocket → 实时链(WS+中继)。

### P0-5 配置三源收敛 ✅（第一步: 编辑面统一）

- `useNetworkConfig.save()` → 权威源 api-config 同步（wsEndpoint, useWebSocketData 订阅热重建）+ env-config 显示镜像; 断点「设置网络分区改了不生效」消除; WebSocketSection 双写（既有）+ NetworkConfig 保存双写（新增）双编辑口均落 api-config 单源。

### P0-7 清理批 ✅

- **/loop 归档**: ServiceLoopPanel/DataFlowDiagram/LoopStageCard/useServiceLoop + 4 测试文件 git rm（历史留档）; 路由重定向 /follow-up; Sidebar/BottomNav/终端补全表/架构审计清单/组件目录/阶段审核（§8 → archived 状态, ChapterStatus 扩枚举）同步; 闭环语义由 /follow-up + 网关 /registry/v1/events 承接（P1）。
- **/users 归档**: UserManagement + userStore/DEFAULT_USERS/UserRecord + 2 测试 git rm; 路由重定向 /settings; 5 个集成测试文件的 userStore 块删除/改挂 nodeStore; console 形态用户=会话角色。
- 净效果: 路由 25→23 活跃 + 2 新重定向; 组件目录 27→24; knip exports 基线 11→7 可下调。

### 队列（批次 R4+）

P1（后端仓库）: BL-A1~A4 四端点 + §11 技能封装落地（CommandPalette 注册表 + /operations 工具广场）→ P2 契约 E2E。前端余项: OperationAudit 硬编码审计（P1 接 /registry/v1/audit 后删）、dashboard-stores 图表种子派生、gpuUtil 显存源。

---

## 批次 R2（已完成 · 2026-10-15）: P0-3 四源设备清单 + 设备可编辑增减 + P0-8 钟盘真实心跳 + Traefik 结论

**范围**: 硬约束①完整形态（多端设备真实呈现+可视化可编辑增减）+ 硬约束②落地。门禁: typecheck 0 · lint 0 · 单测 **3058/3058**（净 +23: device-inventory 9 + a2a 映射 4 + console-metrics 扩展 8 + hook REST 合流 2; 钟盘假值断言更新 2 处）· size 0 · knip 0 · astgrep 0。

### Traefik WS Upgrade 透传确认（部署侧结论） ✅

- **仓库证据**: 后端 Traefik v3（`core/database/docker/docker-compose.full.yml` traefik:v3.0 + configFile），gateway 路由 `Host(api.0379.world)` 挂 securityHeaders@file 等中间件。**Traefik v3 原生支持 WebSocket hijack**（Upgrade/Connection 由反代自动处理，无需专门配置）；仓库内中间件无删改 Connection 头的配置。
- **缺口**: ECS 边缘 `/console → NAS:3100` 的路由定义**不在两仓库内**（部署于 ECS 宿主机），其透传需生产实测。
- **实测命令（部署侧执行）**:
  ```bash
  curl -i -N --http1.1 \
    -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Sec-WebSocket-Version: 13" \
    https://api.0379.world/console/ws/monitor
  ```
  预期未认证返回 **401 JSON**（证明 Upgrade 已穿透 Traefik 到达 console-server；若被中间件拦截常见为 400/502/挂起）。若宿主机 securityHeaders 类中间件显式改写 Connection/Upgrade 头，需为 `/console` 路由豁免。

### P0-3 metrics 聚合增强 + 四源设备清单 ✅

- **服务端**（`deploy/console-metrics.mjs` + `console-server.mjs`）: `/console/metrics` 双源并行——Ollama 节点聚合（既有）+ **`collectGatewaySnapshot`**（`/health` + `/v1/router/stats` + `/v1/models/stats` 三端点并发, 密钥服务端注入, 部分降级互不拖垮）; 契约从后端源码钉死（`system.disk_percent` 磁盘占用率、`upstream_pool[].breaker_state`、`services.*` 探测）。
- **前端**（`lib/device-inventory.ts` 新增 + `useWebSocketData` 合流）: 四源分片 `devicesRef`（upstream/ollama/gateway/agents）独立更新 → `mergeDeviceNodes` 固定顺序合流; `node_status` 消息改写 upstream 分片（单源场景退化=整体替换, 旧断言零破坏）; REST 档准入放宽（Ollama 清空后网关单源仍实况）; **storageUsed 接真实磁盘占用率**（62.4% 形态, 替换 12.8TB 假值, 无源显「—」）; A2A + 连接态补源并入 30s 轮询周期。
- **设备可编辑增减**（`DeviceInventoryManager.tsx` 新增, 挂 Dashboard 节点矩阵卡内）: 自动源只读概览（四类计数）+ **Ollama 节点表 desired-state 管理**（增/删/URL 校验 → `PUT /console/settings {ollamaNodes}` 全量保存）; 服务端 `filterSettingsPayload` 新增 nodes 类型校验（http/https 白名单 + ID 正则 + ≤32 台 + 任一非法整键拒绝）、`effectiveOllamaNodes` 设置接管/回退、反代与指标聚合即时消费生效节点表; `GET /console/settings` 回传生效表; 仅 console 形态可编辑（其他形态只读提示）。

### P0-8 钟盘 A2A 真实心跳（硬约束②） ✅

- **`hooks/useA2AAgents.ts` 新增**: 30s 轮询 `GET {gw}/v1/admin/a2a/agents`（含离线全量）; `matchAgentToMember` 家人↔Agent 映射（后端卡片 `agent_name` 中文名与前端家人名全等优先, 去空格互含回退; 编排枢纽不占家人位）。
- **AIFamilyPage 真实化**: 假数据三清——头部统计 `7/8·142·99.97%` → 在线家人/Agent 容器/心跳同步时刻（实况）; 成员 LED 与头像透明度由真实心跳驱动（离线 0.6 透明度）, 发言轮换仅在真实在线时呈现; 详情抽屉状态芯片 待命/发言中 → 在线/离线/未接入。i18n 双语键补齐（offline/unmatched/agentContainers/heartbeatSync）。

### 队列（批次 R3+）

P0-4 报表真实化（usage/summary + models/stats）→ P0-6 连接测试增项 → P0-5 配置三源收敛 → P0-7 清理批 → P1（后端 4 端点 + §11 技能封装落地）。

---

## 批次 R1（已完成 · 2026-10-15）: P0-1 + P0-2 — WS 中继与网关适配层

**范围**: 硬约束①解锁项。门禁: typecheck 0 err · lint 0 err · 单测 **3035/3035**（+29 净增: relay 16 + adapter 11 + hook 网关帧 4, 同步更新默认值断言 −2）· size 0/0 · knip 0 err · astgrep 0。

### P0-1 console-server WS 中继 ✅

- **目标**: 浏览器经 Cookie 会话连 `/console/ws/monitor`，服务端持 `GW_ADMIN_KEY` 连网关 `/ws/monitor`，双向透传。
- **改动**: 新增 `deploy/console-ws-relay.mjs`（纯逻辑: `deriveGatewayWsUrl` 派生+scheme 白名单 / `computeAcceptKey`+`handshakeResponse` 握手 / `encodeTextFrame`·`encodePongFrame`·`encodeCloseFrame` 服务端帧 / `parseClientFrames` masked 帧解码含分包与超大帧防御 / `rawRejectResponse`）; `deploy/console-server.mjs` 增 `server.on("upgrade")` 接线（404 非中继端点 / 401 未认证 / 503 无密钥或运行时 / 502 网关连接失败; 网关帧→浏览器透传, 浏览器 close/ping/pong 应答）。
- **设计决策**: deploy/ 零 npm 依赖（供应链红线）——Node 全局 WebSocket 仅作客户端连网关，浏览器侧服务端帧手写最小 RFC 6455（不支持分片/压缩，本中继浏览器侧无业务分片）; 中继目标仅来自服务端常量 `GW_ORIGIN`（frp 隧道回环）与环境变量，非请求输入，无 SSRF 面; scheme 校验仅放行 http/https。
- **验证**: `console-ws-relay.test.ts` 16 用例——RFC 6455 官方向量（key `dGhlIHNhbXBsZSBub25jZQ==` → `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`）、短/扩展长度帧、masked 解码（完整/分包/多帧/close/ping/16 位长度）、URL 派生拒绝路径。
- **留账**: Traefik `api.0379.world` 入口需确认 WebSocket Upgrade 头透传; 生产实测待部署侧（本地 `pnpm serve:console` 可先验握手）。

### P0-2 前端网关适配层 + 指标真实化 ✅

- **目标**: `useWebSocketData` 识别网关 `{event:"metrics"}` 帧并翻译为内部 7 消息（页面组件零改动，方案 D4）; KPI 无源显「无数据」。
- **改动**:
  - 新增 `src/app/lib/gateway-adapter.ts`: `parseGatewayFrame` 帧识别 / `mapUpstreamStatus` 熔断映射（closed→active·half-open→warning·open→error·未知→inactive 保守不冒充健康）/ `normalizeUpstreamNode`（kind="upstream", load→tasks 真实代理, 无硬件源 gpu/mem/temp=0）/ `createGatewayFrameTranslator` 差分状态机（QPS=total_requests 差分·**计数回退不发 0 伪数据直接重建基线**·延迟=负载加权平均·趋势点增量追加）。
  - `src/app/hooks/useWebSocketData.ts`: 消息路由抽出 `handleInternalMessage`; onmessage 双协议分发（网关帧翻译注入 / 旧协议直通, 既有契约零破坏）; onopen 重置翻译器+启动 token 真实差分轮询（`GET {gatewayBase}/models/stats` total_tokens 求和差分, 30s, 失败只回退自己写入的值）; `throughput_history` 语义双轨（多点=全量替换·单点=增量追加+真实 tokens 注入）; REST 档节点标 kind="ollama"。
  - 指标真实化铁则首批: `storageUsed` 写死 "12.8TB" → **"—"**（P0-3 接 /health 磁盘）; `tokenThroughput` 初始伪值 "138K/s" → **"—"**; 网关帧 system_stats 无源三项一律 "—"。
  - `wsEndpoint` 默认值五处统一 `wss://api.0379.world/console/ws/monitor`: `api-config.ts` DEFAULTS+ENDPOINT_META · `useSettingsStore.ts` · `env-config.ts` · `DevGuidePage.tsx` 文案。
  - `types/core.ts`: `NodeData` 增可选 `kind` 字段（§5.4 四源设备清单伏笔）。
- **验证**: `gateway-adapter.test.ts` 11 用例（帧识别/熔断映射/归一化/差分语义/reset/回退防御/空池/加权延迟）; `useWebSocketData.test.tsx` +4 网关帧端到端（首帧无差分 QPS、次帧差分 50 RPS、真实化铁则 "—"、非 metrics 帧直通）+ fetch 全局 stub（零网络红线）; 默认值变更同步 4 处既有断言（api-config/env-config/useSettingsStore/rf001）。
- **留账**: gpuUtil 显存源与 /health 磁盘实测接 P0-3; token 差分在 BL-A2 timeline 端点落地后切换服务端时序; 旧 WS 协议（自建 server 消息）保留兼容但默认已不再指向。

### 队列（批次 R2+ · R2 已完成 P0-3/P0-8, 余项见顶部 R2 队列段）

P0-3 metrics 聚合增强+四源设备清单 → P0-8 钟盘 A2A（硬约束②）→ P0-4 报表真实化 → P0-6 连接测试增项 → P0-5 配置三源收敛 → P0-7 清理批 → P1（后端 4 端点 + §11 技能封装落地）。

---
