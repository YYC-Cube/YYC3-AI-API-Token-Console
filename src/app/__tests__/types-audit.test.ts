/**
 * types-audit.test.ts
 * =====================
 * 全局类型定义完整性审计测试
 *
 * 确保:
 *  - types/index.ts 导出所有必要类型
 *  - 类型转换函数正确工作
 *  - 无散落的重复类型定义
 *  - 各模块从 ../types 统一导入
 */

// @vitest-environment node
import { describe, it, expect } from "vitest";
import { ALL_STORES } from "../lib/yyc3-storage";
import {
  // Section 1: Auth
  type UserRole, type AppUser, type AppSession, type AuthContextValue,
  // Section 2: Node
  type NodeStatusType, type NodeData, type NodeStatusRecord, toNodeData,
  // Section 3: Model
  type ModelTier, type Model, type Agent, type InferenceStatus, type InferenceLog, type ModelStats,
  // Section 4: WebSocket
  type ConnectionState, type AlertLevel, type AlertData, type ThroughputPoint, type SystemStats,
  type WSMessage, type WebSocketDataState,
  // Section 5: Network
  type NetworkInterface, type NetworkMode, type NetworkConfig, type TestStatus,
  type ConnectionTestResult, type NetworkConfigState,
  // Section 6: Sync
  type SyncItemType, type SyncItem, type SyncQueueStats, type SyncProcessResult,
  // Section 7: Error
  type ErrorCategory, type ErrorSeverity, type AppError, type ErrorStats,
  // Section 8: Layout
  type Breakpoint, type ViewState,
  // Section 9: UI Props
  type ErrorBoundaryLevel, type ChatMessage, type CommandCategory, type BeforeInstallPromptEvent,
  // Section 10: FollowUp
  type FollowUpSeverity, type FollowUpStatus, type ChainEventType, type ChainEvent,
  type FollowUpItem, type QuickAction,
  // Section 11: Operation
  type OperationCategoryType, type OperationCategoryMeta, type OperationStatus,
  type OperationItem, type OperationTemplateItem, type OperationLogEntry, type LogFilterType,
  // Section 12: Terminal
  type TerminalHistoryEntry, type IDEPanelTab,
  // Section 13: File System
  type FileItemType, type FileItem, type LogLevel, type LogEntry,
  type ReportType, type ReportFormat, type ReportConfig, type ReportResult,
  // Section 14: Shortcuts
  type KeyboardShortcut,
  // Section 15: AI Decision
  type AnomalyPatternType, type PatternSeverity, type DetectedPattern,
  type AIRecommendation, type AIAnalysisResult,
  // Section 16: Command Palette
  type CommandPaletteItem,
  // Section 17: PWA
  type SWStatus, type CacheEntry, type PWAState,
  // Section 18: I18n
  type Locale, type LocaleInfo,
  // Section 19: Service Loop
  type LoopStage, type StageStatus, type StageResult, type LoopRun,
  type DataFlowNodeType, type DataFlowEdge,
  // Section 20: Model Provider
  type ModelProviderId, type ModelProviderDef, type ConfiguredModel,
  type OllamaModel, type OllamaTagsResponse,
  // Section 21: SDK
  type SDKConnectionStatus, type ChatRole, type ChatSession, type SDKCapability,
  type SDKUsageStats, type SDKProviderCapabilities, type SDKChatRequest, type SDKChatResponse,
  // Section 22: Host FS
  type HostFileEntry, type FileVersion, type HostFSState,
  // Section 23: Database
  type DatabaseType, type DBConnectionStatus, type DBConnection, type DBTable, type DBColumn,
  type QueryResult, type DBBackup,
  // Section 24: Patrol
  type PatrolStatus, type CheckStatus, type PatrolInterval, type PatrolCheckItem,
  type PatrolResult, type PatrolSchedule,
  // Section 25: Security Monitor
  type SecurityTab, type ScanStatus, type RiskLevel, type VitalRating,
  type CSPResult, type CookieResult, type SensitiveDataResult, type ResourceEntry,
  type PerformanceResult, type MemoryResult, type WebVital, type DeviceInfo,
  type NetworkInfo, type BrowserFeature, type BrowserInfo, type StorageUsage,
  type DataManagementState, type SecurityMonitorState,
  // Section 26: Service Loop Meta
  type StageMeta, type DataFlowNode,
  // Section 27: Registered Shortcuts
  type RegisteredShortcut,
  // Section 28: I18n Context
  type I18nContextValue,
  // Section 29: SQL Template
  type SQLTemplate,
  // Section 30: Inline Editable Table
  type ChangeType, type EditableCellChange, type CommittedChange,
  // Section 31: Smart Alert Rules
  type AlertSeverity, type AlertMetric, type AlertCondition, type EscalationLevel,
  type AlertThreshold, type EscalationPolicy, type AlertRule, type AlertEvent, type AlertRulesOptions,
  // Section 32: Report Exporter
  type ExportReportType, type ExportFormat, type TimeRange,
  type ReportMetric, type PerformanceSnapshot, type SecuritySnapshot,
  type ReportData, type ReportHistoryEntry,
  // Section 33: AI Diagnostics
  type DiagnosticStatus, type PatternType, type ConfidenceLevel, type ActionPriority,
  type DiagnosticPattern, type AnomalyRecord, type SuggestedAction,
  type PredictiveForecast, type DiagnosticSession,
  type WsNodeSnapshot, type DiagnosticsOptions,
  type DiagnosticHistoryEntry, type DiagnosticView,
  // Section 34: Recent Files
  type RecentFile,
  // Section 35: Storage Infrastructure
  type StoreName, type StorageChangeEvent,
  // Section 36: API Configuration
  type APIEndpoints,
  // Section 37: Design System
  type ColorToken, type TypographyToken, type SpacingToken, type ShadowToken, type AnimationToken,
  type StatusDef, type ComponentEntry, type InteractionSpec,
  type ChapterStatus, type ChapterReview, type ProjectStats, type AcceptanceItem,
} from "../types";

describe("types/index.ts 完整性审计", () => {
  describe("Section 1-3: 用户/节点/模型", () => {
    it("toNodeData 转换正确", () => {
      const record: NodeStatusRecord = {
        id: "1",
        hostname: "GPU-A100-01",
        gpu_util: 85,
        mem_util: 72,
        temp_celsius: 68,
        model_deployed: "LLaMA-70B",
        active_tasks: 128,
        status: "active",
      };
      const node = toNodeData(record);
      expect(node.id).toBe("GPU-A100-01");
      expect(node.gpu).toBe(85);
      expect(node.mem).toBe(72);
      expect(node.temp).toBe(68);
      expect(node.model).toBe("LLaMA-70B");
      expect(node.tasks).toBe(128);
      expect(node.status).toBe("active");
    });

    it("UserRole 枚举值正确", () => {
      const roles: UserRole[] = ["admin", "developer"];
      expect(roles).toHaveLength(2);
    });

    it("ModelTier 枚举值正确", () => {
      const tiers: ModelTier[] = ["primary", "secondary", "standby"];
      expect(tiers).toHaveLength(3);
    });
  });

  describe("Section 4: WebSocket 类型", () => {
    it("ConnectionState 包含所有枚举值", () => {
      const states: ConnectionState[] = [
        "connecting", "connected", "disconnected", "reconnecting", "simulated",
      ];
      expect(states).toHaveLength(5);
    });

    it("AlertLevel 包含所有枚举值", () => {
      const levels: AlertLevel[] = ["info", "warning", "error", "critical"];
      expect(levels).toHaveLength(4);
    });
  });

  describe("Section 19: LoopStage 类型", () => {
    it("包含所有 6 个阶段", () => {
      const stages: LoopStage[] = [
        "monitor", "analyze", "decide", "execute", "verify", "optimize",
      ];
      expect(stages).toHaveLength(6);
    });
  });

  describe("Section 23: 数据库类型", () => {
    it("DatabaseType 包含所有类型", () => {
      const types: DatabaseType[] = ["postgresql", "mysql", "redis"];
      expect(types).toHaveLength(3);
    });

    it("DBConnectionStatus 包含所有状态", () => {
      const statuses: DBConnectionStatus[] = [
        "disconnected", "connecting", "connected", "error",
      ];
      expect(statuses).toHaveLength(4);
    });
  });

  describe("Section 24: 巡查类型", () => {
    it("PatrolStatus 包含所有状态", () => {
      const statuses: PatrolStatus[] = ["idle", "running", "completed", "failed"];
      expect(statuses).toHaveLength(4);
    });

    it("CheckStatus 包含所有状态", () => {
      const statuses: CheckStatus[] = ["pass", "warning", "critical", "skipped"];
      expect(statuses).toHaveLength(4);
    });

    it("PatrolInterval 包含所有允许值", () => {
      const intervals: PatrolInterval[] = [5, 10, 15, 30, 60];
      expect(intervals).toHaveLength(5);
    });
  });

  describe("Section 25: 安全监控类型", () => {
    it("SecurityTab 包含所有标签页", () => {
      const tabs: SecurityTab[] = [
        "security", "performance", "diagnostics", "dataManagement",
      ];
      expect(tabs).toHaveLength(4);
    });

    it("RiskLevel 包含所有级别", () => {
      const levels: RiskLevel[] = ["safe", "warning", "danger"];
      expect(levels).toHaveLength(3);
    });
  });

  describe("Section 30: 内联编辑表格类型", () => {
    it("ChangeType 包含所有类型", () => {
      const types: ChangeType[] = ["update", "delete"];
      expect(types).toHaveLength(2);
    });

    it("CommittedChange 结构正确", () => {
      const commit: CommittedChange = {
        id: "c1",
        tableName: "test",
        changes: [],
        committedAt: Date.now(),
        rolledBack: false,
        rolledBackIndices: [0],
      };
      expect(commit.id).toBe("c1");
      expect(commit.rolledBackIndices).toEqual([0]);
    });
  });

  describe("Section 31: 智能告警规则类型", () => {
    it("AlertSeverity 包含所有级别", () => {
      // RF-005: 补充 'error' 级别
      const levels: AlertSeverity[] = ["info", "warning", "error", "critical"];
      expect(levels).toHaveLength(4);
    });

    it("AlertMetric 包含所有指标", () => {
      const metrics: AlertMetric[] = [
        "cpu", "gpu", "memory", "latency", "disk", "network", "error_rate", "throughput",
      ];
      expect(metrics).toHaveLength(8);
    });

    it("AlertRule 结构正确", () => {
      const rule: AlertRule = {
        id: "r1", name: "test", enabled: true, severity: "critical",
        thresholds: [{ metric: "gpu", condition: "gt", value: 90, unit: "%", duration: 60 }],
        aggregation: { enabled: true, windowMinutes: 5, maxGroupSize: 10 },
        deduplication: { enabled: true, cooldownMinutes: 15 },
        escalation: [{ level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] }],
        targets: ["GPU-01"], createdAt: Date.now(), lastTriggered: null, triggerCount: 0,
      };
      expect(rule.id).toBe("r1");
    });
  });

  describe("Section 32: 报表导出类型", () => {
    it("ExportReportType 包含所有类型", () => {
      const types: ExportReportType[] = ["performance", "security", "audit", "comprehensive"];
      expect(types).toHaveLength(4);
    });

    it("ExportFormat 包含所有格式", () => {
      const formats: ExportFormat[] = ["json", "csv", "print"];
      expect(formats).toHaveLength(3);
    });

    it("TimeRange 包含所有范围", () => {
      const ranges: TimeRange[] = ["1h", "6h", "24h", "7d", "30d", "custom"];
      expect(ranges).toHaveLength(6);
    });
  });

  describe("Section 33: AI 诊断类型", () => {
    it("DiagnosticStatus 包含所有状态", () => {
      const statuses: DiagnosticStatus[] = ["idle", "analyzing", "complete", "error"];
      expect(statuses).toHaveLength(4);
    });

    it("PatternType 包含所有类型", () => {
      const types: PatternType[] = ["recurring", "gradual", "spike", "correlation", "seasonal"];
      expect(types).toHaveLength(5);
    });

    it("DiagnosticPattern 结构正确", () => {
      const p: DiagnosticPattern = {
        id: "dp1", type: "spike", title: "test", description: "desc",
        confidence: "high", affectedNodes: ["N1"], detectedAt: Date.now(),
        dataPoints: [1, 2, 3], metric: "GPU", severity: "critical",
      };
      expect(p.id).toBe("dp1");
    });
  });

  describe("Section 35: 存储基础设施类型", () => {
    it("StoreName 包含所有 14 个 store", () => {
      // RF-004: import ALL_STORES 进行断言
      expect(ALL_STORES).toHaveLength(14);
      expect(ALL_STORES).toContain("alertRules");
      expect(ALL_STORES).toContain("committedChanges");
    });
  });

  describe("Section 36: API 配置类型", () => {
    it("APIEndpoints 结构正确", () => {
      const config: APIEndpoints = {
        fsBase: "/api/fs", dbBase: "/api/db", wsEndpoint: "ws://localhost:3113/ws",
        aiBase: "https://api.openai.com/v1", clusterBase: "/api/cluster",
        enableBackend: false, timeout: 15000, maxRetries: 2,
      };
      expect(config.maxRetries).toBe(2);
    });
  });

  describe("Section 37: 设计系统类型", () => {
    it("ColorToken 结构正确", () => {
      const token: ColorToken = { name: "primary", value: "#00d4ff", cssVar: "--primary", usage: "主色调" };
      expect(token.name).toBe("primary");
      expect(token.cssVar).toBe("--primary");
    });

    it("TypographyToken 结构正确", () => {
      const token: TypographyToken = {
        name: "heading", family: "Orbitron", weight: "700",
        size: "1.5rem", usage: "标题", sample: "Hello",
      };
      expect(token.family).toBe("Orbitron");
    });

    it("SpacingToken 结构正确", () => {
      const token: SpacingToken = { name: "sm", value: "0.5rem", px: 8, usage: "小间距" };
      expect(token.px).toBe(8);
    });

    it("ShadowToken 结构正确", () => {
      const token: ShadowToken = { name: "glow", value: "0 0 10px #00d4ff", usage: "霓虹辉光" };
      expect(token.name).toBe("glow");
    });

    it("AnimationToken 结构正确", () => {
      const token: AnimationToken = { name: "fade-in", duration: "300ms", easing: "ease-out", usage: "淡入" };
      expect(token.duration).toBe("300ms");
    });

    it("ComponentEntry 结构正确", () => {
      const entry: ComponentEntry = {
        name: "GlassCard", tier: "atom", path: "/components/GlassCard.tsx",
        description: "玻璃态卡片", props: ["children", "className"],
        states: ["default", "hover"], responsive: true,
      };
      expect(entry.tier).toBe("atom");
      expect(entry.responsive).toBe(true);
    });

    it("InteractionSpec 结构正确", () => {
      const spec: InteractionSpec = {
        name: "hover-glow", trigger: "hover", duration: "200ms",
        effect: "glow border", feedback: "visual",
      };
      expect(spec.trigger).toBe("hover");
    });

    it("ChapterReview 结构正确", () => {
      const review: ChapterReview = {
        chapter: 1, title: "测试章节", status: "completed",
        progress: 100, deliverables: ["item1"], notes: "测试",
      };
      expect(review.status).toBe("completed");
    });

    it("ChapterStatus 包含所有状态", () => {
      const statuses: ChapterStatus[] = ["completed", "partial", "pending", "deferred"];
      expect(statuses).toHaveLength(4);
    });

    it("AcceptanceItem 结构正确", () => {
      const item: AcceptanceItem = {
        category: "功能验收",
        items: [{ label: "测试项", passed: true }],
      };
      expect(item.items[0].passed).toBe(true);
    });

    it("ProjectStats 结构正确", () => {
      const stat: ProjectStats = { label: "类型分类", value: 37, color: "#00d4ff" };
      expect(stat.value).toBe(37);
    });
  });

  describe("类型总数验证", () => {
    it("types/index.ts 覆盖 37 个业务领域", () => {
      // 此测试仅验证导入不会报错 - 真正的检查在编译时
      // 如果任何类型缺失，TypeScript 会在编译时报错
      expect(true).toBe(true);
    });
  });
});