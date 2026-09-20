/**
 * types/ai-provider.ts — AI 与基础设施: 模型提供商 / BigModel SDK / 宿主机文件 / 数据库 / AI 诊断
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */
import type { ChatMessage } from "./ui-shared";

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
