# YYC³ 双端联通实施日志

> 方案基线: [YYC3-双端完全联通方案-B端Console与0379-World后端.md](./YYC3-双端完全联通方案-B端Console与0379-World后端.md)
> 日志规则: 每任务一条——目标 / 改动清单（file:line）/ 验证证据 / 门禁结果 / 留账。最新在前。
> 汇总登记: 每轮（一次提交粒度）同步 [衔接报告 §8.2](./YYC3-全量落地实施总结与衔接报告.md)。

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
