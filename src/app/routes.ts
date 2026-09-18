/**
 * routes.ts
 * ==========
 * YYC³ 路由配置 (v4 — 2026-03-17 精简盘点版)
 *
 * 精简收拢原则:
 *   1. 监控中心: / (数据监控), /follow-up (一键跟进), /patrol (巡查模式), /alerts (告警规则)
 *   2. 运维管理: /operations (操作中心), /files (文件管理), /database (数据库管理), /connection-test (连接测试), /loop (闭环), /reports (报表导出)
 *   3. AI 智能: /models (API 矩阵与模型管理), /ai (AI 辅助决策), /ai-diagnosis (AI 诊断)
 *   4. AI Family: /ai-family (12小时钟盘), /ai-family-center (Family中心), /ai-family-design (设计文档), /ai-family-sub/:subpage (按需子项)
 *   5. 开发规范: /design-system (设计系统), /dev-guide (开发指南)
 *   6. 系统管理: /audit (操作审计), /users (用户管理), /settings (系统设置), /security (安全监控), /pwa (PWA管理), /env-config (环境变量)
 *
 * 重叠/开发冗余路由重定向/兼容处理，核心组件按需 lazy 加载。
 */

import React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AIFamilyRouter } from "./components/ai-family/AIFamilyRouter";
import { LazyWrap } from "./components/ai-family/LazyWrap";
import { AIDiagnostics } from "./components/AIDiagnostics";
import { AISuggestionPanel } from "./components/AISuggestionPanel";
import { AlertRulesPanel } from "./components/AlertRulesPanel";
import { DatabaseManager } from "./components/DatabaseManager";
import { DataMonitoring } from "./components/DataMonitoring";
import { DesignSystemPage } from "./components/design-system/DesignSystemPage";
import { DevGuidePage } from "./components/DevGuidePage";
import { EnvConfigEditor } from "./components/EnvConfigEditor";
import { FollowUpPanel } from "./components/FollowUpPanel";
import { Layout } from "./components/Layout";
import { LocalFileManager } from "./components/LocalFileManager";
import { ModelProviderPanel } from "./components/ModelProviderPanel";
import { NotFound } from "./components/NotFound";
import { OperationAudit } from "./components/OperationAudit";
import { OperationCenter } from "./components/OperationCenter";
import { PatrolDashboard } from "./components/PatrolDashboard";
import { PWAStatusPanel } from "./components/PWAStatusPanel";
import { ReportExporter } from "./components/ReportExporter";
import { SecurityMonitor } from "./components/SecurityMonitor";
import { ServiceConnectionTest } from "./components/ServiceConnectionTest";
import { ServiceLoopPanel } from "./components/ServiceLoopPanel";
import { SystemSettings } from "./components/SystemSettings";
import { UserManagement } from "./components/UserManagement";

// AI Family 独立入口页 — lazy load
const AIFamilyPageLazy = React.lazy(() =>
  import("./components/AIFamilyPage").then(m => ({ default: m.AIFamilyPage }))
);
const AIFamilyDesignDocLazy = React.lazy(() =>
  import("./components/AIFamilyDesignDoc").then(m => ({ default: m.AIFamilyDesignDoc }))
);
const AIFamilyCenterPageLazy = React.lazy(() =>
  import("./components/AIFamilyCenterPage").then(m => ({ default: m.AIFamilyCenterPage }))
);

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
        { index: true, Component: DataMonitoring },
        { path: "follow-up", Component: FollowUpPanel },
        { path: "patrol", Component: PatrolDashboard },
        { path: "alerts", Component: AlertRulesPanel },

        // 2. 运维管理
        { path: "operations", Component: OperationCenter },
        { path: "files", Component: LocalFileManager },
        { path: "database", Component: DatabaseManager },
        { path: "connection-test", Component: ServiceConnectionTest },
        { path: "loop", Component: ServiceLoopPanel },
        { path: "reports", Component: ReportExporter },

        // 重叠文件/数据库页面自动重定向
        { path: "host-files", element: React.createElement(Navigate, { to: "/files", replace: true }) },
        { path: "db-connections", element: React.createElement(Navigate, { to: "/database", replace: true }) },
        { path: "data-editor", element: React.createElement(Navigate, { to: "/database", replace: true }) },

        // 3. AI 智能 (API 矩阵与模型)
        { path: "models", Component: ModelProviderPanel },
        { path: "ai", Component: AISuggestionPanel },
        { path: "ai-diagnosis", Component: AIDiagnostics },

        // 4. AI Family
        {
          path: "ai-family",
          element: React.createElement(LazyWrap, { Component: AIFamilyPageLazy }),
        },
        {
          path: "ai-family-center",
          element: React.createElement(LazyWrap, { Component: AIFamilyCenterPageLazy }),
        },
        {
          path: "ai-family-design",
          element: React.createElement(LazyWrap, { Component: AIFamilyDesignDocLazy }),
        },
        { path: "ai-family-sub/:subpage", Component: AIFamilyRouter },

        // 旧兼容路径重定向至子分发器
        { path: "ai-family-home", Component: AIFamilyRouter },
        { path: "ai-family-chat", Component: AIFamilyRouter },
        { path: "ai-family-share", Component: AIFamilyRouter },
        { path: "ai-family-learn", Component: AIFamilyRouter },
        { path: "ai-family-music", Component: AIFamilyRouter },
        { path: "ai-family-growth", Component: AIFamilyRouter },
        { path: "ai-family-phone", Component: AIFamilyRouter },
        { path: "ai-family-fun", Component: AIFamilyRouter },
        { path: "ai-family-activities", Component: AIFamilyRouter },
        { path: "ai-family-models", Component: AIFamilyRouter },
        { path: "ai-family-voice", Component: AIFamilyRouter },
        { path: "ai-family-data", Component: AIFamilyRouter },
        { path: "ai-family-comm", Component: AIFamilyRouter },
        { path: "ai-family-settings", Component: AIFamilyRouter },

        // 5. 开发规范
        { path: "design-system", Component: DesignSystemPage },
        { path: "dev-guide", Component: DevGuidePage },

        // 隐藏/精简掉的纯展示开发工具重定向至 dev-guide
        { path: "terminal", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "ide", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "theme", element: React.createElement(Navigate, { to: "/settings", replace: true }) },
        { path: "refactoring", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },
        { path: "architecture", element: React.createElement(Navigate, { to: "/dev-guide", replace: true }) },

        // 6. 系统管理
        { path: "audit", Component: OperationAudit },
        { path: "users", Component: UserManagement },
        { path: "settings", Component: SystemSettings },
        { path: "security", Component: SecurityMonitor },
        { path: "pwa", Component: PWAStatusPanel },
        { path: "env-config", Component: EnvConfigEditor },
        { path: "performance", element: React.createElement(Navigate, { to: "/security", replace: true }) },

        { path: "*", Component: NotFound },
      ],
    },
  ],
  { basename }
);
