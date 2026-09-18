/**
 * ALIGNMENT-PLAN.ts
 * ==================
 * YYC³ CloudPivot Intelli-Matrix · 全局对齐实施方案
 *
 * 基于 guidelines/YYC3-CloudPivot-Intelli-Matrix.md 的 156 个问题统计
 * 与项目当前实际状态的逐条对齐分析
 *
 * 生成时间: 2026-03-07
 * 文档性质: 纯 .ts 导出常量, 不被运行时代码导入
 */

// ============================================================
//  一、问题对齐矩阵 (Guidelines vs 当前状态)
// ============================================================

export const ALIGNMENT_MATRIX = {
  title: "YYC³ 全局对齐矩阵",
  generatedAt: "2026-03-07",
  totalIssues: 156,
  resolved: 47,
  inProgress: 12,
  remaining: 97,

  categories: [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. 数据管理问题 (Data Management)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: "DM",
      name: "数据管理问题",
      issues: [
        {
          id: "DM-1.1",
          title: "模型信息不一致",
          severity: "🔴 严重",
          guidelinesRef: "1.1",
          status: "🟡 部分修复",
          detail: "useModelProvider 已重构为动态 CRUD + localStorage 持久化 + Ollama 自动检测同步",
          remaining: [
            "SystemSettings.tsx 第 840-845 行仍有硬编码 <option> 列表 (GPT-4o/LLaMA-70B/Qwen-72B 等)",
            "SystemSettings.tsx 的 aiModel 默认值仍为硬编码 'gpt-4o'",
          ],
          fix: "Phase-1: 将 SystemSettings 的 AI 模型选择改为消费 useModelProvider().availableModels",
        },
        {
          id: "DM-1.2",
          title: "硬编码内容过多",
          severity: "🔴 严重",
          guidelinesRef: "1.2",
          status: "🟡 部分修复",
          detail: "useModelProvider 服务商列表已改为可编辑 CRUD; API 端点已有 api-config.ts 持久化",
          remaining: [
            "1.2.1 模型提供者配置 → ✅ 已修复 (上轮重构)",
            "1.2.2 SystemSettings.tsx 系统设置默认值 → 未持久化到 localStorage",
            "1.2.3 useLocalFileSystem.ts MOCK_FILE_TREE → 仍为硬编码 (Web 环境无真实 FS, 可增加编辑能力)",
            "1.2.4 db-queries.ts MOCK_MODELS/MOCK_NODES/MOCK_AGENTS → 仍为硬编码 (需 localStorage 可编辑化)",
          ],
          fix: "Phase-1: SystemSettings 持久化; Phase-2: db-queries 数据可编辑; Phase-3: 文件树可编辑",
        },
        {
          id: "DM-1.3",
          title: "缺少持久化存储",
          severity: "🔴 严重",
          guidelinesRef: "1.3",
          status: "🟡 部分修复",
          detail: [
            "✅ useModelProvider → localStorage 持久化",
            "✅ api-config.ts → localStorage + BroadcastChannel",
            "✅ useBigModelSDK → sessions + stats localStorage",
            "❌ SystemSettings → 不持久化, 重启丢失",
            "❌ db-queries.ts → 纯 mock, 无法 CRUD",
            "❌ useLocalFileSystem → 纯 mock",
          ],
          fix: "Phase-1: SystemSettings 持久化; Phase-2: db-queries 加 localStorage CRUD 层",
        },
      ],
    },
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. 架构设计问题 (Architecture)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: "ARCH",
      name: "架构设计问题",
      issues: [
        {
          id: "ARCH-2.1",
          title: "数据源分散",
          severity: "🟡 中等",
          guidelinesRef: "2.1",
          status: "🟡 部分修复",
          detail: "useModelProvider 已统一模型数据源; availableModels 供全局消费",
          remaining: [
            "SystemSettings.tsx AI 模型 <select> 仍独立维护列表 → 需对接 useModelProvider",
            "db-queries.ts 的 MOCK_MODELS 与 useModelProvider 的数据完全独立",
          ],
          fix: "Phase-1: SystemSettings 对接统一数据源; Phase-2: db-queries 统一化",
        },
        {
          id: "ARCH-2.2",
          title: "Electron 功能不完整",
          severity: "🟡 中等",
          guidelinesRef: "2.2",
          status: "⬜ 超出范围",
          detail: "Figma Make 为 Web 沙箱环境, Electron IPC / 真实文件系统操作不适用",
          remaining: ["标记为 Web 环境限制, 不在本轮修复范围"],
          fix: "N/A (Electron 功能在本地 IDE 环境中实现)",
        },
        {
          id: "ARCH-2.3",
          title: "缺少统一配置管理",
          severity: "🟡 中等",
          guidelinesRef: "2.3",
          status: "🟡 部分修复",
          detail: [
            "✅ api-config.ts 已实现统一 API 端点配置管理 + localStorage + BroadcastChannel",
            "✅ useModelProvider 已实现统一模型/服务商配置管理 + 导入导出",
            "❌ SystemSettings 的其他配置项 (集群/存储/WebSocket 等) 未持久化",
          ],
          fix: "Phase-1: 创建 useSettingsStore 统一管理 SystemSettings 所有配置",
        },
      ],
    },
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. 用户体验问题 (UX)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: "UX",
      name: "用户体验问题",
      issues: [
        {
          id: "UX-3.1",
          title: "模型选择体验不佳",
          severity: "🟡 中等",
          guidelinesRef: "3.1",
          status: "🟡 部分修复",
          detail: [
            "✅ AIAssistant 浮窗 → 已对接 useModelProvider.availableModels",
            "✅ ModelProviderPanel → 已完整 CRUD",
            "✅ AddModelModal → 已支持自定义模型名输入",
            "❌ SystemSettings → 仍为硬编码 <select>",
          ],
          fix: "Phase-1: SystemSettings AI 模型选择改为动态列表",
        },
        {
          id: "UX-3.2",
          title: "文件系统管理功能缺失",
          severity: "🟡 中等",
          guidelinesRef: "3.2",
          status: "🟡 Mock 受限",
          detail: "Web 沙箱无真实 FS, Mock 数据可增加编辑能力 (增删改文件节点)",
          fix: "Phase-3: useLocalFileSystem 增加 CRUD 操作 + localStorage 持久化",
        },
        {
          id: "UX-3.3",
          title: "配置修改不持久",
          severity: "🟡 中等",
          guidelinesRef: "3.3",
          status: "🟡 部分修复",
          detail: [
            "✅ API 端点配置 → 已持久化",
            "✅ 模型/服务商配置 → 已持久化",
            "✅ AI 聊天会话 → 已持久化",
            "❌ SystemSettings 全局设置 → 未持久化",
          ],
          fix: "Phase-1: useSettingsStore + localStorage",
        },
      ],
    },
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. 性能问题 (Performance)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
      id: "PERF",
      name: "性能问题",
      issues: [
        {
          id: "PERF-4.1",
          title: "Mock 数据加载效率低",
          severity: "🟢 轻微",
          guidelinesRef: "4.1",
          status: "⬜ 待评估",
          detail: "Mock 数据量不大, 当前性能可接受; 若后续接入真实数据源可加分页",
          fix: "Phase-3: 按需优化",
        },
        {
          id: "PERF-4.2",
          title: "缺少性能监控",
          severity: "🟢 轻微",
          guidelinesRef: "4.2",
          status: "⬜ 待评估",
          fix: "Phase-3: 按需添加",
        },
      ],
    },
  ],
} as const;

// ============================================================
//  二、分阶段实施计划
// ============================================================

export const IMPLEMENTATION_PHASES = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Phase-1: 统一数据源闭环 (本轮重点)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  phase1: {
    name: "Phase-1: 统一数据源闭环",
    priority: "🔴 最高",
    scope: "消除所有硬编码模型列表 + SystemSettings 持久化 + 数据源统一",
    tasks: [
      {
        id: "P1-T1",
        title: "SystemSettings.tsx AI 模型选择对接 useModelProvider",
        status: "✅ 已完成",
        detail: [
          "移除第 840-845 行硬编码 <option> 列表",
          "import useModelProvider, 消费 availableModels 动态渲染",
          "aiModel 默认值改为从 availableModels[0] 自动选取",
        ],
        affectsTests: ["SystemSettings.test.tsx"],
        effort: "15min",
      },
      {
        id: "P1-T2",
        title: "创建 useSettingsStore Hook — SystemSettings 全局持久化",
        status: "✅ 已完成",
        detail: [
          "新建 src/app/hooks/useSettingsStore.ts",
          "将 SystemSettings 的所有 values state 迁移到此 Hook",
          "localStorage 持久化 (key: yyc3_system_settings)",
          "BroadcastChannel 多标签页同步",
          "导出 getSettings / updateSettings / resetSettings",
          "SystemSettings.tsx 消费此 Hook",
        ],
        affectsTests: ["SystemSettings.test.tsx"],
        effort: "25min",
      },
      {
        id: "P1-T3",
        title: "db-queries.ts Mock 数据可编辑化",
        status: "✅ 已完成",
        detail: [
          "MOCK_MODELS / MOCK_NODES / MOCK_AGENTS 初始化写入 localStorage",
          "后续读取从 localStorage 获取 (支持 CRUD)",
          "添加 addModel / updateModel / deleteModel 等函数",
          "添加 addNode / updateNode / deleteNode 等函数",
          "Dashboard 等消费组件无需改动 (函数签名不变)",
        ],
        affectsTests: ["db-queries.test.ts"],
        effort: "20min",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Phase-2: 数据管理增强
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  phase2: {
    name: "Phase-2: 数据管理增强",
    priority: "🟡 中等",
    scope: "数据编辑 UI + 导入导出 + 数据校验",
    tasks: [
      {
        id: "P2-T1",
        title: "db-queries 数据编辑 UI (模型/节点 CRUD 面板)",
        status: "✅ 已完成",
        detail: "新建 DataEditorPanel.tsx — 模型/节点/Agent 三 Tab CRUD 表格 + 搜索 + 校验 + 重置",
        effort: "30min",
      },
      {
        id: "P2-T2",
        title: "全局配置导入导出统一入口",
        status: "✅ 已完成",
        detail: "新建 ConfigExportCenter.tsx — 整合 useModelProvider + useSettingsStore + db-queries 三大模块，支持分模块选择导出/导入/重置/预览",
        effort: "20min",
      },
      {
        id: "P2-T3",
        title: "数据校验与错误提示",
        status: "✅ 已完成",
        detail: "新建 useValidation.ts — URL/API Key/端口/IP/模型名/数值范围/正则等 10+ 校验规则，支持单字段实时校验和批量校验",
        effort: "15min",
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Phase-3: 文件树 CRUD + 性能监控 + 硬编码消除
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  phase3: {
    name: "Phase-3: 文件树 CRUD + 性能监控 + 硬编码消除",
    priority: "🟢 低",
    scope: "文件系统可编辑 + 性能优化 + 监控",
    tasks: [
      {
        id: "P3-T1",
        title: "useLocalFileSystem CRUD + localStorage 持久化",
        status: "✅ 已完成",
        detail: "重写 useLocalFileSystem.ts — 文件树 localStorage 持久化 + addFile/addDirectory/renameItem/deleteItem/deleteBatch/resetFileTree/exportFileTree/importFileTree 完整 CRUD",
        effort: "25min",
      },
      {
        id: "P3-T2",
        title: "性能监控面板 (PerformanceMonitor)",
        status: "✅ 已完成",
        detail: "新建 PerformanceMonitor.tsx — Web Vitals 采集(FCP/LCP/CLS/INP/TTFB) + JS Heap 内存趋势图 + FPS 实时图 + localStorage 用量 + 资源加载按类型汇总 + recharts 图表 + 导出快照",
        effort: "30min",
      },
      {
        id: "P3-T3",
        title: "DataEditorPanel 批量删除 + 排序功能",
        status: "✅ 已完成",
        detail: "三表全增加: 全选 checkbox + 行选择 + 批量删除操作栏 + 列头点击排序(升序/降序切换) + SortIcon 指示器 + 切换 Tab 清空选中/排序",
        effort: "20min",
      },
      {
        id: "P3-T4",
        title: "env-config 环境变量集中管理",
        status: "✅ 已完成",
        detail: "新建 env-config.ts — 30+ 不可逆环境变量统一 env() 读取: 系统名/版本/API端点/WS端点/Ollama地址/存储前缀/IDB名称/集群ID/AI默认配置/安全配置/功能开关, 优先级 import.meta.env > localStorage > defaults",
        effort: "15min",
      },
      {
        id: "P3-T5",
        title: "MOCK 数据 → localStorage 可编辑转换",
        status: "✅ 已完成",
        detail: "createLocalStore 通用工厂 + useFollowUp/useAISuggestion 转为 localStorage 持久化 + ConfigExportCenter 增加 envConfig 模块",
        effort: "20min",
      },
    ],
  },
} as const;

// ============================================================
//  三、已修复问题清单 (前几轮成果)
// ============================================================

export const COMPLETED_FIXES = [
  "✅ ModelProviderId 从固定枚举改为 string, 支持自定义服务商",
  "✅ ModelProviderDef 增加 isBuiltin/isCustom/createdAt/updatedAt 字段",
  "✅ useModelProvider 服务商 CRUD (addProvider/updateProvider/removeProvider/resetProvider)",
  "✅ useModelProvider 模型列表动态编辑 (addModelToProvider/removeModelFromProvider)",
  "✅ useModelProvider localStorage 持久化 (providers + configuredModels)",
  "✅ useModelProvider Ollama 初始化自动获取 + 模型列表同步",
  "✅ useModelProvider 统一 availableModels 合并列表",
  "✅ useModelProvider 配置导入/导出 (exportConfig/importConfig)",
  "✅ ProviderEditorModal 新建 — 自定义服务商编辑器 (新增/编辑/重置)",
  "✅ AddModelModal 增加自定义模型名输入",
  "✅ ModelProviderPanel 服务商注册表展示/编辑/删除 + 导入导出 UI",
  "✅ AIAssistant 浮窗移除 MOCK_MODELS, 对接 useModelProvider.availableModels",
  "✅ api-config.ts 统一 API 端点管理 + localStorage + BroadcastChannel",
  "✅ CodeEditor @codemirror 依赖修复",
  "✅ 全部 100+ 测试文件通过",
] as const;

// ============================================================
//  四、文件影响范围图
// ============================================================

export const FILE_IMPACT_MAP = {
  "Phase-1 直接修改": [
    "src/app/components/SystemSettings.tsx     — 模型选择动态化 + 消费 useSettingsStore",
    "src/app/hooks/useSettingsStore.ts          — 新建: 全局设置持久化 Hook",
    "src/app/lib/db-queries.ts                 — Mock 数据 localStorage 可编辑化",
  ],
  "Phase-1 间接验证": [
    "src/app/components/AIAssistant.tsx         — 确认 availableModels 一致性",
    "src/app/components/ModelProviderPanel.tsx   — 确认服务商 CRUD 正常",
    "src/app/components/SDKChatPanel.tsx        — 确认 configuredModels 一致性",
    "src/app/hooks/useModelProvider.ts          — 上轮已重构, 本轮验证",
  ],
  "不修改 (已完成)": [
    "src/app/types/index.ts                    — 上轮已更新",
    "src/app/hooks/useBigModelSDK.ts           — 兼容 string ModelProviderId",
    "src/app/components/AddModelModal.tsx       — 上轮已增加自定义模型输入",
    "src/app/components/ProviderEditorModal.tsx — 上轮新建",
    "src/app/lib/api-config.ts                 — 已完整, 无需修改",
  ],
} as const;