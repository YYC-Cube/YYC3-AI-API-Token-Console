/**
 * ============================================================================
 *  YYC³ 组件参考文档
 *  YYC³ 本地多端推理矩阵数据库数据看盘 - Component Reference
 * ============================================================================
 *
 * 版本: 0.0.1
 * 更新: 2026-02-25
 *
 * ============================================================
 *  全局类型中心: src/app/types/index.ts (38 个类型定义)
 *  测试运行指南: src/app/docs/TESTING-GUIDE.ts
 * ============================================================
 *
 * ============================================================
 *  目录
 * ============================================================
 *
 * 一、布局组件 (Layout)
 * 二、页面组件 (Pages)
 * 三、功能组件 (Features)
 * 四、基础UI组件 (Primitives)
 * 五、自定义 Hooks
 * 六、样式系统
 * 七、测试文件 (7 个文件 / ~95 用例)
 *
 * ============================================================================
 *  一、布局组件
 * ============================================================================
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  App.tsx (入口)                                              │
 * │  ├── ErrorBoundary (页面级错误边界)                           │
 * │  ├── AuthContext.Provider (from lib/authContext.ts)           │
 * │  │   └── RouterProvider → routes.ts                          │
 * │  │       ── Layout.tsx                                      │
 * │  │           ├── TopBar (顶栏)                               │
 * │  │           ├── ErrorBoundary (模块级)                       │
 * │  │           │   └── <Outlet /> (路由页面)                    │
 * │  │           ├── BottomNav (移动端底栏)                       │
 * │  │           ├── AIAssistant (浮窗)                           │
 * │  │           ├── PWAInstallPrompt (安装横幅)                  │
 * │  │           ├── OfflineIndicator (离线指示)                   │
 * │  │           └── Toaster (通知)                               │
 * │  └── Login (未认证)                                          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ---
 *
 * Layout.tsx
 * ----------
 * 文件: src/app/components/Layout.tsx
 * 用途: 主布局框架，包含导航、背景动画、Context Provider
 *
 * Context 提供:
 *   - WebSocketContext: useWebSocketData() 的完整返回值
 *   - ViewContext:      useMobileView() 的完整返回值
 *
 * 子组件: TopBar, BottomNav, AIAssistant, PWAInstallPrompt,
 *         OfflineIndicator, ErrorBoundary, Toaster
 *
 * ---
 *
 * TopBar.tsx
 * ----------
 * 文件: src/app/components/TopBar.tsx
 * 用途: 顶部导航栏
 *
 * Props:
 *   connectionState: ConnectionState  WebSocket连接状态
 *   reconnectCount:  number           重连次数
 *   lastSyncTime:    string           上次同步时间
 *   onReconnect:     () => void       手动重连回调
 *   isMobile:        boolean          是否移动端
 *   isTablet:        boolean          是否平板端
 *   mobileMenuOpen:  boolean          移动菜单是否打开
 *   onToggleMobileMenu: () => void    切换移动菜单
 *   onLogout:        () => void       登出回调
 *   userEmail:       string           当前用户邮箱
 *   userRole:        string           当前用户角色
 *
 * 功能:
 *   - Logo + 品牌标识
 *   - 桌面端搜索栏（⌘K 快捷键提示）
 *   - ConnectionStatus 连接状态
 *   - 通知中心下拉菜单
 *   - 用户头像 + 下拉菜单（个人信息、系统设置、退出登录）
 *   - 桌面端水平导航 / 移动端汉堡菜单
 *
 * ---
 *
 * BottomNav.tsx
 * -------------
 * 文件: src/app/components/BottomNav.tsx
 * 用途: 移动端/平板端底部导航栏
 * 显示条件: isMobile || isTablet
 *
 * ============================================================================
 *  二、页面组件
 * ============================================================================
 *
 * DataMonitoring.tsx (路由: /)
 * ----------------------------
 * 文件: src/app/components/DataMonitoring.tsx
 * 用途: 数据监控大屏（首页）
 *
 * 功能:
 *   - 实时 QPS / 延迟 / GPU利用率 / Token吞吐量指标卡片
 *   - Recharts 吞吐量趋势图（支持 react-swipeable 滑动切换）
 *   - 节点状态网格（点击打开 NodeDetailModal）
 *   - 告警列表
 *
 * 数据源: WebSocketContext (useWebSocketData)
 *
 * ---
 *
 * OperationAudit.tsx (路由: /audit)
 * ----------------------------------
 * 文件: src/app/components/OperationAudit.tsx
 * 用途: 操作审计日志页面
 *
 * 功能:
 *   - 审计日志表格（时间、用户、操作、结果、IP）
 *   - 搜索和筛选
 *   - 日志详情弹窗
 *
 * ---
 *
 * UserManagement.tsx (路由: /users)
 * ----------------------------------
 * 文件: src/app/components/UserManagement.tsx
 * 用途: 用户管理页面
 *
 * 功能:
 *   - 用户列表（头像、邮箱、角色、状态）
 *   - 角色管理（admin / developer）
 *   - 用户创建/编辑弹窗
 *
 * ---
 *
 * SystemSettings.tsx (路由: /settings)
 * -------------------------------------
 * 文件: src/app/components/SystemSettings.tsx
 * 用途: 系统设置页面（12个分区）
 *
 * 分区列表:
 *   1.  通用设置 (general)     - 系统名称、集群ID、显示界面
 *   2.  网络连接 (network)     - 网络配置面板、节点拓扑
 *   3.  集群配置 (cluster)     - 弹性伸缩、健康检查、负载均衡
 *   4.  模型管理 (model)       - 模型列表、部署状态、KV-Cache
 *   5.  存储配置 (storage)     - 存储容量、备份计划、压缩
 *   6.  WebSocket (websocket)  - 端点、重连、心跳、节流
 *   7.  AI / LLM (ai)         - API Key、模型选择、温度/TopP
 *   8.  PWA / 离线 (pwa)       - PWA开关、缓存大小、TTL
 *   9.  安全设置 (security)    - MFA、审计、速率限制、IP白名单
 *   10. 通知配置 (notification) - 邮件/Slack通知、告警阈值
 *   11. 环境变量 (env)         - PostgreSQL 数据库配置
 *   12. 高级设置 (advanced)    - 调试模式、日志、危险操作
 *
 * 内部组件:
 *   - Toggle: 开关切换组件
 *   - EditableField: 可编辑字段（支持 text/number/password/url/email）
 *
 * ============================================================================
 *  三、功能组件
 * ============================================================================
 *
 * GlassCard.tsx
 * -------------
 * 文件: src/app/components/GlassCard.tsx
 * 用途: 统一玻璃效果卡片容器
 *
 * Props:
 *   children:  ReactNode   内容
 *   className: string      附加样式类
 *   glowColor: string      自定义发光颜色
 *   onClick:   () => void  点击回调
 *
 * 样式: bg-[rgba(8,25,55,0.7)] backdrop-blur-xl
 *       border-[rgba(0,180,255,0.15)]
 *       hover:border-[rgba(0,212,255,0.3)]
 *
 * ---
 *
 * ErrorBoundary.tsx
 * -----------------
 * 文件: src/app/components/ErrorBoundary.tsx
 * 用途: React 错误边界，三级降级 UI
 *
 * Props:
 *   level:    "page" | "module" | "widget"  降级UI级别
 *   fallback: ReactNode | Function          自定义降级UI
 *   source:   string                        错误来源标识
 *   onError:  (error, info) => void         错误回调
 *
 * 功能:
 *   - page:   全屏错误页面（重试/回首页/复制报告/展开详情）
 *   - module: 中等卡片（重试/复制错误）
 *   - widget: 最小化一行提示（重试按钮）
 *   - 自动调用 captureError 记录到日志
 *
 * ---
 *
 * ConnectionStatus.tsx
 * --------------------
 * 文件: src/app/components/ConnectionStatus.tsx
 * 用途: WebSocket 连接状态指示器
 *
 * Props:
 *   state:          ConnectionState  连接状态
 *   reconnectCount: number           重连次数
 *   lastSyncTime:   string           上次同步时间
 *   onReconnect:    () => void       重连回调
 *   compact:        boolean          紧凑模式
 *
 * 状态映射:
 *   connected    → 绿色 + Wifi图标
 *   connecting   → 黄色 + Radio图标 + 脉冲
 *   reconnecting → 橙色 + RefreshCw图标 + 旋转
 *   disconnected → 红色 + WifiOff图标
 *   simulated    → 蓝色 + Zap图标
 *
 * ---
 *
 * NetworkConfig.tsx
 * -----------------
 * 文件: src/app/components/NetworkConfig.tsx
 * 用途: 网络连接配置弹窗
 *
 * Props:
 *   open:    boolean       是否打开
 *   onClose: () => void    关闭回调
 *
 * 功能:
 *   - 自动检测 Tab: WebRTC IP检测、网络接口列表、在线状态
 *   - WiFi配置 Tab: 网络信息展示
 *   - 手动配置 Tab: 服务器地址/端口/NAS/WebSocket URL 编辑
 *   - 连接测试: WebSocket 握手验证 + 延迟显示
 *   - 配置保存: localStorage 持久化
 *
 * ---
 *
 * AIAssistant.tsx
 * ----------------
 * 文件: src/app/components/AIAssistant.tsx
 * 用途: AI 智能助理浮窗
 *
 * Props:
 *   isMobile: boolean  是否移动端
 *
 * 功能:
 *   - 对话 Tab: AI 对话（模拟 OpenAI 接口）
 *   - 命令 Tab: 系统全能命令预设（一键操作）
 *   - 提示词 Tab: 提示词模板管理
 *   - 配置 Tab: OpenAI API Key / 模型 / 温度 配置
 *
 * ---
 *
 * NodeDetailModal.tsx
 * -------------------
 * 文件: src/app/components/NodeDetailModal.tsx
 * 用途: 节点详情弹窗
 *
 * ---
 *
 * PWAInstallPrompt.tsx
 * --------------------
 * 文件: src/app/components/PWAInstallPrompt.tsx
 * 用途: PWA 安装提示横幅
 * 显示条件: canInstall && !isInstalled && !dismissed
 *
 * ---
 *
 * OfflineIndicator.tsx
 * --------------------
 * 文件: src/app/components/OfflineIndicator.tsx
 * 用途: 网络状态指示条
 * 行为: 离线时显示红色条，恢复在线时显示绿色条（3秒后淡出）
 *
 * ---
 *
 * Login.tsx
 * ---------
 * 文件: src/app/components/Login.tsx
 * 用途: 登录页面
 *
 * Props:
 *   onLoginSuccess: () => void  登录成功回调
 *
 * ============================================================================
 *  四、基础 UI 组件 (src/app/components/ui/)
 * ============================================================================
 *
 * 40+ 个 Radix UI 基础组件，包括：
 *
 *   accordion, alert-dialog, alert, aspect-ratio, avatar,
 *   badge, breadcrumb, button, calendar, card, carousel,
 *   chart, checkbox, collapsible, command, context-menu,
 *   dialog, drawer, dropdown-menu, form, hover-card,
 *   input-otp, input, label, menubar, navigation-menu,
 *   pagination, popover, progress, radio-group, resizable,
 *   scroll-area, select, separator, sheet, sidebar,
 *   skeleton, slider, sonner, switch, table, tabs,
 *   textarea, toggle-group, toggle, tooltip
 *
 * 样式: 统一使用 theme.css 中定义的 CSS 变量
 *       所有组件已适配深色赛博朋克主题
 *
 * ============================================================================
 *  五、自定义 Hooks
 * ============================================================================
 *
 * useWebSocketData()
 * ------------------
 * 文件: src/app/hooks/useWebSocketData.ts
 * 用途: WebSocket 实时数据管理
 *
 * 返回值 (WebSocketDataState):
 *   connectionState:   ConnectionState      连接状态
 *   reconnectCount:    number               重连次数
 *   lastSyncTime:      string               上次同步时间
 *   liveQPS:           number               实时QPS
 *   qpsTrend:          string               QPS趋势
 *   liveLatency:       number               实时延迟
 *   latencyTrend:      string               延迟趋势
 *   activeNodes:       string               活跃节点数
 *   gpuUtil:           string               GPU利用率
 *   tokenThroughput:   string               Token吞吐量
 *   storageUsed:       string               存储使用量
 *   nodes:             NodeData[]           节点列表
 *   throughputHistory: ThroughputPoint[]    吞吐量历史
 *   alerts:            AlertData[]          告警列表
 *   manualReconnect:   () => void           手动重连
 *   clearAlerts:       () => void           清除告警
 *
 * 行为:
 *   1. 尝试连接 ws://localhost:3113/ws
 *   2. 1.5秒内未连接成功 → 降级到拟模式
 *   3. 重连失败10次 → 切换模拟模式
 *   4. 心跳间隔30秒，UI节流100ms
 *
 * ---
 *
 * useMobileView()
 * ----------------
 * 文件: src/app/hooks/useMobileView.ts
 * 用途: 响应式断点检测
 *
 * 返回值 (ViewState):
 *   breakpoint: "sm" | "md" | "lg" | "xl" | "2xl"
 *   isMobile:   boolean   (<768px)
 *   isTablet:   boolean   (768-1023px)
 *   isDesktop:  boolean   (>=1024px)
 *   width:      number    视口宽度
 *   isTouch:    boolean   是否触控设备
 *
 * ---
 *
 * useNetworkConfig()
 * -------------------
 * 文件: src/app/hooks/useNetworkConfig.ts
 * 用途: 网络配置管理
 *
 * 返回值:
 *   config:         NetworkConfig     当前配置
 *   interfaces:     NetworkInterface[] 网络接口列表
 *   localIP:        string            本机IP
 *   testStatus:     TestStatus        测试状态
 *   testLatency:    number            测试延迟
 *   testError:      string            测试错误信息
 *   detecting:      boolean           是否检测中
 *   updateConfig:   (partial) => void 更新配置
 *   save:           () => void        保存到localStorage
 *   reset:          () => void        重置为默认
 *   detectNetwork:  () => Promise     刷新网络检测
 *   testConnection: () => Promise     测试WebSocket连接
 *
 * ---
 *
 * useOfflineMode()
 * -----------------
 * 文件: src/app/hooks/useOfflineMode.ts
 * 用途: 在线/离线状态管理
 *
 * 返回值:
 *   isOnline:             boolean      是否在线
 *   lastSyncTime:         Date | null  上次同步时间
 *   pendingSync:          boolean      是否同步中
 *   saveOfflineSnapshot:  () => void   保存离线快照
 *   syncOfflineData:      () => Promise 同步离线数据
 *   getOfflineSnapshotTime: () => Date | null
 *
 * ---
 *
 * useInstallPrompt()
 * -------------------
 * 文件: src/app/hooks/useInstallPrompt.ts
 * 用途: PWA 安装提示管理
 *
 * 返回值:
 *   isInstalled:   boolean            是否已安装
 *   canInstall:    boolean            是否可安装
 *   promptInstall: () => Promise      触发安装
 *   dismiss:       () => void         关闭提示
 *
 * ---
 *
 * usePushNotifications()
 * -----------------------
 * 文件: src/app/hooks/usePushNotifications.ts
 * 用途: 推送通知管理
 *
 * 返回值:
 *   permission:        NotificationPermission 权限状态
 *   supported:         boolean                是否支持
 *   requestPermission: () => Promise          请求权限
 *   showNotification:  (title, opts) => Notification | null
 *   sendAlert:         (level, message, detail?) => Notification | null
 *
 * ============================================================================
 *  六、样式系统
 * ============================================================================
 *
 * 主题文件: src/styles/theme.css
 *
 * 品牌色:
 *   --primary:    #00d4ff  (天蓝色主色调)
 *   --background: #060e1f  (深蓝色背景)
 *
 * 语义色:
 *   --chart-1: #00d4ff  蓝色 (QPS/默认)
 *   --chart-2: #00ff88  绿色 (成功/在线)
 *   --chart-3: #ff6600  橙色 (警告/重连)
 *   --chart-4: #aa55ff  紫色 (辅助/备用)
 *   --chart-5: #ffdd00  黄色 (注意/连接中)
 *   --destructive: #ff3366  红色 (错误/离线)
 *
 * 字体:
 *   --font-family-display: 'Orbitron', sans-serif  (标题/Logo)
 *   --font-family-body:    'Rajdhani', sans-serif  (正文/按钮)
 *
 * 统一容器:
 *   GlassCard: bg-[rgba(8,25,55,0.7)] backdrop-blur-xl
 *              border-[rgba(0,180,255,0.15)]
 *              70%透明度 + 模糊背景
 *
 * ============================================================================
 */

export {};