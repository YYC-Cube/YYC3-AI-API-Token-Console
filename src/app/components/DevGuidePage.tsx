/**
 * DevGuidePage.tsx
 * ==================
 * 第十章 · 开发实施建议 · 可视化面板
 *
 * 路由: /dev-guide
 *
 * 包含:
 * 10.1 技术选型表
 * 10.2 开发优先级 (Phase 1/2/3 + 进度追踪)
 * 架构概览 · 存储策略
 */

import React, { useState, useContext } from "react";
import {
  BookOpen, Server, Database, Globe, Cpu,
  Check, Clock, AlertCircle, ChevronRight,
  HardDrive, Terminal, MonitorSmartphone, Layers,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

/* ============================================================
 *  10.1 技术选型
 * ============================================================ */

interface TechChoice {
  feature: string;
  technology: string;
  reason: string;
  icon: React.ElementType;
  status: "active" | "planned" | "optional";
}

const TECH_CHOICES: TechChoice[] = [
  {
    feature: "本地文件访问",
    technology: "File System Access API",
    reason: "原生浏览器支持，无需插件，直接读写本地文件",
    icon: HardDrive,
    status: "active",
  },
  {
    feature: "前端框架",
    technology: "React 19 + TypeScript + Vite",
    reason: "类型安全、热更新、Tree Shaking、生态丰富",
    icon: Layers,
    status: "active",
  },
  {
    feature: "样式系统",
    technology: "Tailwind CSS v4 + CSS Variables",
    reason: "原子化样式、Design Tokens、赛博朋克主题",
    icon: Globe,
    status: "active",
  },
  {
    feature: "实时数据",
    technology: "WebSocket (ws://localhost:3113/ws)",
    reason: "本地低延迟、双向通信、100ms 节流",
    icon: Cpu,
    status: "active",
  },
  {
    feature: "本地存储",
    technology: "IndexedDB + localStorage",
    reason: "双层缓存：大数据持久化 + 轻量配置",
    icon: Database,
    status: "active",
  },
  {
    feature: "离线运行",
    technology: "Service Worker + PWA",
    reason: "标准化方案，缓存策略，后台同步",
    icon: MonitorSmartphone,
    status: "active",
  },
  {
    feature: "命令行工具",
    technology: "Commander.js + Node.js CLI",
    reason: "成熟、易用、支持子命令和自动补全",
    icon: Terminal,
    status: "planned",
  },
  {
    feature: "IDE 插件",
    technology: "VS Code Extension API",
    reason: "官方支持、Webview Panel、命令面板",
    icon: Server,
    status: "planned",
  },
];

/* ============================================================
 *  10.2 开发优先
 * ============================================================ */

type PhaseStatus = "completed" | "inProgress" | "planned";

interface PhaseItem {
  id: number;
  name: string;
  description: string;
  status: PhaseStatus;
  components: string[];
}

interface DevPhase {
  phase: number;
  title: string;
  subtitle: string;
  color: string;
  items: PhaseItem[];
}

const DEV_PHASES: DevPhase[] = [
  {
    phase: 1,
    title: "Phase 1",
    subtitle: "核心闭环",
    color: "#00ff88",
    items: [
      {
        id: 1,
        name: "操作中心 + 操作模板",
        description: "集中管理操作、批量操作、定时任务",
        status: "completed",
        components: ["OperationCenter", "OperationCategory", "QuickActionGrid", "OperationTemplate", "OperationLogStream"],
      },
      {
        id: 2,
        name: "巡查模式 + 自动巡查",
        description: "定期/手动巡检、巡检报告、风险标记",
        status: "completed",
        components: ["PatrolDashboard", "PatrolScheduler", "PatrolReport", "PatrolHistory"],
      },
      {
        id: 3,
        name: "本地文件访问 + 日志导出",
        description: "文件浏览、日志查看、报告生成",
        status: "completed",
        components: ["LocalFileManager", "FileBrowser", "LogViewer", "ReportGenerator"],
      },
    ],
  },
  {
    phase: 2,
    title: "Phase 2",
    subtitle: "智能增强",
    color: "#00d4ff",
    items: [
      {
        id: 4,
        name: "AI 辅助决策",
        description: "异常模式检测、智能推荐、一键修复",
        status: "completed",
        components: ["AISuggestionPanel", "PatternAnalyzer", "ActionRecommender"],
      },
      {
        id: 5,
        name: "一键跟进 + 操作链路",
        description: "告警卡片、时间线操作链、快速操作按钮组",
        status: "completed",
        components: ["FollowUpCard", "OperationChain", "QuickActionGroup", "FollowUpDrawer"],
      },
      {
        id: 6,
        name: "快捷键系统",
        description: "全局快捷键、命令面板 (Cmd+K)",
        status: "completed",
        components: ["CommandPalette", "useKeyboardShortcuts"],
      },
    ],
  },
  {
    phase: 3,
    title: "Phase 3",
    subtitle: "终端集成",
    color: "#ffaa00",
    items: [
      {
        id: 7,
        name: "命令行工具 (CLI)",
        description: "CLI 终端模拟、命令补全、脚本化",
        status: "completed",
        components: ["CLITerminal", "useTerminal"],
      },
      {
        id: 8,
        name: "IDE 插件 (VS Code)",
        description: "VS Code 侧边栏模拟、Webview Panel",
        status: "completed",
        components: ["IDEPanel"],
      },
      {
        id: 9,
        name: "脚本化操作",
        description: "操作模板脚本化、批量执行、导出",
        status: "completed",
        components: ["OperationTemplate", "ScriptExecutor"],
      },
    ],
  },
];

/* ============================================================
 *  架构概览节点
 * ============================================================ */

interface ArchNode {
  label: string;
  sublabel: string;
  color: string;
  icon: React.ElementType;
  techs: string[];
}

const ARCH_NODES: ArchNode[] = [
  {
    label: "表示层",
    sublabel: "React + Tailwind + PWA",
    color: "#00d4ff",
    icon: MonitorSmartphone,
    techs: ["React 19", "TypeScript", "Tailwind v4", "React Router", "Recharts", "Lucide Icons"],
  },
  {
    label: "状态层",
    sublabel: "Context + Hooks + WebSocket",
    color: "#7b2ff7",
    icon: Layers,
    techs: ["React Context", "Custom Hooks x17", "WebSocket 实时数据", "100ms 节流"],
  },
  {
    label: "数据层",
    sublabel: "IndexedDB + localStorage + Mock",
    color: "#00ff88",
    icon: Database,
    techs: ["IndexedDB", "localStorage", "Mock 数据生成", "本地 PostgreSQL"],
  },
  {
    label: "运行时",
    sublabel: "Vite + Service Worker",
    color: "#ffaa00",
    icon: Cpu,
    techs: ["Vite HMR", "Service Worker", "PWA Manifest", "本地部署 3118 端口"],
  },
];

/* ============================================================
 *  存储策略说明
 * ============================================================ */

interface StorageLayer {
  name: string;
  tech: string;
  usage: string[];
  limit: string;
  color: string;
}

const STORAGE_LAYERS: StorageLayer[] = [
  {
    name: "L1 内存缓存",
    tech: "React State + Context",
    usage: ["WebSocket 实时数据", "UI 状态", "命令历史"],
    limit: "~50MB",
    color: "#00d4ff",
  },
  {
    name: "L2 轻量持久化",
    tech: "localStorage",
    usage: ["语言偏好", "主题设置", "用户配置", "认证 Token"],
    limit: "5-10MB",
    color: "#7b2ff7",
  },
  {
    name: "L3 大数据持久化",
    tech: "IndexedDB",
    usage: ["巡查历史", "操作日志", "缓存响应", "离线数据"],
    limit: "~500MB+",
    color: "#00ff88",
  },
  {
    name: "L4 文件系统",
    tech: "File System Access API",
    usage: ["日志文件", "报告导出", "配置备份", "数据归档"],
    limit: "无限制",
    color: "#ffaa00",
  },
];

/* ============================================================
 *  渲染组件
 * ============================================================ */

const statusIcon: Record<PhaseStatus, { icon: React.ElementType; color: string; label: string }> = {
  completed:  { icon: Check,       color: "#00ff88", label: "已完成" },
  inProgress: { icon: Clock,       color: "#ffaa00", label: "进行中" },
  planned:    { icon: AlertCircle, color: "rgba(0,212,255,0.3)", label: "已规划" },
};

export function DevGuidePage() {
  const view = useContext(ViewContext);
  const { t } = useI18n();
  const isMobile = view?.isMobile ?? false;
  const [activeTab, setActiveTab] = useState<string>("tech");

  const tabs = [
    { key: "tech",     label: t("devGuide.techStack") },
    { key: "priority", label: t("devGuide.devPriority") },
    { key: "arch",     label: t("devGuide.architecture") },
    { key: "storage",  label: t("devGuide.storageStrategy") },
  ];

  return (
    <div className="space-y-4" data-testid="dev-guide-page">
      {/* ======== Header ======== */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
            {t("devGuide.title")}
          </h2>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
            {t("devGuide.subtitle")}
          </p>
        </div>
      </div>

      {/* ======== Tabs ======== */}
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                : "text-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] border border-transparent"
            }`}
            style={{ fontSize: "0.72rem" }}
            data-testid={`devguide-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== 技术选型 ==================== */}
      {activeTab === "tech" && (
        <GlassCard className="p-4" data-testid="devguide-tech">
          <div className="space-y-2" data-testid="tech-list">
            {TECH_CHOICES.map((tc) => {
              const Icon = tc.icon;
              return (
                <div
                  key={tc.feature}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                  data-testid={`tech-${tc.feature}`}
                >
                  <Icon className="w-5 h-5 shrink-0 mt-0.5 text-[#00d4ff]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                        {tc.feature}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          fontSize: "0.55rem",
                          color: tc.status === "active" ? "#00ff88" : "#ffaa00",
                          backgroundColor: tc.status === "active" ? "rgba(0,255,136,0.08)" : "rgba(255,170,0,0.08)",
                          border: `1px solid ${tc.status === "active" ? "rgba(0,255,136,0.2)" : "rgba(255,170,0,0.2)"}`,
                        }}
                      >
                        {tc.status === "active" ? t("devGuide.completed") : t("devGuide.planned")}
                      </span>
                    </div>
                    <p className="text-[#00d4ff] mt-0.5" style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>
                      {tc.technology}
                    </p>
                    <p className="text-[rgba(0,212,255,0.3)] mt-0.5" style={{ fontSize: "0.62rem" }}>
                      {tc.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ==================== 开发优先级 ==================== */}
      {activeTab === "priority" && (
        <div className="space-y-4" data-testid="devguide-priority">
          {DEV_PHASES.map((phase) => {
            const completedCount = phase.items.filter((i) => i.status === "completed").length;
            const progress = Math.round((completedCount / phase.items.length) * 100);

            return (
              <GlassCard key={phase.phase} className="p-4" data-testid={`phase-${phase.phase}`}>
                {/* Phase header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="px-2 py-1 rounded-lg"
                    style={{
                      fontSize: "0.78rem",
                      fontFamily: "'Orbitron', monospace",
                      color: phase.color,
                      backgroundColor: `${phase.color}10`,
                      border: `1px solid ${phase.color}30`,
                    }}
                  >
                    {phase.title}
                  </span>
                  <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
                    {phase.subtitle}
                  </span>
                  <span className="text-[rgba(0,212,255,0.3)] ml-auto" style={{ fontSize: "0.65rem" }}>
                    {completedCount}/{phase.items.length} {t("devGuide.completed")}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-[rgba(0,40,80,0.2)] overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: phase.color }}
                  />
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {phase.items.map((item) => {
                    const stCfg = statusIcon[item.status];
                    const StIcon = stCfg.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)]"
                        data-testid={`priority-item-${item.id}`}
                      >
                        <StIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: stCfg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#e0f0ff]" style={{ fontSize: "0.75rem" }}>
                              {item.id}. {item.name}
                            </span>
                          </div>
                          <p className="text-[rgba(0,212,255,0.3)] mt-0.5" style={{ fontSize: "0.62rem" }}>
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.components.map((c) => (
                              <span
                                key={c}
                                className="px-1 py-0.5 rounded bg-[rgba(0,40,80,0.15)] text-[rgba(0,212,255,0.3)]"
                                style={{ fontSize: "0.5rem", fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ==================== 架构概 ==================== */}
      {activeTab === "arch" && (
        <GlassCard className="p-4" data-testid="devguide-arch">
          <div className="space-y-3">
            {ARCH_NODES.map((node, i) => {
              const Icon = node.icon;
              return (
                <div key={node.label}>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(0,40,80,0.06)]" data-testid={`arch-${node.label}`}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${node.color}12`, border: `1px solid ${node.color}25` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: node.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ color: node.color, fontSize: "0.82rem" }}>
                          {node.label}
                        </span>
                        <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                          {node.sublabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {node.techs.map((tech) => (
                          <span
                            key={tech}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              fontSize: "0.55rem",
                              fontFamily: "'JetBrains Mono', monospace",
                              color: `${node.color}90`,
                              backgroundColor: `${node.color}08`,
                              border: `1px solid ${node.color}15`,
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Connector arrow */}
                  {i < ARCH_NODES.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="flex flex-col items-center">
                        <div className="w-px h-3 bg-[rgba(0,180,255,0.1)]" />
                        <ChevronRight className="w-3 h-3 text-[rgba(0,180,255,0.15)] rotate-90" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ==================== 存储策略 ==================== */}
      {activeTab === "storage" && (
        <GlassCard className="p-4" data-testid="devguide-storage">
          <p className="text-[rgba(0,212,255,0.35)] mb-3" style={{ fontSize: "0.68rem" }}>
            {t("devGuide.dualCacheDesc")}
          </p>
          <div className="space-y-2">
            {STORAGE_LAYERS.map((layer, i) => (
              <div
                key={layer.name}
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: `${layer.color}04`,
                  borderColor: `${layer.color}15`,
                }}
                data-testid={`storage-${layer.name}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{
                      fontSize: "0.55rem",
                      fontFamily: "'Orbitron', monospace",
                      color: layer.color,
                      backgroundColor: `${layer.color}12`,
                    }}
                  >
                    L{i + 1}
                  </span>
                  <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                    {layer.name}
                  </span>
                  <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    {layer.tech}
                  </span>
                  <span className="text-[rgba(0,212,255,0.2)] ml-auto" style={{ fontSize: "0.55rem" }}>
                    {layer.limit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {layer.usage.map((u) => (
                    <span
                      key={u}
                      className="px-1.5 py-0.5 rounded"
                      style={{ fontSize: "0.55rem", color: `${layer.color}80`, backgroundColor: `${layer.color}08` }}
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}