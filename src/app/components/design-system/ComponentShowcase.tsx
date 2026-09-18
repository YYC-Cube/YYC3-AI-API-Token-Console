/**
 * ComponentShowcase.tsx
 * ======================
 * 9.1 Atoms / Molecules / Organisms / Templates 组件展示面板
 *
 * 交互原型 + 状态设计文档 合一
 * 每个组件展示：使用场景 / API / 状态变体 / 响应式行为
 */

import React, { useState } from "react";
import {
  Check, X, AlertTriangle, Info, Loader2, Bell,
  Activity, Shield, Server, Database, Zap,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import type { StatusDef, ComponentEntry, InteractionSpec } from "../../types";

// RF-011: Re-export 已移除

/* ============================================================
 *  状态颜色映射 (全局状态设计)
 * ============================================================ */

export const STATUS_DEFINITIONS: StatusDef[] = [
  {
    key: "normal",
    label: "正常",
    color: "#00ff88",
    bgColor: "rgba(0,255,136,0.06)",
    borderColor: "rgba(0,255,136,0.2)",
    glowColor: "rgba(0,255,136,0.3)",
    icon: Check,
    description: "系统运行正常，所有指标在阈值范围内",
  },
  {
    key: "warning",
    label: "警告",
    color: "#ffaa00",
    bgColor: "rgba(255,170,0,0.06)",
    borderColor: "rgba(255,170,0,0.2)",
    glowColor: "rgba(255,170,0,0.3)",
    icon: AlertTriangle,
    description: "接近阈值或出现潜在风险，需要关注",
  },
  {
    key: "error",
    label: "错误",
    color: "#ff3366",
    bgColor: "rgba(255,51,102,0.06)",
    borderColor: "rgba(255,51,102,0.2)",
    glowColor: "rgba(255,51,102,0.5)",
    icon: X,
    description: "发生异常或故障，需要立即处理",
  },
  {
    key: "loading",
    label: "加载中",
    color: "#00d4ff",
    bgColor: "rgba(0,212,255,0.06)",
    borderColor: "rgba(0,212,255,0.2)",
    glowColor: "rgba(0,212,255,0.3)",
    icon: Loader2,
    description: "数据加载或操作执行中",
  },
  {
    key: "info",
    label: "信息",
    color: "rgba(0,212,255,0.5)",
    bgColor: "rgba(0,212,255,0.04)",
    borderColor: "rgba(0,212,255,0.1)",
    glowColor: "rgba(0,212,255,0.15)",
    icon: Info,
    description: "中性信息提示",
  },
];

/* ============================================================
 *  组件注册表
 * ============================================================ */

export const COMPONENT_REGISTRY: ComponentEntry[] = [
  // Atoms
  { name: "GlassCard",          tier: "atom",     path: "components/GlassCard.tsx",         description: "70% 透明度玻璃态卡片容器",    props: ["children","className","glowColor","onClick"], states: ["default","hover","active","glow"], responsive: true },
  { name: "YYC3Logo",           tier: "atom",     path: "components/YYC3Logo.tsx",          description: "品牌 Logo 组件",               props: ["size","showStatus","glow"],                     states: ["default","glow","status"], responsive: true },
  { name: "ConnectionStatus",   tier: "atom",     path: "components/ConnectionStatus.tsx",  description: "WebSocket 连接状态指示器",     props: ["state","reconnectCount","lastSyncTime","onReconnect","compact"], states: ["connected","disconnected","reconnecting"], responsive: true },
  { name: "LanguageSwitcher",   tier: "atom",     path: "components/LanguageSwitcher.tsx",  description: "中英文语言切换下拉",           props: ["compact"],                                       states: ["closed","open","active"], responsive: true },
  { name: "OfflineIndicator",   tier: "atom",     path: "components/OfflineIndicator.tsx",  description: "离线模式横幅指示器",           props: [],                                                 states: ["hidden","offline","reconnected"], responsive: true },
  { name: "ErrorBoundary",      tier: "atom",     path: "components/ErrorBoundary.tsx",     description: "React 错误边界降级 UI",        props: ["level","source","children"],                      states: ["normal","error"], responsive: true },
  { name: "AlertBanner",        tier: "atom",     path: "components/AlertBanner.tsx",       description: "告警横幅提示条",               props: ["type","message","onClose"],                       states: ["info","warning","error","success"], responsive: true },
  // Molecules
  { name: "FollowUpCard",       tier: "molecule", path: "components/FollowUpCard.tsx",      description: "告警跟进卡片 + 快速操作按钮组", props: ["alert","onAction"],                               states: ["normal","critical","resolved"], responsive: true },
  { name: "OperationChain",     tier: "molecule", path: "components/OperationChain.tsx",    description: "时间线式操作链路展示",           props: ["chain","currentIndex"],                           states: ["idle","active","completed"], responsive: true },
  { name: "QuickActionGroup",   tier: "molecule", path: "components/QuickActionGroup.tsx",  description: "一键操作按钮组",               props: ["actions","onAction"],                              states: ["default","loading","disabled"], responsive: true },
  { name: "LoopStageCard",      tier: "molecule", path: "components/LoopStageCard.tsx",     description: "闭环阶段卡片",                 props: ["meta","result","index","isActive","showConnector"], states: ["idle","running","completed","error"], responsive: true },
  { name: "DataFlowDiagram",    tier: "molecule", path: "components/DataFlowDiagram.tsx",   description: "数据流向可视化拓扑图",           props: ["nodes","edges","isMobile"],                       states: ["default","animated"], responsive: true },
  { name: "NodeDetailModal",    tier: "molecule", path: "components/NodeDetailModal.tsx",   description: "节点详情弹窗",                  props: ["node","isOpen","onClose"],                        states: ["open","closed","loading"], responsive: true },
  // Organisms
  { name: "DataMonitoring",     tier: "organism", path: "components/DataMonitoring.tsx",    description: "数据监控主页面",                props: [],                                                 states: ["loading","live","error"], responsive: true },
  { name: "FollowUpPanel",      tier: "organism", path: "components/FollowUpPanel.tsx",     description: "一键跟进全页面",                props: [],                                                 states: ["idle","filtering","detail"], responsive: true },
  { name: "PatrolDashboard",    tier: "organism", path: "components/PatrolDashboard.tsx",   description: "巡查仪表盘全页面",              props: [],                                                 states: ["idle","scanning","complete"], responsive: true },
  { name: "OperationCenter",    tier: "organism", path: "components/OperationCenter.tsx",   description: "操作中心全页面",                props: [],                                                 states: ["browse","execute","log"], responsive: true },
  { name: "LocalFileManager",   tier: "organism", path: "components/LocalFileManager.tsx",  description: "本地文件管理全页面",             props: [],                                                 states: ["browse","view","generate"], responsive: true },
  { name: "AISuggestionPanel",  tier: "organism", path: "components/AISuggestionPanel.tsx", description: "AI 辅助决策全页面",             props: [],                                                 states: ["idle","analyzing","results"], responsive: true },
  { name: "ServiceLoopPanel",   tier: "organism", path: "components/ServiceLoopPanel.tsx",  description: "一站式闭环全页面",              props: [],                                                 states: ["idle","running","completed"], responsive: true },
  { name: "PWAStatusPanel",     tier: "organism", path: "components/PWAStatusPanel.tsx",    description: "PWA 离线管理全页面",            props: [],                                                 states: ["online","offline","updating"], responsive: true },
  { name: "CLITerminal",        tier: "organism", path: "components/CLITerminal.tsx",       description: "CLI 终端模拟器",                props: [],                                                 states: ["idle","executing","output"], responsive: true },
  { name: "IDEPanel",           tier: "organism", path: "components/IDEPanel.tsx",          description: "IDE 集成面板",                  props: [],                                                 states: ["browse","detail"], responsive: true },
  // Templates
  { name: "Layout",             tier: "template", path: "components/Layout.tsx",            description: "全局布局模板 (TopBar + Content + BottomNav)", props: [],                                    states: ["desktop","tablet","mobile"], responsive: true },
  { name: "TopBar",             tier: "template", path: "components/TopBar.tsx",            description: "顶部导航栏模板 (12 项导航)",      props: ["connectionState","isMobile","isTablet"],          states: ["desktop","mobile","menu-open"], responsive: true },
  { name: "BottomNav",          tier: "template", path: "components/BottomNav.tsx",         description: "底部导航栏 (移动端/平板)",        props: [],                                                 states: ["active","inactive"], responsive: true },
  { name: "CommandPalette",     tier: "template", path: "components/CommandPalette.tsx",    description: "全局命令面板 (Cmd+K)",            props: ["isOpen","onClose"],                               states: ["closed","open","searching","shortcuts"], responsive: true },
];

/* ============================================================
 *  交互规范常量
 * ============================================================ */

export const INTERACTION_SPECS: InteractionSpec[] = [
  { name: "按钮点击",     trigger: "click",          duration: "100ms",  effect: "scale(0.97) → scale(1)", feedback: "颜色加深 + 波纹扩散" },
  { name: "卡片悬浮",     trigger: "hover",          duration: "300ms",  effect: "边框亮度 +50%, 发光强度 +100%", feedback: "光晕扩散" },
  { name: "抽屉展开",     trigger: "click/swipe",    duration: "500ms",  effect: "translateX(100%) → 0",     feedback: "背景遮罩淡入" },
  { name: "模态框弹出",   trigger: "click",          duration: "300ms",  effect: "scale(0.95) + opacity(0) → 1", feedback: "背景 blur + 暗化" },
  { name: "Toast 通知",   trigger: "事件触发",        duration: "300ms 入 / 3s 停留",  effect: "translateY(-20px) → 0", feedback: "自动消失 + 可手动关闭" },
  { name: "命令面板",     trigger: "Cmd+K",          duration: "200ms",  effect: "fadeIn + scaleY(0.95→1)",  feedback: "背景 blur" },
  { name: "标签页切换",   trigger: "click",          duration: "200ms",  effect: "底部指示线滑动",            feedback: "颜色切换" },
  { name: "列表项悬浮",   trigger: "hover",          duration: "150ms",  effect: "背景色加深",               feedback: "行高亮" },
  { name: "脉冲指示器",   trigger: "持续",           duration: "2s 循环", effect: "opacity 0.5→1→0.5",       feedback: "活跃/在线状态" },
  { name: "扫描线",       trigger: "持续",           duration: "8s 循环", effect: "translateY(0→100%)",       feedback: "赛博朋克氛围" },
];

/* ============================================================
 *  渲染组件
 * ============================================================ */

const tierLabels: Record<string, { label: string; color: string }> = {
  atom:     { label: "Atom 原子",       color: "#00d4ff" },
  molecule: { label: "Molecule 分子",   color: "#7b2ff7" },
  organism: { label: "Organism 有机体", color: "#00ff88" },
  template: { label: "Template 模板",   color: "#ffaa00" },
};

export function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState<string>("states");
  const [filterTier, setFilterTier] = useState<string>("all");

  const tabs = [
    { key: "states",      label: "状态设计" },
    { key: "components",  label: "组件清单" },
    { key: "interactions", label: "交互规范" },
  ];

  const tiers = ["all", "atom", "molecule", "organism", "template"];

  const filteredComponents = filterTier === "all"
    ? COMPONENT_REGISTRY
    : COMPONENT_REGISTRY.filter((c) => c.tier === filterTier);

  return (
    <div data-testid="component-showcase">
      {/* Tab bar */}
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
            data-testid={`showcase-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== 状态设计 ==================== */}
      {activeTab === "states" && (
        <div data-testid="showcase-states">
          <p className="text-[rgba(0,212,255,0.35)] mb-3" style={{ fontSize: "0.68rem" }}>
            所有组件共享的 5 种全局状态视觉定义
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STATUS_DEFINITIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: s.bgColor,
                    borderColor: s.borderColor,
                    boxShadow: `0 0 12px ${s.glowColor}`,
                  }}
                  data-testid={`status-${s.key}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      className={`w-5 h-5 ${s.key === "loading" ? "animate-spin" : ""}`}
                      style={{ color: s.color }}
                    />
                    <span style={{ color: s.color, fontSize: "0.88rem" }}>
                      {s.label}
                    </span>
                    <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem" }}>
                      {s.key}
                    </span>
                  </div>
                  <p className="text-[#c0dcf0]" style={{ fontSize: "0.72rem" }}>
                    {s.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace", color: s.color, backgroundColor: `${s.color}12` }}>
                      color: {s.color}
                    </span>
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace", color: s.color, backgroundColor: `${s.color}12` }}>
                      glow: {s.glowColor}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live preview strip */}
          <div className="mt-4 p-3 rounded-xl bg-[rgba(0,40,80,0.06)]">
            <p className="text-[rgba(0,212,255,0.3)] mb-2" style={{ fontSize: "0.65rem" }}>
              实时状态条预览
            </p>
            <div className="flex items-center gap-3">
              {STATUS_DEFINITIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.glowColor}` }}
                    />
                    <span style={{ color: s.color, fontSize: "0.6rem" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 组件清单 ==================== */}
      {activeTab === "components" && (
        <div data-testid="showcase-components">
          {/* Tier filter */}
          <div className="flex flex-wrap gap-1 mb-3">
            {tiers.map((t) => {
              const tl = t === "all" ? { label: "全部", color: "#00d4ff" } : tierLabels[t];
              return (
                <button
                  key={t}
                  onClick={() => setFilterTier(t)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterTier === t
                      ? "border"
                      : "border border-transparent text-[rgba(0,212,255,0.3)]"
                  }`}
                  style={{
                    fontSize: "0.65rem",
                    color: filterTier === t ? tl.color : undefined,
                    borderColor: filterTier === t ? `${tl.color}40` : undefined,
                    backgroundColor: filterTier === t ? `${tl.color}08` : undefined,
                  }}
                  data-testid={`filter-${t}`}
                >
                  {tl.label} ({t === "all" ? COMPONENT_REGISTRY.length : COMPONENT_REGISTRY.filter((c) => c.tier === t).length})
                </button>
              );
            })}
          </div>

          {/* Component list */}
          <div className="space-y-1" data-testid="component-list">
            {filteredComponents.map((c) => {
              const tl = tierLabels[c.tier];
              return (
                <div
                  key={c.name}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                  data-testid={`comp-${c.name}`}
                >
                  {/* Tier badge */}
                  <span
                    className="px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ fontSize: "0.5rem", color: tl.color, backgroundColor: `${tl.color}10`, border: `1px solid ${tl.color}20` }}
                  >
                    {c.tier.toUpperCase()}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>{c.name}</span>
                      {c.responsive && (
                        <span className="text-[rgba(0,255,136,0.4)]" style={{ fontSize: "0.5rem" }}>RWD</span>
                      )}
                    </div>
                    <p className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.62rem" }}>
                      {c.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.states.map((s) => (
                        <span
                          key={s}
                          className="px-1 py-0.5 rounded bg-[rgba(0,40,80,0.15)] text-[rgba(0,212,255,0.3)]"
                          style={{ fontSize: "0.5rem" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Path */}
                  <span className="text-[rgba(0,212,255,0.15)] shrink-0 hidden lg:block" style={{ fontSize: "0.5rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    {c.path}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== 交互规范 ==================== */}
      {activeTab === "interactions" && (
        <div data-testid="showcase-interactions">
          <p className="text-[rgba(0,212,255,0.35)] mb-3" style={{ fontSize: "0.68rem" }}>
            动效时长 · 过渡效果 · 反馈时机 规范
          </p>
          <div className="space-y-1.5">
            {INTERACTION_SPECS.map((spec) => (
              <div
                key={spec.name}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)]"
                data-testid={`interaction-${spec.name}`}
              >
                <span className="text-[#00d4ff] w-20 shrink-0" style={{ fontSize: "0.72rem" }}>
                  {spec.name}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>
                      {spec.trigger}
                    </span>
                    <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}>
                      {spec.duration}
                    </span>
                  </div>
                  <p className="text-[#c0dcf0] mt-0.5" style={{ fontSize: "0.65rem" }}>
                    {spec.effect}
                  </p>
                  <p className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem" }}>
                    反馈: {spec.feedback}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}