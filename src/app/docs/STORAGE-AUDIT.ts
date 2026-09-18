/**
 * STORAGE-AUDIT.ts
 * =================
 * YYC³ CloudPivot Intelli-Matrix — 存储设计真实审计报告
 *
 * 基于 Guidelines.md 第五章 / 第七章 / 第十章 + 代码全量审查
 * 审计日期: 2026-03-01
 */

// ─────────────────────────────────────────────────────
//  一、存储架构总览
// ─────────────────────────────────────────────────────

export const STORAGE_ARCHITECTURE = `
┌─────────────────────────────────────────────────────────────────┐
│                  YYC³ 双层缓存策略                              │
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────────────┐ │
│  │    localStorage      │     │         IndexedDB             │ │
│  │  (轻量配置 < 5KB/项) │     │  (大数据持久化, 无大小上限)   │ │
│  ├──────────────────────┤     ├──────────────────────────────┤ │
│  │ • 认证会话            │     │ • 告警规则 (alertRules)       │ │
│  │ • 语言偏好            │     │ • 告警事件 (alertEvents)      │ │
│  │ • 网络配置            │     │ • 巡查历史 (patrolHistory)    │ │
│  │ • AI 模型配置         │     │ • 闭环历史 (loopHistory)      │ │
│  │ • SDK 聊天会话        │     │ • 操作模板 (operationTemplates)│ │
│  │ • SDK 使用统计        │     │ • 操作日志 (operationLogs)    │ │
│  │ • 后台同步队列        │     │ • 诊断记录 (diagnosisHistory) │ │
│  │ • 错误日志 (≤200条)   │     │ • 报表数据 (reports)          │ │
│  │ • 离线快照            │     │ • 错误日志 (errorLog)         │ │
│  │ • PWA 安装状态        │     │ • 仪表盘快照 (dashboardSnaps) │ │
│  │ • 幽灵模式标记        │     │                               │ │
│  │ • 仪表盘状态          │     │                               │ │
│  └──────────────────────┘     └──────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              BroadcastChannel (多标签页同步)              │  │
│  │  频道: yyc3_storage_sync                                  │  │
│  │  事件: { store, action, key, timestamp }                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
`;

// ─────────────────────────────────────────────────────
//  二、localStorage 清单 (13 个 Key)
// ─────────────────────────────────────────────────────

export interface LocalStorageKey {
  key: string;
  module: string;
  purpose: string;
  maxSize: string;
  writeFrequency: string;
  status: "ACTIVE" | "FIXED" | "NEW";
}

export const LOCALSTORAGE_REGISTRY: LocalStorageKey[] = [
  {
    key: "yyc3_session",
    module: "lib/supabaseClient.ts",
    purpose: "认证会话 (AppSession: user + token + expiresAt)",
    maxSize: "~200B",
    writeFrequency: "登录/登出时",
    status: "ACTIVE",
  },
  {
    key: "yyc3_ghost",
    module: "lib/supabaseClient.ts",
    purpose: "幽灵模式标记 ('1' / 删除)",
    maxSize: "1B",
    writeFrequency: "幽灵登录/登出时",
    status: "ACTIVE",
  },
  {
    key: "yyc3_locale",
    module: "hooks/useI18n.ts",
    purpose: "语言偏好 ('zh-CN' / 'en-US')",
    maxSize: "5B",
    writeFrequency: "切换语言时",
    status: "ACTIVE",
  },
  {
    key: "yyc3_configured_models",
    module: "hooks/useModelProvider.ts",
    purpose: "已配置的 AI 模型列表 (ConfiguredModel[])",
    maxSize: "~5KB",
    writeFrequency: "添加/删除/测试模型时",
    status: "ACTIVE",
  },
  {
    key: "yyc3_sdk_sessions",
    module: "hooks/useBigModelSDK.ts",
    purpose: "聊天会话数据 (ChatSession[])",
    maxSize: "~50KB",
    writeFrequency: "每次发送/接收消息",
    status: "ACTIVE",
  },
  {
    key: "yyc3_sdk_stats",
    module: "hooks/useBigModelSDK.ts",
    purpose: "SDK 使用统计 (请求数/Token/延迟/错误)",
    maxSize: "~200B",
    writeFrequency: "每次 SDK 调用",
    status: "ACTIVE",
  },
  {
    key: "yyc3_sync_queue",
    module: "lib/backgroundSync.ts",
    purpose: "后台同步队列 (离线操作排队)",
    maxSize: "~10KB",
    writeFrequency: "离线操作时 / 恢复在线时清空",
    status: "ACTIVE",
  },
  {
    key: "yyc3_error_log",
    module: "lib/error-handler.ts",
    purpose: "错误日志 (AppError[], 最多 200 条)",
    maxSize: "~50KB",
    writeFrequency: "每次错误捕获",
    status: "ACTIVE",
  },
  {
    key: "network_config",
    module: "lib/network-utils.ts",
    purpose: "网络配置 (服务器地址/端口/WS URL/NAS)",
    maxSize: "~200B",
    writeFrequency: "修改网络配置时",
    status: "ACTIVE",
  },
  {
    key: "dashboard_state",
    module: "hooks/useOfflineMode.ts",
    purpose: "仪表盘状态快照 (每 30s 自动保存, 供离线恢复)",
    maxSize: "~1KB",
    writeFrequency: "每 30 秒",
    status: "FIXED",
  },
  {
    key: "offline_snapshot",
    module: "hooks/useOfflineMode.ts",
    purpose: "离线状态快照 (断网时从 dashboard_state 复制)",
    maxSize: "~1KB",
    writeFrequency: "断网时",
    status: "ACTIVE",
  },
  {
    key: "offline_snapshot_time",
    module: "hooks/useOfflineMode.ts",
    purpose: "离线快照时间戳",
    maxSize: "~25B",
    writeFrequency: "断网时",
    status: "ACTIVE",
  },
  {
    key: "pwa_install_dismissed",
    module: "hooks/useInstallPrompt.ts",
    purpose: "PWA 安装提示已关闭标记",
    maxSize: "4B",
    writeFrequency: "用户关闭安装提示时",
    status: "ACTIVE",
  },
];

// ─────────────────────────────────────────────────────
//  三、IndexedDB Store 清单 (10 个 ObjectStore)
// ─────────────────────────────────────────────────────

export interface IDBStoreInfo {
  name: string;
  keyPath: string;
  purpose: string;
  persistedBy: string;
  status: "ACTIVE" | "NEW" | "PLANNED";
}

export const IDB_STORES: IDBStoreInfo[] = [
  {
    name: "alertRules",
    keyPath: "id",
    purpose: "告警规则配置 (启用/阈值/聚合/升级策略)",
    persistedBy: "hooks/useAlertRules.ts → idbPut/idbGetAll",
    status: "ACTIVE",
  },
  {
    name: "alertEvents",
    keyPath: "id",
    purpose: "告警事件记录 (WebSocket 触发/手动确认/解决)",
    persistedBy: "hooks/useAlertRules.ts → idbPut/idbGetAll",
    status: "ACTIVE",
  },
  {
    name: "patrolHistory",
    keyPath: "id",
    purpose: "巡查历史记录 (手动/自动巡查结果)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "loopHistory",
    keyPath: "id",
    purpose: "服务闭环运行历史 (六阶段流水线记录)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "operationTemplates",
    keyPath: "id",
    purpose: "操作模板 (用户自定义操作流程)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "operationLogs",
    keyPath: "id",
    purpose: "操作日志 (操作中心执行记录)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "diagnosisHistory",
    keyPath: "id",
    purpose: "AI 诊断记录 (模式识别/异常/解决方案)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "reports",
    keyPath: "id",
    purpose: "报表数据 (生成的性能/安全/审计报表)",
    persistedBy: "hooks/usePersistedState.ts (通用Hook)",
    status: "NEW",
  },
  {
    name: "errorLog",
    keyPath: "id",
    purpose: "错误日志 (大容量, 超过 localStorage 200 条限制时溢出)",
    persistedBy: "lib/yyc3-storage.ts",
    status: "NEW",
  },
  {
    name: "dashboardSnapshots",
    keyPath: "id",
    purpose: "仪表盘历史快照 (用于离线回溯/时间旅行调试)",
    persistedBy: "lib/yyc3-storage.ts",
    status: "NEW",
  },
];

// ─────────────────────────────────────────────────────
//  四、核心功能实现审计
// ─────────────────────────────────────────────────────

export interface StorageFeatureAudit {
  feature: string;
  guideline: string;
  status: "DONE" | "FIXED" | "NEW" | "PLANNED";
  implementation: string;
  files: string[];
}

export const STORAGE_FEATURES: StorageFeatureAudit[] = [
  // ✅ 已实现功能
  {
    feature: "localStorage 轻量配置持久化",
    guideline: "10.1 双层缓存策略 — localStorage 负责轻量配置",
    status: "DONE",
    implementation: "13 个 key 覆盖认证/语言/网络/模型/会话/统计/同步/错误/快照/PWA",
    files: ["lib/supabaseClient.ts", "hooks/useI18n.ts", "lib/network-utils.ts", "hooks/useModelProvider.ts", "hooks/useBigModelSDK.ts", "lib/backgroundSync.ts", "lib/error-handler.ts", "hooks/useOfflineMode.ts", "hooks/useInstallPrompt.ts"],
  },
  {
    feature: "后台同步队列",
    guideline: "7.1 Service Worker 后台同步",
    status: "DONE",
    implementation: "addToSyncQueue() → localStorage 队列 → processSyncQueue() 恢复在线时批量处理, 最多重试 3 次",
    files: ["lib/backgroundSync.ts"],
  },
  {
    feature: "离线数据快照与恢复",
    guideline: "7.1 完全离线运行",
    status: "FIXED",
    implementation: "dashboard_state 每 30 秒自动保存 → 断网时复制到 offline_snapshot → 恢复在线时同步清空。【修复】原 dashboard_state 从未写入, 现已补全定时保存逻辑",
    files: ["hooks/useOfflineMode.ts", "lib/yyc3-storage.ts"],
  },
  {
    feature: "错误日志本地持久化",
    guideline: "7.1 本地数据持久化",
    status: "DONE",
    implementation: "captureError() → localStorage 持久化, 最多 200 条, FIFO 淘汰, QuotaExceeded 时清除旧日志重试",
    files: ["lib/error-handler.ts"],
  },
  {
    feature: "Mock 文件系统模拟",
    guideline: "5.1 本地文件系统访问",
    status: "DONE",
    implementation: "MOCK_FILE_TREE 匹配 Guidelines ~/.yyc3-matrix/ 目录结构 (logs/reports/backups/configs/cache), 含 FileBrowser + LogViewer + ReportGenerator",
    files: ["hooks/useLocalFileSystem.ts", "components/LocalFileManager.tsx", "components/FileBrowser.tsx", "components/LogViewer.tsx", "components/ReportGenerator.tsx"],
  },
  {
    feature: "PWA 缓存管理 UI",
    guideline: "7.1 PWA 缓存 + Service Worker",
    status: "DONE",
    implementation: "usePWAManager Mock 5 个缓存条目 (static/api/fonts/images/runtime), 支持清理/刷新/SW 更新",
    files: ["hooks/usePWAManager.ts", "components/PWAStatusPanel.tsx"],
  },
  {
    feature: "数据管理面板",
    guideline: "4.1 数据持久化增强",
    status: "DONE",
    implementation: "SecurityMonitor 数据管理 Tab: 存储用量分析 (localStorage/sessionStorage/IndexedDB/CacheAPI) + 数据清理/导入导出/备份恢复",
    files: ["hooks/useSecurityMonitor.ts", "components/SecurityMonitor.tsx"],
  },
  {
    feature: "SDK 聊天会话持久化",
    guideline: "AI 集成 — 会话管理",
    status: "DONE",
    implementation: "ChatSession[] 持久化到 yyc3_sdk_sessions, SDKUsageStats 持久化到 yyc3_sdk_stats",
    files: ["hooks/useBigModelSDK.ts"],
  },
  {
    feature: "AI 模型配置持久化",
    guideline: "AI 集成 — 通用 Key 认证",
    status: "DONE",
    implementation: "ConfiguredModel[] 持久化到 yyc3_configured_models, 含 apiKey/baseUrl/model/status",
    files: ["hooks/useModelProvider.ts"],
  },
  {
    feature: "WebSocket 连接管理",
    guideline: "1.2 数据监控 — 实时看板",
    status: "DONE",
    implementation: "useWebSocketData: WS URL ws://localhost:3113/ws, 自动重连 (5s 间隔, 最多 10 次), 30s 心跳, 100ms UI 节流, 断线自动降级到本地模拟数据",
    files: ["hooks/useWebSocketData.ts"],
  },

  // ✅ 本轮新增/修复
  {
    feature: "IndexedDB 大数据持久化层",
    guideline: "10.1 双层缓存策略 — IndexedDB 负责大数据",
    status: "NEW",
    implementation: "yyc3-storage.ts: 统一 IndexedDB wrapper (DB: yyc3_matrix, 10 个 ObjectStore), 通用 CRUD (idbPut/idbGet/idbGetAll/idbDelete/idbClear/idbCount), 批量操作 idbPutMany",
    files: ["lib/yyc3-storage.ts"],
  },
  {
    feature: "告警规则 IndexedDB 持久化",
    guideline: "5.1 告警与通知增强",
    status: "NEW",
    implementation: "useAlertRules: 初始化从 IndexedDB 加载, 创建/更新/删除/切换 均同步写入 alertRules + alertEvents store, 首次使用自动存入 Mock 默认数据",
    files: ["hooks/useAlertRules.ts"],
  },
  {
    feature: "BroadcastChannel 多标签页同步",
    guideline: "4.1 多标签页数据同步",
    status: "NEW",
    implementation: "yyc3_storage_sync 频道: 每次 IndexedDB 写入/删除/清空自动广播 StorageChangeEvent, onStorageChange() 注册跨标签页监听器",
    files: ["lib/yyc3-storage.ts"],
  },
  {
    feature: "通用持久化 Hook (usePersistedList)",
    guideline: "10.1 开发实施建议 — 模块化",
    status: "NEW",
    implementation: "usePersistedList<T>: 初始化从 IndexedDB 加载 → React state 双向绑定 → BroadcastChannel 跨标签同步, 支持 upsert/setAll/remove/clear/prepend",
    files: ["hooks/usePersistedState.ts"],
  },
  {
    feature: "数据导入导出 (CLI/设置)",
    guideline: "5.1 本地文件系统 + 4.1 数据同步",
    status: "NEW",
    implementation: "exportAllData(): 导出全部 10 个 store 为 JSON; importAllData(): 从 JSON 导入; getStorageStats(): 获取各 store 记录数统计",
    files: ["lib/yyc3-storage.ts"],
  },
  {
    feature: "localStorage Key 统一注册表",
    guideline: "3.2 敏感信息泄漏检测",
    status: "NEW",
    implementation: "LOCALSTORAGE_KEYS 常量: 13 个 key 集中管理, clearAllLocalStorage() 一键清除, clearAllStorage() 清除 localStorage + IndexedDB 全部数据",
    files: ["lib/yyc3-storage.ts"],
  },
  {
    feature: "dashboard_state 定时写入修复",
    guideline: "7.1 离线运行",
    status: "FIXED",
    implementation: "useOfflineMode: 每 30 秒自动保存 dashboard_state (locale + networkConfig + modelsCount + timestamp), 修复原 dashboard_state 从未写入的 bug",
    files: ["hooks/useOfflineMode.ts"],
  },

  // ❌ 未实现 / 后续规划
  {
    feature: "巡查历史 IndexedDB 持久化",
    guideline: "3.2 巡查历史记录",
    status: "PLANNED",
    implementation: "usePatrol 已预留 patrolHistory store, 待集成 usePersistedList<PatrolRecord>('patrolHistory')",
    files: ["hooks/usePatrol.ts"],
  },
  {
    feature: "服务闭环历史 IndexedDB 持久化",
    guideline: "8.1 六层管道运行记录",
    status: "PLANNED",
    implementation: "useServiceLoop 已预留 loopHistory store, 待集成 usePersistedList<LoopRun>('loopHistory')",
    files: ["hooks/useServiceLoop.ts"],
  },
  {
    feature: "操作模板 IndexedDB 持久化",
    guideline: "3.3 操作模板管理",
    status: "PLANNED",
    implementation: "useOperationCenter 已预留 operationTemplates store, 待集成 usePersistedList<OperationTemplateItem>('operationTemplates')",
    files: ["hooks/useOperationCenter.ts"],
  },
  {
    feature: "真实 File System Access API",
    guideline: "10.1 File System Access API",
    status: "PLANNED",
    implementation: "当前为 Mock 静态目录树, 真实部署时需调用 window.showOpenFilePicker / showDirectoryPicker",
    files: ["hooks/useLocalFileSystem.ts"],
  },
  {
    feature: "Service Worker 真实注册",
    guideline: "7.1 PWA + Service Worker",
    status: "PLANNED",
    implementation: "当前 usePWAManager 为 Mock, 真实部署时需 navigator.serviceWorker.register('/sw.js')",
    files: ["hooks/usePWAManager.ts"],
  },
];

// ─────────────────────────────────────────────────────
//  五、统计总结
// ─────────────────────────────────────────────────────

export const STORAGE_SUMMARY = {
  localStorageKeys: 13,
  indexedDBStores: 10,
  indexedDBName: "yyc3_matrix",
  broadcastChannel: "yyc3_storage_sync",
  persistedHooks: {
    active: ["useAlertRules (IndexedDB)", "useModelProvider (localStorage)", "useBigModelSDK (localStorage)", "useI18n (localStorage)", "useOfflineMode (localStorage)"],
    newInfra: ["usePersistedList (通用 IndexedDB Hook)", "yyc3-storage.ts (统一存储层)"],
    planned: ["usePatrol", "useServiceLoop", "useOperationCenter", "useAIDiagnostics", "useReportExporter"],
  },
  featuresAudit: {
    done: 10,
    fixed: 2,
    new: 6,
    planned: 5,
  },
};
