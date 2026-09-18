/**
 * RefactoringReport.tsx
 * =====================
 * YYC3 深度代码分析 & 重构方案报告
 *
 * 基于全量代码审计生成的可交互式报告：
 *  - 识别不稳定板块、冲突、潜在影响
 *  - 按优先级分级呈现重构方案
 *  - 赛博朋克风格 UI
 */

import React, { useState, useMemo } from "react";
import { GlassCard } from "./GlassCard";
import {
  AlertTriangle, ShieldAlert, Zap, Database, Globe, Layers, Code,
  ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle,
  GitBranch, FileWarning, Repeat, ArrowRightLeft, Bug, Wrench,
  Target, Clock, TrendingUp, BarChart3,
} from "lucide-react";

// ============================================================
//  Data Types
// ============================================================

type Severity = "critical" | "high" | "medium" | "low";
type Category = "conflict" | "instability" | "duplication" | "design-debt" | "missing-feature";
type Status = "open" | "refactoring" | "resolved";

interface Issue {
  id: string;
  title: string;
  titleCn: string;
  severity: Severity;
  category: Category;
  affectedFiles: string[];
  description: string;
  impact: string;
  rootCause: string;
  refactorPlan: string[];
  effort: "S" | "M" | "L" | "XL";
  priority: number; // 1 = highest
  status: Status;
}

// ============================================================
//  Analysis Data
// ============================================================

const ISSUES: Issue[] = [
  {
    id: "RF-001",
    title: "WebSocket URL Triple-Source Conflict",
    titleCn: "WebSocket URL 三源冲突",
    severity: "critical",
    category: "conflict",
    affectedFiles: [
      "hooks/useWebSocketData.ts (WS_URL hardcoded)",
      "lib/api-config.ts (wsEndpoint field)",
      "lib/network-utils.ts (DEFAULT_NETWORK_CONFIG.wsUrl)",
    ],
    description:
      "WebSocket 连接地址在三个独立模块中分别硬编码了不同的值：useWebSocketData 使用 ws://localhost:3113/ws，network-utils 使用 ws://192.168.3.45:3113/ws，api-config 使用 ws://localhost:3113/ws 但提供了用户可编辑的持久化配置。三者互不关联，修改任意一处对其他无效。",
    impact:
      "用户在 SystemSettings 中修改 WebSocket 地址后，实际连接仍使用 useWebSocketData 中的硬编码值，配置变更完全无效。部署到生产环境（192.168.3.x）时需手动改源码。",
    rootCause:
      "WebSocket URL 没有单一数据源（Single Source of Truth），三个模块各自独立演化，未接入统一配置服务。",
    refactorPlan: [
      "将 useWebSocketData.ts 中的 WS_URL 改为从 getAPIConfig().wsEndpoint 动态读取",
      "在 useWebSocketData Hook 内监听 onAPIConfigChange，配置变更时触发重连",
      "移除 network-utils.ts 中的 wsUrl 字段，统一使用 api-config 作为唯一数据源",
      "usePatrol / useTerminal 中的硬编码 ws:// 引用改为读取 getAPIConfig()",
      "补充集成测试：修改 apiConfig → 验证 WebSocket 重连到新地址",
    ],
    effort: "M",
    priority: 1,
    status: "resolved",
  },
  {
    id: "RF-002",
    title: "Error Log Dual-Path Storage Split",
    titleCn: "错误日志双路径存储分裂",
    severity: "high",
    category: "instability",
    affectedFiles: [
      "lib/error-handler.ts (localStorage: yyc3_error_log)",
      "lib/yyc3-storage.ts (IndexedDB: errorLog store)",
    ],
    description:
      "error-handler.ts 将错误写入 localStorage（key: yyc3_error_log，上限 200 条），而 yyc3-storage.ts 声明了 IndexedDB 的 errorLog store 但 error-handler 完全未使用。两个存储路径互不关联。",
    impact:
      "① localStorage 有 5MB 上限，200 条带 stack 的错误记录可能快速填满空间，挤压其他配置项。② IndexedDB errorLog store 始终为空，exportAllData 导出的错误日志为空数组。③ 跨标签页 BroadcastChannel 同步仅覆盖 IndexedDB，localStorage 错误日志不会同步。",
    rootCause:
      "error-handler.ts 早于 IndexedDB 统一存储层开发，沿用了最初的 localStorage 方案，后续 yyc3-storage.ts 虽预留了 errorLog store 但未迁移。",
    refactorPlan: [
      "将 error-handler.ts 的 saveErrorToLog / getErrorLog 迁移到 IndexedDB（使用 idbPut/idbGetAll）",
      "保留 localStorage 作为 fallback（IndexedDB 不可用时降级），但主存储使用 IndexedDB",
      "在 captureError() 中调用 idbPut('errorLog', appError) 替代 localStorage.setItem",
      "getErrorLog() 改为 async，从 IndexedDB 读取，UI 层适配 async 调用",
      "移除 LOCALSTORAGE_KEYS.errorLog 中对旧 key 的引用（或标记为 deprecated）",
      "补充迁移脚本：首次启动时将 localStorage 旧数据导入 IndexedDB",
    ],
    effort: "M",
    priority: 2,
    status: "resolved",
  },
  {
    id: "RF-003",
    title: "Figma Error Handler Double Registration",
    titleCn: "Figma 错误处理器重复注册",
    severity: "high",
    category: "duplication",
    affectedFiles: [
      "App.tsx (module-level, capture phase, lines 17-42)",
      "lib/error-handler.ts (installGlobalErrorListeners, bubble phase, lines 296-341)",
    ],
    description:
      "App.tsx 在模块顶层注册了 capture-phase 的 error/unhandledrejection 监听器来拦截 Figma iframe 错误，同时 error-handler.ts 的 installGlobalErrorListeners() 在 bubble-phase 也注册了相同事件的监听器并包含 Figma 过滤逻辑。两层防护功能重叠。",
    impact:
      "① 内存开销：4 个全局监听器处理同一逻辑。② 维护风险：修改一处过滤规则时容易遗漏另一处，导致行为不一致。③ App.tsx 的 stopImmediatePropagation 在 capture phase 调用后，error-handler.ts 的 bubble-phase 监听器不会收到 Figma 错误——这是预期行为，但代码意图不明确。",
    rootCause:
      "Figma 沙盒错误问题在不同阶段被两次修复，第一次加在 error-handler.ts，发现仍有泄漏后在 App.tsx 加了 capture-phase 拦截，但未合并去重。",
    refactorPlan: [
      "统一到 error-handler.ts 的 installGlobalErrorListeners() 中，使用 capture phase",
      "移除 App.tsx 模块顶层的两个 addEventListener 调用",
      "在 installGlobalErrorListeners() 中将 useCapture 设为 true，使其在 capture phase 运行",
      "确保 Figma 过滤逻辑只在一处维护，添加明确注释说明 capture vs bubble 选择原因",
      "更新 error-handler.test.ts 中的 4 个 Figma 过滤测试用例以验证 capture phase",
    ],
    effort: "S",
    priority: 3,
    status: "resolved",
  },
  {
    id: "RF-004",
    title: "StoreName Array 4x Duplication",
    titleCn: "StoreName 数组四复制",
    severity: "medium",
    category: "duplication",
    affectedFiles: [
      "lib/yyc3-storage.ts (lines 38-53, 268-274, 305-310, 358-363)",
      "__tests__/types-audit.test.ts (line 305)",
    ],
    description:
      "14 个 IndexedDB store 名称列表在 yyc3-storage.ts 中重复了 4 次（openDB、exportAllData、getStorageStats、clearAllStorage），另外在测试文件中还复制了 1 次。总计 5 处相同的字面量数组。",
    impact:
      "新增 store 时需修改 5 处，遗漏任意一处会导致：① 新 store 未被创建（openDB 遗漏）② 导出数据不完整（exportAllData 遗漏）③ 统计不准确 ④ 清理不彻底。",
    rootCause: "每个函数独立声明了自己需要的 store 列表，未提取为常量。",
    refactorPlan: [
      "在 yyc3-storage.ts 顶部导出 ALL_STORES 常量数组：export const ALL_STORES: StoreName[] = [...]",
      "openDB、exportAllData、getStorageStats、clearAllStorage 全部引用 ALL_STORES",
      "测试文件 import ALL_STORES 进行断言",
      "在类型文件 types/index.ts 的 StoreName 联合类型旁添加注释，提醒新增 store 时同步更新 ALL_STORES",
    ],
    effort: "S",
    priority: 4,
    status: "resolved",
  },
  {
    id: "RF-005",
    title: "Severity Type Semantic Inconsistency",
    titleCn: "严重级别类型语义不一致",
    severity: "medium",
    category: "conflict",
    affectedFiles: [
      "types/index.ts — AlertLevel (Section 4)",
      "types/index.ts — FollowUpSeverity (Section 10)",
      "types/index.ts — AlertSeverity (Section 31)",
      "types/index.ts — ErrorSeverity (Section 7)",
      "types/index.ts — DiagnosticPattern.severity (Section 33, inline)",
    ],
    description:
      "系统中存在 5+ 种严重级别类型定义，值域不统一：AlertLevel = info|warning|error|critical，AlertSeverity = info|warning|critical（缺少 \"error\"），DiagnosticPattern.severity = critical|warning|info（缺少 \"error\"）。跨模块引用时可能类型不兼容。",
    impact:
      "① AlertSeverity 缺少 \"error\" 级别，告警事件无法表达 \"error\" 严重度。② 告警事件与跟进系统关联时，severity 类型不兼容需要 type assertion。③ 新开发者容易选错类型。",
    rootCause:
      "各模块在不同阶段独立定义了自己的 severity 类型，未进行全局统一审核。",
    refactorPlan: [
      "定义统一的基础严重级别类型：type BaseSeverity = 'info' | 'warning' | 'error' | 'critical'",
      "AlertLevel / FollowUpSeverity / ErrorSeverity 统一为 BaseSeverity 的别名",
      "AlertSeverity 补充 'error' 级别（需同步更新 AlertRule / AlertEvent 相关组件）",
      "DiagnosticPattern.severity 改为引用 BaseSeverity",
      "保留 PatternSeverity (low/medium/high/critical) 作为独立分类（语义不同，不合并）",
      "添加 types-audit 测试用例验证所有 severity 类型的值域一致性",
    ],
    effort: "M",
    priority: 5,
    status: "resolved",
  },
  {
    id: "RF-006",
    title: "Missing Catch-All 404 Route",
    titleCn: "缺少 404 通配路由",
    severity: "medium",
    category: "missing-feature",
    affectedFiles: ["routes.ts"],
    description:
      "路由表包含 23 条路由但没有 { path: '*', Component: NotFound } 通配路由。用户访问任何未定义的路径（如 /foo）时看到空白页面，无错误提示。",
    impact:
      "① 用户误输入 URL 后无反馈，体验差。② 爬虫/扫描器访问随机路径时无 404 响应。③ 不符合 Guidelines 验收标准中的 UX 要求。",
    rootCause: "路由表随功能模块逐步扩展，一直未添加 fallback 路由。",
    refactorPlan: [
      "创建 NotFound.tsx 组件（赛博朋克风格 404 页面）",
      "在 routes.ts 的 children 数组末尾添加 { path: '*', Component: NotFound }",
      "NotFound 页面包含：错误码展示、返回首页按钮、最近访问路径建议",
    ],
    effort: "S",
    priority: 6,
    status: "resolved",
  },
  {
    id: "RF-007",
    title: "useHostFileSystem Hardcoded API_BASE",
    titleCn: "useHostFileSystem API 地址硬编码",
    severity: "medium",
    category: "conflict",
    affectedFiles: [
      "hooks/useHostFileSystem.ts (line 28: const API_BASE = '/api/fs')",
      "lib/api-config.ts (fsBase field)",
    ],
    description:
      "useHostFileSystem.ts 在第 28 行硬编码了 API_BASE = '/api/fs'，而 api-config.ts 提供了 fsBase 字段用于统一配置文件系统 API 地址。两者不关联，SystemSettings 中修改 fsBase 对文件系统操作无效。",
    impact:
      "后端 API 部署在非标准路径时，文件系统功能无法工作。与 useLocalDatabase.ts（正确使用 getAPIConfig()）的实现模式不一致。",
    rootCause: "useHostFileSystem 早于 api-config 统一配置服务开发，未跟进迁移。",
    refactorPlan: [
      "将 API_BASE 常量替换为 getAPIConfig().fsBase 调用",
      "在 apiFallback 函数中动态获取 fsBase，而非使用闭包中的常量",
      "检查 enableBackend 标志，仅在启用后端时调用 HTTP API",
    ],
    effort: "S",
    priority: 7,
    status: "resolved",
  },
  {
    id: "RF-008",
    title: "useAlertRules Bypasses usePersistedList",
    titleCn: "useAlertRules 绕过通用持久化 Hook",
    severity: "low",
    category: "duplication",
    affectedFiles: [
      "hooks/useAlertRules.ts (直接调用 idbGetAll/idbPut/idbDelete)",
      "hooks/usePersistedState.ts (通用 usePersistedList Hook)",
    ],
    description:
      "useAlertRules 直接导入并调用 yyc3-storage 的底层 CRUD 函数（idbGetAll、idbPut、idbPutMany、idbDelete、idbClear），实现了与 usePersistedList 几乎相同的逻辑：初始化加载、乐观更新、IndexedDB 写回。",
    impact:
      "① 代码重复约 60 行。② usePersistedList 的 BroadcastChannel 跨标签页同步功能被绕过——告警规则不会自动跨标签页同步。③ 未来 usePersistedList 添加新功能（如乐观 UI 回滚）时，useAlertRules 无法自动受益。",
    rootCause:
      "useAlertRules 在 usePersistedList 之前开发，后续未进行重构迁移。useAlertRules 有额外的 WebSocket 评估逻辑，开发者可能认为不适合使用通用 Hook。",
    refactorPlan: [
      "将 useAlertRules 中的 rules 状态管理替换为 usePersistedList<AlertRule>('alertRules', MOCK_RULES)",
      "将 events 状态管理替换为 usePersistedList<AlertEvent>('alertEvents')",
      "保留 WebSocket 评估逻辑（evaluateRules）作为独立 useEffect",
      "验证跨标签页同步是否正常工作",
    ],
    effort: "M",
    priority: 8,
    status: "resolved",
  },
  {
    id: "RF-009",
    title: "BroadcastChannel Pattern Inconsistency",
    titleCn: "BroadcastChannel 使用模式不一致",
    severity: "low",
    category: "design-debt",
    affectedFiles: [
      "lib/yyc3-storage.ts (singleton cached channel: yyc3_storage_sync)",
      "lib/api-config.ts (ephemeral channels: yyc3_api_config)",
    ],
    description:
      "yyc3-storage.ts 使用单例缓存的 BroadcastChannel（getChannel() 函数），而 api-config.ts 在 setAPIConfig() 中每次调用都新建并关闭 channel，在 onAPIConfigChange() 中又创建持久化的 channel。两种模式并存，不同模块开发者可能采用不同方式。",
    impact:
      "① api-config 的 ephemeral channel 模式每次 setAPIConfig 调用都创建/销毁对象，有微量性能开销。② 新开发者不确定该遵循哪种模式。③ onAPIConfigChange 中创建的 channel 在组件卸载后可能泄漏（如果 cleanup 函数未调用）。",
    rootCause: "两个模块由不同阶段开发，未建立 BroadcastChannel 使用规范。",
    refactorPlan: [
      "建立统一的 BroadcastChannel 工厂函数或统一使用 yyc3-storage 的 singleton 模式",
      "api-config 改用 singleton channel + postMessage，移除 setAPIConfig 中的 new/close 模式",
      "在开发文档中记录 BroadcastChannel 使用规范",
    ],
    effort: "S",
    priority: 9,
    status: "resolved",
  },
  {
    id: "RF-010",
    title: "IndexedDB No versionchange Handler",
    titleCn: "IndexedDB 缺少 versionchange 处理",
    severity: "low",
    category: "instability",
    affectedFiles: ["lib/yyc3-storage.ts (openDB / getDB)"],
    description:
      "openDB() 缓存了 dbPromise 但未监听 IDBDatabase 的 onversionchange 事件。当另一个标签页升级了 DB_VERSION（如热更新部署新版本），旧标签页的缓存连接会变为 stale，后续操作可能抛出 InvalidStateError。",
    impact:
      "多标签页场景下，应用热更新后旧标签页的 IndexedDB 操作静默失败（��� try-catch 吞掉），数据丢失不可追溯。",
    rootCause: "openDB 实现较早，未考虑多标签页版本升级场景。",
    refactorPlan: [
      "在 openDB() 的 onsuccess 回调中添加 db.onversionchange = () => { db.close(); dbPromise = null; }",
      "添加 onblocked 处理：通知用户关闭其他标签页以完成升级",
      "getDB() 在检测到连接关闭时重置 dbPromise 并重新打开",
    ],
    effort: "S",
    priority: 10,
    status: "resolved",
  },
  {
    id: "RF-011",
    title: "Re-export Pollution Across Modules",
    titleCn: "类型 Re-export 污染",
    severity: "low",
    category: "design-debt",
    affectedFiles: [
      "lib/error-handler.ts",
      "lib/db-queries.ts",
      "lib/backgroundSync.ts",
      "lib/network-utils.ts",
      "hooks/useAlertRules.ts",
      "hooks/useI18n.ts",
      "hooks/useWebSocketData.ts",
      "components/ErrorBoundary.tsx",
    ],
    description:
      "几乎每个模块都包含 '// Re-export for backward compatibility' 模式，将 types/index.ts 中的类型重新导出。这导致同一类型有多个导入路径（如 AppError 可从 error-handler.ts 或 types/index.ts 导入）。",
    impact:
      "① IDE 自动导入可能选择非规范路径。② 移除某个模块时，依赖其 re-export 的文件会断裂。③ 增加代码审查复杂度。",
    rootCause: "类型集中化（迁移到 types/index.ts）时保留了旧导出路径以避免破坏现有导入。",
    refactorPlan: [
      "分阶段移除 re-export：先用 @deprecated JSDoc 标注",
      "全局搜索替换：将所有非 types/index.ts 的类型导入改为从 types/index.ts 导入",
      "CI 添加 lint 规则：禁止从非 types/ 路径导入类型（eslint-plugin-import）",
      "最终移除所有 re-export 语句",
    ],
    effort: "L",
    priority: 11,
    status: "resolved",
  },
  {
    id: "RF-012",
    title: "Mock Supabase → Real Supabase Migration Risk",
    titleCn: "Mock Supabase 与真实 Supabase 迁移风险",
    severity: "low",
    category: "design-debt",
    affectedFiles: [
      "lib/supabaseClient.ts",
      "App.tsx (session type casting)",
    ],
    description:
      "MockSupabaseClient 的 auth.getSession() 返回的 session 结构使用 AppSession（{user: AppUser, token, expiresAt}），而真实 Supabase 的 session 结构完全不同（{access_token, user: {id, email, user_metadata}}）。App.tsx 直接将 session cast 为 AppSession（line 74），接入真实 Supabase 后会 runtime 崩溃。",
    impact:
      "切换到真实 Supabase 时需大量适配工作，且由于 TypeScript 强制类型断言，编译期不会报错。",
    rootCause: "Mock 层设计时未严格遵循 Supabase SDK 的实际类型签名。",
    refactorPlan: [
      "Mock 层应模拟真实 Supabase SDK 的返回类型结构",
      "创建 adapter 层：toAppSession(supabaseSession) / toAppUser(supabaseUser)",
      "App.tsx 中移除 as AppSession 断言，改用 adapter 函数",
      "或者：保持当前 Mock 结构不变，但在 supabaseClient.ts 中添加明确的 TODO 注释和迁移指南",
    ],
    effort: "M",
    priority: 12,
    status: "resolved",
  },
];

// ============================================================
//  Refactoring Phases
// ============================================================

interface Phase {
  id: string;
  title: string;
  titleCn: string;
  description: string;
  issueIds: string[];
  estimatedDays: string;
}

const PHASES: Phase[] = [
  {
    id: "P1",
    title: "Critical Fixes & Conflict Resolution",
    titleCn: "Phase 1: 关键冲突修复",
    description: "解决直接影响功能正确性的冲突和不稳定问题",
    issueIds: ["RF-001", "RF-002", "RF-003"],
    estimatedDays: "2-3 天",
  },
  {
    id: "P2",
    title: "Code Deduplication & Standardization",
    titleCn: "Phase 2: 代码去重与标准化",
    description: "消除重复代码，统一编码模式，补齐缺失功能",
    issueIds: ["RF-004", "RF-005", "RF-006", "RF-007", "RF-008"],
    estimatedDays: "2-3 天",
  },
  {
    id: "P3",
    title: "Architecture Hardening & Tech Debt",
    titleCn: "Phase 3: 架构加固与技术债清理",
    description: "消除设计债务，提升系统韧性",
    issueIds: ["RF-009", "RF-010", "RF-011", "RF-012"],
    estimatedDays: "3-4 天",
  },
];

// ============================================================
//  Summary Stats
// ============================================================

function computeStats(issues: Issue[]) {
  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory: Record<Category, number> = { conflict: 0, instability: 0, duplication: 0, "design-debt": 0, "missing-feature": 0 };
  for (const i of issues) {
    bySeverity[i.severity]++;
    byCategory[i.category]++;
  }
  const totalFiles = new Set(issues.flatMap((i) => i.affectedFiles)).size;
  return { bySeverity, byCategory, totalFiles, total: issues.length };
}

// ============================================================
//  Sub-components
// ============================================================

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ff3366",
  high: "#ff6600",
  medium: "#ffaa00",
  low: "#00d4ff",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "严重",
  high: "高",
  medium: "中",
  low: "低",
};

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  conflict: <ArrowRightLeft className="w-4 h-4" />,
  instability: <AlertTriangle className="w-4 h-4" />,
  duplication: <Repeat className="w-4 h-4" />,
  "design-debt": <Wrench className="w-4 h-4" />,
  "missing-feature": <Target className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<Category, string> = {
  conflict: "冲突",
  instability: "不稳定",
  duplication: "重复",
  "design-debt": "设计债务",
  "missing-feature": "功能缺失",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <span
      className="px-2 py-0.5 rounded-full border"
      style={{
        fontSize: "0.68rem",
        background: `${color}15`,
        borderColor: `${color}40`,
        color,
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

function EffortBadge({ effort }: { effort: string }) {
  const colors: Record<string, string> = { S: "#00ff88", M: "#00d4ff", L: "#ffaa00", XL: "#ff6600" };
  const c = colors[effort] || "#00d4ff";
  return (
    <span
      className="px-2 py-0.5 rounded border"
      style={{ fontSize: "0.65rem", background: `${c}10`, borderColor: `${c}30`, color: c }}
    >
      {effort}
    </span>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLORS[issue.severity];

  return (
    <div
      className="rounded-xl border transition-all duration-300"
      style={{
        background: "rgba(8, 25, 55, 0.5)",
        borderColor: expanded ? `${color}40` : "rgba(0, 180, 255, 0.1)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.4)] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.4)] shrink-0" />
        )}
        <span className="text-[rgba(0,212,255,0.3)] font-mono shrink-0" style={{ fontSize: "0.72rem" }}>
          {issue.id}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[#e0f0ff] truncate" style={{ fontSize: "0.85rem" }}>
            {issue.titleCn}
          </div>
          <div className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.7rem" }}>
            {issue.title}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EffortBadge effort={issue.effort} />
          <SeverityBadge severity={issue.severity} />
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[rgba(0,180,255,0.08)] pt-4 mx-4">
          {/* Category & Affected Files */}
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: SEVERITY_COLORS[issue.severity] }}>
              {CATEGORY_ICONS[issue.category]}
            </span>
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>
              {CATEGORY_LABELS[issue.category]}
            </span>
          </div>

          {/* Description */}
          <div>
            <div className="text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.7rem" }}>
              问题描述
            </div>
            <p className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.78rem", lineHeight: "1.6" }}>
              {issue.description}
            </p>
          </div>

          {/* Impact */}
          <div>
            <div className="text-[rgba(255,170,0,0.6)] mb-1 flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
              <AlertCircle className="w-3 h-3" /> 潜在影响
            </div>
            <p className="text-[rgba(255,170,0,0.5)]" style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>
              {issue.impact}
            </p>
          </div>

          {/* Root Cause */}
          <div>
            <div className="text-[rgba(0,212,255,0.4)] mb-1 flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
              <Bug className="w-3 h-3" /> 根因分析
            </div>
            <p className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.75rem", lineHeight: "1.5" }}>
              {issue.rootCause}
            </p>
          </div>

          {/* Affected Files */}
          <div>
            <div className="text-[rgba(0,212,255,0.4)] mb-1 flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
              <FileWarning className="w-3 h-3" /> 影响文件
            </div>
            <div className="space-y-1">
              {issue.affectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="font-mono text-[rgba(0,255,136,0.5)] pl-3 border-l-2 border-[rgba(0,255,136,0.15)]"
                  style={{ fontSize: "0.7rem" }}
                >
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Refactor Plan */}
          <div>
            <div className="text-[rgba(0,212,255,0.4)] mb-2 flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
              <GitBranch className="w-3 h-3" /> 重构方案
            </div>
            <div className="space-y-1.5">
              {issue.refactorPlan.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center border"
                    style={{
                      fontSize: "0.6rem",
                      background: "rgba(0,212,255,0.05)",
                      borderColor: "rgba(0,212,255,0.2)",
                      color: "rgba(0,212,255,0.5)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.75rem", lineHeight: "1.5" }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Main Component
// ============================================================

export function RefactoringReport() {
  const stats = useMemo(() => computeStats(ISSUES), []);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const filteredIssues = useMemo(() => {
    if (activePhase) {
      const phase = PHASES.find((p) => p.id === activePhase);
      if (phase) {
        return ISSUES.filter((i) => phase.issueIds.includes(i.id));
      }
    }
    if (severityFilter !== "all") {
      return ISSUES.filter((i) => i.severity === severityFilter);
    }
    return ISSUES;
  }, [activePhase, severityFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className="p-3 rounded-xl border"
          style={{
            background: "rgba(255,51,102,0.08)",
            borderColor: "rgba(255,51,102,0.2)",
          }}
        >
          <ShieldAlert className="w-7 h-7 text-[#ff3366]" />
        </div>
        <div>
          <h1 className="text-[#e0f0ff]" style={{ fontSize: "1.3rem" }}>
            YYC3 深度代码分析 & 重构方案
          </h1>
          <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.78rem" }}>
            Code Stability Audit & Refactoring Plan
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: "发现问题", value: stats.total, icon: <Bug className="w-5 h-5" />, color: "#00d4ff" },
          { label: "影响文件", value: stats.totalFiles, icon: <FileWarning className="w-5 h-5" />, color: "#ffaa00" },
          { label: "严重/高危", value: stats.bySeverity.critical + stats.bySeverity.high, icon: <AlertTriangle className="w-5 h-5" />, color: "#ff3366" },
          { label: "重构阶段", value: PHASES.length, icon: <Layers className="w-5 h-5" />, color: "#00ff88" },
        ] as const).map((s) => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              <div style={{ color: s.color, opacity: 0.6 }}>{s.icon}</div>
              <div>
                <div className="text-[#e0f0ff]" style={{ fontSize: "1.3rem" }}>
                  {s.value}
                </div>
                <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                  {s.label}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Severity Distribution */}
      <GlassCard className="p-5">
        <div className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-2" style={{ fontSize: "0.78rem" }}>
          <BarChart3 className="w-4 h-4" /> 严重级别分布
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setSeverityFilter("all"); setActivePhase(null); }}
            className={`px-3 py-1.5 rounded-lg border transition-all ${severityFilter === "all" && !activePhase ? "border-[rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.1)]" : "border-[rgba(0,180,255,0.1)] bg-transparent"}`}
            style={{ fontSize: "0.75rem", color: severityFilter === "all" && !activePhase ? "#00d4ff" : "rgba(0,212,255,0.4)" }}
          >
            全部 ({stats.total})
          </button>
          {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => { setSeverityFilter(s); setActivePhase(null); }}
              className={`px-3 py-1.5 rounded-lg border transition-all ${severityFilter === s && !activePhase ? `border-[${SEVERITY_COLORS[s]}40]` : "border-[rgba(0,180,255,0.1)]"}`}
              style={{
                fontSize: "0.75rem",
                color: severityFilter === s && !activePhase ? SEVERITY_COLORS[s] : `${SEVERITY_COLORS[s]}80`,
                background: severityFilter === s && !activePhase ? `${SEVERITY_COLORS[s]}15` : "transparent",
                borderColor: severityFilter === s && !activePhase ? `${SEVERITY_COLORS[s]}40` : undefined,
              }}
            >
              {SEVERITY_LABELS[s]} ({stats.bySeverity[s]})
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Refactoring Phases */}
      <GlassCard className="p-5">
        <div className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-2" style={{ fontSize: "0.78rem" }}>
          <TrendingUp className="w-4 h-4" /> 重构执行计划
        </div>
        <div className="space-y-3">
          {PHASES.map((phase) => {
            const isActive = activePhase === phase.id;
            const phaseIssues = ISSUES.filter((i) => phase.issueIds.includes(i.id));
            const maxSeverity = phaseIssues.reduce<Severity>((acc, i) => {
              const order: Severity[] = ["critical", "high", "medium", "low"];
              return order.indexOf(i.severity) < order.indexOf(acc) ? i.severity : acc;
            }, "low");
            const color = SEVERITY_COLORS[maxSeverity];

            return (
              <button
                key={phase.id}
                onClick={() => {
                  setActivePhase(isActive ? null : phase.id);
                  setSeverityFilter("all");
                }}
                className={`w-full text-left rounded-xl border p-4 transition-all ${isActive ? "" : "hover:border-[rgba(0,180,255,0.25)]"}`}
                style={{
                  background: isActive ? `${color}08` : "rgba(0, 20, 50, 0.3)",
                  borderColor: isActive ? `${color}30` : "rgba(0, 180, 255, 0.1)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[rgba(0,212,255,0.3)] font-mono" style={{ fontSize: "0.7rem" }}>
                      {phase.id}
                    </span>
                    <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>
                      {phase.titleCn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[rgba(0,212,255,0.3)] flex items-center gap-1" style={{ fontSize: "0.68rem" }}>
                      <Clock className="w-3 h-3" /> {phase.estimatedDays}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: "0.65rem",
                        background: `${color}15`,
                        color,
                      }}
                    >
                      {phase.issueIds.length} issues
                    </span>
                  </div>
                </div>
                <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.72rem" }}>
                  {phase.description}
                </p>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Issue List */}
      <div>
        <div className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-2" style={{ fontSize: "0.78rem" }}>
          <Code className="w-4 h-4" /> 问题详情
          <span className="text-[rgba(0,212,255,0.3)]">
            ({filteredIssues.length} / {ISSUES.length})
          </span>
        </div>
        <div className="space-y-2">
          {filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      </div>

      {/* Dependency Graph Summary */}
      <GlassCard className="p-5">
        <div className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-2" style={{ fontSize: "0.78rem" }}>
          <Globe className="w-4 h-4" /> 模块依赖冲突矩阵
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: "0.72rem" }}>
            <thead>
              <tr className="text-[rgba(0,212,255,0.4)] border-b border-[rgba(0,180,255,0.1)]">
                <th className="text-left py-2 px-3">源模块</th>
                <th className="text-left py-2 px-3">冲突目标</th>
                <th className="text-left py-2 px-3">冲突类型</th>
                <th className="text-left py-2 px-3">关联 Issue</th>
              </tr>
            </thead>
            <tbody className="text-[rgba(224,240,255,0.5)]">
              {[
                { source: "useWebSocketData", target: "api-config / network-utils", type: "URL 数据源冲突", issue: "RF-001" },
                { source: "error-handler", target: "yyc3-storage (IndexedDB)", type: "存储路径分裂", issue: "RF-002" },
                { source: "App.tsx (module)", target: "error-handler", type: "监听器重复注册", issue: "RF-003" },
                { source: "useAlertRules", target: "usePersistedList", type: "功能重复实现", issue: "RF-008" },
                { source: "useHostFileSystem", target: "api-config", type: "配置源不一致", issue: "RF-007" },
                { source: "supabaseClient", target: "App.tsx", type: "类型断言风险", issue: "RF-012" },
              ].map((row) => (
                <tr key={row.issue} className="border-b border-[rgba(0,180,255,0.05)] hover:bg-[rgba(0,212,255,0.03)]">
                  <td className="py-2 px-3 font-mono text-[rgba(0,255,136,0.5)]">{row.source}</td>
                  <td className="py-2 px-3 font-mono text-[rgba(255,170,0,0.5)]">{row.target}</td>
                  <td className="py-2 px-3">{row.type}</td>
                  <td className="py-2 px-3 font-mono text-[rgba(0,212,255,0.4)]">{row.issue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Verification Checklist */}
      <GlassCard className="p-5">
        <div className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-2" style={{ fontSize: "0.78rem" }}>
          <CheckCircle2 className="w-4 h-4" /> 重构后验证清单
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "npx tsc --noEmit 通过",
            "pnpm test 全部通过（130+ 用例）",
            "覆盖率 ≥ 80% statements / 70% branches",
            "SystemSettings 修改 wsEndpoint → WebSocket 自动重连",
            "SystemSettings 修改 fsBase → 文件系统 API 切换",
            "多标签页打开 → BroadcastChannel 同步正常",
            "IndexedDB DB_VERSION 升级 → 旧标签页平滑处理",
            "访问 /nonexistent → 显示 404 页面",
            "错误日志 → IndexedDB errorLog store 有数据",
            "exportAllData() → 包含完整的 errorLog 数据",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 py-1">
              <div
                className="w-4 h-4 rounded border shrink-0"
                style={{
                  borderColor: "rgba(0,212,255,0.2)",
                  background: "rgba(0,212,255,0.05)",
                }}
              />
              <span className="text-[rgba(224,240,255,0.5)]" style={{ fontSize: "0.72rem" }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}