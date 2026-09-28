/**
 * ============================================================================
 *  YYC³ API 参考文档
 *  YYC³ 本地多端推理矩阵数据库数据看盘 - API Reference
 * ============================================================================
 *
 * 版本: 0.0.1
 * 更新: 2026-02-25
 * 技术栈: React 18 + TypeScript + Tailwind CSS v4 + Recharts + React Router 7
 *
 * ============================================================
 *  全局类型中心: src/app/types/index.ts
 * ============================================================
 *
 * 所有业务类型统一定义在 types/index.ts，各模块通过
 * import type { ... } from "../types" 导入。
 * 旧的模块级 re-export 保留用于向后兼容。
 *
 * 9 大分类 / 38 个类型:
 *   1. 用户与认证  — UserRole, AppUser, AppSession, AuthContextValue
 *   2. 节点与集群  — NodeStatusType, NodeData, NodeStatusRecord, toNodeData()
 *   3. 模型与Agent — ModelTier, Model, Agent, InferenceStatus, InferenceLog, ModelStats
 *   4. WebSocket   — ConnectionState, AlertLevel, AlertData, ThroughputPoint, SystemStats, WSMessage, WebSocketDataState
 *   5. 网络配置    — NetworkInterface, NetworkMode, NetworkConfig, TestStatus, ConnectionTestResult, NetworkConfigState
 *   6. 后台同步    — SyncItemType, SyncItem, SyncQueueStats, SyncProcessResult
 *   7. 错误处理    — ErrorCategory, ErrorSeverity, AppError, ErrorStats
 *   8. 响应式布局  — Breakpoint, ViewState
 *   9. UI 组件     — ErrorBoundaryLevel, ChatMessage, CommandCategory, BeforeInstallPromptEvent
 *
 * ============================================================
 *  目录
 * ============================================================
 *
 * 1. 数据库查询 API (db-queries.ts)
 * 2. 认证 API (supabaseClient.ts)
 * 3. 网络工具 API (network-utils.ts)
 * 4. 错误处理 API (error-handler.ts)
 * 5. 后台同步 API (backgroundSync.ts)
 * 6. WebSocket 消息协议
 *
 * ============================================================
 *  1. 数据库查询 API
 *  文件: src/app/lib/db-queries.ts
 * ============================================================
 *
 * 当前状态: Mock 模式（所有函数返回模拟数据）
 * 接入方式: 配置 Supabase 后替换为 supabase.from() 调用
 *
 * ---
 *
 * getActiveModels(): Promise<{ data: Model[]; error: null }>
 *
 * 说明: 查询活跃模型列表
 * SQL:  SELECT * FROM core.models
 *       WHERE tier IN ('primary','secondary')
 *       ORDER BY avg_latency_ms ASC
 *
 * 返回字段:
 *   - id:             string    模型唯一标识
 *   - name:           string    模型名称 (如 "LLaMA-70B")
 *   - provider:       string    提供商 (如 "Meta")
 *   - tier:           "primary" | "secondary" | "standby"
 *   - avg_latency_ms: number    平均延迟(毫秒)
 *   - throughput:     number    吞吐量
 *   - created_at:     string    创建时间(ISO)
 *
 * ---
 *
 * getRecentLogs(limit?: number): Promise<{ data: InferenceLog[]; error: null }>
 *
 * 说明: 查询最近推理日志
 * 参数: limit - 返回条数，默认 100
 * SQL:  SELECT * FROM telemetry.inference_logs
 *       ORDER BY created_at DESC LIMIT $1
 *
 * 返回字段:
 *   - id:         string    日志唯一标识
 *   - model_id:   string    关联模型ID
 *   - agent_id:   string    关联Agent ID
 *   - latency_ms: number    本次延迟(毫秒)
 *   - tokens_in:  number    输入token数
 *   - tokens_out: number    输出token数
 *   - status:     "success" | "error" | "timeout"
 *   - created_at: string    创建时间(ISO)
 *
 * ---
 *
 * getModelStats(modelId: string): Promise<{ data: Stats | null; error: null }>
 *
 * 说明: 查询模型24小时性能统计
 * 参数: modelId - 模型ID
 * SQL:  SELECT model_id, AVG(latency_ms), COUNT(*), SUM(tokens_out)
 *       FROM telemetry.inference_logs
 *       WHERE created_at > NOW() - INTERVAL '24 hours'
 *       AND model_id = $1 GROUP BY model_id
 *
 * 返回字段:
 *   - avgLatency:     number  平均延迟
 *   - totalRequests:  number  总请求数
 *   - totalTokens:    number  总token数
 *   - successRate:    number  成功率(%)
 *
 * ---
 *
 * getNodesStatus(): Promise<{ data: NodeStatus[]; error: null }>
 *
 * 说明: 查询节点实时状态
 * SQL:  SELECT * FROM infra.nodes ORDER BY hostname
 *
 * 返回字段:
 *   - id:             string  节点唯一标识
 *   - hostname:       string  主机名
 *   - gpu_util:       number  GPU利用率(0-100)
 *   - mem_util:       number  内存利用率(0-100)
 *   - temp_celsius:   number  温度(°C)
 *   - model_deployed: string  已部署模型
 *   - active_tasks:   number  活跃任务数
 *   - status:         "active" | "warning" | "inactive"
 *
 * ---
 *
 * getActiveAgents(): Promise<{ data: Agent[]; error: null }>
 *
 * 说明: 查询活跃Agent列表
 * SQL:  SELECT * FROM core.agents WHERE is_active = true
 *
 * 返回字段:
 *   - id:          string   Agent唯一标识
 *   - name:        string   英文名
 *   - name_cn:     string   中文名
 *   - role:        string   角色类型
 *   - description: string   描述
 *   - is_active:   boolean  是否活跃
 *
 * ============================================================
 *  2. 认证 API
 *  文件: src/app/lib/supabaseClient.ts
 * ============================================================
 *
 * 当前状态: Mock 模式（localStorage 模拟会话）
 * 预设账号:
 *   - admin@yyc-matrix.local / admin123 (超级管理员)
 *   - dev@yyc-matrix.local   / dev123   (开发者)
 *
 * ---
 *
 * supabase.auth.signInWithPassword({ email, password })
 *   → { data: { user, session } | null, error: { message } | null }
 *
 * supabase.auth.getSession()
 *   → { data: { session: MockSession | null }, error: null }
 *
 * supabase.auth.getUser()
 *   → { data: { user: MockUser | null }, error: null }
 *
 * supabase.auth.signOut()
 *   → { error: null }
 *
 * supabase.auth.onAuthStateChange(callback)
 *   callback 签名: (event: "SIGNED_IN" | "SIGNED_OUT", session) => void
 *   → { data: { subscription: { unsubscribe: () => void } } }
 *
 * ============================================================
 *  3. 网络工具 API
 *  文件: src/app/lib/network-utils.ts
 * ============================================================
 *
 * --- 配置管理 ---
 *
 * loadNetworkConfig(): NetworkConfig
 *   从 localStorage 读取网络配置，不存在时返回默认值
 *
 * saveNetworkConfig(config: NetworkConfig): void
 *   保存网络配置到 localStorage
 *
 * resetNetworkConfig(): NetworkConfig
 *   重置为默认配置并清除 localStorage
 *
 * --- 网络检测 ---
 *
 * getLocalIP(): Promise<string>
 *   使用 WebRTC 获取本机 IP，失败返回 "127.0.0.1"
 *
 * getNetworkInterfaces(): Promise<NetworkInterface[]>
 *   检测网络接口信息（接口名、类型、IP、状态）
 *
 * --- URL 生成 ---
 *
 * generateWsUrl(address: string, port: string): string
 *   根据地址和端口生成 WebSocket URL: ws://{address}:{port}/ws
 *
 * --- 连接测试 ---
 *
 * testWebSocketConnection(url, timeoutMs?): Promise<TestResult>
 *   测试 WebSocket 连接，返回 { success, latency, error? }
 *
 * testHTTPConnection(url, timeoutMs?): Promise<TestResult>
 *   测试 HTTP 端点可达性，返回 { success, latency, error? }
 *
 * ============================================================
 *  4. 错误处理 API
 *  文件: src/app/lib/error-handler.ts
 * ============================================================
 *
 * --- 核心函数 ---
 *
 * captureError(error, options?): AppError
 *   捕获并记录错误，options: { category, severity, source, userAction, silent }
 *
 * captureNetworkError(error, endpoint): AppError
 *   网络错误快捷函数
 *
 * captureWSError(error, detail?): AppError
 *   WebSocket 错误快捷函数
 *
 * captureAuthError(error): AppError
 *   认证错误快捷函数
 *
 * captureParseError(error, context): AppError
 *   解析错误快捷函数
 *
 * --- 安全包装器 ---
 *
 * trySafe<T>(fn, source?): Promise<[T, null] | [null, AppError]>
 *   异步操作安全包装器，自动捕获错误返回元组
 *
 * trySafeSync<T>(fn, source?): [T, null] | [null, AppError]
 *   同步操作安全包装器
 *
 * --- 日志管理 ---
 *
 * getErrorLog(): AppError[]
 *   获取本地错误日志（最多200条）
 *
 * clearErrorLog(): void
 *   清除所有错误日志
 *
 * getErrorStats(): ErrorStats
 *   获取错误统计信息（按类别、严重级别分组）
 *
 * --- 全局监听 ---
 *
 * installGlobalErrorListeners(): void
 *   安装 window.onerror 和 unhandledrejection 监听器
 *   在 App.tsx 初始化时调用一次
 *
 * ============================================================
 *  5. 后台同步 API
 *  文件: src/app/lib/backgroundSync.ts
 * ============================================================
 *
 * registerBackgroundSync(tag?): Promise<boolean>
 *   注册 Service Worker 后台同步
 *
 * addToSyncQueue(item): SyncItem
 *   添加同步项到队列，item: { type, payload }
 *   type: "config_update" | "audit_log" | "user_action"
 *
 * getSyncQueue(): SyncItem[]
 *   获取当前同步队列
 *
 * processSyncQueue(): Promise<{ success, failed }>
 *   处理队列中所有项，失败项自动重试（最多3次）
 *
 * clearSyncQueue(): void
 *   清空同步队列
 *
 * getSyncQueueStats(): QueueStats
 *   获取队列统计: { total, pending, retrying, oldestTimestamp }
 *
 * ============================================================
 *  6. WebSocket 消息协议
 *  端点: ws://localhost:3113/ws
 * ============================================================
 *
 * --- 客户端 → 服务端 ---
 *
 * { type: "init", requestData: string[] }
 *   请求初始数据，requestData 可选值:
 *   ["throughput_history", "node_status", "system_stats"]
 *
 * { type: "heartbeat" }
 *   心跳探测（30秒间隔）
 *
 * --- 服务端 → 客户端 ---
 *
 * { type: "qps_update", payload: { qps: number, trend: string } }
 *   实时QPS更新
 *
 * { type: "latency_update", payload: { latency: number, trend: string } }
 *   实时延迟更新
 *
 * { type: "node_status", payload: NodeData[] }
 *   节点状态批量更新
 *
 * { type: "alert", payload: AlertData }
 *   告警通知
 *
 * { type: "throughput_history", payload: ThroughputPoint[] }
 *   吞吐量历史数据
 *
 * { type: "system_stats", payload: SystemStats }
 *   系统总览指标
 *
 * { type: "heartbeat_ack" }
 *   心跳确认
 *
 * ============================================================
 */

// 此文件仅作为 TypeScript 格式的可导航文档
// 无需导出任何运行时值
export {};