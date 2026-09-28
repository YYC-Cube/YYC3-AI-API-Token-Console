/**
 * routes.ts
 * ==========
 * YYC³ 路由配置 (v5 — 路由级代码分割全覆盖)
 *
 * 精简收拢原则:
 *   1. 监控中心: / (数据监控), /follow-up (一键跟进), /patrol (巡查模式), /alerts (告警规则)
 *   2. 运维管理: /operations (操作中心), /files (文件管理), /database (数据库管理), /connection-test (连接测试), /loop (闭环), /reports (报表导出)
 *   3. AI 智能: /models (API 矩阵与模型管理), /ai (AI 辅助决策), /ai-diagnosis (AI 诊断)
 *   4. AI Family: /ai-family (12小时钟盘), /ai-family-center (Family中心), /ai-family-design (设计文档), /ai-family-sub/:subpage (按需子项)
 *   5. 开发规范: /design-system (设计系统), /dev-guide (开发指南)
 *   6. 系统管理: /audit (操作审计), /users (用户管理), /settings (系统设置), /security (安全监控), /pwa (PWA管理), /env-config (环境变量)
 *
 * v5 变更 (性能维度):
 *   - 页面组件全量 React.lazy 化 (主包仅保留 Layout 壳 + NotFound 兜底),
 *     CodeMirror/Recharts 等重型依赖随路由 chunk 按需加载
 *   - lazyPage 泛型 helper: 导出名拼写错误在编译期暴露
 *   - 重叠/开发冗余路由重定向/兼容处理保持不变
 */

import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { LazyWrap } from "./components/ai-family/LazyWrap";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/NotFound";

// ────────────────────────────────────────────
//  路由级代码分割 (lazy 声明区)
// ────────────────────────────────────────────

/** lazy 组件声明: loader + 命名导出名 (拼写受 keyof 约束, 编译期校验) */
function lazyPage<T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T & string
): React.LazyExoticComponent<React.ComponentType> {
  return React.lazy(() => loader().then(m => ({ default: m[name] })));
}

/** Suspense 包装的路由 element (复用 ai-family LazyWrap 壳) */
function lazyEl(Component: React.LazyExoticComponent<React.ComponentType>) {
  return React.createElement(LazyWrap, { Component });
}

// 1. 监控中心
const DataMonitoring = lazyPage(() => import("./components/DataMonitoring"), "DataMonitoring");
const FollowUpPanel = lazyPage(() => import("./components/FollowUpPanel"), "FollowUpPanel");
const PatrolDashboard = lazyPage(() => import("./components/PatrolDashboard"), "PatrolDashboard");
const AlertRulesPanel = lazyPage(() => import("./components/AlertRulesPanel"), "AlertRulesPanel");

// 2. 运维管理
const OperationCenter = lazyPage(() => import("./components/OperationCenter"), "OperationCenter");
const LocalFileManager = lazyPage(() => import("./components/LocalFileManager"), "LocalFileManager");
const DatabaseManager = lazyPage(() => import("./components/DatabaseManager"), "DatabaseManager");
const ServiceConnectionTest = lazyPage(() => import("./components/ServiceConnectionTest"), "ServiceConnectionTest");
const ServiceLoopPanel = lazyPage(() => import("./components/ServiceLoopPanel"), "ServiceLoopPanel");
const ReportExporter = lazyPage(() => import("./components/ReportExporter"), "ReportExporter");

// 3. AI 智能 (API 矩阵与模型)
const ModelProviderPanel = lazyPage(() => import("./components/ModelProviderPanel"), "ModelProviderPanel");
const GatewayKeysPanel = lazyPage(() => import("./components/GatewayKeysPanel"), "GatewayKeysPanel");
const AISuggestionPanel = lazyPage(() => import("./components/AISuggestionPanel"), "AISuggestionPanel");
const AIDiagnostics = lazyPage(() => import("./components/AIDiagnostics"), "AIDiagnostics");

// 4. AI Family
const AIFamilyPage = lazyPage(() => import("./components/AIFamilyPage"), "AIFamilyPage");
const AIFamilyCenterPage = lazyPage(() => import("./components/AIFamilyCenterPage"), "AIFamilyCenterPage");
const AIFamilyDesignDoc = lazyPage(() => import("./components/AIFamilyDesignDoc"), "AIFamilyDesignDoc");
const AIFamilyRouter = lazyPage(() => import("./components/ai-family/AIFamilyRouter"), "AIFamilyRouter");

// 5. 开发规范
const DesignSystemPage = lazyPage(() => import("./components/design-system/DesignSystemPage"), "DesignSystemPage");
const DevGuidePage = lazyPage(() => import("./components/DevGuidePage"), "DevGuidePage");

// 6. 系统管理
const OperationAudit = lazyPage(() => import("./components/OperationAudit"), "OperationAudit");
const UserManagement = lazyPage(() => import("./components/UserManagement"), "UserManagement");
const SystemSettings = lazyPage(() => import("./components/SystemSettings"), "SystemSettings");
const SecurityMonitor = lazyPage(() => import("./components/SecurityMonitor"), "SecurityMonitor");
const PWAStatusPanel = lazyPage(() => import("./components/PWAStatusPanel"), "PWAStatusPanel");
const EnvConfigEditor = lazyPage(() => import("./components/EnvConfigEditor"), "EnvConfigEditor");

// ────────────────────────────────────────────
//  路由表
// ────────────────────────────────────────────

// 子路径部署: basename 对齐 Vite base (VITE_BASE 环境变量, 默认 '/')
// 根路径部署时 BASE_URL === '/', basename 不生效; 子路径部署时自动匹配
const basename = import.meta.env.BASE_URL || "/";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        // 1. 监控中心
        { index: true, element: lazyEl(DataMonitoring) },
        { path: "follow-up", element: lazyEl(FollowUpPanel) },
        { path: "patrol", element: lazyEl(PatrolDashboard) },
        { path: "alerts", element: lazyEl(AlertRulesPanel) },

        // 2. 运维管理
        { path: "operations", element: lazyEl(OperationCenter) },
        { path: "files", element: lazyEl(LocalFileManager) },
        { path: "database", element: lazyEl(DatabaseManager) },
        { path: "connection-test", element: lazyEl(ServiceConnectionTest) },
        { path: "loop", element: lazyEl(ServiceLoopPanel) },
        { path: "reports", element: lazyEl(ReportExporter) },

        // 重叠文件/数据库页面自动重定向
        { path: "host-files", element: React.createElement(Navigate, { to: "/files", replace: true }) },
        { path: "db-connections", element: React.createElement(Navigate, { to: "/database", replace: true }) },
        { path: "data-editor", element: React.createElement(Navigate, { to: "/database", replace: true }) },

        // 3. AI 智能 (API 矩阵与模型)
        { path: "models", element: lazyEl(ModelProviderPanel) },
        { path: "gateway-keys", element: lazyEl(GatewayKeysPanel) },
        { path: "ai", element: lazyEl(AISuggestionPanel) },
        { path: "ai-diagnosis", element: lazyEl(AIDiagnostics) },

        // 4. AI Family
        { path: "ai-family", element: lazyEl(AIFamilyPage) },
        { path: "ai-family-center", element: lazyEl(AIFamilyCenterPage) },
        { path: "ai-family-design", element: lazyEl(AIFamilyDesignDoc) },
        { path: "ai-family-sub/:subpage", element: lazyEl(AIFamilyRouter) },

        // 旧兼容路径重定向至子分发器
        { path: "ai-family-home", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-chat", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-share", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-learn", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-music", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-growth", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-phone", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-fun", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-activities", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-models", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-voice", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-data", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-comm", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-settings", element: lazyEl(AIFamilyRouter) },
        { path: "ai-family-drama", element: lazyEl(AIFamilyRouter) },

        // 5. 开发规范
        { path: "design-system", element: lazyEl(DesignSystemPage) },
        { path: "dev-guide", element: lazyEl(DevGuidePage) },

        // 隐藏/精简掉的纯展示开发工具重定向至 dev-guide
        { path: "terminal", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "ide", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "theme", element: React.createElement(Navigate, { to: "/settings", replace: true }) },
        { path: "refactoring", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "architecture", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },

        // 6. 系统管理
        { path: "audit", element: lazyEl(OperationAudit) },
        { path: "users", element: lazyEl(UserManagement) },
        { path: "settings", element: lazyEl(SystemSettings) },
        { path: "security", element: lazyEl(SecurityMonitor) },
        { path: "pwa", element: lazyEl(PWAStatusPanel) },
        { path: "env-config", element: lazyEl(EnvConfigEditor) },
        { path: "performance", element: React.createElement(Navigate, { to: "/security", replace: true }) },

        { path: "*", Component: NotFound },
      ],
    },
  ],
  { basename }
);
