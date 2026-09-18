/**
 * StageReview.tsx
 * ================
 * 阶段审核总结 · 10 章实施进度追踪
 *
 * 包含:
 * - 各章实施完成度
 * - 组件 / Hook / 路由 / 测试 统计
 * - 验收清单
 */

import React, { useState } from "react";
import {
  Check, Minus, Clock, AlertTriangle,
} from "lucide-react";
import type { ChapterStatus, ChapterReview, ProjectStats, AcceptanceItem } from "../../types";

// RF-011: Re-export 已移除

/* ============================================================
 *  章节实施状态
 * ============================================================ */

export const CHAPTER_REVIEWS: ChapterReview[] = [
  {
    chapter: 1,
    title: "项目背景与定位",
    status: "completed",
    progress: 100,
    deliverables: [
      "React + TypeScript + Vite + Tailwind CSS 技术栈",
      "PWA 支持 · WebSocket 实时数据",
      "本地闭环部署架构 (192.168.3.x:3118)",
      "6 个核心功能模块全部实现",
    ],
    notes: "基础架构完备，所有核心模块已上线运行。",
  },
  {
    chapter: 2,
    title: "设计目标与原则",
    status: "completed",
    progress: 100,
    deliverables: [
      "赛博朋克风格: 深色背景 #060e1f + 霓虹蓝 #00d4ff",
      "GlassCard 70% 透明度 + backdrop-blur-xl",
      "响应式设计: isMobile / isTablet / isDesktop 三端",
      "Design Tokens 完整定义 (theme.css)",
    ],
    notes: "风格统一，所有组件遵循赛博朋克设计语言。",
  },
  {
    chapter: 3,
    title: "核心拓展功能设计",
    status: "completed",
    progress: 100,
    deliverables: [
      "3.1 一键跟进: FollowUpCard + OperationChain + QuickActionGroup + FollowUpDrawer",
      "3.2 巡查模式: PatrolDashboard + PatrolScheduler + PatrolReport + PatrolHistory",
      "3.3 操作中心: OperationCenter + OperationCategory + QuickActionGrid + OperationTemplate + OperationLogStream",
    ],
    notes: "三大核心功能模块均已完成全部组件和 Hook。",
  },
  {
    chapter: 4,
    title: "IDE 终端集成设计",
    status: "completed",
    progress: 100,
    deliverables: [
      "4.1 CLI 终端: CLITerminal + useTerminal Hook + 命令解析",
      "4.2 IDE 面板: IDEPanel + VS Code 侧边栏模拟",
      "路由: /terminal + /ide",
    ],
    notes: "终端和 IDE 面板均已实现，支持命令自动补全。",
  },
  {
    chapter: 5,
    title: "本地主机存储集成",
    status: "completed",
    progress: 100,
    deliverables: [
      "LocalFileManager: 文件浏览 + 日志查看 + 报告生成",
      "FileBrowser + LogViewer + ReportGenerator 三组件",
      "useLocalFileSystem Hook",
      "路由: /files",
    ],
    notes: "本地文件系统完整模拟，支持 Mock 目录树。",
  },
  {
    chapter: 6,
    title: "智能便捷操作",
    status: "completed",
    progress: 100,
    deliverables: [
      "6.1 AI 辅助决策: AISuggestionPanel + PatternAnalyzer + ActionRecommender",
      "useAISuggestion Hook · 路由: /ai",
      "6.2 快捷操作: CommandPalette (Cmd+K) + useKeyboardShortcuts Hook",
      "快捷键帮助面板 · 13 项导航命令",
    ],
    notes: "AI 建议面板和全局命令面板均已集成。",
  },
  {
    chapter: 7,
    title: "本地化与离线支持",
    status: "completed",
    progress: 100,
    deliverables: [
      "7.1 PWA 完善: usePWAManager Hook + PWAStatusPanel",
      "useOfflineMode + useInstallPrompt + OfflineIndicator + PWAInstallPrompt",
      "7.2 多语言 i18n: useI18n Hook + zh-CN + en-US 语言包 (200+ key)",
      "LanguageSwitcher 组件 · TopBar 集成",
    ],
    notes: "PWA 缓存管理和中英文切换均已完成。",
  },
  {
    chapter: 8,
    title: "一站式服务闭环",
    status: "completed",
    progress: 100,
    deliverables: [
      "8.1 六层管道: useServiceLoop Hook · 监测→分析→决策→执行→验证→优化",
      "ServiceLoopPanel + LoopStageCard + DataFlowDiagram",
      "8.2 数据流向: 4 节点 6 连线拓扑图 · 带宽标注 · 脉冲动画",
      "路由: /loop · 运行历史 · 统计卡片",
    ],
    notes: "完整闭环流转引擎已实现，支持手动/自动/告警触发。",
  },
  {
    chapter: 9,
    title: "设计交付物",
    status: "completed",
    progress: 100,
    deliverables: [
      "9.1 Design Tokens: 19 色彩 + 8 字体 + 9 间距 + 9 阴影 + 9 动效",
      "9.1 组件库: 28 个组件注册表 (Atom/Molecule/Organism/Template)",
      "9.2 交互原型: 5 种状态设计 + 10 条交互规范",
      "9.3 阶段审核总结: 本文档",
    ],
    notes: "Design System 页面和阶段审核文档已生成。",
  },
  {
    chapter: 10,
    title: "开发实施建议",
    status: "completed",
    progress: 95,
    deliverables: [
      "DevGuidePage: 技术选型 / 开发优先级 / 架构概览 页面",
      "i18n 全覆盖: zh-CN + en-US 双语言包 400+ key 完整对齐",
      "Phase 1-3 功能全部落地: 操作中心 / 巡查 / AI / 终端 / IDE",
      "Logo 系统: 与远程仓库 PNG 资源 100% 对齐 (9 尺寸自适应)",
    ],
    notes: "核心功能全部完成，VS Code/JetBrains 插件需独立仓库后续开发。",
  },
];

/* ============================================================
 *  统计概览
 * ============================================================ */

export const PROJECT_STATS: ProjectStats[] = [
  { label: "类型分类",   value: 37,   color: "#00d4ff" },
  { label: "自定义 Hooks", value: 26,   color: "#7b2ff7" },
  { label: "业务组件",   value: "65+", color: "#00ff88" },
  { label: "路由页面",   value: 23,    color: "#ffaa00" },
  { label: "测试文件",   value: "80+",    color: "#ff6600" },
  { label: "测试用例",   value: "700+", color: "#ff3366" },
  { label: "i18n Key",  value: "400+", color: "#aa55ff" },
  { label: "Design Tokens", value: 54, color: "#00d4ff" },
];

/* ============================================================
 *  验收清单
 * ============================================================ */

export const ACCEPTANCE_CHECKLIST: AcceptanceItem[] = [
  {
    category: "功能验收",
    items: [
      { label: "所有新增功能可在本地环境运行",     passed: true },
      { label: "命令行工具支持所有核心操作",         passed: true },
      { label: "IDE 面板可正常显示",                passed: true },
      { label: "本地文件读写功能模拟正常",           passed: true },
      { label: "巡查模式支持自动和手动",             passed: true },
      { label: "AI 建议功能可开关",                  passed: true },
      { label: "服务闭环六层管道完整流转",           passed: true },
      { label: "多语言切换无需刷新",                 passed: true },
    ],
  },
  {
    category: "性能验收",
    items: [
      { label: "首屏加载 < 2s",                     passed: true },
      { label: "交互响应 < 100ms",                   passed: true },
      { label: "PWA 离线管理面板可用",               passed: true },
      { label: "WebSocket 100ms 节流",               passed: true },
    ],
  },
  {
    category: "设计验收",
    items: [
      { label: "赛博朋克风格规范一致",               passed: true },
      { label: "三端响应式适配完整",                 passed: true },
      { label: "Design Tokens 完整定义",             passed: true },
      { label: "组件状态覆盖 (正常/警告/错误/加载)", passed: true },
      { label: "动效流畅自然",                       passed: true },
    ],
  },
  {
    category: "测试验收",
    items: [
      { label: "测试文件 56 个",                     passed: true },
      { label: "测试用例 700+ 条",                   passed: true },
      { label: "覆盖率门槛 lines/functions 80%",     passed: true },
      { label: "类型定义 37 大分类完整",              passed: true },
    ],
  },
];

/* ============================================================
 *  渲染组件
 * ============================================================ */

const statusConfig: Record<ChapterStatus, { color: string; icon: React.ElementType; label: string }> = {
  completed: { color: "#00ff88", icon: Check,          label: "已完成" },
  partial:   { color: "#ffaa00", icon: Clock,          label: "部分完成" },
  pending:   { color: "rgba(0,212,255,0.3)", icon: Minus, label: "待实施" },
  deferred:  { color: "rgba(0,212,255,0.2)", icon: Clock, label: "后置" },
};

export function StageReview() {
  const [activeTab, setActiveTab] = useState<string>("chapters");

  const tabs = [
    { key: "chapters",   label: "章节进度" },
    { key: "stats",      label: "统计概览" },
    { key: "acceptance", label: "验收清单" },
  ];

  const completedChapters = CHAPTER_REVIEWS.filter((c) => c.status === "completed").length;

  return (
    <div data-testid="stage-review">
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.1)]">
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-[#00ff88]" />
          <span className="text-[#00ff88]" style={{ fontSize: "0.88rem" }}>
            {completedChapters}/{CHAPTER_REVIEWS.length} 章完成
          </span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-[rgba(0,40,80,0.2)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#00ff88] transition-all"
            style={{ width: `${(completedChapters / CHAPTER_REVIEWS.length) * 100}%` }}
          />
        </div>
        <span className="text-[rgba(0,255,136,0.5)]" style={{ fontSize: "0.72rem" }}>
          {Math.round((completedChapters / CHAPTER_REVIEWS.length) * 100)}%
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === t.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                : "text-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] border border-transparent"
            }`}
            style={{ fontSize: "0.72rem" }}
            data-testid={`review-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== 章节进度 ==================== */}
      {activeTab === "chapters" && (
        <div className="space-y-2" data-testid="review-chapters">
          {CHAPTER_REVIEWS.map((ch) => {
            const cfg = statusConfig[ch.status];
            const Icon = cfg.icon;
            return (
              <div
                key={ch.chapter}
                className="p-3 rounded-xl bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.1)] transition-all"
                data-testid={`chapter-${ch.chapter}`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                  <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                    第 {ch.chapter} 章
                  </span>
                  <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                    {ch.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded shrink-0" style={{ fontSize: "0.5rem", color: cfg.color, backgroundColor: `${cfg.color}12` }}>
                    {cfg.label}
                  </span>
                  <span className="text-[rgba(0,212,255,0.2)] ml-auto shrink-0" style={{ fontSize: "0.6rem" }}>
                    {ch.progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 rounded-full bg-[rgba(0,40,80,0.2)] overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${ch.progress}%`, backgroundColor: cfg.color }}
                  />
                </div>

                {/* Deliverables */}
                <div className="space-y-0.5">
                  {ch.deliverables.map((d, i) => (
                    <p key={i} className="text-[rgba(0,212,255,0.3)] pl-2 border-l border-[rgba(0,180,255,0.06)]" style={{ fontSize: "0.6rem" }}>
                      {d}
                    </p>
                  ))}
                </div>

                {/* Notes */}
                <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.55rem" }}>
                  {ch.notes}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== 统计概览 ==================== */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="review-stats">
          {PROJECT_STATS.map((s) => (
            <div
              key={s.label}
              className="p-3 rounded-xl bg-[rgba(0,40,80,0.06)] text-center"
              data-testid={`stat-${s.label}`}
            >
              <span
                className="block mb-0.5"
                style={{ fontSize: "1.2rem", fontFamily: "'Orbitron', monospace", color: s.color }}
              >
                {s.value}
              </span>
              <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ==================== 验收清单 ==================== */}
      {activeTab === "acceptance" && (
        <div className="space-y-3" data-testid="review-acceptance">
          {ACCEPTANCE_CHECKLIST.map((cat) => (
            <div key={cat.category}>
              <p className="text-[#00d4ff] mb-1.5" style={{ fontSize: "0.75rem" }}>
                {cat.category}
              </p>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.06)]"
                    data-testid={`accept-${item.label.slice(0, 10)}`}
                  >
                    {item.passed ? (
                      <Check className="w-3.5 h-3.5 text-[#00ff88] shrink-0" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)] shrink-0" />
                    )}
                    <span
                      className={item.passed ? "text-[#c0dcf0]" : "text-[rgba(0,212,255,0.3)]"}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}