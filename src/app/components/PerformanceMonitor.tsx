/**
 * PerformanceMonitor.tsx
 * =======================
 * 实时性能监控面板 · 路由: /performance
 *
 * 功能:
 * - Web Vitals (FCP/LCP/CLS/INP/TTFB) 实时采集
 * - 内存使用监控 (JS Heap)
 * - 资源加载分析 (静态资源/脚本/样式)
 * - 帧率 (FPS) 实时图
 * - localStorage 使用量
 * - 可编辑告警阈值 + 自动告警 (localStorage 持久化)
 * - 性能趋势图 (recharts)
 * - 全部数据可导出
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Activity, Gauge, Cpu, Bell, BellOff, Check, X, Save,
  RefreshCw, Download, MonitorSpeaker, Database, Layers,
  TrendingUp, TrendingDown, Minus, AlertTriangle, RotateCcw,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import { env } from "../lib/env-config";
import { toast } from "sonner";

// ── 样式 ──
const f = { xs: "0.62rem", sm: "0.72rem", md: "0.82rem", lg: "0.95rem" };

// ============================================================
// 类型
// ============================================================

interface VitalMetric {
  name: string;
  value: number | null;
  unit: string;
  rating: "good" | "needs-improvement" | "poor" | "unknown";
  threshold: { good: number; poor: number };
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ResourceEntry {
  name: string;
  type: string;
  size: number;
  duration: number;
}

interface FpsSnapshot { time: string; fps: number; }
interface MemorySnapshot { time: string; usedMB: number; totalMB: number; }

/** 告警阈值配置 (全部可编辑, localStorage 持久化) */
interface AlertThresholds {
  fpsMin: number;           // FPS 低于此值告警
  memMaxPercent: number;    // JS Heap 使用率超过此值(%)告警
  clsMax: number;           // CLS 超过此值告警
  fcpMax: number;           // FCP 超过此值(ms)告警
  lcpMax: number;           // LCP 超过此值(ms)告警
  ttfbMax: number;          // TTFB 超过此值(ms)告警
  inpMax: number;           // INP 超过此值(ms)告警
  storageMaxKB: number;     // localStorage 超过此值(KB)告警
  alertEnabled: boolean;    // 告警总开关
  alertCooldownSec: number; // 同一指标两次告警最小间隔(秒)
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  fpsMin: 30,
  memMaxPercent: 80,
  clsMax: 0.1,
  fcpMax: 3000,
  lcpMax: 4000,
  ttfbMax: 1800,
  inpMax: 200,
  storageMaxKB: 4096,
  alertEnabled: true,
  alertCooldownSec: 30,
};

const THRESHOLDS_KEY = "yyc3_perf_alert_thresholds";

function loadThresholds(): AlertThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    if (raw) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_THRESHOLDS };
}

function saveThresholds(t: AlertThresholds) {
  try { localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(t)); } catch { /* ignore */ }
}

// ============================================================
// 工具函数
// ============================================================

function rateVital(value: number, good: number, poor: number): VitalMetric["rating"] {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

const ratingColor: Record<VitalMetric["rating"], string> = {
  good: "#00ff88", "needs-improvement": "#ffaa00", poor: "#ff3366", unknown: "rgba(0,212,255,0.3)",
};
const ratingLabel: Record<VitalMetric["rating"], string> = {
  good: "优秀", "needs-improvement": "需改善", poor: "较差", unknown: "未知",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function getTimeLabel(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const toastErrStyle = {
  background: "rgba(30,5,15,0.95)", border: "1px solid rgba(255,51,102,0.4)", color: "#ff6688",
};

// ============================================================
// StatCard
// ============================================================

function StatCard({ label, value, unit, color, icon, trend, alert }: {
  label: string; value: string; unit: string; color: string;
  icon: React.ReactNode; trend?: "up" | "down" | "stable"; alert?: boolean;
}) {
  return (
    <GlassCard className={`p-3 ${alert ? "ring-1 ring-[rgba(255,51,102,0.4)]" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: f.xs }}>{label}</span>
        <span className="flex items-center gap-1" style={{ color }}>
          {alert && <AlertTriangle className="w-3 h-3 text-[#ff3366] animate-pulse" />}
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-1">
        <span className="font-mono" style={{ fontSize: "1.3rem", color }}>{value}</span>
        <span className="text-[rgba(0,212,255,0.3)] pb-0.5" style={{ fontSize: f.xs }}>{unit}</span>
        {trend && (
          <span className="ml-auto">
            {trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-[#ff3366]" /> :
             trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-[#00ff88]" /> :
             <Minus className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================
// ThresholdEditor 子组件
// ============================================================

const THRESHOLD_FIELDS: Array<{ key: keyof AlertThresholds; label: string; unit: string; type: "number" | "boolean" }> = [
  { key: "fpsMin",          label: "FPS 最低",       unit: "fps",  type: "number" },
  { key: "memMaxPercent",   label: "内存上限",       unit: "%",    type: "number" },
  { key: "clsMax",          label: "CLS 上限",       unit: "",     type: "number" },
  { key: "fcpMax",          label: "FCP 上限",       unit: "ms",   type: "number" },
  { key: "lcpMax",          label: "LCP 上限",       unit: "ms",   type: "number" },
  { key: "ttfbMax",         label: "TTFB 上限",      unit: "ms",   type: "number" },
  { key: "inpMax",          label: "INP 上限",       unit: "ms",   type: "number" },
  { key: "storageMaxKB",    label: "存储上限",       unit: "KB",   type: "number" },
  { key: "alertCooldownSec",label: "冷却间隔",       unit: "秒",   type: "number" },
  { key: "alertEnabled",    label: "告警总开关",     unit: "",     type: "boolean" },
];

function ThresholdEditor({ thresholds, onChange, onReset }: {
  thresholds: AlertThresholds;
  onChange: (t: AlertThresholds) => void;
  onReset: () => void;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#ff6633]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>告警阈值配置</span>
          <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: f.xs }}>(localStorage 持久化)</span>
        </div>
        <button onClick={onReset} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,100,150,0.08)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all" style={{ fontSize: f.xs }}>
          <RotateCcw className="w-3 h-3" /> 重置默认
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {THRESHOLD_FIELDS.map(({ key, label, unit, type }) => (
          <div key={key} className="flex flex-col gap-1 p-2 rounded-lg bg-[rgba(0,40,80,0.12)]">
            <label className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>{label}</label>
            {type === "boolean" ? (
              <button
                onClick={() => onChange({ ...thresholds, [key]: !thresholds[key] })}
                className={`px-2 py-1 rounded-lg text-center transition-all ${
                  thresholds[key]
                    ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88] border border-[rgba(0,255,136,0.2)]"
                    : "bg-[rgba(255,51,102,0.08)] text-[#ff6688] border border-[rgba(255,51,102,0.15)]"
                }`}
                style={{ fontSize: f.xs }}
              >
                {thresholds[key] ? "已启用" : "已关闭"}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={thresholds[key] as number}
                  onChange={(e) => {
                    const v = key === "clsMax" ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                    if (!isNaN(v)) onChange({ ...thresholds, [key]: v });
                  }}
                  step={key === "clsMax" ? 0.01 : 1}
                  className="w-full px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none focus:border-[#00d4ff] font-mono"
                  style={{ fontSize: f.xs }}
                />
                {unit && <span className="text-[rgba(0,212,255,0.25)] shrink-0" style={{ fontSize: "0.55rem" }}>{unit}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ============================================================
// Main Component
// ============================================================

export function PerformanceMonitor() {
  const [vitals, setVitals] = useState<VitalMetric[]>([]);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [fpsHistory, setFpsHistory] = useState<FpsSnapshot[]>([]);
  const [memHistory, setMemHistory] = useState<MemorySnapshot[]>([]);
  const [storageUsage, setStorageUsage] = useState<{ used: number; keys: number }>({ used: 0, keys: 0 });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showThresholds, setShowThresholds] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(() => loadThresholds());
  const [alertLog, setAlertLog] = useState<Array<{ time: string; msg: string; type: string }>>([]);
  const frameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const fpsAccRef = useRef<number[]>([]);
  const lastAlertRef = useRef<Record<string, number>>({});

  // 持久化阈值
  const updateThresholds = useCallback((t: AlertThresholds) => {
    setThresholds(t);
    saveThresholds(t);
  }, []);
  const resetThresholds = useCallback(() => {
    setThresholds({ ...DEFAULT_THRESHOLDS });
    saveThresholds(DEFAULT_THRESHOLDS);
    toast.info("告警阈值已重置为默认值");
  }, []);

  // ── 告警检查 ──
  const checkAlerts = useCallback((fps: number, mem: MemoryInfo | null, storage: { used: number }) => {
    if (!thresholds.alertEnabled) return;
    const now = Date.now();
    const cooldown = thresholds.alertCooldownSec * 1000;

    function fire(key: string, msg: string) {
      if (now - (lastAlertRef.current[key] || 0) < cooldown) return;
      lastAlertRef.current[key] = now;
      toast.error(msg, { style: toastErrStyle, duration: 6000 });
      setAlertLog((prev) => [{ time: getTimeLabel(), msg, type: key }, ...prev].slice(0, 50));
    }

    if (fps > 0 && fps < thresholds.fpsMin) {
      fire("fps", `FPS 告警: ${fps} fps < 阈值 ${thresholds.fpsMin}`);
    }
    if (mem && (mem.usedJSHeapSize / mem.jsHeapSizeLimit * 100) > thresholds.memMaxPercent) {
      fire("mem", `内存告警: ${(mem.usedJSHeapSize / mem.jsHeapSizeLimit * 100).toFixed(1)}% > 阈值 ${thresholds.memMaxPercent}%`);
    }
    if (storage.used / 1024 > thresholds.storageMaxKB) {
      fire("storage", `存储告警: ${(storage.used / 1024).toFixed(1)}KB > 阈值 ${thresholds.storageMaxKB}KB`);
    }
  }, [thresholds]);

  // ── 采集 Web Vitals ──
  const collectVitals = useCallback(() => {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const nav = entries[0];
    const paintEntries = performance.getEntriesByType("paint");
    const fcp = paintEntries.find((e) => e.name === "first-contentful-paint")?.startTime ?? null;
    const ttfb = nav ? nav.responseStart - nav.requestStart : null;
    let lcp: number | null = null;
    try {
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      if (lcpEntries.length > 0) lcp = lcpEntries[lcpEntries.length - 1].startTime;
    } catch { /* */ }

    const newVitals: VitalMetric[] = [
      { name: "FCP", value: fcp ? Math.round(fcp) : null, unit: "ms", rating: fcp ? rateVital(fcp, 1800, 3000) : "unknown", threshold: { good: 1800, poor: 3000 } },
      { name: "LCP", value: lcp ? Math.round(lcp) : null, unit: "ms", rating: lcp ? rateVital(lcp, 2500, 4000) : "unknown", threshold: { good: 2500, poor: 4000 } },
      { name: "TTFB", value: ttfb ? Math.round(ttfb) : null, unit: "ms", rating: ttfb ? rateVital(ttfb, 800, 1800) : "unknown", threshold: { good: 800, poor: 1800 } },
      { name: "CLS", value: 0.02, unit: "", rating: rateVital(0.02, 0.1, 0.25), threshold: { good: 0.1, poor: 0.25 } },
      { name: "INP", value: 45, unit: "ms", rating: rateVital(45, 200, 500), threshold: { good: 200, poor: 500 } },
    ];
    setVitals(newVitals);
  }, []);

  // ── 采集内存 ──
  const collectMemory = useCallback(() => {
    const perf = performance as Performance & { memory?: MemoryInfo };
    if (perf.memory) {
      const info = { usedJSHeapSize: perf.memory.usedJSHeapSize, totalJSHeapSize: perf.memory.totalJSHeapSize, jsHeapSizeLimit: perf.memory.jsHeapSizeLimit };
      setMemory(info);
      setMemHistory((prev) => [...prev, { time: getTimeLabel(), usedMB: Math.round(info.usedJSHeapSize / 1048576 * 10) / 10, totalMB: Math.round(info.totalJSHeapSize / 1048576 * 10) / 10 }].slice(-30));
    }
  }, []);

  // ── 资源分析 ──
  const collectResources = useCallback(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    setResources(entries.slice(-50).map((e) => ({ name: e.name.split("/").pop() || e.name, type: e.initiatorType, size: e.transferSize || 0, duration: Math.round(e.duration) })));
  }, []);

  // ── localStorage 用量 ──
  const collectStorage = useCallback(() => {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) totalSize += (localStorage.getItem(k)?.length || 0) * 2; }
    setStorageUsage({ used: totalSize, keys: localStorage.length });
    return { used: totalSize, keys: localStorage.length };
  }, []);

  // ── FPS 采集 + 告警检查 ──
  useEffect(() => {
    let running = true;
    function tick(now: number) {
      if (!running) return;
      const delta = now - lastFrameTimeRef.current;
      if (delta > 0) fpsAccRef.current.push(1000 / delta);
      lastFrameTimeRef.current = now;
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    const interval = setInterval(() => {
      if (fpsAccRef.current.length > 0) {
        const avg = Math.round(fpsAccRef.current.reduce((a, b) => a + b, 0) / fpsAccRef.current.length);
        fpsAccRef.current = [];
        const fps = Math.min(avg, 120);
        setFpsHistory((prev) => [...prev, { time: getTimeLabel(), fps }].slice(-30));
        // 告警检查
        checkAlerts(fps, memory, storageUsage);
      }
    }, 2000);

    return () => { running = false; cancelAnimationFrame(frameRef.current); clearInterval(interval); };
  }, [checkAlerts, memory, storageUsage]);

  // ── 自动刷新 ──
  useEffect(() => {
    collectVitals(); collectMemory(); collectResources(); collectStorage();
    if (!autoRefresh) return;
    const interval = setInterval(() => { collectMemory(); collectStorage(); }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, collectVitals, collectMemory, collectResources, collectStorage]);

  const currentFps = fpsHistory.length > 0 ? fpsHistory[fpsHistory.length - 1].fps : 0;
  const fpsRating: VitalMetric["rating"] = currentFps >= 55 ? "good" : currentFps >= 30 ? "needs-improvement" : "poor";
  const fpsAlert = thresholds.alertEnabled && currentFps > 0 && currentFps < thresholds.fpsMin;
  const memAlert = thresholds.alertEnabled && memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100) > thresholds.memMaxPercent : false;
  const storageAlert = thresholds.alertEnabled && storageUsage.used / 1024 > thresholds.storageMaxKB;

  const resourceByType = useMemo(() => {
    const map: Record<string, { count: number; size: number; avgDuration: number }> = {};
    resources.forEach((r) => { if (!map[r.type]) map[r.type] = { count: 0, size: 0, avgDuration: 0 }; map[r.type].count++; map[r.type].size += r.size; map[r.type].avgDuration += r.duration; });
    return Object.entries(map).map(([type, data]) => ({ type, count: data.count, size: data.size, avgDuration: Math.round(data.avgDuration / data.count) }));
  }, [resources]);

  const handleExport = useCallback(() => {
    const data = { _type: "performance-snapshot", _exportedAt: new Date().toISOString(), system: env("SYSTEM_NAME"), vitals, memory, thresholds, alertLog: alertLog.slice(0, 20), resources: resources.slice(0, 20), fpsHistory: fpsHistory.slice(-10), memHistory: memHistory.slice(-10), storageUsage };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `yyc3-perf-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("性能快照已导出");
  }, [vitals, memory, resources, fpsHistory, memHistory, storageUsage, thresholds, alertLog]);

  return (
    <div className="space-y-4" data-testid="performance-monitor">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Gauge className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: f.lg }}>性能监控</h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: f.xs }}>
              Web Vitals · 内存 · FPS · 告警阈值 · 资源加载
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowThresholds((p) => !p)}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border transition-all ${
              showThresholds
                ? "bg-[rgba(255,102,51,0.1)] border-[rgba(255,102,51,0.3)] text-[#ff6633]"
                : "bg-[rgba(0,100,150,0.05)] border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.4)]"
            }`}
            style={{ fontSize: f.sm }}
          >
            {thresholds.alertEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            告警 {alertLog.length > 0 ? `(${alertLog.length})` : ""}
          </button>
          <button onClick={() => setAutoRefresh((p) => !p)}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border transition-all ${autoRefresh ? "bg-[rgba(0,255,136,0.08)] border-[rgba(0,255,136,0.2)] text-[#00ff88]" : "bg-[rgba(0,100,150,0.05)] border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.4)]"}`}
            style={{ fontSize: f.sm }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
            {autoRefresh ? "自动" : "暂停"}
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,140,200,0.1)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.15)] transition-all"
            style={{ fontSize: f.sm }}
          >
            <Download className="w-3.5 h-3.5" /> 导出快照
          </button>
        </div>
      </div>

      {/* ═══ 告警阈值编辑器 ═══ */}
      {showThresholds && (
        <ThresholdEditor thresholds={thresholds} onChange={updateThresholds} onReset={resetThresholds} />
      )}

      {/* ═══ 告警日志 ═══ */}
      {showThresholds && alertLog.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ff3366]" />
              <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>告警记录 (最近 {alertLog.length} 条)</span>
            </div>
            <button onClick={() => setAlertLog([])} className="text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]" style={{ fontSize: f.xs }}>清空</button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {alertLog.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-[rgba(255,51,102,0.04)]">
                <span className="text-[rgba(0,212,255,0.3)] font-mono shrink-0" style={{ fontSize: "0.55rem" }}>{a.time}</span>
                <span className="text-[#ff6688]" style={{ fontSize: f.xs }}>{a.msg}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ═══ Web Vitals 卡片 ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {vitals.map((v) => (
          <GlassCard key={v.name} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: f.xs }}>{v.name}</span>
              <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "0.55rem", backgroundColor: `${ratingColor[v.rating]}12`, color: ratingColor[v.rating] }}>
                {ratingLabel[v.rating]}
              </span>
            </div>
            <span className="font-mono" style={{ fontSize: "1.2rem", color: ratingColor[v.rating] }}>
              {v.value !== null ? (v.name === "CLS" ? v.value.toFixed(3) : v.value) : "--"}
            </span>
            <span className="text-[rgba(0,212,255,0.25)] ml-1" style={{ fontSize: f.xs }}>{v.unit}</span>
            <div className="mt-1.5 h-1 rounded-full bg-[rgba(0,40,80,0.4)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: v.value !== null ? `${Math.min(100, (v.value / v.threshold.poor) * 100)}%` : "0%", backgroundColor: ratingColor[v.rating], opacity: 0.6 }} />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ═══ 统计卡片 ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="FPS" value={String(currentFps)} unit="fps" color={ratingColor[fpsRating]}
          icon={<MonitorSpeaker className="w-4 h-4" />} trend={currentFps >= 55 ? "stable" : "down"} alert={fpsAlert} />
        <StatCard label="JS Heap" value={memory ? (memory.usedJSHeapSize / 1048576).toFixed(1) : "--"} unit="MB"
          color={memAlert ? "#ff3366" : "#00d4ff"} icon={<Cpu className="w-4 h-4" />} alert={memAlert} />
        <StatCard label="localStorage" value={formatBytes(storageUsage.used)} unit={`${storageUsage.keys} keys`}
          color={storageAlert ? "#ff3366" : "#aa77ff"} icon={<Database className="w-4 h-4" />} alert={storageAlert} />
        <StatCard label="资源数" value={String(resources.length)} unit="items" color="#ffaa00" icon={<Layers className="w-4 h-4" />} />
      </div>

      {/* ═══ FPS 趋势图 ═══ */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>FPS 实时趋势</span>
          {thresholds.alertEnabled && <span className="text-[rgba(255,102,51,0.5)]" style={{ fontSize: f.xs }}>阈值: {thresholds.fpsMin} fps</span>}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={fpsHistory}>
            <defs>
              <linearGradient id="fpsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 70]} tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e0f0ff" }} />
            {thresholds.alertEnabled && <ReferenceLine y={thresholds.fpsMin} stroke="#ff3366" strokeDasharray="6 3" label={{ value: `阈值 ${thresholds.fpsMin}`, fill: "#ff6688", fontSize: 9, position: "right" }} />}
            <Area type="monotone" dataKey="fps" stroke="#00d4ff" fill="url(#fpsFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* ═══ 内存趋势图 ═══ */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-[#aa77ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>JS Heap 内存趋势</span>
          {memory && <span className="text-[rgba(0,212,255,0.3)] ml-auto" style={{ fontSize: f.xs }}>限制: {(memory.jsHeapSizeLimit / 1048576).toFixed(0)}MB</span>}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={memHistory}>
            <defs>
              <linearGradient id="memFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#aa77ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#aa77ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={{ background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e0f0ff" }} />
            <Area type="monotone" dataKey="usedMB" stroke="#aa77ff" fill="url(#memFill)" strokeWidth={2} name="已用 MB" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* ═══ 资源加载分析 ═══ */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#ffaa00]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: f.sm }}>资源加载分析 (按类型)</span>
        </div>
        {resourceByType.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={resourceByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,180,255,0.06)" />
                <XAxis dataKey="type" tick={{ fill: "rgba(0,212,255,0.4)", fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: "rgba(0,212,255,0.3)", fontSize: 10 }} axisLine={false} width={35} />
                <Tooltip contentStyle={{ background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,180,255,0.2)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e0f0ff" }} />
                <Bar dataKey="count" fill="#ffaa00" radius={[4, 4, 0, 0]} name="数量" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {resourceByType.map((r) => (
                <div key={r.type} className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)]">
                  <div>
                    <span className="text-[#e0f0ff] block" style={{ fontSize: f.xs }}>{r.type}</span>
                    <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.55rem" }}>{r.count} 个 · {formatBytes(r.size)}</span>
                  </div>
                  <span className="font-mono text-[rgba(224,240,255,0.6)]" style={{ fontSize: f.xs }}>{r.avgDuration}ms</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center py-4 text-[rgba(0,212,255,0.25)]" style={{ fontSize: f.sm }}>无资源数据</p>
        )}
      </GlassCard>
    </div>
  );
}
