/**
 * DEVELOPER-HANDOFF.ts
 * =====================
 * YYC³ CloudPivot Intelli-Matrix — 完整开发者衔接文档
 *
 * 最后更新: 2026-02-25
 * 适用版本: cpim-cli v3.2.0
 *
 * 用途:
 * - 新成员本地跑通项目的完整指南
 * - Phase 1 ~ Phase 3 已完成工作清单与技术决策
 * - 已知遗留项 & 后续优化建议
 * - 测试覆盖与 CI 流程说明
 *
 * ⚠ 本文件仅作为代码内文档存在，不会被运行时加载
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  目录
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  0. 快速启动
//  1. 项目全貌与架构
//  2. 目录结构详解
//  3. 路由与导航架构
//  4. 类型系统（21 类）
//  5. 核心 Hooks 清单
//  6. 组件层次结构
//  7. 样式系统（Tailwind v4 + CSS 自定义属性）
//  8. 国际化（zh-CN / en-US）
//  9. 测试体系
// 10. 已完成功能清单
// 11. 已知遗留项 & TODO
// 12. 环境变量与配置
// 13. CI/CD 流程
// 14. 开发规范与约定
// 15. 常见问题排查
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  0. 快速启动 (Quick Start)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const QUICK_START = `
┌──────────────────────────────────────────────────────────┐
│  YYC³ CloudPivot Intelli-Matrix — 本地跑通指南           │
│  ────────────────────────────────────────────────────── │
│                                                          │
│  前置条件:                                               │
│  • Node.js ≥ 18.x (推荐 20.x LTS)                       │
│  • pnpm ≥ 8.x (项目使用 pnpm 作为包管理器)              │
│  • macOS / Linux / Windows (已在 M4 Max macOS 15.3 验证) │
│                                                          │
│  ═══════════════════════════════════════════════════════  │
│                                                          │
│  Step 1: 安装依赖                                        │
│  ─────────────────                                       │
│  $ pnpm install                                          │
│                                                          │
│  Step 2: 启动开发服务器                                  │
│  ─────────────────────                                   │
│  $ pnpm dev                                              │
│  → 默认监听 http://localhost:5173                        │
│  → 生产部署建议: http://192.168.3.x:3118                │
│                                                          │
│  Step 3: 运行测试                                        │
│  ─────────────────                                       │
│  $ pnpm test                       # 单次运行            │
│  $ pnpm test:watch                 # 监听模式            │
│  $ pnpm test:coverage              # 覆盖率报告          │
│                                                          │
│  Step 4: 构建生产包                                      │
│  ─────────────────                                       │
│  $ pnpm build                                            │
│  → 产物在 dist/ 目录                                    │
│                                                          │
│  Step 5: 本地预览生产构建                                │
│  ─────────────────────                                   │
│  $ pnpm preview                                          │
│                                                          │
│  ═══════════════════════════════════════════════════════  │
│                                                          │
│  登录方式:                                               │
│  • 正常登录: 需 Supabase 认证 (或点击 GHOST MODE)        │
│  • 幽灵模式: 点击登录页 GHOST MODE 按钮跳过认证          │
│    → 以 ghost@yyc3.local / developer 角色进入            │
│    → 所有功能可用，数据仅 localStorage                   │
│                                                          │
│  首页快速导航:                                           │
│  • Ctrl/⌘ + K    打开命令面板 (全局搜索)                 │
│  • Ctrl + \`       打开集成终端                           │
│  • 左侧 Sidebar   5 类导航 (桌面端)                     │
│  • 底部 BottomNav  4+1 导航 (移动端)                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. 项目全貌与架构
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ARCHITECTURE = `
┌─────────────────────────────────────────────────────────────┐
│                  YYC³ CP-IM 架构总览                        │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ React 18    │  │ TypeScript   │  │ Tailwind CSS v4 │   │
│  │ + Router 7  │  │ Strict Mode  │  │ + CSS Variables  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼──────────┐ │
│  │                   Vite 6.3.5                          │ │
│  │              (Dev Server + Build)                     │ │
│  └──────────────────────┬────────────────────────────────┘ │
│                         │                                   │
│  ┌──────────────────────▼────────────────────────────────┐ │
│  │                  核心分层                              │ │
│  │                                                        │ │
│  │  App.tsx (入口 + Auth Context + I18n Provider)          │ │
│  │    ↓                                                    │ │
│  │  routes.ts (React Router Data Mode, 25 路由)            │ │
│  │    ↓                                                    │ │
│  │  Layout.tsx (Sidebar + TopBar + BottomNav + 终端 + AI)  │ │
│  │    ↓                                                    │ │
│  │  各页面组件 (DataMonitoring / Patrol / Operations ...)  │ │
│  │    ↓                                                    │ │
│  │  原子组件 (GlassCard / AlertBanner / ConnectionStatus)  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  数据层                                │ │
│  │                                                        │ │
│  │  useWebSocketData.ts  ← 模拟 WebSocket 实时数据推送    │ │
│  │  useBigModelSDK.ts    ← AI SDK Bridge (Z.ai/OpenAI)   │ │
│  │  supabaseClient.ts    ← 认证 + Ghost Mode              │ │
│  │  localStorage         ← 会话/配置/主题持久化            │ │
│  │  IndexedDB (planned)  ← 大量数据本地缓存               │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  设计风格: 赛博朋克 (深蓝 #060e1f + 青色 #00d4ff)          │
│  部署目标: 本地 192.168.3.x:3118 (PWA 离线可用)            │
│  目标用户: YYC³ Family 内部 AI 研发 / 运维团队              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

技术栈版本锁定:
─────────────────────────────────────────────────────────
│ 依赖              │ 版本        │ 说明                  │
│───────────────────│─────────────│───────────────────────│
│ React             │ 18.3.1      │ peerDependency        │
│ React Router      │ 7.13.0      │ Data Mode (非 DOM)    │
│ TypeScript        │ (Vite 内置) │ Strict                │
│ Tailwind CSS      │ 4.1.12      │ v4, 无 tailwind.config│
│ Vite              │ 6.3.5       │ 锁定                  │
│ Vitest            │ ^4.0.18     │ 测试框架              │
│ Motion            │ 12.23.24    │ 动画 (原 Framer Motion)│
│ Recharts          │ 2.15.2      │ 图表                  │
│ Lucide React      │ 0.487.0     │ 图标                  │
│ Sonner            │ 2.0.3       │ Toast 通知            │
│ react-hook-form   │ 7.55.0      │ 表单 (版本锁定)       │
─────────────────────────────────────────────────────────

关键设计决策:
• 纯前端 Mock: 所有数据均为前端模拟，无真实后端依赖
• Ghost Mode: 跳过 Supabase 认证的开发便捷入口
• react-router (非 react-router-dom): 环境限制, 使用 react-router 单包
• Tailwind v4: 使用 @tailwindcss/vite 插件, 不需要 tailwind.config
• CSS 自定义属性: 主题 token 定义在 /src/styles/theme.css
• Motion (非 framer-motion): 统一使用 motion/react 导入路径
`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2. 目录结构详解
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DIRECTORY_STRUCTURE = `
/
├── package.json                    # 依赖清单, 脚本定义
├── vite.config.ts                  # Vite 配置
├── vitest.config.ts                # Vitest 配置 (如有)
├── tsconfig.json                   # TypeScript 配置
│
├── /src
│   ├── /styles
│   │   ├── index.css               # 主 CSS 入口
│   │   ├── tailwind.css            # Tailwind 导入
│   │   ├── theme.css               # CSS 自定义属性 (设计 token)
│   │   └── fonts.css               # @font-face 声明
│   │
│   ├── /app
│   │   ├── App.tsx                 # 根组件 (Auth + I18n + Router)
│   │   ├── routes.ts               # React Router 路由定义 (17 路由)
│   │   │
│   │   ├── /types
│   │   │   └── index.ts            # 全局统一类型 (21 大类, ~910 行)
│   │   │
│   │   ├── /hooks                  # 自定义 Hooks (19 个)
│   │   │   ├── useWebSocketData.ts # WebSocket 模拟 + 实时数据
│   │   │   ├── useBigModelSDK.ts   # AI SDK Bridge
│   │   │   ├── useTerminal.ts      # CLI 终端引擎
│   │   │   ├── useI18n.ts          # 国际化
│   │   │   ├── useKeyboardShortcuts.ts # 全局快捷键
│   │   │   ├── useMobileView.ts    # 响应式断点
│   │   │   ├── usePatrol.ts        # 巡查模式逻辑
│   │   │   ├── useFollowUp.ts      # 跟进系统逻辑
│   │   │   ├── useOperationCenter.ts # 操作中心逻辑
│   │   │   ├── useModelProvider.ts # 模型供应商管理
│   │   │   ├── useAISuggestion.ts  # AI 辅助决策
│   │   │   ├── useServiceLoop.ts   # 服务闭环
│   │   │   ├── useLocalFileSystem.ts # 本地文件系统
│   │   │   ├── useNetworkConfig.ts # 网络配置
│   │   │   ├── useOfflineMode.ts   # 离线模式
│   │   │   ├── usePWAManager.ts    # PWA 管理
│   │   │   ├── usePushNotifications.ts # 推送通知
│   │   │   ├── useInstallPrompt.ts # PWA 安装提示
│   │   │   ├── useYYC3Head.ts      # 品牌 <head> 注入
│   │   │   ├── useSecurityMonitor.ts # 安全与性能监控
│   │   │   ├── useAlertRules.ts    # 智能告警规则配置
│   │   │   ├── useReportExporter.ts # 性能报表生成与导出
│   │   │   └── useAIDiagnostics.ts # AI 辅助诊断
│   │   │
│   │   ├── /i18n                   # 国际化语言包
│   │   │   ├── index.ts            # 导出 + 工具
│   │   │   ├── zh-CN.ts            # 中文简体
│   │   │   └── en-US.ts            # English (US)
│   │   │
│   │   ├── /lib                    # 工具库
│   │   │   ├── supabaseClient.ts   # Supabase 客户端 + Ghost Mode
│   │   │   ├── error-handler.ts    # 全局错误处理
│   │   │   ├── db-queries.ts       # 数据库查询工具
│   │   │   ├── network-utils.ts    # 网络工具
│   │   │   ├── backgroundSync.ts   # 后台同步队列
│   │   │   └── yyc3-icons.ts       # 自定义图标库 (yyc3-badge-icons CDN + 本地)
│   │   │
│   │   ├── /components             # 组件库 (55+ 组件)
│   │   │   ├── Layout.tsx          # 主布局 (Sidebar + TopBar + Terminal)
│   │   │   ├── TopBar.tsx          # 顶栏 (移动端抽屉菜单)
│   │   │   ├── Sidebar.tsx         # 侧边栏 (桌面端, 5 类导航)
│   │   │   ├── BottomNav.tsx       # 底部导航 (移动端 4+1)
│   │   │   │
│   │   │   ├── Login.tsx           # ��录页 (含 Ghost Mode)
│   │   │   ├── GlassCard.tsx       # 通用玻璃卡片
│   │   │   ├── Dashboard.tsx       # 仪表盘卡片
│   │   │   ├── DataMonitoring.tsx   # 数据监控主页
│   │   │   │
│   │   │   ├── FollowUpPanel.tsx    # 一键跟进主页
│   │   │   ├── FollowUpCard.tsx     # 告警卡片
│   │   │   ├── FollowUpDrawer.tsx   # 跟进抽屉
│   │   │   ├── OperationChain.tsx   # 操作链路时间线
│   │   │   ├── QuickActionGroup.tsx # 快速操作按钮组
│   │   │   │
│   │   │   ├── PatrolDashboard.tsx  # 巡查仪表盘
│   │   │   ├── PatrolScheduler.tsx  # 巡查计划
│   │   │   ├── PatrolReport.tsx     # 巡查报告
│   │   │   ├── PatrolHistory.tsx    # 巡查历史
│   │   │   │
│   │   │   ├── OperationCenter.tsx  # 操作中心主界面
│   │   │   ├── OperationCategory.tsx # 操作分类
│   │   │   ├── QuickActionGrid.tsx  # 快速操作网格
│   │   │   ├── OperationTemplate.tsx # 操作模板
│   │   │   ├── OperationLogStream.tsx # 实时操作日志
│   │   │   │
│   │   │   ├── LocalFileManager.tsx  # 本地文件管理器
│   │   │   ├── FileBrowser.tsx       # 文件浏览���
│   │   │   ├── LogViewer.tsx         # 日志查看器
│   │   │   ├── ReportGenerator.tsx   # 报告生成器
│   │   │   │
│   │   │   ├── AISuggestionPanel.tsx # AI 决策面板 (双 Tab)
│   │   │   ├── SDKChatPanel.tsx      # AI 流式聊天
│   │   │   ├── AIAssistant.tsx       # AI 悬浮助手
│   │   │   ├── ActionRecommender.tsx # 操作推荐引擎
│   │   │   ├── PatternAnalyzer.tsx   # 模式分析器
│   │   │   │
│   │   │   ├── IntegratedTerminal.tsx # 集成终端 (多 Tab)
│   │   │   ├── CLITerminal.tsx        # 全页终端
│   │   │   ├── IDEPanel.tsx           # IDE 面板
│   │   │   │
│   │   │   ├── ModelProviderPanel.tsx # 模型供应商管理
│   │   │   ├── AddModelModal.tsx      # 添加模型弹窗
│   │   │   │
│   │   │   ├── ServiceLoopPanel.tsx   # 服务闭环面板
│   │   │   ├── LoopStageCard.tsx      # 闭环阶段卡片
│   │   │   ├── DataFlowDiagram.tsx    # 数据流向图
│   │   │   │
│   │   │   ├── ThemeCustomizer.tsx    # 主题定制页
│   │   │   ├── /theme                 # 主题子组件
│   │   │   │   ├── ColorPicker.tsx    # 颜色拾取器
│   │   │   │   ├── ColorSwatch.tsx    # 颜色色板
│   │   │   │   ├── color-utils.ts     # OKLch/HEX 转换
│   │   │   │   └── theme-presets.ts   # 6 套预设主题
│   │   │   │
│   │   │   ├── /design-system         # 设计系统页
│   │   │   │   ├── DesignSystemPage.tsx
│   │   │   │   ├── DesignTokens.tsx
│   │   │   │   ├── ComponentShowcase.tsx
│   │   │   │   └── StageReview.tsx
│   │   │   │
│   │   │   ├── OperationAudit.tsx     # 操作审计
│   │   │   ├── UserManagement.tsx     # 用户管理
│   │   │   ├── SystemSettings.tsx     # 系统设置
│   │   │   ├── NetworkConfig.tsx      # 网络配置
│   │   │   ├── DevGuidePage.tsx       # 开发指南
│   │   │   ├── PWAStatusPanel.tsx     # PWA 状态
│   │   │   │
│   │   │   ├── ConnectionStatus.tsx   # 连接状态指示器
│   │   │   ├── LanguageSwitcher.tsx   # 语言切换
│   │   │   ├── CommandPalette.tsx     # 命令面板 (⌘K)
│   │   │   ├── AlertBanner.tsx        # 告警横幅
│   │   │   ├── NodeDetailModal.tsx    # 节点详情弹窗
│   │   │   ├── ErrorBoundary.tsx      # 错误边界
│   │   │   ├── PWAInstallPrompt.tsx   # PWA 安装提示
│   │   │   ├── OfflineIndicator.tsx   # 离线指示器
│   │   │   └── YYC3Logo.tsx           # 品牌 Logo
│   │   │
│   │   ├── /docs                      # 代码内文档
│   │   │   ├── API-REFERENCE.ts       # API 参考
│   │   │   ├── COMPONENT-REFERENCE.ts # 组件参考
│   │   │   ├── TESTING-GUIDE.ts       # 测试指南
│   │   │   └── DEVELOPER-HANDOFF.ts   # [本文件] 开发者衔接
│   │   │
│   │   ├── /ci                        # CI 配置
│   │   │   └── github-actions-ci.yml  # GitHub Actions
│   │   │
│   │   └── /__tests__                 # 测试文件 (65+ 测试文件)
│   │       ├── setup.ts               # Vitest 全局 setup
│   │       ├── i18n-consistency.test.ts # i18n 键一致性
│   │       └── ... (按组件/Hook 1:1 对应)
│   │
│   └── /imports                       # Figma 导入资产
│
├── /guidelines
│   └── Guidelines.md                  # 设计规范文档
│
├── /BigModelSDK                       # SDK 参考代码
│
├── /YYC3-Data.md                      # 参考文档 1
├── /YYC3-Data-1.md                    # 参考文档 2
└── /YYC3-Data-2.md                    # 参考文档 3
`;


// ━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3. 路由与导航架构
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ROUTING = `
React Router 7 Data Mode (createBrowserRouter)
───────────────────────────────────────────────

路由定义: /src/app/routes.ts
布局壳层: Layout.tsx → <Outlet />

┌────────────────────────────────────────────────────────┐
│ 路径              │ 组件                  │ 导航类别     │
│───────────────────│───────────────────────│──────────────│
│ /                 │ DataMonitoring        │ 监控中心     │
│ /follow-up        │ FollowUpPanel         │ 监控中心     │
│ /patrol           │ PatrolDashboard       │ 监控中心     │
│ /operations       │ OperationCenter       │ 运维管理     │
│ /files            │ LocalFileManager      │ 运维管理     │
│ /ai               │ AISuggestionPanel     │ AI 智能      │
│ /models           │ ModelProviderPanel    │ AI 智能      │
│ /loop             │ ServiceLoopPanel      │ AI 智能      │
│ /design-system    │ DesignSystemPage      │ 开发工具     │
│ /dev-guide        │ DevGuidePage          │ 开发工具     │
│ /theme            │ ThemeCustomizer       │ 开发工具     │
│ /terminal         │ CLITerminal           │ 开发工具     │
│ /ide              │ IDEPanel              │ 开发工具     │
│ /audit            │ OperationAudit        │ 系统管理     │
│ /users            │ UserManagement        │ 系统管理     │
│ /settings         │ SystemSettings        │ 系统管理     │
│ /pwa              │ PWAStatusPanel        │ (未归类)     │
└────────────────────────────────────────────────────────┘

导航入口:
────────
桌面端:
  • Sidebar.tsx: 5 个类别，每类 hover flyout 子菜单
    - 收起态 52px / 展开态 208px
    - 状态 ❌ 未持久化到 localStorage
  • TopBar.tsx: 品牌标识 + ⌘K 搜索 + 连接状态 + 终端图标 + 通知 + 用户

移动端/平板:
  • BottomNav.tsx: 4+1 "更多" 模式
    - 固��� 4 个: 监控 / 跟进 / 巡查 / AI
    - "更多" 弹出 Drawer (Motion 弹簧动画)
  • TopBar.tsx 移动端: hamburger → 全屏左侧滑入抽屉
    - 分类手风琴折叠
    - 搜索框移入抽屉
    - 通知面板底部 sheet

终端内路由跳转:
  • goto <path>   — 终端命令，跳转到指定页面
  • open <path>   — 同义词
  • 支持 Tab 自动补全 17 条路由
  • 支持中文名称模糊匹配 (如 "goto 巡查" → /patrol)
`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  4. 类型系统 (21 类)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TYPE_SYSTEM = `
所有类型集中在: /src/app/types/index.ts (~910 行)
设计原则: 同一业务概念只定义一次，全局 import

┌────┬────────────────────────────────────────────────┐
│ #  │ 分类                        │ 核心类型           │
│────│─────────────────────────────│────────────────────│
│  1 │ 用户与认证                  │ AppUser, AppSession, AuthContextValue  │
│  2 │ 节点与集群                  │ NodeData, NodeStatusRecord            │
│  3 │ 模型与 Agent                │ Model, Agent, InferenceLog            │
│  4 │ WebSocket 通信              │ WSMessage, WebSocketDataState         │
│  5 │ 网络配置                    │ NetworkConfig, NetworkInterface       │
│  6 │ 后台同步                    │ SyncItem, SyncQueueStats              │
│  7 │ 错误处理                    │ AppError, ErrorStats                  │
│  8 │ 响应式布局                  │ ViewState, Breakpoint                 │
│  9 │ UI 组件公共 Props           │ ChatMessage, CommandCategory          │
│ 10 │ 一键跟进系统                │ FollowUpItem, ChainEvent              │
│ 11 │ 操作中心                    │ OperationItem, OperationTemplateItem  │
│ 12 │ IDE 终端集成                │ TerminalHistoryEntry, IDEPanelTab     │
│ 13 │ 本地文件系统                │ FileItem, LogEntry, ReportConfig      │
│ 14 │ 快捷键系统                  │ KeyboardShortcut                      │
│ 15 │ AI 辅助决策                 │ DetectedPattern, AIRecommendation     │
│ 16 │ 命令面板                    │ CommandPaletteItem                    │
│ 17 │ PWA & 离线支持              │ PWAState, CacheEntry                  │
│ 18 │ 国际化                      │ Locale, LocaleInfo                    │
│ 19 │ 一站式服务闭环              │ LoopStage, StageResult, LoopRun       │
│ 20 │ AI 模型提供商               │ ModelProviderId, ConfiguredModel      │
│ 21 │ BigModel SDK 集成           │ SDKChatRequest, SDKChatResponse       │
└────┴────────────────────────────────────────────────┘

DB 字段约定:
  前端: camelCase (nodeData.gpuUtil)
  数据库: snake_case (gpu_util)
  转换函数: toNodeData(record) 在 types/index.ts 中提供
`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  5. 核心 Hooks 清单
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HOOKS_REFERENCE = `
/src/app/hooks/ — 22 个自定义 Hooks
──────────────────────────────────────────────────────────────

数据与连接:
  useWebSocketData.ts     模拟 WebSocket 实时数据 (QPS/延迟/节点/告警/吞吐量)
                          返回 WebSocketDataState，通过 Layout 的 Context 传播
  useBigModelSDK.ts       AI SDK Bridge: Z.ai / OpenAI / Ollama / 自定义
                          chat() / chatStream() 统一接口
                          Mock 模式 (无 Key 时自动降级)
                          localStorage 持久化 sessions & usage stats

终端:
  useTerminal.ts          CLI 终端引擎
                          - cpim 系列命令 (status/node/model/alerts/patrol/report/config)
                          - Unix 命令 (ls/cat/pwd/df/ping/htop/neofetch/echo...)
                          - goto/open 路由跳转 (onNavigate 回调)
                          - ai <prompt> Text-to-CLI (aiTextToCli 翻译)
                          - Tab 自动补全 + 命令历史 (↑/↓)
                          - 支持多 Tab 独立实例 (tabId 参数)

UI 与交互:
  useMobileView.ts        响应式断点检测 (sm/md/lg/xl/2xl + isMobile/isTablet)
  useKeyboardShortcuts.ts 全局快捷键 (⌘K / Ctrl+\` / ⌘Shift+A/P/O/L/F / Esc)
  useI18n.ts              国际化 Hook + I18nContext Provider
  useInstallPrompt.ts     PWA 安装提示 (beforeinstallprompt)
  useYYC3Head.ts          品牌 <head> 标签注入

业务逻辑:
  useFollowUp.ts          跟进系统状态管理
  usePatrol.ts            ��查模式 (自动/手动巡检, 历史, 配置)
  useOperationCenter.ts   操作中心 (分类/模板/日志流)
  useAISuggestion.ts      AI 辅助决策 (模式分析/推荐/健康度)
  useModelProvider.ts     模型供应商 CRUD + Ollama 自动发现
  useServiceLoop.ts       服务闭环 6 阶段流程管理
  useLocalFileSystem.ts   本地文件系统模拟
  useNetworkConfig.ts     网络配置 (IP/端口/NAS/WS)
  useOfflineMode.ts       离线检测
  usePWAManager.ts        PWA 状态管理
  usePushNotifications.ts 推送通知模拟
  useSecurityMonitor.ts   安全与性能监控 (CSP/Cookie/敏感数据/性能/内存/Web Vitals/设备/网络/浏览器)

Phase 4 新增 — 智能告警 · 报表 · AI 诊断:
  useAlertRules.ts        智能告警规则配置 (自定义阈值/聚合去重/升级策略/CRUD)
                          6 条 Mock 规则 + 5 条 Mock 事件, stats 统计, severity 筛选
  useReportExporter.ts    性能报表生成与导出 (JSON/CSV/Print)
                          Mock 生成器: Performance + Security 历史数据
                          节点明细 / 趋势图 / 优化建议, 历史报表列表 (max 10)
  useAIDiagnostics.ts     AI 辅助诊断 (模式识别/异常分析/自动解决方案/趋势预测)
                          5 类模式 (recurring/gradual/spike/correlation/seasonal)
                          WebSocket 实时数据集成, 诊断历史 (max 10)
                          executeAction 模拟执行, timer cleanup
`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  6. 组件层次结构
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const COMPONENT_HIERARCHY = `
App.tsx (根)
├── Login.tsx                    [未认证时]
└── RouterProvider → Layout.tsx  [已认证时]
    ├── TopBar.tsx / Sidebar.tsx / BottomNav.tsx
    ├── <Outlet /> (20 路由, 含 Phase 4: /alerts /reports /ai-diagnosis)
    ├── IntegratedTerminal.tsx / CommandPalette.tsx / AIAssistant.tsx
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  7. 样式系统
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STYLING = `
Tailwind CSS v4 + CSS 自定义属性
主色系: #060e1f (深蓝底色) + #00d4ff (青色强调) + #aa55ff / #00ff88 / #ffaa00 / #ff3366
GlassCard: rgba(8,25,55,0.6) backdrop-filter blur(12px)
字体: Orbitron (标题) + 系统默认 (正文)
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  8. 国际化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const I18N = `
zh-CN.ts + en-US.ts, 22 个命名空间:
  common nav bottomNav monitor followUp patrol operations fileManager
  log report ai palette pwa settings loop devGuide modelProvider sdk
  security alerts reports aiDiag
测试: i18n-consistency.test.ts (全量键一致) + security-i18n.test.ts (70+ 键)
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  9. 测试体系
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TESTING = `
Vitest 4.x + @testing-library/react 16
75+ 测试文件, 覆盖率阈值 80%/70%
Phase 4 新增 6 文件 ~65 用例:
  useAlertRules.test.ts / AlertRulesPanel.test.tsx
  useReportExporter.test.ts / ReportExporter.test.tsx
  useAIDiagnostics.test.ts / AIDiagnostics.test.tsx
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. 已完成功能清单
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const COMPLETED_FEATURES = `
Phase 1-3: SDK Bridge + AI 流式聊天 + 主题定制 + 导航重构 + 移动端 + Ghost Mode + 集成终端 + 全局快捷键 + 安全与性能监控
Phase 4: 智能告警规则 (/alerts) + 性能报表导出 (/reports) + AI 辅助诊断 (/ai-diagnosis)
核心模块: 数据监控 / 跟进 / 巡查 / 操作中心 / 文件管理 / AI 决策 / 服务闭环 / 设计系统
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. 已知遗留项 & TODO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TODO_LIST = `
🟢 ✅ 循环依赖修复: AuthContext 已从 App.tsx 提取到 lib/authContext.ts
🔴 主题 CSS 变量绑定 + localStorage 持久化
🟡 CreateRuleModal 编辑回填 / WebSocket 实时告警推送
🟡 虚拟滚动 / React.lazy 懒加载 / WebSocket 重连
🟡 Service Worker / IndexedDB / 真实 Supabase 认证
🟢 终端 ANSI 颜色 / 告警声音 / 高对比度模式
`;

// ━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12~15. 环境 / CI / 规范 / FAQ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ENV_CONFIG = `纯前端 Mock, 无需真实环境变量。localStorage 持久化终端高度/Ghost 标记/语言/聊天会话/模型配置。`;
export const CI_CD = `GitHub Actions: checkout → pnpm install → tsc --noEmit → vitest → coverage → vite build。覆盖率门槛 80%/70%。`;
export const CONVENTIONS = `PascalCase 组件 / useCamelCase Hook / kebab-case 工具 / 统一 types/index.ts / i18n 强制双语同步`;
export const TROUBLESHOOTING = `Ghost Mode 跳过认证 / react-router (非 dom) / motion/react (非 framer-motion) / Tailwind v4 无 config`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 导出汇总
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HANDOFF_DOCUMENT = {
  quickStart: QUICK_START,
  architecture: ARCHITECTURE,
  directoryStructure: DIRECTORY_STRUCTURE,
  routing: ROUTING,
  typeSystem: TYPE_SYSTEM,
  hooksReference: HOOKS_REFERENCE,
  componentHierarchy: COMPONENT_HIERARCHY,
  styling: STYLING,
  i18n: I18N,
  testing: TESTING,
  completedFeatures: COMPLETED_FEATURES,
  todoList: TODO_LIST,
  envConfig: ENV_CONFIG,
  ciCd: CI_CD,
  conventions: CONVENTIONS,
  troubleshooting: TROUBLESHOOTING,
} as const;