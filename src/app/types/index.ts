/**
 * types/index.ts
 * ===============
 * YYC³ 全局统一类型定义
 *
 * 设计原则：
 * - 同一业务概念只定义一次，全局引用
 * - 所有组件、Hooks、工具函数从此处 import 类型
 * - 字段命名遵循 camelCase (前端) / snake_case (DB Schema) 双标准
 *
 * ============================================================
 *  1. 用户与认证
 * ============================================================
 */

import type { ElementType } from "react";

/** 系统角色 */
export type UserRole = "admin" | "developer";

/** 认证用户 */
export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/** 认证会话 */
export interface AppSession {
  user: AppUser;
  token: string;
  expiresAt: number;
}

/** 认证上下文数据 */
export interface AuthContextValue {
  logout: () => void;
  userEmail: string;
  userRole: UserRole | "";
  isGhost?: boolean;
}

/**
 * ============================================================
 *  2. 节点与集群
 * ============================================================
 */

/** 节点运行状态 */
export type NodeStatusType = "active" | "warning" | "inactive" | "error";

/**
 * 实时节点数据（WebSocket 推送 / 前端展示）
 * 字段使用 camelCase 短名，适合高频 UI 渲染
 */
export interface NodeData {
  id: string;
  status: NodeStatusType;
  gpu: number;       // GPU 利用率 0-100
  mem: number;       // 内存利用率 0-100
  temp: number;      // 温度 °C
  model: string;     // 当前部署模型
  tasks: number;     // 活跃任务数
  uptime?: string;   // 运行时长（如 "48h"）
}

/**
 * 数据库节点状态（PostgreSQL Schema: infra.nodes）
 * 字段使用 snake_case，与 DB 列名一致
 */
export interface NodeStatusRecord {
  id: string;
  hostname: string;
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
  model_deployed: string;
  active_tasks: number;
  status: NodeStatusType;
}

/** NodeStatusRecord → NodeData 转换 */
export function toNodeData(record: NodeStatusRecord): NodeData {
  return {
    id: record.hostname,
    status: record.status,
    gpu: record.gpu_util,
    mem: record.mem_util,
    temp: record.temp_celsius,
    model: record.model_deployed,
    tasks: record.active_tasks,
  };
}

/**
 * ============================================================
 *  3. 模型与 Agent
 * ============================================================
 */

/** 模型层级 */
export type ModelTier = "primary" | "secondary" | "standby";

/** 模型配置（DB Schema: core.models） */
export interface Model {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  avg_latency_ms: number;
  throughput: number;
  created_at: string;
}

/** Agent 配置（DB Schema: core.agents） */
export interface Agent {
  id: string;
  name: string;
  name_cn: string;
  role: string;
  description: string;
  is_active: boolean;
}

/** 推理日志状态 */
export type InferenceStatus = "success" | "error" | "timeout";

/** 推理日志（DB Schema: telemetry.inference_logs） */
export interface InferenceLog {
  id: string;
  model_id: string;
  agent_id: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  status: InferenceStatus;
  created_at: string;
}

/** 模型性能统计（聚合查询结果） */
export interface ModelStats {
  avgLatency: number;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
}

/**
 * ============================================================
 *  4. WebSocket 通信
 * ============================================================
 */

/** WebSocket 连接状态 */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "simulated";

/**
 * RF-005: 统一基础严重级别类型
 * 所有模块的 severity 类型应基于此定义，确保跨模块类型兼容
 * 注意: PatternSeverity (low/medium/high/critical) 语义不同，保持独立
 */
export type BaseSeverity = "info" | "warning" | "error" | "critical";

/** 告警严重级别 — RF-005: BaseSeverity 别名 */
export type AlertLevel = BaseSeverity;

/** 告警通知数据 */
export interface AlertData {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  timestamp: number;
}

/** 吞吐量历史数据点 */
export interface ThroughputPoint {
  time: string;
  qps: number;
  latency: number;
  tokens: number;
}

/** 系统总览指标 */
export interface SystemStats {
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;
}

/** WebSocket 消息类型联合 */
export type WSMessage =
  | { type: "qps_update"; payload: { qps: number; trend: string } }
  | { type: "latency_update"; payload: { latency: number; trend: string } }
  | { type: "node_status"; payload: NodeData[] }
  | { type: "alert"; payload: AlertData }
  | { type: "throughput_history"; payload: ThroughputPoint[] }
  | { type: "system_stats"; payload: SystemStats }
  | { type: "heartbeat_ack" };

/** useWebSocketData Hook 返回的完整数据状态 */
export interface WebSocketDataState {
  // 连接状态
  connectionState: ConnectionState;
  reconnectCount: number;
  lastSyncTime: string;

  // 实时指标
  liveQPS: number;
  qpsTrend: string;
  liveLatency: number;
  latencyTrend: string;

  // 系统指标
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;

  // 节点数据
  nodes: NodeData[];

  // 吞吐量历史
  throughputHistory: ThroughputPoint[];

  // 告警列表
  alerts: AlertData[];

  // 操作方法
  manualReconnect: () => void;
  clearAlerts: () => void;
}

/**
 * ============================================================
 *  5. 网络配置
 * ============================================================
 */

/** 网络接口信息 */
export interface NetworkInterface {
  name: string;
  type: string;
  ip: string;
  status: "active" | "inactive" | "unknown";
}

/** 网络配置模式 */
export type NetworkMode = "auto" | "wifi" | "manual";

/** 网络配置项 */
export interface NetworkConfig {
  serverAddress: string;
  port: string;
  nasAddress: string;
  wsUrl: string;
  mode: NetworkMode;
}

/** 连接测试状态 */
export type TestStatus = "idle" | "testing" | "success" | "failed";

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  error?: string;
}

/** useNetworkConfig Hook 状态 */
export interface NetworkConfigState {
  config: NetworkConfig;
  interfaces: NetworkInterface[];
  localIP: string;
  testStatus: TestStatus;
  testLatency: number;
  testError: string;
  detecting: boolean;
}

/**
 * ============================================================
 *  6. 后台同步
 * ============================================================
 */

/** 同步项类型 */
export type SyncItemType = "config_update" | "audit_log" | "user_action";

/** 同步队列项 */
export interface SyncItem {
  id: string;
  type: SyncItemType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

/** 同步队列统计 */
export interface SyncQueueStats {
  total: number;
  pending: number;
  retrying: number;
  oldestTimestamp: number | null;
}

/** 同步处理结果 */
export interface SyncProcessResult {
  success: number;
  failed: number;
}

/**
 * ============================================================
 *  7. 错误处理
 * ============================================================
 */

/** 错误分类 */
export type ErrorCategory =
  | "NETWORK"
  | "PARSE"
  | "AUTH"
  | "RUNTIME"
  | "VALIDATION"
  | "STORAGE"
  | "UNKNOWN";

/** 错误严重级别 — RF-005: BaseSeverity 别名 */
export type ErrorSeverity = BaseSeverity;

/** 应用级错误 */
export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  detail?: string;
  source?: string;
  stack?: string;
  timestamp: number;
  resolved: boolean;
  userAction?: string;
}

/** 错误统计 */
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  unresolvedCount: number;
  lastErrorTime: number | null;
}

/**
 * ============================================================
 *  8. 响应式布局
 * ============================================================
 */

/** 响应式断点 */
export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

/** 视口状态 */
export interface ViewState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  isTouch: boolean;
}

/**
 * ============================================================
 *  9. UI 组件公共 Props
 * ============================================================
 */

/** ErrorBoundary 级别 */
export type ErrorBoundaryLevel = "page" | "module" | "widget";

/** AI 助理聊天消息 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: ModelProviderId;
  tokens?: { input: number; output: number };
}

/** AI 助理系统命令类别 */
export type CommandCategory = "cluster" | "model" | "data" | "security" | "monitor";

/** PWA beforeinstallprompt 事件接口 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * ============================================================
 *  10. 一键跟进系统 (Follow-up System)
 * ============================================================
 */

/** 告警 / 异常严重级别 — RF-005: BaseSeverity 别名 */
export type FollowUpSeverity = BaseSeverity;

/** 告警状态 */
export type FollowUpStatus = "active" | "investigating" | "resolved" | "ignored";

/** 操作链路条目类型 */
export type ChainEventType =
  | "model_load"
  | "task_start"
  | "alert_trigger"
  | "auto_action"
  | "manual_action"
  | "resolved"
  | "system_event";

/** 操作链路单条事件 */
export interface ChainEvent {
  id: string;
  time: string;           // HH:mm:ss
  type: ChainEventType;
  label: string;
  detail: string;
  isCurrent?: boolean;
}

/** 跟进卡片数据 */
export interface FollowUpItem {
  id: string;
  severity: FollowUpSeverity;
  title: string;
  source: string;         // 节点/模型/服务 来源
  metric?: string;        // 关键指标 e.g. "2,450ms > 2,000ms"
  status: FollowUpStatus;
  timestamp: number;
  chain: ChainEvent[];    // 关联操作链路
  relatedAlerts?: string[]; // 关联告警 ID
  assignee?: string;      // 当前负责人
  tags?: string[];        // 标签
}

/** 快速操作定 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;           // lucide icon name
  variant: "default" | "primary" | "warning" | "danger" | "success";
  action: () => void;
}

/**
 * ============================================================
 *  11. 操作中心 (Operation Center)
 * ============================================================
 */

/** 操作分类 */
export type OperationCategoryType =
  | "node"
  | "model"
  | "task"
  | "system"
  | "custom";

/** 操作分类元信息 */
export interface OperationCategoryMeta {
  key: OperationCategoryType;
  label: string;
  icon: string;
  color: string;
}

/** 操作状态 */
export type OperationStatus = "pending" | "running" | "success" | "failed" | "cancelled";

/** 操作项 */
export interface OperationItem {
  id: string;
  category: OperationCategoryType;
  label: string;
  description: string;
  icon: string;
  status: OperationStatus;
  dangerous?: boolean;
}

/** 操作模板 */
export interface OperationTemplateItem {
  id: string;
  name: string;
  description: string;
  category: OperationCategoryType;
  steps: string[];
  createdAt: number;
  lastUsed?: number;
}

/** 操作日志条目 */
export interface OperationLogEntry {
  id: string;
  timestamp: number;
  category: OperationCategoryType;
  action: string;
  user: string;
  status: OperationStatus;
  detail?: string;
  duration?: number;        // ms
}

/** 操作日志筛选 */
export type LogFilterType = "all" | "byCategory" | "byUser" | "search";

/**
 * ============================================================
 *  12. IDE 终端集成 (Terminal & IDE)
 * ============================================================
 */

/** 终端命令历史条目 */
export interface TerminalHistoryEntry {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  status: "success" | "error" | "info";
}

/** IDE 面板 Tab */
export type IDEPanelTab = "monitor" | "alerts" | "operations" | "logs";

/**
 * ============================================================
 *  13. 本地文件系统 (Local File System)
 * ============================================================
 */

/** 文件类型 */
export type FileItemType = "file" | "directory";

/** 文件条目 */
export interface FileItem {
  id: string;
  name: string;
  type: FileItemType;
  size?: number;          // bytes
  modifiedAt: number;
  path: string;           // 完整路径
  extension?: string;     // 文件扩展名
  children?: FileItem[];  // 子目录
}

/** 日志级别 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/** 日志条目 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
}

/** 报告类型 */
export type ReportType = "performance" | "health" | "security" | "custom";

/** 报告格式 */
export type ReportFormat = "json" | "markdown" | "csv";

/** 报告配置 */
export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateRange: "today" | "week" | "month" | "custom";
  includeCharts: boolean;
  includeRawData: boolean;
}

/** 报告结果 */
export interface ReportResult {
  id: string;
  config: ReportConfig;
  generatedAt: number;
  filename: string;
  size: number;
  previewContent: string;
}

/**
 * ============================================================
 *  14. 快捷键系统 (Keyboard Shortcuts)
 * ============================================================
 */

/** 快捷键绑定 */
export interface KeyboardShortcut {
  id: string;
  keys: string;          // 显示用 e.g. "⌘+Shift+O"
  description: string;
  category: string;
  action: () => void;
}

/**
 * ============================================================
 *  15. AI 辅助决策 (AI-Assisted Decision)
 * ============================================================
 */

/** 异常模式类型 */
export type AnomalyPatternType =
  | "latency_spike"
  | "memory_pressure"
  | "gpu_overheat"
  | "throughput_drop"
  | "error_burst"
  | "storage_near_full";

/** 异常模式严重级别 */
export type PatternSeverity = "low" | "medium" | "high" | "critical";

/** 检测到的异常模式 */
export interface DetectedPattern {
  id: string;
  type: AnomalyPatternType;
  severity: PatternSeverity;
  title: string;
  description: string;
  source: string;
  metric: string;
  detectedAt: number;
  occurrences: number;      // 近期出现次数
  trend: "rising" | "stable" | "declining";
}

/** AI 推荐操作 */
export interface AIRecommendation {
  id: string;
  patternId: string;        // 关联的异常模式
  action: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number;       // 0-100 置信度
  autoExecutable: boolean;  // 是否可自动执行
  applied?: boolean;
}

/** AI 分析结果 */
export interface AIAnalysisResult {
  patterns: DetectedPattern[];
  recommendations: AIRecommendation[];
  overallHealth: number;     // 0-100
  analysisTime: number;      // ms
  lastAnalyzedAt: number;
}

/**
 * ============================================================
 *  16. 命令面板 (Command Palette)
 * ============================================================
 */

/** 命令面板条目 */
export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

/**
 * ============================================================
 *  17. PWA & 离线支持 (PWA & Offline)
 * ============================================================
 */

/** Service Worker 状态 */
export type SWStatus = "idle" | "installing" | "waiting" | "active" | "error" | "unsupported";

/** 缓存条目 */
export interface CacheEntry {
  name: string;
  size: number;       // bytes
  count: number;      // 缓存请求数
  lastUpdated: number;
}

/** PWA 状态概览 */
export interface PWAState {
  swStatus: SWStatus;
  swVersion: string;
  isOnline: boolean;
  cacheEntries: CacheEntry[];
  totalCacheSize: number;
  offlineReady: boolean;
  lastCacheUpdate: number;
}

/**
 * ============================================================
 *  18. 国际化 (i18n)
 * ============================================================
 */

/** 支持的语言 */
export type Locale = "zh-CN" | "en-US";

/** 语言元信息 */
export interface LocaleInfo {
  code: Locale;
  label: string;
  nativeLabel: string;
}

/**
 * ============================================================
 *  19. 一站式服务闭环 (Service Loop)
 * ============================================================
 */

/** 闭环阶段 */
export type LoopStage =
  | "monitor"   // 监测层
  | "analyze"   // 分析层
  | "decide"    // 决策层
  | "execute"   // 执行层
  | "verify"    // 验证层
  | "optimize"; // 优化层

/** 阶段运行状态 */
export type StageStatus = "idle" | "running" | "completed" | "error" | "skipped";

/** 单阶段结果 */
export interface StageResult {
  stage: LoopStage;
  status: StageStatus;
  startedAt: number | null;
  completedAt: number | null;
  duration: number | null;    // ms
  summary: string;
  details: string[];
  metrics?: Record<string, number>;
}

/** 闭环运行记录 */
export interface LoopRun {
  id: string;
  startedAt: number;
  completedAt: number | null;
  trigger: "manual" | "auto" | "alert";
  currentStage: LoopStage;
  stages: StageResult[];
  overallStatus: StageStatus;
}

/** 数据流节点 */
export type DataFlowNodeType = "device" | "storage" | "dashboard" | "terminal";

/** 数据流连线 */
export interface DataFlowEdge {
  from: DataFlowNodeType;
  to: DataFlowNodeType;
  label: string;
  bandwidth: string;          // e.g. "2.4 GB/s"
  active: boolean;
}

/**
 * ============================================================
 *  20. AI 模型提供商 (Model Provider)
 * ============================================================
 */

/** 服务商标识 — 改为 string 以支持自定义服务商 */
export type ModelProviderId = string;

/** 服务商定义 */
export interface ModelProviderDef {
  id: ModelProviderId;
  label: string;
  baseUrl: string;
  authType: "bearer" | "api-key" | "none";
  models: string[];
  requiresApiKey: boolean;
  isLocal: boolean;           // Ollama = true
  isBuiltin?: boolean;        // 内置服务商标记（不可删除）
  isCustom?: boolean;         // 用户自定义服务商标记
  createdAt?: number;         // 创建时间
  updatedAt?: number;         // 更新时间
}

/** 已配置的模型实例 */
export interface ConfiguredModel {
  id: string;
  providerId: ModelProviderId;
  providerLabel: string;
  model: string;
  apiKey: string;             // 加密存储
  baseUrl: string;
  proxyUrl?: string;          // CORS 代理 URL (可选, 解决浏览器跨域限制)
  createdAt: number;
  lastUsed: number | null;
  status: "active" | "error" | "unchecked";
}

/** Ollama 本地模型标签 (来自 /api/tags) */
export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/** Ollama /api/tags 响应 */
export interface OllamaTagsResponse {
  models: OllamaModel[];
}

/**
 * ============================================================
 *  21. BigModel SDK 集成 (SDK Bridge)
 * ============================================================
 */

/** SDK 连接状态 */
export type SDKConnectionStatus = "idle" | "connecting" | "connected" | "error";

/** 聊天消息角色 */
export type ChatRole = "system" | "user" | "assistant";

/** 聊天会话 */
export interface ChatSession {
  id: string;
  title: string;
  modelId: string;           // ConfiguredModel.id
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/** SDK 能力枚举 */
export type SDKCapability =
  | "chat"
  | "chat-stream"
  | "file-upload"
  | "knowledge-base"
  | "image-gen"
  | "tts"
  | "stt"
  | "video-gen"
  | "code-gen";

/** SDK 使用统计 */
export interface SDKUsageStats {
  totalRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgLatencyMs: number;
  lastRequestAt: number | null;
  errorCount: number;
}

/** SDK 提供商能力映射 */
export interface SDKProviderCapabilities {
  providerId: ModelProviderId;
  capabilities: SDKCapability[];
}

/** SDK Chat Completion 请求 */
export interface SDKChatRequest {
  model: string;
  messages: { role: ChatRole; content: string }[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/** SDK Chat Completion 响应 */
export interface SDKChatResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

/**
 * ============================================================
 *  22. 宿主机文件系统 (Host File System)
 * ============================================================
 */

/** 宿主机文件条目 (真实文件系统) */
export interface HostFileEntry {
  id: string;
  name: string;
  kind: "file" | "directory";
  path: string;
  size?: number;
  lastModified?: number;
  mimeType?: string;
  /** File System Access API handle (运行时引用, 不持久化) */
  handle?: FileSystemHandle;
  children?: HostFileEntry[];
}

/** 文件版本快照 */
export interface FileVersion {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  content: string;
  size: number;
  savedAt: number;
  label?: string;
}

/** 宿主机文件系统状态 */
export interface HostFSState {
  supported: boolean;
  rootHandle: FileSystemDirectoryHandle | null;
  rootName: string;
  entries: HostFileEntry[];
  currentPath: string[];
  selectedEntry: HostFileEntry | null;
  editingContent: string | null;
  versions: FileVersion[];
  loading: boolean;
}

/**
 * ============================================================
 *  23. 本地数据库管理 (Database Manager)
 * ============================================================
 */

/** 数据库类型 */
export type DatabaseType = "postgresql" | "mysql" | "redis";

/** 数据库连接状态 */
export type DBConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/** 数据库连接配置 */
export interface DBConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  /** 加密存储, 前端仅做 mask 展示 */
  password: string;
  status: DBConnectionStatus;
  lastConnected: number | null;
  createdAt: number;
  color: string;
}

/** 数据库表信息 */
export interface DBTable {
  name: string;
  schema: string;
  rowCount: number;
  sizeBytes: number;
  columns: DBColumn[];
}

/** 数据库列定义 */
export interface DBColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
}

/** SQL 查询结果 */
export interface QueryResult {
  id: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  executedAt: number;
  error?: string;
}

/** 数据库备份记录 */
export interface DBBackup {
  id: string;
  connectionId: string;
  connectionName: string;
  type: DatabaseType;
  fileName: string;
  sizeBytes: number;
  createdAt: number;
  status: "completed" | "failed" | "in_progress";
}

/**
 * ============================================================
 *  24. 巡查模式 (Patrol Mode)
 * ============================================================
 */

/** 巡查运行状态 */
export type PatrolStatus = "idle" | "running" | "completed" | "failed";

/** 巡查项状态 */
export type CheckStatus = "pass" | "warning" | "critical" | "skipped";

/** 自动巡查间隔 (分钟) */
export type PatrolInterval = 5 | 10 | 15 | 30 | 60;

/** 巡查检查项 */
export interface PatrolCheckItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  value: string;
  threshold?: string;
  detail?: string;
}

/** 巡查结果 */
export interface PatrolResult {
  id: string;
  timestamp: number;
  duration: number;          // seconds
  status: PatrolStatus;
  healthScore: number;       // 0-100
  totalChecks: number;
  passCount: number;
  warningCount: number;
  criticalCount: number;
  skippedCount: number;
  checks: PatrolCheckItem[];
  triggeredBy: "manual" | "auto" | "scheduled";
}

/** 巡查计划 */
export interface PatrolSchedule {
  enabled: boolean;
  interval: PatrolInterval;  // minutes
  lastRun: number | null;
  nextRun: number | null;
}

/**
 * ============================================================
 *  25. 安全与性能监控 (Security Monitor)
 * ============================================================
 */

/** 安全监控标签页 */
export type SecurityTab = "security" | "performance" | "diagnostics" | "dataManagement";

/** 扫描状态 */
export type ScanStatus = "idle" | "scanning" | "complete";

/** 风险等级 */
export type RiskLevel = "safe" | "warning" | "danger";

/** Web Vitals 评级 */
export type VitalRating = "good" | "needs-improvement" | "poor";

/** CSP 检测结果 */
export interface CSPResult {
  enabled: boolean;
  directives: { name: string; value: string; status: "pass" | "warn" | "fail" }[];
  inlineBlocked: boolean;
  recommendations: string[];
  score: number;
}

/** Cookie 检查结果 */
export interface CookieResult {
  count: number;
  checks: { name: string; status: "pass" | "warn" | "fail"; detail: string }[];
  score: number;
}

/** 敏感数据检测结果 */
export interface SensitiveDataResult {
  localStorage: { key: string; risk: RiskLevel; detail: string }[];
  sessionStorage: { key: string; risk: RiskLevel; detail: string }[];
  consoleRisks: number;
  totalRisks: number;
  score: number;
}

/** 资源加载条目 */
export interface ResourceEntry {
  name: string;
  type: string;
  size: number;
  loadTime: number;
  cached: boolean;
}

/** 性能分析结果 */
export interface PerformanceResult {
  resources: ResourceEntry[];
  totalResources: number;
  totalSize: number;
  pageLoadTime: number;
  imgOptimizations: string[];
  jsBundles: { name: string; size: number; gzipped: number }[];
  lazyLoadSavings: number;
}

/** 内存分析结果 */
export interface MemoryResult {
  usedJSHeap: number;
  totalJSHeap: number;
  jsHeapLimit: number;
  listeners: number;
  timers: number;
  domNodes: number;
  leakRisk: RiskLevel;
  trend: number[];
}

/** Web Vitals 指标 */
export interface WebVital {
  name: string;
  value: number;
  unit: string;
  rating: VitalRating;
  target: string;
}

/** 设备信息 */
export interface DeviceInfo {
  cpuCores: number;
  memory: number | null;
  screen: string;
  pixelRatio: number;
  touchSupport: boolean;
  gpu: string;
  platform: string;
  userAgent: string;
}

/** 网络信息 */
export interface NetworkInfo {
  type: string;
  downlink: number;
  rtt: number;
  effectiveType: string;
  isStable: boolean;
  saveData: boolean;
}

/** 浏览器特性支持 */
export interface BrowserFeature {
  name: string;
  supported: boolean;
  polyfillNeeded: boolean;
}

/** 浏览器信息 */
export interface BrowserInfo {
  name: string;
  version: string;
  features: BrowserFeature[];
  upgradeNeeded: boolean;
}

/** 存储使用情况 */
export interface StorageUsage {
  localStorage: number;
  sessionStorage: number;
  indexedDB: number;
  cacheAPI: number;
  total: number;
}

/** 数据管理状态 */
export interface DataManagementState {
  storage: StorageUsage;
  lastBackup: number | null;
  syncEnabled: boolean;
  expiredItems: number;
  cacheSize: number;
}

/** 安全监控完整状态 */
export interface SecurityMonitorState {
  activeTab: SecurityTab;
  scanStatus: ScanStatus;
  lastScanTime: number | null;
  overallScore: number;
  overallRisk: RiskLevel;
  csp: CSPResult | null;
  cookie: CookieResult | null;
  sensitive: SensitiveDataResult | null;
  performance: PerformanceResult | null;
  memory: MemoryResult | null;
  vitals: WebVital[];
  device: DeviceInfo | null;
  network: NetworkInfo | null;
  browser: BrowserInfo | null;
  dataManagement: DataManagementState | null;
}

/**
 * ============================================================
 *  26. 服务闭环元信息 (Service Loop Meta)
 * ============================================================
 */

/** 闭环阶段元信息 */
export interface StageMeta {
  key: LoopStage;
  label: string;
  icon: string;
  color: string;
  description: string;
}

/** 数据流可视化节点 */
export interface DataFlowNode {
  type: DataFlowNodeType;
  label: string;
  sublabel: string;
  color: string;
}

/**
 * ============================================================
 *  27. 快捷键注册 (Registered Shortcuts)
 * ============================================================
 */

/** 已注册快捷键 (用于帮助面板展示) */
export interface RegisteredShortcut {
  id: string;
  keys: string;
  description: string;
  category: string;
}

/**
 * ============================================================
 *  28. 国际化上下文 (I18n Context)
 * ============================================================
 */

/** 国际化上下文值 */
export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locales: LocaleInfo[];
}

/**
 * ============================================================
 *  29. SQL 模板 (SQL Templates)
 * ============================================================
 */

/** SQL 快速模板 */
export interface SQLTemplate {
  id: string;
  label: string;
  sql: string;
  dbType: DatabaseType | "all";
  category: string;
}

/**
 * ============================================================
 *  30. 内联编辑表格 (Inline Editable Table)
 * ============================================================
 */

/** 变更操作类型 */
export type ChangeType = "update" | "delete";

/** 单元格编辑变更记录 */
export interface EditableCellChange {
  rowIndex: number;
  column: string;
  oldValue: unknown;
  newValue: string;
  /** 操作类型 */
  type: ChangeType;
  /** 生成的 SQL (UPDATE / DELETE) */
  sql?: string;
  /** 生成的 Rollback SQL (UPDATE 反向 / INSERT 复原) */
  rollbackSQL?: string;
}

/** 已提交的变更记录 (用于 Undo, IndexedDB 持久化) */
export interface CommittedChange {
  id: string;
  tableName: string;
  changes: EditableCellChange[];
  committedAt: number;
  /** 是否整批已回滚 */
  rolledBack: boolean;
  /** 已回滚的单项变更索引 (行级 Undo) */
  rolledBackIndices?: number[];
}

/**
 * ============================================================
 *  31. 智能告警规则 (Smart Alert Rules)
 * ============================================================
 */

/** 告警严重级别 (规则引擎) — RF-005: 补充 'error' 级别，与 BaseSeverity 对齐 */
export type AlertSeverity = "info" | "warning" | "error" | "critical";

/** 告警指标类型 */
export type AlertMetric = "cpu" | "gpu" | "memory" | "latency" | "disk" | "network" | "error_rate" | "throughput";

/** 告警比较条件 */
export type AlertCondition = "gt" | "lt" | "gte" | "lte" | "eq" | "neq";

/** 升级等级 */
export type EscalationLevel = 1 | 2 | 3;

/** 告警阈值配置 */
export interface AlertThreshold {
  metric: AlertMetric;
  condition: AlertCondition;
  value: number;
  unit: string;
  duration: number; // seconds, must sustain for this duration
}

/** 升级策略 */
export interface EscalationPolicy {
  level: EscalationLevel;
  delayMinutes: number;
  notifyChannels: string[];
  autoAction?: string;
}

/** 告警规则 */
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: AlertSeverity;
  thresholds: AlertThreshold[];
  aggregation: {
    enabled: boolean;
    windowMinutes: number;
    maxGroupSize: number;
  };
  deduplication: {
    enabled: boolean;
    cooldownMinutes: number;
  };
  escalation: EscalationPolicy[];
  targets: string[]; // node IDs
  createdAt: number;
  lastTriggered: number | null;
  triggerCount: number;
}

/** 告警事件 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  metric: AlertMetric;
  currentValue: number;
  threshold: number;
  nodeId: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  escalationLevel: EscalationLevel;
}

/** 告警规则 Hook 选项 */
export interface AlertRulesOptions {
  liveNodes?: { id: string; gpu: number; mem: number; temp: number; status: string }[];
  liveLatency?: number;
}

/**
 * ============================================================
 *  32. 报表导出 (Report Exporter)
 * ============================================================
 */

/** 导出报告类型 (区别于 Section 13 的 ReportType) */
export type ExportReportType = "performance" | "security" | "audit" | "comprehensive";

/** 导出格式 */
export type ExportFormat = "json" | "csv" | "print";

/** 时间范围 */
export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

/** 报表指标 */
export interface ReportMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  change: string;
}

/** 性能快照 */
export interface PerformanceSnapshot {
  timestamp: number;
  cpuUsage: number;
  gpuUsage: number;
  memoryUsage: number;
  latencyP50: number;
  latencyP99: number;
  throughput: number;
  errorRate: number;
}

/** 安全快照 */
export interface SecuritySnapshot {
  timestamp: number;
  cspScore: number;
  cookieScore: number;
  sensitiveScore: number;
  overallScore: number;
  activeThreats: number;
}

/** 导出报告数据 */
export interface ReportData {
  id: string;
  type: ExportReportType;
  title: string;
  generatedAt: number;
  timeRange: { start: number; end: number; label: string };
  summary: ReportMetric[];
  performanceHistory: PerformanceSnapshot[];
  securityHistory: SecuritySnapshot[];
  recommendations: string[];
  nodeBreakdown: { nodeId: string; avgCpu: number; avgGpu: number; avgLatency: number; errorRate: number }[];
}

/** 报告历史条目 (可持久化) */
export interface ReportHistoryEntry {
  id: string;
  type: ExportReportType;
  time: number;
  range: string;
}

/**
 * ============================================================
 *  33. AI 辅助诊断 (AI Diagnostics)
 * ============================================================
 */

/** 诊断状态 */
export type DiagnosticStatus = "idle" | "analyzing" | "complete" | "error";

/** 模式类型 */
export type PatternType = "recurring" | "gradual" | "spike" | "correlation" | "seasonal";

/** 置信度等级 */
export type ConfidenceLevel = "high" | "medium" | "low";

/** 操作优先级 */
export type ActionPriority = "urgent" | "recommended" | "optional";

/** 诊断检测模式 (区别于 Section 15 的 DetectedPattern) */
export interface DiagnosticPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  affectedNodes: string[];
  detectedAt: number;
  dataPoints: number[];
  metric: string;
  /** RF-005: 使用 BaseSeverity 子集 */
  severity: "critical" | "warning" | "error" | "info";
}

/** 异常记录 */
export interface AnomalyRecord {
  id: string;
  timestamp: number;
  nodeId: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  rootCause: string;
  relatedPatternId?: string;
}

/** AI 建议操作 */
export interface SuggestedAction {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  estimatedImpact: string;
  confidence: ConfidenceLevel;
  steps: string[];
  autoExecutable: boolean;
  relatedPatternId: string;
}

/** 预测性预报 */
export interface PredictiveForecast {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  trend: "up" | "down" | "stable";
  riskLevel: "safe" | "warning" | "danger";
  explanation: string;
}

/** 诊断会话 */
export interface DiagnosticSession {
  id: string;
  startedAt: number;
  completedAt: number | null;
  status: DiagnosticStatus;
  patterns: DiagnosticPattern[];
  anomalies: AnomalyRecord[];
  actions: SuggestedAction[];
  forecasts: PredictiveForecast[];
  summary: string;
}

/** WebSocket 节点快照 (诊断用) */
export interface WsNodeSnapshot {
  id: string;
  gpu: number;
  mem: number;
  temp: number;
  status: string;
}

/** 诊断选项 */
export interface DiagnosticsOptions {
  /** Live node data from useWebSocketData */
  liveNodes?: WsNodeSnapshot[];
  /** Live QPS value */
  liveQPS?: number;
  /** Live latency value */
  liveLatency?: number;
}

/** 诊断历史条目 */
export interface DiagnosticHistoryEntry {
  id: string;
  time: number;
  patterns: number;
  actions: number;
}

/** 诊断视图类型 */
export type DiagnosticView = "patterns" | "anomalies" | "actions" | "forecasts";

/**
 * ============================================================
 *  34. 最近文件 (Recent Files)
 * ============================================================
 */

/** 最近访问文件 */
export interface RecentFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  accessedAt: number;
}

/**
 * ============================================================
 *  35. 存储基础设施 (Storage Infrastructure)
 * ============================================================
 */

/** IndexedDB store 名称
 *  RF-004: 新增 store 时需同步更新 yyc3-storage.ts 中的 ALL_STORES 常量数组
 */
export type StoreName =
  | "alertRules"
  | "alertEvents"
  | "patrolHistory"
  | "loopHistory"
  | "operationTemplates"
  | "operationLogs"
  | "diagnosisHistory"
  | "reports"
  | "errorLog"
  | "dashboardSnapshots"
  | "fileVersions"
  | "dbConnections"
  | "queryHistory"
  | "committedChanges";

/** 存储变更事件 (BroadcastChannel) */
export interface StorageChangeEvent {
  store: StoreName;
  action: string;
  key: string;
  timestamp: number;
}

/**
 * ============================================================
 *  36. API 端点配置 (API Configuration)
 * ============================================================
 */

/** 后端 API 端点配置 */
export interface APIEndpoints {
  /** 文件系统 API 基地址 */
  fsBase: string;
  /** 数据库管理 API 基地址 */
  dbBase: string;
  /** WebSocket 地址 */
  wsEndpoint: string;
  /** AI 推理 API 基地址 */
  aiBase: string;
  /** 集群管理 API 基地址 */
  clusterBase: string;
  /** 是否启用后端 API (false = 纯前端 Mock) */
  enableBackend: boolean;
  /** API 请求超时 (ms) */
  timeout: number;
  /** 最大重试次数 (指数退避, 0 = 不重试) */
  maxRetries: number;
}

/**
 * ============================================================
 *  37. 设计系统 (Design System)
 * ============================================================
 */

/** 色彩 Token */
export interface ColorToken {
  name: string;
  value: string;
  cssVar: string;
  usage: string;
}

/** 字体排版 Token */
export interface TypographyToken {
  name: string;
  family: string;
  weight: string;
  size: string;
  usage: string;
  sample: string;
}

/** 间距 Token */
export interface SpacingToken {
  name: string;
  value: string;
  px: number;
  usage: string;
}

/** 阴影 Token */
export interface ShadowToken {
  name: string;
  value: string;
  usage: string;
}

/** 动效 Token */
export interface AnimationToken {
  name: string;
  duration: string;
  easing: string;
  usage: string;
}

/** 状态定义 */
export interface StatusDef {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: ElementType;
  description: string;
}

/** 组件注册表条目 */
export interface ComponentEntry {
  name: string;
  tier: "atom" | "molecule" | "organism" | "template";
  path: string;
  description: string;
  props: string[];
  states: string[];
  responsive: boolean;
}

/** 交互规范 */
export interface InteractionSpec {
  name: string;
  trigger: string;
  duration: string;
  effect: string;
  feedback: string;
}

/** 阶段审核状态 */
export type ChapterStatus = "completed" | "partial" | "pending" | "deferred";

/** 章节审核 */
export interface ChapterReview {
  chapter: number;
  title: string;
  status: ChapterStatus;
  progress: number;        // 0-100
  deliverables: string[];
  notes: string;
}

/** 项目统计 */
export interface ProjectStats {
  label: string;
  value: string | number;
  color: string;
}

/** 验收清单项 */
export interface AcceptanceItem {
  category: string;
  items: { label: string; passed: boolean }[];
}