/**
 * LOCAL-DESIGN-GUIDE.ts
 * ======================
 * YYC3 CloudPivot Intelli-Matrix -- 本地封装完整设计指南
 *
 * 审计日期: 2026-03-02
 * 适用版本: 1.0.0-rc.2
 *
 * 本文件是面向开发者的完整设计规范，涵盖：
 * - 设计系统 (Design Tokens / 组件规范 / 交互规范)
 * - 本地闭环部署指南
 * - 组件 API 速查
 * - 样式编码规范
 * - 响应式与无障碍规范
 *
 * 导出为 TypeScript 常量，可在 DevGuidePage / DesignSystemPage 中直接引用渲染。
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  一、设计系统总览
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DESIGN_SYSTEM_OVERVIEW = `
┌─────────────────────────────────────────────────────────────────┐
│              YYC3 CloudPivot Design System v1.0                  │
│                                                                  │
│  风格定位: 赛博朋克 (Cyberpunk)                                  │
│  主色系:   深蓝 #060e1f + 青色 #00d4ff                           │
│  字体:     Orbitron (标题/品牌) + Rajdhani (正文/UI)              │
│  核心组件: GlassCard (毛玻璃卡片)                                 │
│  响应式:   Mobile (<768px) / Tablet (768-1023px) / Desktop (>=1024px) │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Design Tokens (54)                                       │    │
│  │ ├── Colors      19 语义化色彩变量                        │    │
│  │ ├── Typography   8 字体规范 (2 字族 × 4 层级)            │    │
│  │ ├── Spacing      9 间距规范 (4px 基准)                   │    │
│  │ ├── Shadows      9 阴影效果 (含发光/霓虹)                │    │
│  │ └── Animations   9 动效定义 (过渡/弹簧/扫描线)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Component Hierarchy (68+)                                │    │
│  │ ├── Atoms       GlassCard / AlertBanner / ConnectionStatus│   │
│  │ ├── Molecules   FollowUpCard / LoopStageCard / QuickAction│   │
│  │ ├── Organisms   PatrolDashboard / OperationCenter / IDE   │   │
│  │ └── Templates   Layout / Login / DesignSystemPage         │   │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  二、色彩系统
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ColorToken {
  name: string;
  cssVar: string;
  value: string;
  usage: string;
}

export const COLOR_TOKENS: ColorToken[] = [
  // 基础
  { name: "Background",    cssVar: "--background",    value: "#060e1f",                usage: "全局背景色" },
  { name: "Foreground",    cssVar: "--foreground",    value: "#e0f0ff",                usage: "全局前景文字" },
  // 主色
  { name: "Primary",       cssVar: "--primary",       value: "#00d4ff",                usage: "强调色、链接、激活态" },
  { name: "Primary FG",    cssVar: "--primary-foreground", value: "#060e1f",           usage: "主色上的文字" },
  // 语义色
  { name: "Destructive",   cssVar: "--destructive",   value: "#ff3366",                usage: "错误、危险操作" },
  { name: "Success",       cssVar: "--chart-2",       value: "#00ff88",                usage: "成功、健康状态" },
  { name: "Warning",       cssVar: "--chart-3",       value: "#ff6600",                usage: "警告、注意" },
  { name: "Purple",        cssVar: "--chart-4",       value: "#aa55ff",                usage: "AI/智能功能标记" },
  // 容器
  { name: "Card",          cssVar: "--card",          value: "rgba(10,30,60,0.7)",     usage: "卡片背景" },
  { name: "Card FG",       cssVar: "--card-foreground", value: "#e0f0ff",              usage: "卡片文字" },
  // 边框
  { name: "Border",        cssVar: "--border",        value: "rgba(0,180,255,0.2)",    usage: "通用边框" },
  { name: "Ring",          cssVar: "--ring",          value: "rgba(0,212,255,0.5)",    usage: "焦点环" },
  // Sidebar
  { name: "Sidebar",       cssVar: "--sidebar",       value: "rgba(8,20,40,0.9)",      usage: "侧边栏背景" },
  { name: "Sidebar Primary", cssVar: "--sidebar-primary", value: "#00d4ff",            usage: "侧边栏激活色" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  三、字体系统
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TYPOGRAPHY_SYSTEM = `
字族配置 (fonts.css):
─────────────────────────────────────────────
  Orbitron    — 标题、品牌标识、导航分类标题
                Google Fonts: wght@400..900
                CSS: font-family: 'Orbitron', sans-serif

  Rajdhani    — 正文、按钮、输入框、标签
                Google Fonts: wght@300..700
                CSS: font-family: 'Rajdhani', sans-serif

字体层级 (theme.css @layer base):
─────────────────────────────────────────────
  h1    — Orbitron, text-2xl, font-weight-medium, line-height: 1.5
  h2    — Orbitron, text-xl,  font-weight-medium, line-height: 1.5
  h3    — Rajdhani, text-lg,  font-weight-medium, line-height: 1.5
  h4    — Rajdhani, text-base, font-weight-medium, line-height: 1.5
  body  — Rajdhani, text-base, font-weight-normal
  label — text-base, font-weight-medium
  button— Rajdhani, text-base, font-weight-medium
  input — Rajdhani, text-base, font-weight-normal

内联字体尺寸规范 (组件内 style 属性):
─────────────────────────────────────────────
  品牌标识 (YYC3)     0.82rem, letter-spacing: 0.15em
  分类标题 (Sidebar)   0.72rem, letter-spacing: 0.04em
  子项文字 (Sidebar)   0.68rem
  Flyout 标签          0.65rem, letter-spacing: 0.08em, uppercase
  Flyout 子项          0.74rem
  底部提示             0.65rem
  加载指示文字         0.72-0.75rem

  注意: 不使用 Tailwind 的 text-* 类做字体大小，
  避免与 theme.css 中的 @layer base 定义冲突。
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  四、GlassCard 组件规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const GLASSCARD_SPEC = `
GlassCard — 核心容器组件 (组件路径: components/GlassCard.tsx)
═══════════════════════════════════════════════════════════════

Props:
─────────────────────────────────────────────
  children    ReactNode     内容
  className?  string        额外 Tailwind 类
  glowColor?  string        自定义发光色 (rgba)
  onClick?    () => void    点击事件 (自动添加 cursor-pointer)
  style?      CSSProperties 内联样式

视觉样式:
─────────────────────────────────────────────
  背景:    rgba(8, 25, 55, 0.7)        半透明深蓝
  模糊:    backdrop-blur-xl            毛玻璃效果
  边框:    1px solid rgba(0,180,255,0.15)  青色微光
  阴影:    0 0 30px rgba(0,180,255,0.05)   环境光
  圆角:    rounded-xl                   12px 圆角
  Hover:   边框亮度 → 0.3，阴影范围 → 40px

使用示例:
─────────────────────────────────────────────
  <GlassCard className="p-4">
    <h3>节点状态</h3>
    <p>GPU-A100-01: 正常</p>
  </GlassCard>

  <GlassCard glowColor="rgba(0,255,136,0.15)" onClick={handleClick}>
    <span>可点击的绿色发光卡片</span>
  </GlassCard>

设计意图:
─────────────────────────────────────────────
  所有内容区块均使用 GlassCard 包裹，确保:
  1. 视觉一致性 — 统一的毛玻璃效果
  2. 层次分明 — 通过阴影和边框区分层级
  3. 交互反馈 — hover 时边框和阴影增强
  4. 灵活扩展 — className 可覆盖任何样式
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  五、布局与导航规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LAYOUT_SPEC = `
三端布局架构 (Layout.tsx):
═══════════════════════════════════════════════════════════════

桌面端 (>= 1024px):
─────────────────────────────────────────────
  ┌──────────────────────────────────────────────┐
  │ TopBar (52px)                                 │
  ├──────┬───────────────────────────────────────┤
  │ Side │ <Outlet /> (p-4)                       │
  │ bar  │                                        │
  │ 52/  │                                        │
  │ 208px│                                        │
  ├──────┴───────────────────────────────────────┤
  │ IntegratedTerminal (可折叠, 300px)            │
  └──────────────────────────────────────────────┘

  Sidebar: 折叠 52px / 展开 208px
  5 个导航分类: 监控 / 运维 / AI / 开发 / 管理
  折叠时 hover 弹出 Flyout 浮层
  展开时直接显示子项列表

平板端 (768px - 1023px):
─────────────────────────────────────────────
  ┌──────────────────────────────────────────────┐
  │ TopBar (hamburger)                            │
  ├──────────────────────────────────────────────┤
  │ <Outlet /> (px-4, pt-3, pb-72px)              │
  │                                               │
  ├──────────────────────────────────────────────┤
  │ BottomNav (4 + "更多")                        │
  └──────────────────────────────────────────────┘

移动端 (< 768px):
─────────────────────────────────────────────
  ┌──────────────────────────────────────────────┐
  │ TopBar (hamburger + logo + 通知 + 头像)       │
  ├──────────────────────────────────────────────┤
  │ <Outlet /> (px-3, pt-2, pb-72px)              │
  │                                               │
  ├──────────────────────────────────────────────┤
  │ BottomNav (4 + "更多")                        │
  └──────────────────────────────────────────────┘

  hamburger → 全屏左侧滑入抽屉 (Motion 动画)
  "更多" → 底部弹出 Sheet (分类折叠/展开)

导航分类结构 (5 类 25 路由):
─────────────────────────────────────────────
  监控中心:  / · /follow-up · /patrol · /alerts
  运维管理:  /operations · /files · /host-files · /database · /loop · /reports
  AI 智能:   /ai · /models · /ai-diagnosis
  开发工具:  /design-system · /dev-guide · /theme · /terminal · /ide · /refactoring
  系统管理:  /audit · /users · /settings · /security · /pwa
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  六、交互与动效规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INTERACTION_SPEC = `
动效库: Motion (motion/react) v12.23
═══════════════════════════════════════════════════════════════

过渡时长标准:
─────────────────────────────────────────────
  即时反馈     100ms    按钮点击、Tab 切换
  微交互       150ms    Hover 效果、边框变化
  状态变化     200ms    Sidebar 折叠/展开
  面板切换     250ms    抽屉滑入、模态框
  路由过渡     300ms    页面切换
  扫描线       8000ms   背景装饰动画 (线性循环)

Motion 使用模式:
─────────────────────────────────────────────
  import { motion, AnimatePresence } from "motion/react";

  // 进入/退出动画
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      />
    )}
  </AnimatePresence>

  // 弹簧动画参数 (BottomNav 更多抽屉)
  damping: 25, stiffness: 300

加载状态:
─────────────────────────────────────────────
  • 路由懒加载: RouteFallback (旋转圆环 + "Loading module...")
  • 认证检查:   App.tsx 初始化 (旋转圆环 + "正在初始化...")
  • 数据加载:   组件内 skeleton / shimmer 效果

反馈时机:
─────────────────────────────────────────────
  • 点击:    即时 (100ms 内) 视觉反馈
  • 操作成功: Toast 通知 (sonner, 深蓝底 + 青色边框)
  • 操作失败: Toast 错误提示 + ErrorBoundary 降级
  • 告警:     AlertBanner 顶部横幅 / FollowUpCard 卡片
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  七、本地闭环部署指南
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LOCAL_DEPLOYMENT = `
本地闭环部署 (192.168.3.x:3118)
═══════════════════════════════════════════════════════════════

一、环境准备
─────────────────────────────────────────────
  硬件: Mac M4 Max (已验证) / 任何 x86/ARM 设备
  OS:   macOS 15.3+ / Ubuntu 22.04+ / Windows 11
  Node: >= 18.x (推荐 20.x LTS)
  pnpm: >= 8.x

二、部署步骤
─────────────────────────────────────────────
  # 1. 克隆代码
  git clone <repo> && cd yyc3-dashboard

  # 2. 安装依赖
  pnpm install

  # 3. (可选) 下载品牌图标
  chmod +x ./scripts/download-icons.sh
  ./scripts/download-icons.sh

  # 4. 构建生产包
  pnpm build

  # 5. 部署到本地服务器
  # 方式 A: 使用 Vite preview
  pnpm preview --host 0.0.0.0 --port 3118

  # 方式 B: 使用 Nginx
  server {
    listen 3118;
    root /path/to/dist;
    location / {
      try_files $uri $uri/ /index.html;
    }
  }

  # 方式 C: 使用 serve
  npx serve dist -l 3118

三、网络配置
─────────────────────────────────────────────
  内网地址: http://192.168.3.x:3118
  WebSocket: ws://192.168.3.x:3118/ws (可在 /settings 配置)
  DNS:       (可选) yyc3.local → 192.168.3.x

四、PWA 离线支持
─────────────────────────────────────────────
  • 首次访问后 Service Worker 缓存所有静态资源
  • 离线时已缓存页面正常可用
  • 联网后自动同步离线期间的操作

五、数据存储路径
─────────────────────────────────────────────
  浏览器 localStorage:  配置 / 认证 / 偏好 (< 5KB/项)
  浏览器 IndexedDB:     告警 / 巡查 / 日志 (无大小限制)
  本地文件系统:         ~/.yyc3-matrix/ (File System API)
    ├── logs/            节点日志
    ├── reports/         巡查/性能报告
    ├── backups/         配置备份
    ├── configs/         系统配置
    └── cache/           查询缓存

六、安全注意事项
─────────────────────────────────────────────
  • 仅限内网访问，不暴露公网
  • Ghost Mode 仅用于开发调试，生产环境建议禁用
  • API Key (Z.ai / OpenAI) 通过环境变量配置，不硬编码
  • 本系统不适合收集/存储 PII 或敏感数据
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  八、组件 API 速查表
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ComponentAPI {
  name: string;
  path: string;
  category: "Atom" | "Molecule" | "Organism" | "Template" | "Hook";
  props: string;
  description: string;
}

export const COMPONENT_API_TABLE: ComponentAPI[] = [
  // Atoms
  { name: "GlassCard",          path: "components/GlassCard.tsx",         category: "Atom",     props: "children, className?, glowColor?, onClick?, style?", description: "统一毛玻璃容器组件" },
  { name: "AlertBanner",        path: "components/AlertBanner.tsx",       category: "Atom",     props: "message, severity, onClose?, actions?",              description: "顶部告警横幅" },
  { name: "ConnectionStatus",   path: "components/ConnectionStatus.tsx",  category: "Atom",     props: "state, reconnectCount?, compact?, onReconnect?",     description: "连接状态指示器" },
  { name: "LanguageSwitcher",   path: "components/LanguageSwitcher.tsx",  category: "Atom",     props: "(无)",                                               description: "中英文切换按钮" },
  { name: "OfflineIndicator",   path: "components/OfflineIndicator.tsx",  category: "Atom",     props: "(无, 自动检测)",                                     description: "离线状态提示条" },
  { name: "YYC3Logo",           path: "components/YYC3Logo.tsx",          category: "Atom",     props: "size?, showStatus?, glow?, statusColor?, onClick?",  description: "品牌 Logo 组件" },
  { name: "ErrorBoundary",      path: "components/ErrorBoundary.tsx",     category: "Atom",     props: "children, level, source, fallback?, onError?",       description: "三级错误边界" },
  // Molecules
  { name: "FollowUpCard",       path: "components/FollowUpCard.tsx",      category: "Molecule", props: "item, onAction, onExpand",                           description: "告警/异常跟进卡片" },
  { name: "LoopStageCard",      path: "components/LoopStageCard.tsx",     category: "Molecule", props: "stage, isActive, onSelect",                          description: "服务闭环阶段卡片" },
  { name: "QuickActionGroup",   path: "components/QuickActionGroup.tsx",  category: "Molecule", props: "actions, onAction",                                  description: "快速操作按钮组" },
  { name: "OperationChain",     path: "components/OperationChain.tsx",    category: "Molecule", props: "events, currentEventId?",                            description: "操作链路时间线" },
  { name: "CommandPalette",     path: "components/CommandPalette.tsx",    category: "Molecule", props: "isOpen, onClose",                                    description: "全局命令面板 (Cmd+K)" },
  // Organisms
  { name: "PatrolDashboard",    path: "components/PatrolDashboard.tsx",   category: "Organism", props: "(内部状态管理)",                                     description: "巡查仪表盘 (4 子组件)" },
  { name: "OperationCenter",    path: "components/OperationCenter.tsx",   category: "Organism", props: "(内部状态管理)",                                     description: "操作中心 (5 子组件)" },
  { name: "SecurityMonitor",    path: "components/SecurityMonitor.tsx",   category: "Organism", props: "(内部状态管理)",                                     description: "安全与性能监控 (5 Tab)" },
  { name: "AIDiagnostics",      path: "components/AIDiagnostics.tsx",     category: "Organism", props: "(内部状态管理)",                                     description: "AI 辅助诊断 (3 Tab)" },
  { name: "IDEPanel",           path: "components/IDEPanel.tsx",          category: "Organism", props: "(内部状态管理)",                                     description: "VS Code 风格 IDE 面板" },
  // Templates
  { name: "Layout",             path: "components/Layout.tsx",            category: "Template", props: "(Router Outlet)",                                     description: "主布局 (TopBar+Sidebar+BottomNav)" },
  { name: "Login",              path: "components/Login.tsx",             category: "Template", props: "onLoginSuccess, onGhostLogin",                       description: "登录页 (含 Ghost Mode)" },
  { name: "DesignSystemPage",   path: "components/design-system/DesignSystemPage.tsx", category: "Template", props: "(内部 3 Tab)",                          description: "设计系统展示页" },
  // Hooks
  { name: "useI18n",            path: "hooks/useI18n.ts",                 category: "Hook",     props: "() => { t, locale, setLocale }",                     description: "国际化 Hook" },
  { name: "useWebSocketData",   path: "hooks/useWebSocketData.ts",        category: "Hook",     props: "() => WebSocketDataState",                           description: "实时数据 Hook" },
  { name: "useMobileView",      path: "hooks/useMobileView.ts",          category: "Hook",     props: "() => ViewState",                                    description: "响应式断点 Hook" },
  { name: "useKeyboardShortcuts", path: "hooks/useKeyboardShortcuts.ts", category: "Hook",     props: "(config: ShortcutConfig) => void",                   description: "全局快捷键 Hook" },
  { name: "useTerminal",        path: "hooks/useTerminal.ts",            category: "Hook",     props: "(tabId?, onNavigate?) => TerminalState",              description: "CLI 终端引擎 Hook" },
  { name: "usePatrol",          path: "hooks/usePatrol.ts",              category: "Hook",     props: "() => PatrolState",                                  description: "巡查模式 Hook" },
  { name: "useServiceLoop",     path: "hooks/useServiceLoop.ts",         category: "Hook",     props: "() => ServiceLoopState",                             description: "服务闭环 Hook" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  九、编码规范速查
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CODING_CONVENTIONS = `
命名规范:
─────────────────────────────────────────────
  组件文件:     PascalCase.tsx         (FollowUpCard.tsx)
  Hook 文件:    useCamelCase.ts        (usePatrol.ts)
  工具文件:     kebab-case.ts          (error-handler.ts)
  测试文件:     ComponentName.test.tsx  (FollowUpCard.test.tsx)
  类型文件:     统一 types/index.ts     (集中管理)
  i18n 键:      dot.separated.key      (nav.dataMonitor)

样式规范:
─────────────────────────────────────────────
  1. 使用 Tailwind CSS v4 原子类 (无 tailwind.config)
  2. 不使用 text-*/font-*/leading-* 类 (由 theme.css 统一定义)
  3. 颜色使用 CSS 变量: text-[var(--primary)] 或 text-[#00d4ff]
  4. 自定义样式用 style 属性或 theme.css 自定义属性
  5. GlassCard 作为统一容器，内部用 className 扩展
  6. 响应式: 先写移动端，再用 md: / lg: 前缀扩展

类型规范:
─────────────────────────────────────────────
  1. 所有类型在 types/index.ts 集中定义
  2. 前端字段: camelCase (nodeData.gpuUtil)
  3. 数据库字段: snake_case (gpu_util)
  4. 提供 toNodeData() 等转换函数
  5. 严格模式: 全局开启 TypeScript strict

i18n 规范:
─────────────────────────────────────────────
  1. 所有用户可见文字必须使用 t() 函数
  2. zh-CN 和 en-US 键必须一一对应
  3. 模板变量: t("key", { n: 5 }) → "{n} 分钟前"
  4. 新增键: 同时在两个语言包中添加
  5. 测试: i18n-consistency.test.ts 自动检查

测试规范:
─────────────────────────────────────────────
  1. 纯逻辑测试: .test.ts (Node 环境)
  2. 组件测试: .test.tsx (jsdom 环境)
  3. vi.mock 模式: react-router / recharts / motion / hooks
  4. 覆盖率: lines >= 80%, functions >= 70%
  5. 每个组件/Hook 至少一个对应测试文件
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  十、无障碍 (WCAG 2.1 AA) 规范
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const A11Y_SPEC = `
无障碍标准: WCAG 2.1 AA
═══════════════════════════════════════════════════════════════

色彩对比度:
─────────────────────────────────────────────
  正文 (#e0f0ff on #060e1f): 对比度 > 12:1 ✅
  主色 (#00d4ff on #060e1f): 对比度 > 7:1  ✅
  弱文字 (rgba 0.3-0.5):    注意低对比度风险 ⚠️
  最小字体: 建议 >= 0.65rem (约 10.4px)

键盘导航:
─────────────────────────────────────────────
  Tab:     焦点在所有交互元素间流转
  Enter:   确认/提交
  Esc:     关闭所有模态框/抽屉/面板
  Cmd+K:   打开命令面板
  方向键:  CommandPalette 列表选择

ARIA 标签:
─────────────────────────────────────────────
  • 所有图标按钮添加 aria-label 或 title
  • 状态指示器添加 role="status"
  • 模态框添加 role="dialog" + aria-modal
  • 导航区域添加 role="navigation"

测试工具:
─────────────────────────────────────────────
  • axe-core: 自动化检测 (已安装)
  • vitest-axe: 组件级 a11y 测试 (已安装)
  • a11y-audit.test.tsx: GlassCard/LanguageSwitcher/ConnectionStatus
  • 建议: 扩展 axe 扫描到所有 Organism 级组件
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  十一、拓展优化建议
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface OptimizationSuggestion {
  priority: "P0" | "P1" | "P2" | "P3";
  category: string;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
}

export const OPTIMIZATION_SUGGESTIONS: OptimizationSuggestion[] = [
  // P0 — 立即执行
  {
    priority: "P0",
    category: "验证",
    title: "执行 npx tsc --noEmit && pnpm test",
    description: "终极闭环的最后一步: 实际运行编译检查和全量测试，根据真实输出修复任何编译错误或测试失败",
    effort: "medium",
    impact: "high",
  },
  {
    priority: "P0",
    category: "文档",
    title: "DEVELOPER-HANDOFF.ts 数据对齐",
    description: "更新文档中的路由数 (17→25)、Hooks 数 (22→26)、组件数 (55→68)、测试文件数 (65→100) 等统计数据",
    effort: "low",
    impact: "medium",
  },
  // P1 — 近期优化
  {
    priority: "P1",
    category: "无障碍",
    title: "扩展 axe-core 覆盖范围",
    description: "将 a11y-audit.test.tsx 扩展到 PatrolDashboard、OperationCenter、SecurityMonitor 等 Organism 级组件",
    effort: "medium",
    impact: "high",
  },
  {
    priority: "P1",
    category: "性能",
    title: "虚拟滚动长列表",
    description: "OperationLogStream、PatrolHistory 等长列表组件引入虚拟滚动 (react-window 或 @tanstack/react-virtual)，减少 DOM 节点数",
    effort: "medium",
    impact: "high",
  },
  {
    priority: "P1",
    category: "测试",
    title: "E2E 测试 (Playwright)",
    description: "新增 Playwright E2E 测试: 登录→Dashboard→操作审计 完整流程，覆盖关键用户路径",
    effort: "high",
    impact: "high",
  },
  // P2 — 中期增强
  {
    priority: "P2",
    category: "真实集成",
    title: "WebSocket 真实数据接入",
    description: "将 useWebSocketData Mock 替换为真实 WebSocket 连接 (ws://192.168.3.x:3118/ws)，保留 Mock 降级",
    effort: "high",
    impact: "high",
  },
  {
    priority: "P2",
    category: "真实集成",
    title: "AI SDK 真实调用",
    description: "配置 .env 中的 ZHIPU_API_KEY / OPENAI_API_KEY，useBigModelSDK 从 Mock 切换到真实 API 调用",
    effort: "medium",
    impact: "medium",
  },
  {
    priority: "P2",
    category: "性能",
    title: "SSG 预渲染静态页面",
    description: "DevGuidePage、DesignSystemPage 等纯展示页面可预渲染为 HTML，加速首屏",
    effort: "medium",
    impact: "medium",
  },
  {
    priority: "P2",
    category: "安全",
    title: "CSP 策略配置",
    description: "在 Nginx 配置中添加 Content-Security-Policy 响应头，限制内联脚本和外部资源",
    effort: "low",
    impact: "high",
  },
  // P3 — 远期规划
  {
    priority: "P3",
    category: "扩展",
    title: "VS Code Extension",
    description: "基于 IDEPanel 的 UI 设计，开发独立的 VS Code Extension，复用 types/index.ts 类型定义",
    effort: "high",
    impact: "medium",
  },
  {
    priority: "P3",
    category: "扩展",
    title: "CLI 工具 (yyc3 命令)",
    description: "基于 useTerminal 的命令集，开发独立的 Node.js CLI 工具 (Commander.js)，支持真实系统操作",
    effort: "high",
    impact: "medium",
  },
  {
    priority: "P3",
    category: "国际化",
    title: "多语言扩展",
    description: "在 zh-CN / en-US 基础上添加 ja-JP、ko-KR 等语言包，适配亚太区团队",
    effort: "medium",
    impact: "low",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  十二、完整文件清单 (截至 2026-03-02)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PROJECT_FILE_INVENTORY = {
  components: {
    total: 68,
    layout: ["Layout.tsx", "TopBar.tsx", "Sidebar.tsx", "BottomNav.tsx"],
    auth: ["Login.tsx"],
    atoms: ["GlassCard.tsx", "AlertBanner.tsx", "ConnectionStatus.tsx", "LanguageSwitcher.tsx", "OfflineIndicator.tsx", "YYC3Logo.tsx", "YYC3LogoSvg.tsx", "ErrorBoundary.tsx", "PWAInstallPrompt.tsx"],
    monitor: ["DataMonitoring.tsx", "Dashboard.tsx", "NodeDetailModal.tsx"],
    followUp: ["FollowUpPanel.tsx", "FollowUpCard.tsx", "FollowUpDrawer.tsx", "OperationChain.tsx", "QuickActionGroup.tsx"],
    patrol: ["PatrolDashboard.tsx", "PatrolScheduler.tsx", "PatrolReport.tsx", "PatrolHistory.tsx"],
    operations: ["OperationCenter.tsx", "OperationCategory.tsx", "QuickActionGrid.tsx", "OperationTemplate.tsx", "OperationLogStream.tsx", "OperationAudit.tsx"],
    ai: ["AISuggestionPanel.tsx", "AIAssistant.tsx", "AIDiagnostics.tsx", "ActionRecommender.tsx", "PatternAnalyzer.tsx", "SDKChatPanel.tsx", "ModelProviderPanel.tsx", "AddModelModal.tsx"],
    files: ["LocalFileManager.tsx", "FileBrowser.tsx", "LogViewer.tsx", "ReportGenerator.tsx", "HostFileManager.tsx"],
    terminal: ["CLITerminal.tsx", "IntegratedTerminal.tsx", "IDEPanel.tsx", "CodeEditor.tsx"],
    system: ["SystemSettings.tsx", "UserManagement.tsx", "SecurityMonitor.tsx", "NetworkConfig.tsx", "DatabaseManager.tsx"],
    loop: ["ServiceLoopPanel.tsx", "LoopStageCard.tsx", "DataFlowDiagram.tsx"],
    designSystem: ["design-system/DesignSystemPage.tsx", "design-system/DesignTokens.tsx", "design-system/ComponentShowcase.tsx", "design-system/StageReview.tsx"],
    theme: ["ThemeCustomizer.tsx", "theme/ColorPicker.tsx", "theme/ColorSwatch.tsx", "theme/color-utils.ts", "theme/theme-presets.ts"],
    misc: ["CommandPalette.tsx", "PWAStatusPanel.tsx", "DevGuidePage.tsx", "RefactoringReport.tsx", "ReportExporter.tsx", "AlertRulesPanel.tsx", "CreateRuleModal.tsx", "InlineEditableTable.tsx", "NotFound.tsx"],
  },
  hooks: {
    total: 26,
    list: [
      "useAIDiagnostics.ts", "useAISuggestion.ts", "useAlertRules.ts",
      "useBigModelSDK.ts", "useFollowUp.ts", "useHostFileSystem.ts",
      "useI18n.ts", "useInstallPrompt.ts", "useKeyboardShortcuts.ts",
      "useLocalDatabase.ts", "useLocalFileSystem.ts", "useMobileView.ts",
      "useModelProvider.ts", "useNetworkConfig.ts", "useOfflineMode.ts",
      "useOperationCenter.ts", "usePWAManager.ts", "usePatrol.ts",
      "usePersistedState.ts", "usePushNotifications.ts", "useReportExporter.ts",
      "useSecurityMonitor.ts", "useServiceLoop.ts", "useTerminal.ts",
      "useWebSocketData.ts", "useYYC3Head.ts",
    ],
  },
  tests: {
    total: 100,
    directory: "src/app/__tests__/",
  },
  docs: {
    total: 8,
    list: [
      "API-REFERENCE.ts", "COMPONENT-REFERENCE.ts", "DEVELOPER-HANDOFF.ts",
      "FINAL-AUDIT-REPORT.ts", "STORAGE-AUDIT.ts", "TESTING-GUIDE.ts",
      "HA-ARCHITECTURE-TEST.ts", "LOCAL-DESIGN-GUIDE.ts",
    ],
  },
  routes: {
    total: 25,
    paths: [
      "/", "/follow-up", "/patrol", "/alerts",
      "/operations", "/files", "/host-files", "/database", "/loop", "/reports",
      "/ai", "/models", "/ai-diagnosis",
      "/design-system", "/dev-guide", "/theme", "/terminal", "/ide", "/refactoring",
      "/audit", "/users", "/settings", "/security", "/pwa",
      "/*",
    ],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  导出汇总
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DESIGN_GUIDE = {
  overview: DESIGN_SYSTEM_OVERVIEW,
  colors: COLOR_TOKENS,
  typography: TYPOGRAPHY_SYSTEM,
  glassCard: GLASSCARD_SPEC,
  layout: LAYOUT_SPEC,
  interaction: INTERACTION_SPEC,
  deployment: LOCAL_DEPLOYMENT,
  componentAPI: COMPONENT_API_TABLE,
  codingConventions: CODING_CONVENTIONS,
  accessibility: A11Y_SPEC,
  optimizations: OPTIMIZATION_SUGGESTIONS,
  fileInventory: PROJECT_FILE_INVENTORY,
} as const;

export default DESIGN_GUIDE;
