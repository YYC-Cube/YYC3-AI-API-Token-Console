/**
 * types/ops-monitor.ts — 运维监控: 巡查 / 安全性能监控 / 闭环元信息 / 快捷键注册 / i18n 上下文 / SQL 模板 / 内联表格 / 告警规则 / 报表 / 最近文件 / 存储
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */
import type { LoopStage, Locale, LocaleInfo, DataFlowNodeType } from "./ui-shared";
import type { DatabaseType } from "./ai-provider";

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
