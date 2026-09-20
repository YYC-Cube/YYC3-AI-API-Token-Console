/**
 * types/ui-shared.ts — UI 共享层: 布局 / 组件 Props / 跟进 / 操作中心 / IDE / 文件 / 快捷键 / AI 决策 / 命令面板 / PWA / i18n / 服务闭环
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */
import type { ModelProviderId } from "./ai-provider";
import type { BaseSeverity } from "./core";

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
