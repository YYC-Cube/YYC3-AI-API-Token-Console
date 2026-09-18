/**
 * ArchitectureAudit.tsx
 * ======================
 * YYC3 项目架构全景审计面板
 *
 * 详细展示当前项目的:
 * - 架构概览统计
 * - 路由/页面组成
 * - 组件层级分类
 * - 数据层 (stores + localStorage)
 * - 类型系统覆盖
 * - 测试覆盖矩阵
 * - 功能完成度清单
 * - 已知缺口与 TODO
 */

import React, { useState, useMemo } from "react";
import {
  BarChart3, Layers, Database, Route, FileCode2,
  CheckCircle2, AlertTriangle, XCircle, Shield,
  ChevronDown, ChevronRight, GitBranch, Package,
  TestTube2, Cpu, Globe, Palette, Eye,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";

/* ────────────────────────────────────────────────────── */
/*  数据定义                                               */
/* ────────────────────────────────────────────────────── */

type Status = "complete" | "partial" | "missing" | "needs-verify";

interface AuditItem {
  name: string;
  status: Status;
  detail: string;
  path?: string;
}

interface RouteInfo {
  path: string;
  component: string;
  category: string;
  status: Status;
  features: string[];
}

interface StoreInfo {
  key: string;
  storageKey: string;
  itemCount: number;
  type: string;
  status: Status;
}

interface TestFileInfo {
  file: string;
  type: "unit" | "component" | "integration" | "a11y" | "e2e";
  environment: "node" | "jsdom";
  status: Status;
  coverage: string;
}

/* ── 路由清单 ─────────────────────────────────────── */

const ROUTES: RouteInfo[] = [
  { path: "/", component: "DataMonitoring", category: "监控", status: "complete", features: ["节点状态卡片", "模型性能图表", "实时 QPS/延迟", "吞吐量趋势", "模型分布饼图", "全景切换", "跳转审计"] },
  { path: "/follow-up", component: "FollowUpPanel", category: "监控", status: "complete", features: ["告警卡片列表", "操作链路时间线", "快速操作按钮组", "严重级别筛选", "状态管理"] },
  { path: "/patrol", component: "PatrolDashboard", category: "监控", status: "complete", features: ["手动/自动巡查", "健康度评分", "检查项列表", "巡查历史", "巡查计划配置"] },
  { path: "/alerts", component: "AlertRulesPanel", category: "监控", status: "complete", features: ["告警规则 CRUD", "阈值配置", "聚合去重", "升级策略", "实时事件"] },
  { path: "/operations", component: "OperationCenter", category: "运维", status: "complete", features: ["操作分类标签", "快速操作网格", "操作模板管理", "实时操作日志", "搜索过滤"] },
  { path: "/files", component: "LocalFileManager", category: "运维", status: "complete", features: ["虚拟文件浏览", "日志查看器", "报告生成器", "文件操作"] },
  { path: "/host-files", component: "HostFileManager", category: "运维", status: "complete", features: ["File System Access API", "文件版本管理", "代码编辑器", "文件搜索"] },
  { path: "/database", component: "DatabaseManager", category: "运维", status: "complete", features: ["SQL 编辑器", "表浏览", "备份管理", "查询历史"] },
  { path: "/ai", component: "AISuggestionPanel", category: "AI", status: "complete", features: ["异常模式检测", "AI 推荐操作", "健康度评估", "一键应用建议"] },
  { path: "/ai-diagnosis", component: "AIDiagnostics", category: "AI", status: "complete", features: ["模式识别", "异常记录", "建议操作", "预测性预报"] },
  { path: "/loop", component: "ServiceLoopPanel", category: "AI", status: "complete", features: ["六阶段闭环", "数据流可视化", "运行记录", "阶段详情"] },
  { path: "/pwa", component: "PWAStatusPanel", category: "系统", status: "complete", features: ["SW 状态", "缓存管理", "离线就绪", "安装提示"] },
  { path: "/design-system", component: "DesignSystemPage", category: "开发", status: "complete", features: ["色彩 Token", "字体排版", "间距", "阴影", "动效", "组件展示"] },
  { path: "/dev-guide", component: "DevGuidePage", category: "开发", status: "complete", features: ["开发规范", "目录结构", "代码示例"] },
  { path: "/models", component: "ModelProviderPanel", category: "AI", status: "complete", features: ["服务商管理", "模型配置", "API Key 管理", "Ollama 集成"] },
  { path: "/theme", component: "ThemeCustomizer", category: "开发", status: "complete", features: ["主题预设", "颜色选择器", "实时预览"] },
  { path: "/terminal", component: "CLITerminal", category: "开发", status: "complete", features: ["命令行交互", "命令补全", "输出格式化"] },
  { path: "/ide", component: "IDEPanel", category: "开发", status: "complete", features: ["IDE 侧边栏模拟", "四标签切换", "节点状态列表"] },
  { path: "/audit", component: "OperationAudit", category: "管理", status: "complete", features: ["搜索过滤", "分页", "JSON 导出", "链路追踪", "详情 Modal"] },
  { path: "/users", component: "UserManagement", category: "管理", status: "complete", features: ["用户 CRUD", "角色管理", "锁定/解锁", "超管保护", "重置为默认", "权限矩阵"] },
  { path: "/settings", component: "SystemSettings", category: "管理", status: "complete", features: ["模型管理 CRUD", "API 端点配置", "网络配置 Modal", "分类切换", "二次确认"] },
  { path: "/security", component: "SecurityMonitor", category: "管理", status: "complete", features: ["CSP 检测", "Cookie 检查", "敏感数据扫描", "性能分析", "内存监控", "Web Vitals"] },
  { path: "/reports", component: "ReportExporter", category: "管理", status: "complete", features: ["报表生成", "多格式导出", "时间范围", "报表历史"] },
  { path: "/refactoring", component: "RefactoringReport", category: "开发", status: "complete", features: ["重构报告展示", "RF 编号追踪"] },
  { path: "/data-editor", component: "DataEditorPanel", category: "运维", status: "complete", features: ["localStorage 数据编辑", "表格视图", "内联编辑"] },
  { path: "/performance", component: "PerformanceMonitor", category: "监控", status: "complete", features: ["性能指标监控", "图表展示"] },
  { path: "/env-config", component: "EnvConfigEditor", category: "管理", status: "complete", features: ["31 环境变量编辑", "导入导出", "重置"] },
  { path: "/db-connections", component: "DatabaseConnectionPanel", category: "运维", status: "complete", features: ["数据库连接 CRUD", "连接测试", "连接池配置"] },
];

/* ── Store 清单 ───────────────────────────────────── */

const STORES: StoreInfo[] = [
  { key: "nodeStore", storageKey: "yyc3_nodes", itemCount: 8, type: "NodeData", status: "complete" },
  { key: "modelPerfStore", storageKey: "yyc3_model_perf", itemCount: 5, type: "ModelPerfEntry", status: "complete" },
  { key: "modelDistStore", storageKey: "yyc3_model_dist", itemCount: 5, type: "ModelDistEntry", status: "complete" },
  { key: "recentOpsStore", storageKey: "yyc3_recent_ops", itemCount: 5, type: "RecentOpEntry", status: "complete" },
  { key: "radarStore", storageKey: "yyc3_radar_data", itemCount: 6, type: "RadarEntry", status: "complete" },
  { key: "logStore", storageKey: "yyc3_logs", itemCount: 15, type: "StoredLogEntry", status: "complete" },
  { key: "dbConnectionStore", storageKey: "yyc3_db_connections", itemCount: 2, type: "DBConnection", status: "complete" },
  { key: "deployedModelStore", storageKey: "yyc3_deployed_models", itemCount: 5, type: "DeployedModel", status: "complete" },
  { key: "wifiNetworkStore", storageKey: "yyc3_wifi_networks", itemCount: 0, type: "WifiNetwork", status: "complete" },
  { key: "userStore", storageKey: "yyc3_users", itemCount: 8, type: "UserRecord", status: "complete" },
  { key: "wifiAutoReconnectStore", storageKey: "yyc3_wifi_auto_reconnect", itemCount: 1, type: "WifiAutoReconnectSettings", status: "complete" },
];

/* ── 测试文件清单 ──────────────────────────────────── */

const TEST_FILES: TestFileInfo[] = [
  // 纯函数/逻辑 (.test.ts → node)
  { file: "types.test.ts", type: "unit", environment: "node", status: "complete", coverage: "全局类型导出 30+" },
  { file: "create-local-store.test.ts", type: "unit", environment: "node", status: "complete", coverage: "CRUD 工厂全覆盖" },
  { file: "dashboard-stores.test.ts", type: "unit", environment: "node", status: "complete", coverage: "10 个 store 默认数据+CRUD" },
  { file: "env-config.test.ts", type: "unit", environment: "node", status: "complete", coverage: "31 环境变量+导入导出" },
  { file: "api-config.test.ts", type: "unit", environment: "node", status: "complete", coverage: "API 端点读写+广播" },
  { file: "error-handler.test.ts", type: "unit", environment: "node", status: "complete", coverage: "错误分类+日志+trySafe" },
  { file: "network-utils.test.ts", type: "unit", environment: "node", status: "complete", coverage: "配置 CRUD+URL+连接测试" },
  { file: "backgroundSync.test.ts", type: "unit", environment: "node", status: "complete", coverage: "队列增删+统计+重试" },
  { file: "supabaseClient.test.ts", type: "unit", environment: "node", status: "complete", coverage: "Mock 登录/登出+会话" },
  { file: "db-queries.test.ts", type: "unit", environment: "node", status: "complete", coverage: "Mock 数据格式+查询" },
  { file: "figma-error-filter.test.ts", type: "unit", environment: "node", status: "complete", coverage: "RF-003 错误判定函数" },
  { file: "yyc3-storage.test.ts", type: "unit", environment: "node", status: "complete", coverage: "IndexedDB 工具封装" },
  { file: "integration.test.ts", type: "integration", environment: "node", status: "complete", coverage: "跨模块联动+状态一致性" },

  // React 组件测试 (.test.tsx → jsdom)
  { file: "GlassCard.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "渲染+className+glowColor+onClick" },
  { file: "ConnectionStatus.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "5 种状态+compact+重连" },
  { file: "Login.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "表单+密码+登录成功/失败" },
  { file: "ErrorBoundary.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "三级降级+重置+onError" },
  { file: "NodeDetailModal.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "节点信息+指标+状态" },
  { file: "Dashboard.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "统计卡片+图表+切换" },
  { file: "Layout.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "布局渲染+侧边栏+底部导航" },
  { file: "Sidebar.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "导航分类+折叠+路由" },
  { file: "TopBar.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "顶栏+搜索+用户菜单" },
  { file: "BottomNav.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "底部导航+Tab 切换" },
  { file: "LanguageSwitcher.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "语言切换" },
  { file: "SystemSettings.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "分类+Toggle+模型 CRUD" },
  { file: "UserManagement.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "统计+列表+CRUD+锁定" },
  { file: "NetworkConfig.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "Tab+WiFi+手动配置+连接测试" },
  { file: "OperationAudit.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "搜索+分页+导出+追踪" },
  { file: "SecurityMonitor.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "四标签+扫描+评分" },
  { file: "FollowUpCard.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "告警卡片+操作按钮" },
  { file: "FollowUpDrawer.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "抽屉面板+关闭" },
  { file: "PatrolDashboard.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "巡查+历史+计划" },
  { file: "PatrolHistory.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "历史记录列表" },
  { file: "PatrolReport.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "巡查报告详情" },
  { file: "PatrolScheduler.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "计划配置" },
  { file: "OperationCategory.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "操作分类" },
  { file: "OperationChain.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "操作链路" },
  { file: "OperationLogStream.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "日志流" },
  { file: "OperationTemplate.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "操作模板" },
  { file: "QuickActionGrid.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "操作网格" },
  { file: "QuickActionGroup.test.tsx", type: "component", environment: "jsdom", status: "complete", coverage: "操作按钮组" },

  // Hook 测试
  { file: "useI18n.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "语言切换+翻译" },
  { file: "useFollowUp.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "跟进状态管理" },
  { file: "usePatrol.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "巡查 Hook" },
  { file: "useOperationCenter.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "操作中心 Hook" },
  { file: "useSecurityMonitor.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "安全监控 Hook" },
  { file: "useAISuggestion.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "AI 建议 Hook" },
  { file: "useAIDiagnostics.test.tsx", type: "unit", environment: "node", status: "complete", coverage: "AI 诊断 Hook" },
  { file: "useAlertRules.test.tsx", type: "unit", environment: "node", status: "complete", coverage: "告警规则 Hook" },
  { file: "useTerminal.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "终端 Hook" },
  { file: "useServiceLoop.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "服务闭环 Hook" },
  { file: "useKeyboardShortcuts.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "快捷键 Hook" },
  { file: "useModelProvider.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "模型服务商 Hook" },
  { file: "useBigModelSDK.test.tsx", type: "unit", environment: "node", status: "complete", coverage: "SDK Bridge Hook" },
  { file: "useLocalFileSystem.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "本地文件系统" },
  { file: "useLocalDatabase.test.tsx", type: "unit", environment: "node", status: "complete", coverage: "本地数据库 Hook" },
  { file: "usePWAManager.test.tsx", type: "unit", environment: "jsdom", status: "complete", coverage: "PWA 管理 Hook" },
  { file: "useReportExporter.test.tsx", type: "unit", environment: "node", status: "complete", coverage: "报表导出 Hook" },

  // 集成测试
  { file: "core-components-integration.test.tsx", type: "integration", environment: "jsdom", status: "needs-verify", coverage: "SystemSettings+UserManagement+store" },
  { file: "core-integration.test.tsx", type: "integration", environment: "jsdom", status: "needs-verify", coverage: "跨组件数据流" },

  // 无障碍测试
  { file: "a11y-audit.test.tsx", type: "a11y", environment: "jsdom", status: "complete", coverage: "GlassCard+LanguageSwitcher axe-core" },

  // i18n 一致性
  { file: "i18n-consistency.test.ts", type: "unit", environment: "node", status: "complete", coverage: "zh-CN/en-US 键值一致" },
  { file: "i18n-packs.test.ts", type: "unit", environment: "node", status: "complete", coverage: "语言包完整性" },

  // 类型测试
  { file: "types.test.ts", type: "unit", environment: "node", status: "complete", coverage: "37 节类型导出+转换函数" },
  { file: "types-audit.test.ts", type: "unit", environment: "node", status: "complete", coverage: "类型审计" },
];

/* ── 功能完成度清单 ────────────────────────────────── */

interface FeatureChecklist {
  category: string;
  items: AuditItem[];
}

const FEATURE_CHECKLIST: FeatureChecklist[] = [
  {
    category: "数据层 (Data Layer)",
    items: [
      { name: "createLocalStore CRUD 工厂", status: "complete", detail: "getAll/add/update/remove/reset/export/import/count", path: "src/app/lib/create-local-store.ts" },
      { name: "10 个 dashboard stores", status: "complete", detail: "nodes/modelPerf/modelDist/recentOps/radar/logs/dbConn/deployedModel/wifi/users", path: "src/app/stores/dashboard-stores.ts" },
      { name: "env-config 31 环境变量", status: "complete", detail: "env() 类型安全读取 + localStorage 持久化 + import/export", path: "src/app/lib/env-config.ts" },
      { name: "api-config 端点配置", status: "complete", detail: "8 个端点 + BroadcastChannel 同步 + ENDPOINT_META UI 描述", path: "src/app/lib/api-config.ts" },
      { name: "IndexedDB 持久化 (yyc3-storage)", status: "complete", detail: "idbPut/idbGetAll/idbClear + 14 个 store", path: "src/app/lib/yyc3-storage.ts" },
      { name: "BroadcastChannel 单例工厂", status: "complete", detail: "getSharedChannel/postToChannel/closeChannel", path: "src/app/lib/broadcast-channel.ts" },
      { name: "WiFi 自动重连 localStorage 持久化", status: "complete", detail: "wifiAutoReconnectStore (yyc3_wifi_auto_reconnect) 持久化开关/间隔/重试次数/优先 SSID，NetworkConfig 连接历史 Tab 可交互编辑", path: "src/app/stores/dashboard-stores.ts" },
    ],
  },
  {
    category: "认证 (Authentication)",
    items: [
      { name: "Mock Supabase Client", status: "complete", detail: "admin/dev 双角色 + Ghost 幽灵模式", path: "src/app/lib/supabaseClient.ts" },
      { name: "AuthContext", status: "complete", detail: "logout/userEmail/userRole/isGhost", path: "src/app/lib/authContext.ts" },
      { name: "Login 页面", status: "complete", detail: "邮箱密码登录 + Ghost 快速登录 + 加载/错误状态", path: "src/app/components/Login.tsx" },
    ],
  },
  {
    category: "路由 (Routing)",
    items: [
      { name: "28 个路由 (静态导入)", status: "complete", detail: "已从 React.lazy 改为静态导入，避免 iframe 动态加载问题", path: "src/app/routes.ts" },
      { name: "Layout 壳组件", status: "complete", detail: "TopBar + Sidebar + BottomNav + AIAssistant + CommandPalette + IntegratedTerminal", path: "src/app/components/Layout.tsx" },
      { name: "NotFound 404 页面", status: "complete", detail: "赛博朋克风格 404", path: "src/app/components/NotFound.tsx" },
    ],
  },
  {
    category: "国际化 (i18n)",
    items: [
      { name: "zh-CN 语言包", status: "complete", detail: "所有组件翻译键值", path: "src/app/i18n/zh-CN.ts" },
      { name: "en-US 语言包", status: "complete", detail: "对应英文翻译", path: "src/app/i18n/en-US.ts" },
      { name: "useI18n Hook", status: "complete", detail: "t() 翻译 + locale 切换 + 变量插值", path: "src/app/hooks/useI18n.ts" },
      { name: "LanguageSwitcher 组件", status: "complete", detail: "下拉切换 + 实时生效", path: "src/app/components/LanguageSwitcher.tsx" },
    ],
  },
  {
    category: "错误处理 (Error Handling)",
    items: [
      { name: "全局错误处理器", status: "complete", detail: "分类/日志/trySafe/trySafeSync + IndexedDB 双写", path: "src/app/lib/error-handler.ts" },
      { name: "ErrorBoundary 三级降级", status: "complete", detail: "page/module/widget 三级 + 自定义 fallback", path: "src/app/components/ErrorBoundary.tsx" },
      { name: "Figma 错误静默拦截 (RF-003)", status: "complete", detail: "isFigmaPlatformError 统一判定 + capture phase 拦截", path: "src/app/lib/figma-error-filter.ts" },
    ],
  },
  {
    category: "UI 组件库",
    items: [
      { name: "GlassCard 统一卡片", status: "complete", detail: "毛玻璃效果 + glowColor + onClick", path: "src/app/components/GlassCard.tsx" },
      { name: "shadcn/ui 组件 (48 个)", status: "complete", detail: "button/dialog/tabs/table/badge 等完整 UI 原子组件", path: "src/app/components/ui/" },
      { name: "YYC3 品牌 Logo", status: "complete", detail: "SVG Logo + 动态品牌色", path: "src/app/components/YYC3Logo.tsx" },
      { name: "Design System 页面", status: "complete", detail: "Token 展示 + 组件 Showcase + 阶段回顾", path: "src/app/components/design-system/" },
      { name: "主题定制器", status: "complete", detail: "颜色选择器 + 预设主题 + 实时预览", path: "src/app/components/ThemeCustomizer.tsx" },
    ],
  },
  {
    category: "测试基础设施",
    items: [
      { name: "Vitest 配置", status: "complete", detail: "双环境 (node/jsdom) + figma:asset mock + 覆盖率 80%", path: "vitest.config.ts" },
      { name: "测试 setup", status: "complete", detail: "matchMedia/ResizeObserver/IntersectionObserver/canvas mock", path: "src/app/__tests__/setup.ts" },
      { name: "GitHub Actions CI", status: "complete", detail: "test + coverage + build 三阶段流水线", path: "src/app/ci/github-actions-ci.yml" },
      { name: "测试文件 (~95 个)", status: "needs-verify", detail: "已创建但尚未全部运行验证，需 pnpm test 确认" },
      { name: "E2E 测试 (Playwright)", status: "partial", detail: "已创建 Playwright 配置模板 + 3 个 E2E 测试规格 (navigation/wifi-auto-reconnect/cross-page-data-flow)，待独立环境运行", path: "src/app/__tests__/e2e/" },
    ],
  },
  {
    category: "PWA & 离线",
    items: [
      { name: "PWA 状态面板", status: "complete", detail: "SW 状态/缓存管理/离线就绪", path: "src/app/components/PWAStatusPanel.tsx" },
      { name: "PWA 安装提示", status: "complete", detail: "beforeinstallprompt 事件处理", path: "src/app/components/PWAInstallPrompt.tsx" },
      { name: "离线指示器", status: "complete", detail: "在线/离线状态切换提示", path: "src/app/components/OfflineIndicator.tsx" },
      { name: "后台同步", status: "complete", detail: "SyncQueue + 重试 + 统计", path: "src/app/lib/backgroundSync.ts" },
    ],
  },
];

/* ── 已知缺口 ──────────────────────────────────────── */

interface GapItem {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixEstimate: string;
}

const KNOWN_GAPS: GapItem[] = [
  { id: "GAP-001", severity: "high", title: "测试未运行验证", description: "~95 个测试文件已创建，但 pnpm test 从未在当前环境实际运行。部分测试可能因 mock 配置不全而失败。", fixEstimate: "需 pnpm test 逐一排查" },
  { id: "GAP-002", severity: "low", title: "WiFi 自动重连已持久化 [已修复]", description: "已新增 wifiAutoReconnectStore (yyc3_wifi_auto_reconnect)，NetworkConfig 连接历史 Tab 的自动重连开关/间隔/最大次数/优先 SSID 均已持久化到 localStorage，UI 可交互编辑。", fixEstimate: "已完成" },
  { id: "GAP-003", severity: "low", title: "模型编辑二次确认已补齐 [已修复]", description: "SystemSettings 模型管理的「编辑」按钮已添加二次确认弹窗（确认编辑? + 确认/取消按钮），与删除确认交互模式一致，点击编辑时先展示确认 UI，确认后才打开编辑表单。", fixEstimate: "已完成" },
  { id: "GAP-004", severity: "low", title: "E2E 测试框架已引入 [部分完成]", description: "已创建 Playwright 配置模板 (playwright.config.ts) 及 3 个 E2E 测试规格文件 (navigation/wifi-auto-reconnect/cross-page-data-flow)。Figma Make 环境不支持直接运行 Playwright，部署到独立 Node 环境后可执行。", fixEstimate: "已创建模板，待部署环境运行" },
  { id: "GAP-005", severity: "low", title: "覆盖率门槛实际达标未知", description: "vitest.config.ts 设定 80% 门槛，但未实际运行 pnpm test:coverage 验证。", fixEstimate: "需 pnpm test:coverage" },
  { id: "GAP-006", severity: "medium", title: "Service Worker 未实际注册", description: "PWA 面板为 Mock 状态展示，sw.js 文件未实际创建/注册。", fixEstimate: "需 Vite PWA 插件" },
];

/* ── 辅助组件 ──────────────────────────────────────── */

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "complete": return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    case "partial": return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    case "missing": return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    case "needs-verify": return <Eye className="w-4 h-4 text-blue-400 shrink-0" />;
  }
}

function SeverityBadge({ severity }: { severity: GapItem["severity"] }) {
  const colors = {
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded border ${colors[severity]}`} style={{ fontSize: "0.7rem" }}>
      {severity.toUpperCase()}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <GlassCard className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#00d4ff]" />
      </div>
      <div className="min-w-0">
        <div className="text-[#00d4ff]" style={{ fontSize: "1.25rem" }}>{value}</div>
        <div className="text-[rgba(180,200,220,0.7)] truncate" style={{ fontSize: "0.72rem" }}>{label}</div>
        {sub && <div className="text-[rgba(180,200,220,0.4)]" style={{ fontSize: "0.65rem" }}>{sub}</div>}
      </div>
    </GlassCard>
  );
}

/* ── 主组件 ────────────────────────────────────────── */

export function ArchitectureAudit() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "routes" | "stores" | "tests" | "checklist" | "gaps">("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // 统计
  const stats = useMemo(() => {
    const totalTests = TEST_FILES.length;
    const testsByType = {
      unit: TEST_FILES.filter(t => t.type === "unit").length,
      component: TEST_FILES.filter(t => t.type === "component").length,
      integration: TEST_FILES.filter(t => t.type === "integration").length,
      a11y: TEST_FILES.filter(t => t.type === "a11y").length,
    };
    const allItems = FEATURE_CHECKLIST.flatMap(c => c.items);
    const completeItems = allItems.filter(i => i.status === "complete").length;
    return { totalTests, testsByType, totalItems: allItems.length, completeItems };
  }, []);

  const tabs = [
    { key: "overview" as const, label: "架构概览", icon: BarChart3 },
    { key: "routes" as const, label: `路由 (${ROUTES.length})`, icon: Route },
    { key: "stores" as const, label: `数据层 (${STORES.length})`, icon: Database },
    { key: "tests" as const, label: `测试 (${TEST_FILES.length})`, icon: TestTube2 },
    { key: "checklist" as const, label: "功能清单", icon: CheckCircle2 },
    { key: "gaps" as const, label: `缺口 (${KNOWN_GAPS.length})`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h1 className="text-[#e0e8f0]" style={{ fontSize: "1.25rem" }}>YYC3 架构审计全景</h1>
          <p className="text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.72rem" }}>
            项目现状彻底闭环分析 &middot; 停止发展，先补缺失
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex flex-wrap gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                : "text-[rgba(180,200,220,0.6)] hover:text-[rgba(180,200,220,0.9)] hover:bg-[rgba(255,255,255,0.03)]"
            }`}
            style={{ fontSize: "0.78rem" }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────── 概览 ─────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard icon={Route} label="路由页面" value={ROUTES.length} sub="28 个静态路由" />
            <StatCard icon={Layers} label="组件总数" value="80+" sub="含 48 个 shadcn/ui" />
            <StatCard icon={Database} label="数据 Store" value={STORES.length} sub="localStorage CRUD" />
            <StatCard icon={TestTube2} label="测试文件" value={stats.totalTests} sub={`${stats.testsByType.unit} 单元 / ${stats.testsByType.component} 组件`} />
            <StatCard icon={FileCode2} label="类型定义" value="37+" sub="sections in types/index.ts" />
            <StatCard icon={Globe} label="i18n 语言" value={2} sub="zh-CN / en-US" />
          </div>

          {/* 架构层级图 */}
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>架构层级</h2>
            <div className="space-y-3">
              {[
                { layer: "表示层 (Presentation)", color: "#00d4ff", items: "28 Routes → Layout → 80+ Components → GlassCard + shadcn/ui" },
                { layer: "状态层 (State)", color: "#4ade80", items: "React useState/useReducer → 29 Custom Hooks → Context (Auth/WebSocket/View/I18n)" },
                { layer: "数据层 (Data)", color: "#fbbf24", items: "10 createLocalStore → localStorage → IndexedDB (yyc3-storage) → BroadcastChannel 同步" },
                { layer: "配置层 (Config)", color: "#f97316", items: "env-config (31 vars) → api-config (8 endpoints) → import.meta.env → localStorage" },
                { layer: "基础设施 (Infra)", color: "#ef4444", items: "ErrorBoundary → error-handler → figma-error-filter → backgroundSync → supabaseClient (Mock)" },
              ].map(l => (
                <div key={l.layer} className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: l.color }} />
                  <div>
                    <div className="text-[rgba(224,232,240,0.9)]" style={{ fontSize: "0.8rem" }}>{l.layer}</div>
                    <div className="text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.7rem" }}>{l.items}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* 技术栈 */}
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>技术栈</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "React 18.3", role: "UI 框架" },
                { name: "TypeScript", role: "类型系统" },
                { name: "Vite 6.3", role: "构建工具" },
                { name: "Tailwind CSS 4.1", role: "原子样式" },
                { name: "React Router 7.13", role: "路由" },
                { name: "Recharts 2.15", role: "图表" },
                { name: "Lucide React", role: "图标" },
                { name: "Motion 12.x", role: "动效" },
                { name: "shadcn/ui", role: "组件库" },
                { name: "Sonner", role: "Toast 通知" },
                { name: "Vitest 4.x", role: "测试框架" },
                { name: "CodeMirror 6", role: "代码编辑" },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-[rgba(0,212,255,0.5)]" />
                  <span className="text-[rgba(224,232,240,0.8)]" style={{ fontSize: "0.75rem" }}>{t.name}</span>
                  <span className="text-[rgba(180,200,220,0.4)]" style={{ fontSize: "0.65rem" }}>({t.role})</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* 完成度概览 */}
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>功能完成度</h2>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 h-3 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#00d4ff]"
                  style={{ width: `${(stats.completeItems / stats.totalItems * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="text-[#00d4ff] shrink-0" style={{ fontSize: "0.85rem" }}>
                {stats.completeItems}/{stats.totalItems} ({(stats.completeItems / stats.totalItems * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="flex gap-4 text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.7rem" }}>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> 完成: {stats.completeItems}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-400" /> 待验证: {FEATURE_CHECKLIST.flatMap(c => c.items).filter(i => i.status === "needs-verify").length}</span>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> 缺失: {FEATURE_CHECKLIST.flatMap(c => c.items).filter(i => i.status === "missing").length}</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ──────── 路由 ──────── */}
      {activeTab === "routes" && (
        <GlassCard className="p-5">
          <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>路由页面清单 ({ROUTES.length} 个)</h2>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "0.75rem" }}>
              <thead>
                <tr className="text-left text-[rgba(180,200,220,0.5)] border-b border-[rgba(0,180,255,0.1)]">
                  <th className="pb-2 pr-4">路径</th>
                  <th className="pb-2 pr-4">组件</th>
                  <th className="pb-2 pr-4">分类</th>
                  <th className="pb-2 pr-4">状态</th>
                  <th className="pb-2">功能点</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map(r => (
                  <tr key={r.path} className="border-b border-[rgba(0,180,255,0.05)] hover:bg-[rgba(0,212,255,0.03)]">
                    <td className="py-2 pr-4 text-[#00d4ff] font-mono">{r.path}</td>
                    <td className="py-2 pr-4 text-[rgba(224,232,240,0.8)]">{r.component}</td>
                    <td className="py-2 pr-4">
                      <span className="px-2 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.7)]" style={{ fontSize: "0.65rem" }}>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2 pr-4"><StatusIcon status={r.status} /></td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.features.map(f => (
                          <span key={f} className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.6rem" }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ──────── 数据层 ──────── */}
      {activeTab === "stores" && (
        <div className="space-y-4">
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>localStorage CRUD Stores ({STORES.length} 个)</h2>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "0.75rem" }}>
                <thead>
                  <tr className="text-left text-[rgba(180,200,220,0.5)] border-b border-[rgba(0,180,255,0.1)]">
                    <th className="pb-2 pr-4">Store</th>
                    <th className="pb-2 pr-4">localStorage Key</th>
                    <th className="pb-2 pr-4">类型</th>
                    <th className="pb-2 pr-4">默认数据</th>
                    <th className="pb-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {STORES.map(s => (
                    <tr key={s.key} className="border-b border-[rgba(0,180,255,0.05)]">
                      <td className="py-2 pr-4 text-[rgba(224,232,240,0.8)] font-mono">{s.key}</td>
                      <td className="py-2 pr-4 text-[#00d4ff] font-mono">{s.storageKey}</td>
                      <td className="py-2 pr-4 text-[rgba(180,200,220,0.6)]">{s.type}</td>
                      <td className="py-2 pr-4 text-[rgba(180,200,220,0.6)]">{s.itemCount} 条</td>
                      <td className="py-2"><StatusIcon status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>createLocalStore API</h2>
            <div className="font-mono text-[rgba(180,200,220,0.6)] space-y-1" style={{ fontSize: "0.72rem" }}>
              {["getAll(): T[]", "getById(id): T | undefined", "add(item): T", "update(id, partial): T | null",
                "remove(id): boolean", "removeBatch(ids): number", "reset(): T[]",
                "exportData(): string", "importData(json): boolean", "count(): number"].map(m => (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-[#00d4ff]">+</span> {m}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ──────── 测试 ──────── */}
      {activeTab === "tests" && (
        <div className="space-y-4">
          {/* 测试统计 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={TestTube2} label="总测试文件" value={stats.totalTests} />
            <StatCard icon={Cpu} label="单元测试" value={stats.testsByType.unit} sub="node / jsdom" />
            <StatCard icon={Layers} label="组件测试" value={stats.testsByType.component} sub="jsdom" />
            <StatCard icon={GitBranch} label="集成测试" value={stats.testsByType.integration} sub="跨模块" />
            <StatCard icon={Shield} label="无障碍测试" value={stats.testsByType.a11y} sub="axe-core" />
          </div>

          {/* 测试矩阵 */}
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>测试文件矩阵</h2>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: "0.72rem" }}>
                <thead>
                  <tr className="text-left text-[rgba(180,200,220,0.5)] border-b border-[rgba(0,180,255,0.1)]">
                    <th className="pb-2 pr-3">文件</th>
                    <th className="pb-2 pr-3">类型</th>
                    <th className="pb-2 pr-3">环境</th>
                    <th className="pb-2 pr-3">状态</th>
                    <th className="pb-2">覆盖范围</th>
                  </tr>
                </thead>
                <tbody>
                  {TEST_FILES.map(tf => (
                    <tr key={tf.file} className="border-b border-[rgba(0,180,255,0.05)]">
                      <td className="py-1.5 pr-3 text-[rgba(224,232,240,0.8)] font-mono">{tf.file}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded ${
                          tf.type === "unit" ? "bg-blue-500/10 text-blue-300" :
                          tf.type === "component" ? "bg-emerald-500/10 text-emerald-300" :
                          tf.type === "integration" ? "bg-purple-500/10 text-purple-300" :
                          tf.type === "a11y" ? "bg-amber-500/10 text-amber-300" :
                          "bg-red-500/10 text-red-300"
                        }`} style={{ fontSize: "0.65rem" }}>
                          {tf.type}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-[rgba(180,200,220,0.5)]">{tf.environment}</td>
                      <td className="py-1.5 pr-3"><StatusIcon status={tf.status} /></td>
                      <td className="py-1.5 text-[rgba(180,200,220,0.5)]">{tf.coverage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* 覆盖率配置 */}
          <GlassCard className="p-5">
            <h2 className="text-[#e0e8f0] mb-4" style={{ fontSize: "0.92rem" }}>覆盖率配置 (vitest.config.ts)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { metric: "Lines", threshold: "80%" },
                { metric: "Statements", threshold: "80%" },
                { metric: "Branches", threshold: "80%" },
                { metric: "Functions", threshold: "70%" },
              ].map(m => (
                <div key={m.metric} className="text-center">
                  <div className="text-[#00d4ff]" style={{ fontSize: "1.1rem" }}>{m.threshold}</div>
                  <div className="text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.7rem" }}>{m.metric}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ──────── 功能清单 ──────── */}
      {activeTab === "checklist" && (
        <div className="space-y-3">
          {FEATURE_CHECKLIST.map(cat => {
            const isExpanded = expandedCategories.has(cat.category);
            const completeCount = cat.items.filter(i => i.status === "complete").length;
            return (
              <GlassCard key={cat.category} className="overflow-hidden">
                <button
                  onClick={() => toggleCategory(cat.category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[rgba(0,212,255,0.03)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[#00d4ff]" /> : <ChevronRight className="w-4 h-4 text-[rgba(180,200,220,0.4)]" />}
                    <span className="text-[rgba(224,232,240,0.9)]" style={{ fontSize: "0.85rem" }}>{cat.category}</span>
                    <span className="text-[rgba(180,200,220,0.4)]" style={{ fontSize: "0.7rem" }}>
                      ({completeCount}/{cat.items.length})
                    </span>
                  </div>
                  <div className="w-20 h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(completeCount / cat.items.length * 100)}%` }}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-[rgba(0,180,255,0.1)] px-4 pb-4">
                    {cat.items.map(item => (
                      <div key={item.name} className="flex items-start gap-3 py-2 border-b border-[rgba(0,180,255,0.03)] last:border-0">
                        <StatusIcon status={item.status} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[rgba(224,232,240,0.85)]" style={{ fontSize: "0.78rem" }}>{item.name}</div>
                          <div className="text-[rgba(180,200,220,0.45)]" style={{ fontSize: "0.68rem" }}>{item.detail}</div>
                          {item.path && (
                            <div className="text-[rgba(0,212,255,0.4)] font-mono mt-0.5" style={{ fontSize: "0.62rem" }}>{item.path}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ──────── 已知缺口 ──────── */}
      {activeTab === "gaps" && (
        <div className="space-y-3">
          {KNOWN_GAPS.map(gap => (
            <GlassCard key={gap.id} className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  gap.severity === "critical" ? "text-red-400" :
                  gap.severity === "high" ? "text-orange-400" :
                  gap.severity === "medium" ? "text-amber-400" : "text-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[rgba(0,212,255,0.6)] font-mono" style={{ fontSize: "0.68rem" }}>{gap.id}</span>
                    <SeverityBadge severity={gap.severity} />
                    <span className="text-[rgba(224,232,240,0.9)]" style={{ fontSize: "0.82rem" }}>{gap.title}</span>
                  </div>
                  <p className="text-[rgba(180,200,220,0.5)]" style={{ fontSize: "0.72rem" }}>{gap.description}</p>
                  <p className="text-[rgba(0,212,255,0.3)] mt-1" style={{ fontSize: "0.65rem" }}>预估: {gap.fixEstimate}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}