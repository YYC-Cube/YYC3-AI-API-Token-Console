# 08 · 环境变量与 API 端点（env · advanced · pwa）

> 页面：`/settings` → 「环境变量」「高级设置」「PWA/离线」；独立编辑页 `/env-config`（EnvConfigEditor）· `/pwa`
> env 优先级：`import.meta.env (VITE_YYC3_*) > localStorage > 默认值`；变更经 subscribeEnvConfig 即时通知 + 跨标签页 BC

## 环境变量全表（env-config.ts · 31 键，存储 `yyc3_env_config`）

### 系统标识（不可逆）

| 键 | 默认 | 示例 | 说明 |
| ---- | ---- | ---- | ---- |
| `SYSTEM_NAME` | YYC³ CloudPivot Intelli-Matrix | 自定义 | 系统名（终端/文档头） |
| `SYSTEM_VERSION` | 3.2.0 | 3.2.1 | 版本号 |
| `SYSTEM_BUILD` | 2026.03.07 | 日期 | 构建号 |
| `CLUSTER_ID` | CN-EAST-PROD-01 | — | 集群标识 |
| `NODE_ENV` | development | production | 环境 |

### 网络端点

| 键 | 默认 | 示例 |
| ---- | ---- | ---- |
| `API_BASE_URL` | http://192.168.3.1:3118/api | http://192.168.3.45:3118/api |
| `WS_ENDPOINT` | ws://localhost:3113/ws | ws://192.168.3.45:3113/ws |
| `OLLAMA_BASE_URL` | http://localhost:11434 | http://100.65.64.49:11434 |
| `OLLAMA_PROXY_PATH` | /api/v1/llm/ollama | — |

### 存储（不可逆——改后旧数据不可见）

| 键 | 默认 | 说明 |
| ---- | ---- | ---- |
| `STORAGE_PREFIX` | yyc3_ | localStorage 前缀 |
| `IDB_NAME` / `IDB_VERSION` | yyc3_matrix / 3 | IndexedDB 库名/版本 |

### AI 默认 / 安全 / 开关 / 连接池 / SQL

| 键 | 默认 | 示例 |
| ---- | ---- | ---- |
| `DEFAULT_AI_BASE_URL` / `DEFAULT_AI_MODEL` | https://api.openai.com/v1 / gpt-4o | …/console/gw/v1 / glm-4-flash |
| `DEFAULT_AI_TEMPERATURE` / `MAX_TOKENS` / `TIMEOUT` | 0.7 / 2048 / 30000 | 0.2 / 4096 / 60000 |
| `SESSION_TIMEOUT_MIN` / `MAX_LOGIN_ATTEMPTS` / `CORS_ORIGINS` | 30 / 5 / 网段串 | 45 / 5 / … |
| `ENABLE_MOCK_MODE` / `ENABLE_DEBUG` / `ENABLE_PWA` / `ENABLE_ELECTRON_IPC` | true / false / true / false | 布尔 |
| `DB_POOL_MIN/MAX/IDLE_TIMEOUT/ACQUIRE_TIMEOUT` | 2/10/30000/5000 | — |
| `SQL_BLOCKED_COMMANDS` / `SQL_MAX_HISTORY` / `SQL_TEST_SIMULATE_DELAY` | DROP,DELETE,TRUNCATE,ALTER / 20 / 500 | — |

> 终端操作：`env list` 全量 · `env get <KEY>` · `env set <KEY> <VALUE>`（类型自动转换）· `env reset --confirm` · `env export`

## API 端点（api-config.ts · 存储 `yyc3_api_endpoints`）

| 键 | 默认 | 说明 |
| ---- | ---- | ---- |
| `enableBackend` | `false` | 后端总开关（false=纯前端模式） |
| `timeout` / `maxRetries` | `15000` / `2` | 通用超时/重试 |
| `fsBase` | `/api/fs` | 文件系统 API（list/read/write/…） |
| `dbBase` | `/api/db` | 数据库 API（detect/connect/query/…） |
| `wsEndpoint` | `ws://localhost:3113/ws` | 实时推送（编辑即重连） |
| `aiBase` | `https://api.openai.com/v1` | AI 推理 |
| `clusterBase` | `/api/cluster` | 集群管理 |
| `metricsBase` | `/console/metrics` | **节点指标聚合**（REST 轮询档消费） |

## 网关（`yyc3_gateway_config`）

| 键 | 默认 | 示例 |
| ---- | ---- | ---- |
| `gatewayBase` | https://api.0379.world/console/gw/v1 | 服务端代理同源路径 |
| `gatewayAdminKey` | `proxy`（占位） | 代理模式服务端覆盖 |
| `gatewayApiKey` | `""` | 对话密钥 |

## 高级 / PWA

| 变量 | 默认 | 说明 |
| ---- | ---- | ---- |
| `toggles.debugMode` | `false` | 调试模式 |
| `toggles.performanceLog` | `true` | 性能日志 |
| `toggles.autoUpdate` | `false` | 自动更新 |
| `toggles.logLevel`（values） | `"info"` | `debug/info/warn/error` |
| `values.logRetention` | `"30"`（天） | 日志保留 |
| `toggles.wsHeartbeat` 族见 [02](./02-网络与WebSocket.md) | — | — |

---

返回 [目录](./README.md)
