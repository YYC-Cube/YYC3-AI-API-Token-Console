# 02 · 网络与 WebSocket（network · websocket）

> 页面：`/settings` → 「网络连接」「WebSocket」；验证页 `/connection-test`（真实探测链）
> 生效：`wsEndpoint` **编辑即重连**（api-config 直写 → onAPIConfigChange → 旧连接关闭 → 新端点热重建）

## WebSocket 连接配置（WebSocketSection）

| 变量 | 类型 | 默认 | 示例 | 说明 / 生效机制 |
| ---- | ---- | ---- | ---- | ---- |
| `values.wsEndpoint` | string | `"ws://localhost:3113/ws"` | `ws://192.168.3.45:3113/ws` | **双写**：settingsStore 展示副本 + api-config 真实消费源；编辑确认即 teardown+重连（Network 面板可观测） |
| `toggles.wsAutoReconnect` | boolean | `true` | 开/关 | 断线自动重连开关 |
| `values.wsReconnectInterval` | string | `"5000"` | `3000`（ms） | 重连间隔 |
| `values.wsMaxReconnect` | string | `"10"` | `5` | 最大重连次数（超限切模拟/轮询） |
| `toggles.wsHeartbeat` | boolean | `true` | 开/关 | 心跳检测开关 |
| `values.wsHeartbeatInterval` | string | `"30000"` | `15000`（ms） | 心跳间隔 |
| `values.wsThrottleMs` | string | `"100"` | `50`（ms） | UI 更新节流（防高频渲染卡顿） |

## 数据链降级序（实况架构）

```
WS 连接成功 → connected（实时推送, 消息协议 qps/latency/node_status/alert/…）
   ↓ 不可达
REST 轮询档 → connectionState="rest"（「轮询实况」, 消费 metricsBase=/console/metrics）
   ↓ 不可达
本地模拟底座 → simulated（节奏 = refreshInterval 秒）
```

## 网络连接（NetworkSection · 只读展示）

「当前连接」卡片展示 `values.wsEndpoint` 等生效值；真实连通性验证前往 `/connection-test`（Ollama/网关/数据库/网络四类真实 fetch 探测）。

---

返回 [目录](./README.md)
