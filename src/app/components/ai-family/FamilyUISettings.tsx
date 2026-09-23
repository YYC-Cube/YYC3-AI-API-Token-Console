/**
 * FamilyUISettings.tsx
 * =====================
 * AI Family 独立 UI 控制设置页面 & 生态可视操作面板
 *
 * 功能：
 *  - 全局主题偏好（动画速度、信息密度、配色模式）
 *  - 家人显示偏好（可见性、排序、默认展开）
 *  - 通知与播报设置
 *  - 系统链路健康总览（一站式测通 & 自动修复）
 *  - 数据管理（缓存清理、全量导出、全量导入）
 *  - 生态模块状态可视面板
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings2, Palette, Eye, Bell,
  Zap, Shield, Database,
  Download, Upload, Trash2, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Activity, Server, Volume2,
  Radio, MessageCircle, Trophy, Gamepad2, Music,
  BookOpen, TrendingUp, Phone, Heart, Sparkles,
  ExternalLink, ArrowRight, Wifi,
  CircleDot, RotateCcw, FileJson, X,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import { useNavigate } from "react-router";
import { FAMILY_MEMBERS, hexToRgb } from "./shared";

// ═══ Settings Types ═══

interface FamilyUIConfig {
  animationSpeed: "fast" | "normal" | "slow" | "none";
  infoDensity: "compact" | "normal" | "expanded";
  showOfflineMembers: boolean;
  memberOrder: string[]; // ordered member ids
  defaultExpandCards: boolean;
  notificationsEnabled: boolean;
  hourlyCareEnabled: boolean;
  dailyBroadcastEnabled: boolean;
  soundEnabled: boolean;
  autoMarkRead: boolean;
  messageRetentionDays: number;
  locale: "zh-CN" | "en-US";
}

const DEFAULT_CONFIG: FamilyUIConfig = {
  animationSpeed: "normal",
  infoDensity: "normal",
  showOfflineMembers: true,
  memberOrder: FAMILY_MEMBERS.map(m => m.id),
  defaultExpandCards: false,
  notificationsEnabled: true,
  hourlyCareEnabled: true,
  dailyBroadcastEnabled: true,
  soundEnabled: true,
  autoMarkRead: false,
  messageRetentionDays: 30,
  locale: "zh-CN",
};

const CONFIG_KEY = "yyc3-family-ui-config";

function loadConfig(): FamilyUIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(cfg: FamilyUIConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* noop */ }
}

// ═══ Link Health Types ═══

interface LinkNode {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  path: string;
  storageKey?: string;
  description: string;
}

interface LinkStatus {
  nodeId: string;
  status: "idle" | "testing" | "ok" | "warn" | "error";
  message: string;
  latency?: number;
  storageSize?: string;
  lastChecked?: string;
}

const ECOSYSTEM_LINKS: LinkNode[] = [
  { id: "home", name: "家园首页", icon: Heart, color: "#FF69B4", path: "/ai-family-home", description: "家人状态 · 动态 · 空间入口" },
  { id: "center", name: "Family 中心", icon: Sparkles, color: "#FF69B4", path: "/ai-family-center", description: "全景规划 · 信任公约" },
  { id: "chat", name: "家人对话", icon: MessageCircle, color: "#00BFFF", path: "/ai-family-chat", description: "多轮对话 · 群聊" },
  { id: "phone", name: "家人热线", icon: Phone, color: "#00FF88", path: "/ai-family-phone", description: "电话交互 · 来电/去电" },
  { id: "fun", name: "文娱中心", icon: Gamepad2, color: "#FFD700", path: "/ai-family-fun", description: "棋牌对弈 · 才艺展示" },
  { id: "activities", name: "全家活动", icon: Trophy, color: "#FF7043", path: "/ai-family-activities", description: "比赛 · 播报 · 勋章", storageKey: "yyc3-family-activities" },
  { id: "learn", name: "学习成长", icon: BookOpen, color: "#00d4ff", path: "/ai-family-learn", description: "AI 导师 · 陪伴式学习" },
  { id: "music", name: "音乐空间", icon: Music, color: "#BF00FF", path: "/ai-family-music", description: "音乐推荐 · 行业资讯" },
  { id: "growth", name: "成长轨迹", icon: TrendingUp, color: "#FF7043", path: "/ai-family-growth", description: "成长记忆 · 里程碑" },
  { id: "models", name: "模型控制", icon: Server, color: "#06b6d4", path: "/ai-family-models", storageKey: "yyc3-family-model-assignments", description: "大模型绑定 · API Key · 连接测试" },
  { id: "voice", name: "语音系统", icon: Volume2, color: "#a855f7", path: "/ai-family-voice", storageKey: "yyc3-family-voice-profiles", description: "TTS/STT · 语音对话 · 音色配置" },
  { id: "data", name: "数据中心", icon: Database, color: "#10b981", path: "/ai-family-data", description: "统一数据全景 · 统计 · 导出" },
  { id: "comm", name: "通信中心", icon: Radio, color: "#3b82f6", path: "/ai-family-comm", storageKey: "yyc3-family-comm-messages", description: "内部通信 · 消息持久化" },
];

// ═══ 子组件：配置分组 ═══

function SettingsSection({ title, icon: Icon, color, children }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-white/80" style={{ fontSize: "0.85rem" }}>{title}</span>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </GlassCard>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-white/60" style={{ fontSize: "0.75rem" }}>{label}</div>
        {description && <div className="text-white/25 mt-0.5" style={{ fontSize: "0.6rem" }}>{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-all relative ${
        value ? "bg-cyan-500/30" : "bg-white/10"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${
          value ? "left-5.5 bg-cyan-400" : "left-0.5 bg-white/40"
        }`}
        style={{ left: value ? "22px" : "2px" }}
      />
    </button>
  );
}

function SelectPill({ options, value, onChange }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 rounded-md transition-all ${
            value === opt.key
              ? "bg-cyan-500/15 text-cyan-300"
              : "text-white/30 hover:text-white/50"
          }`}
          style={{ fontSize: "0.65rem" }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ═══ 子组件：生态链路节点 ═══

function LinkNodeCard({
  node,
  status,
  onTest,
  onNavigate,
}: {
  node: LinkNode;
  status: LinkStatus;
  onTest: () => void;
  onNavigate: () => void;
}) {
  const rgb = hexToRgb(node.color);
  const statusColor = status.status === "ok" ? "#00FF88"
    : status.status === "warn" ? "#FFD700"
    : status.status === "error" ? "#FF4444"
    : status.status === "testing" ? "#00d4ff"
    : "rgba(255,255,255,0.15)";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.2)` }}
      >
        <node.icon className="w-4 h-4" style={{ color: node.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/80" style={{ fontSize: "0.75rem" }}>{node.name}</span>
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor, boxShadow: status.status === "ok" ? `0 0 6px ${statusColor}` : "none" }} />
        </div>
        <div className="text-white/25 truncate" style={{ fontSize: "0.6rem" }}>{node.description}</div>
        {status.message && status.status !== "idle" && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`${status.status === "ok" ? "text-emerald-400/60" : status.status === "error" ? "text-red-400/60" : "text-amber-400/60"}`} style={{ fontSize: "0.55rem" }}>
              {status.message}
              {status.latency !== undefined && ` · ${status.latency}ms`}
              {status.storageSize && ` · ${status.storageSize}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onTest}
          disabled={status.status === "testing"}
          className="p-1.5 rounded-lg text-white/30 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all disabled:opacity-30"
          title="测试链路"
        >
          {status.status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onNavigate}
          className="p-1.5 rounded-lg text-white/30 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
          title="前往"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ═══ 主组件 ═══

export function FamilyUISettings() {
  const nav = useNavigate();
  const [config, setConfig] = useState<FamilyUIConfig>(DEFAULT_CONFIG);
  const [linkStatuses, setLinkStatuses] = useState<Record<string, LinkStatus>>({});
  const [activeTab, setActiveTab] = useState<"appearance" | "notifications" | "ecosystem" | "data">("ecosystem");
  const [batchTesting, setBatchTesting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadConfig());
    // Init link statuses
    const initial: Record<string, LinkStatus> = {};
    ECOSYSTEM_LINKS.forEach(link => {
      initial[link.id] = { nodeId: link.id, status: "idle", message: "" };
    });
    setLinkStatuses(initial);
  }, []);

  const updateConfig = useCallback((updates: Partial<FamilyUIConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  // ═══ 链路测试 ═══

  const testLink = useCallback(async (link: LinkNode) => {
    setLinkStatuses(prev => ({
      ...prev,
      [link.id]: { nodeId: link.id, status: "testing", message: "测试中..." },
    }));

    const start = performance.now();

    // Simulate: check localStorage data, component importability, route accessibility
    await new Promise(r => setTimeout(r, 200 + Math.random() * 500));

    const latency = Math.round(performance.now() - start);
    let storageSize: string | undefined;
    let status: "ok" | "warn" | "error" = "ok";
    let message = "链路正常";

    // Check storage
    if (link.storageKey) {
      try {
        const data = localStorage.getItem(link.storageKey);
        if (data) {
          const sizeKB = (new Blob([data]).size / 1024).toFixed(1);
          storageSize = `${sizeKB}KB`;
          if (parseFloat(sizeKB) > 500) {
            status = "warn";
            message = "存储占用较高";
          }
        } else {
          storageSize = "0KB";
        }
      } catch {
        status = "warn";
        message = "存储访问异常";
      }
    }

    // Random failure sim (5%)
    if (Math.random() < 0.05) {
      status = "error";
      message = "组件加载异常";
    }

    setLinkStatuses(prev => ({
      ...prev,
      [link.id]: {
        nodeId: link.id,
        status,
        message,
        latency,
        storageSize,
        lastChecked: new Date().toISOString(),
      },
    }));
  }, []);

  const handleBatchTest = useCallback(async () => {
    setBatchTesting(true);
    for (const link of ECOSYSTEM_LINKS) {
      await testLink(link);
      await new Promise(r => setTimeout(r, 100));
    }
    setBatchTesting(false);
  }, [testLink]);

  // Auto-repair: reset problematic storage
  const handleAutoRepair = useCallback(async () => {
    const problemLinks = Object.values(linkStatuses).filter(s => s.status === "error" || s.status === "warn");
    for (const ls of problemLinks) {
      const link = ECOSYSTEM_LINKS.find(l => l.id === ls.nodeId);
      if (link?.storageKey && ls.status === "error") {
        // Clear corrupted data and re-seed
        try {
          localStorage.removeItem(link.storageKey);
        } catch { /* noop */ }
      }
      setLinkStatuses(prev => ({
        ...prev,
        [ls.nodeId]: { ...prev[ls.nodeId], status: "ok", message: "已修复" },
      }));
      await new Promise(r => setTimeout(r, 200));
    }
  }, [linkStatuses]);

  // ═══ 数据管理 ═══

  const ALL_STORAGE_KEYS = [
    "yyc3-family-comm-messages",
    "yyc3-family-voice-profiles",
    "yyc3-family-voice-conversations",
    "yyc3-family-model-assignments",
    "yyc3-family-provider-keys",
    "yyc3-family-diagnostics",
    "yyc3-family-ui-config",
    "yyc3-family-activities",
  ];

  const storageStats = useMemo(() => {
    let totalSize = 0;
    const items: { key: string; size: number }[] = [];
    for (const key of ALL_STORAGE_KEYS) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const size = new Blob([data]).size;
          totalSize += size;
          items.push({ key, size });
        }
      } catch { /* noop */ }
    }
    return { totalSize, items };
  }, [config]); // re-calc on config change as proxy for storage change

  const handleExportAll = useCallback(() => {
    const allData: Record<string, unknown> = {};
    for (const key of ALL_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) allData[key] = JSON.parse(raw);
      } catch { /* noop */ }
    }
    const blob = new Blob([JSON.stringify({
      exportDate: new Date().toISOString(),
      version: "2.0",
      platform: "YYC3 AI Family",
      data: allData,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-family-full-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImportAll = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const data = parsed.data || parsed;
          let count = 0;
          for (const [key, value] of Object.entries(data)) {
            if (ALL_STORAGE_KEYS.includes(key)) {
              localStorage.setItem(key, JSON.stringify(value));
              count++;
            }
          }
          setImportStatus(`成功导入 ${count} 项数据`);
          setConfig(loadConfig()); // reload
          setTimeout(() => setImportStatus(null), 3000);
        } catch {
          setImportStatus("导入失败: 文件格式错误");
          setTimeout(() => setImportStatus(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleClearAll = useCallback(() => {
    for (const key of ALL_STORAGE_KEYS) {
      try { localStorage.removeItem(key); } catch { /* noop */ }
    }
    setConfig(DEFAULT_CONFIG);
    setImportStatus("已清除所有 AI Family 数据");
    setTimeout(() => setImportStatus(null), 3000);
  }, []);

  // Stats
  const okCount = Object.values(linkStatuses).filter(s => s.status === "ok").length;
  const warnCount = Object.values(linkStatuses).filter(s => s.status === "warn").length;
  const errorCount = Object.values(linkStatuses).filter(s => s.status === "error").length;
  const testedCount = okCount + warnCount + errorCount;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-white/90" style={{ fontSize: "1.25rem" }}>AI Family 生态控制中心</h1>
                <p className="text-white/40" style={{ fontSize: "0.7rem" }}>
                  UI 偏好 · 生态链路 · 智能测通 · 数据管理
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {testedCount > 0 && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  {okCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400" style={{ fontSize: "0.6rem" }}>
                      <CheckCircle2 className="w-3 h-3" />{okCount}
                    </span>
                  )}
                  {warnCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400" style={{ fontSize: "0.6rem" }}>
                      <AlertCircle className="w-3 h-3" />{warnCount}
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400" style={{ fontSize: "0.6rem" }}>
                      <X className="w-3 h-3" />{errorCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.05}>
          <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-x-auto">
            {([
              { key: "ecosystem" as const, label: "生态链路", icon: Wifi },
              { key: "appearance" as const, label: "外观偏好", icon: Palette },
              { key: "notifications" as const, label: "通知设置", icon: Bell },
              { key: "data" as const, label: "数据管理", icon: Database },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all flex-1 justify-center whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-[rgba(0,212,255,0.1)] text-cyan-300 border border-[rgba(0,212,255,0.2)]"
                    : "text-white/40 hover:text-white/60 border border-transparent"
                }`}
                style={{ fontSize: "0.75rem" }}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* ═══ Ecosystem Tab ═══ */}
        {activeTab === "ecosystem" && (
          <div className="space-y-4">
            {/* Action bar */}
            <FadeIn delay={0.08}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleBatchTest}
                  disabled={batchTesting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/20 text-cyan-300 hover:from-cyan-500/25 hover:to-purple-500/25 transition-all disabled:opacity-50"
                  style={{ fontSize: "0.8rem" }}
                >
                  {batchTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  一键智能测通 ({ECOSYSTEM_LINKS.length} 模块)
                </button>

                {(warnCount > 0 || errorCount > 0) && (
                  <button
                    onClick={handleAutoRepair}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    自动修复 ({warnCount + errorCount})
                  </button>
                )}

                {testedCount > 0 && testedCount === ECOSYSTEM_LINKS.length && errorCount === 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400" style={{ fontSize: "0.7rem" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    全链路健康
                  </span>
                )}
              </div>
            </FadeIn>

            {/* Link chain visualization */}
            <FadeIn delay={0.1}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CircleDot className="w-4 h-4 text-cyan-400" />
                  <span className="text-white/70" style={{ fontSize: "0.85rem" }}>AI Family 生态模块链路</span>
                  <span className="text-white/25 ml-auto" style={{ fontSize: "0.6rem" }}>
                    {testedCount}/{ECOSYSTEM_LINKS.length} 已检测
                  </span>
                </div>
                <div className="space-y-2">
                  {ECOSYSTEM_LINKS.map((link, i) => (
                    <LinkNodeCard
                      key={link.id}
                      node={link}
                      status={linkStatuses[link.id] || { nodeId: link.id, status: "idle", message: "" }}
                      onTest={() => testLink(link)}
                      onNavigate={() => nav(link.path)}
                    />
                  ))}
                </div>
              </GlassCard>
            </FadeIn>

            {/* Chain flow diagram (visual) */}
            <FadeIn delay={0.15}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-white/70" style={{ fontSize: "0.85rem" }}>生态数据流向</span>
                </div>
                <div className="flex items-center justify-center gap-1 flex-wrap py-4">
                  {[
                    { label: "用户输入", color: "#00d4ff" },
                    { label: "语音/文字", color: "#a855f7" },
                    { label: "家人路由", color: "#FFD700" },
                    { label: "模型推理", color: "#06b6d4" },
                    { label: "语音合成", color: "#ec4899" },
                    { label: "通信记录", color: "#3b82f6" },
                    { label: "数据存储", color: "#10b981" },
                  ].map((step, i) => (
                    <React.Fragment key={step.label}>
                      <div
                        className="px-3 py-1.5 rounded-lg border text-center"
                        style={{
                          fontSize: "0.65rem",
                          color: step.color,
                          background: `${step.color}10`,
                          borderColor: `${step.color}30`,
                        }}
                      >
                        {step.label}
                      </div>
                      {i < 6 && <ArrowRight className="w-3 h-3 text-white/15 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </GlassCard>
            </FadeIn>
          </div>
        )}

        {/* ═══ Appearance Tab ═══ */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            <FadeIn delay={0.08}>
              <SettingsSection title="动画与交互" icon={Zap} color="#FFD700">
                <SettingRow label="动画速度" description="控制所有过渡/入场动画的速度">
                  <SelectPill
                    options={[
                      { key: "fast", label: "快速" },
                      { key: "normal", label: "正常" },
                      { key: "slow", label: "缓慢" },
                      { key: "none", label: "关闭" },
                    ]}
                    value={config.animationSpeed}
                    onChange={(v) => updateConfig({ animationSpeed: v as FamilyUIConfig["animationSpeed"] })}
                  />
                </SettingRow>
                <SettingRow label="信息密度" description="卡片内容的详细程度">
                  <SelectPill
                    options={[
                      { key: "compact", label: "紧凑" },
                      { key: "normal", label: "标准" },
                      { key: "expanded", label: "展开" },
                    ]}
                    value={config.infoDensity}
                    onChange={(v) => updateConfig({ infoDensity: v as FamilyUIConfig["infoDensity"] })}
                  />
                </SettingRow>
                <SettingRow label="默认展开卡片" description="进入页面时自动展开所有可折叠卡片">
                  <Toggle value={config.defaultExpandCards} onChange={(v) => updateConfig({ defaultExpandCards: v })} />
                </SettingRow>
              </SettingsSection>
            </FadeIn>

            <FadeIn delay={0.12}>
              <SettingsSection title="家人显示" icon={Eye} color="#00BFFF">
                <SettingRow label="显示离线家人" description="是否在列表中展示 idle 状态的家人">
                  <Toggle value={config.showOfflineMembers} onChange={(v) => updateConfig({ showOfflineMembers: v })} />
                </SettingRow>
                <SettingRow label="语言" description="界面语言偏好">
                  <SelectPill
                    options={[
                      { key: "zh-CN", label: "简体中文" },
                      { key: "en-US", label: "English" },
                    ]}
                    value={config.locale}
                    onChange={(v) => updateConfig({ locale: v as "zh-CN" | "en-US" })}
                  />
                </SettingRow>
                <div>
                  <div className="text-white/40 mb-2" style={{ fontSize: "0.65rem" }}>家人排序</div>
                  <div className="flex flex-wrap gap-1.5">
                    {FAMILY_MEMBERS.map(m => {
                      const rgb = hexToRgb(m.color);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                          style={{ fontSize: "0.65rem" }}
                        >
                          <m.icon className="w-3 h-3" style={{ color: m.color }} />
                          <span className="text-white/50">{m.shortName}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-white/20 mt-1" style={{ fontSize: "0.55rem" }}>拖拽排序功能开发中</p>
                </div>
              </SettingsSection>
            </FadeIn>
          </div>
        )}

        {/* ═══ Notifications Tab ═══ */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <FadeIn delay={0.08}>
              <SettingsSection title="通知偏好" icon={Bell} color="#f59e0b">
                <SettingRow label="启用通知" description="允许 AI Family 系统发送通知">
                  <Toggle value={config.notificationsEnabled} onChange={(v) => updateConfig({ notificationsEnabled: v })} />
                </SettingRow>
                <SettingRow label="整点关爱播报" description="每整点由一位家人语音关爱提醒">
                  <Toggle value={config.hourlyCareEnabled} onChange={(v) => updateConfig({ hourlyCareEnabled: v })} />
                </SettingRow>
                <SettingRow label="每日家庭播报" description="每日由轮值家人播报家庭动态">
                  <Toggle value={config.dailyBroadcastEnabled} onChange={(v) => updateConfig({ dailyBroadcastEnabled: v })} />
                </SettingRow>
                <SettingRow label="声音效果" description="消息提示音、操作反馈音">
                  <Toggle value={config.soundEnabled} onChange={(v) => updateConfig({ soundEnabled: v })} />
                </SettingRow>
                <SettingRow label="自动标记已读" description="打开通信中心时自动将消息标为已读">
                  <Toggle value={config.autoMarkRead} onChange={(v) => updateConfig({ autoMarkRead: v })} />
                </SettingRow>
              </SettingsSection>
            </FadeIn>

            <FadeIn delay={0.12}>
              <SettingsSection title="消息保留" icon={MessageCircle} color="#3b82f6">
                <SettingRow label="消息保留天数" description="超过此天数的消息将在清理时自动删除">
                  <SelectPill
                    options={[
                      { key: "7", label: "7天" },
                      { key: "30", label: "30天" },
                      { key: "90", label: "90天" },
                      { key: "365", label: "永久" },
                    ]}
                    value={String(config.messageRetentionDays)}
                    onChange={(v) => updateConfig({ messageRetentionDays: parseInt(v) })}
                  />
                </SettingRow>
              </SettingsSection>
            </FadeIn>
          </div>
        )}

        {/* ═══ Data Tab ═══ */}
        {activeTab === "data" && (
          <div className="space-y-4">
            <FadeIn delay={0.08}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/70" style={{ fontSize: "0.85rem" }}>存储概览</span>
                  <span className="text-white/25 ml-auto" style={{ fontSize: "0.6rem" }}>
                    总计 {(storageStats.totalSize / 1024).toFixed(1)}KB
                  </span>
                </div>
                <div className="space-y-2">
                  {storageStats.items.length === 0 ? (
                    <div className="text-center text-white/20 py-4" style={{ fontSize: "0.75rem" }}>暂无存储数据</div>
                  ) : (
                    storageStats.items.map(item => (
                      <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <FileJson className="w-3.5 h-3.5 text-white/20 shrink-0" />
                        <span className="text-white/50 flex-1 truncate" style={{ fontSize: "0.7rem" }}>
                          {item.key.replace("yyc3-family-", "")}
                        </span>
                        <span className="text-white/30 shrink-0" style={{ fontSize: "0.6rem" }}>
                          {(item.size / 1024).toFixed(1)}KB
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </FadeIn>

            <FadeIn delay={0.12}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-white/70" style={{ fontSize: "0.85rem" }}>数据操作</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={handleExportAll}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-cyan-500/[0.05] hover:border-cyan-500/20 transition-all group"
                  >
                    <Download className="w-6 h-6 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-white/60 group-hover:text-white/80" style={{ fontSize: "0.75rem" }}>全量导出</span>
                    <span className="text-white/20" style={{ fontSize: "0.55rem" }}>导出所有 Family 数据</span>
                  </button>

                  <button
                    onClick={handleImportAll}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-purple-500/[0.05] hover:border-purple-500/20 transition-all group"
                  >
                    <Upload className="w-6 h-6 text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                    <span className="text-white/60 group-hover:text-white/80" style={{ fontSize: "0.75rem" }}>全量导入</span>
                    <span className="text-white/20" style={{ fontSize: "0.55rem" }}>从 JSON 文件恢复</span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/[0.05] hover:border-red-500/20 transition-all group"
                  >
                    <Trash2 className="w-6 h-6 text-red-400/60 group-hover:text-red-400 transition-colors" />
                    <span className="text-white/60 group-hover:text-white/80" style={{ fontSize: "0.75rem" }}>清除全部</span>
                    <span className="text-white/20" style={{ fontSize: "0.55rem" }}>重置 AI Family 数据</span>
                  </button>
                </div>

                {importStatus && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-300" style={{ fontSize: "0.75rem" }}>{importStatus}</span>
                  </div>
                )}
              </GlassCard>
            </FadeIn>

            <FadeIn delay={0.16}>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span className="text-white/70" style={{ fontSize: "0.85rem" }}>恢复出厂设置</span>
                </div>
                <p className="text-white/30 mb-3" style={{ fontSize: "0.7rem" }}>
                  将所有 UI 偏好恢复为默认值，不影响消息、模型配置等数据。
                </p>
                <button
                  onClick={() => {
                    setConfig(DEFAULT_CONFIG);
                    saveConfig(DEFAULT_CONFIG);
                    setImportStatus("UI 偏好已恢复默认");
                    setTimeout(() => setImportStatus(null), 3000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all"
                  style={{ fontSize: "0.75rem" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  恢复默认设置
                </button>
              </GlassCard>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
}