/**
 * SecurityMonitor.tsx
 * ====================
 * 安全与性能监控主页面
 * 4 Tab: 安全检测 | 性能监控 | 系统诊断 | 数据管理
 * 赛博朋克风格，深色 #060e1f + 青色 #00d4ff
 */

import React from "react";
import {
  Shield, Zap, Cpu, Database,
  ScanLine, CheckCircle2, XCircle, AlertTriangle,
  Cookie, Eye, FileSearch, BarChart3,
  MemoryStick, Gauge, Monitor, Wifi,
  Globe, HardDrive, Trash2, Download,
  Upload, RefreshCw, Lock,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { useSecurityMonitor } from "../hooks/useSecurityMonitor";
import type { SecurityTab, RiskLevel, VitalRating } from "../types";

// ============================================================
// Helpers
// ============================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function riskColor(risk: RiskLevel): string {
  if (risk === "safe") return "#00ff88";
  if (risk === "warning") return "#ffaa00";
  return "#ff3366";
}

function statusIcon(status: "pass" | "warn" | "fail") {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4" style={{ color: "#00ff88" }} />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4" style={{ color: "#ffaa00" }} />;
  return <XCircle className="w-4 h-4" style={{ color: "#ff3366" }} />;
}

function vitalColor(rating: VitalRating): string {
  if (rating === "good") return "#00ff88";
  if (rating === "needs-improvement") return "#ffaa00";
  return "#ff3366";
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#00ff88" : score >= 60 ? "#ffaa00" : "#ff3366";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,180,255,0.1)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ color, fontSize: size > 60 ? "1.2rem" : "0.9rem", fontFamily: "'Orbitron', sans-serif" }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Tab buttons
// ============================================================

const TAB_CONFIG: { key: SecurityTab; icon: React.ElementType }[] = [
  { key: "security", icon: Shield },
  { key: "performance", icon: Zap },
  { key: "diagnostics", icon: Cpu },
  { key: "dataManagement", icon: Database },
];

// ============================================================
// Sub-sections
// ============================================================

function SecurityTabContent({ state, t }: { state: ReturnType<typeof useSecurityMonitor>; t: (k: string, v?: Record<string, string | number>) => string }) {
  const { csp, cookie, sensitive } = state;

  if (!csp || !cookie || !sensitive) {
    return (
      <div className="flex items-center justify-center py-16 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
        {t("security.noScanYet")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CSP */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.cspTitle")}</span>
          </div>
          <ScoreRing score={csp.score} size={48} />
        </div>
        <div className="space-y-2">
          {csp.directives.map((d) => (
            <div key={d.name} className="flex items-center gap-2" style={{ fontSize: "0.75rem" }}>
              {statusIcon(d.status)}
              <span className="text-[rgba(0,212,255,0.6)] min-w-[100px]">{d.name}</span>
              <span className="text-[rgba(224,240,255,0.5)] truncate">{d.value}</span>
            </div>
          ))}
        </div>
        {csp.recommendations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[rgba(0,180,255,0.1)]">
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>{t("security.cspRecommendation")}</span>
            {csp.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 mt-1" style={{ fontSize: "0.7rem" }}>
                <span className="text-[#ffaa00] shrink-0">*</span>
                <span className="text-[rgba(224,240,255,0.5)]">{r}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Cookie */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cookie className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.cookieTitle")}</span>
          </div>
          <ScoreRing score={cookie.score} size={48} />
        </div>
        <div className="flex items-center gap-2 mb-3" style={{ fontSize: "0.75rem" }}>
          <span className="text-[rgba(0,212,255,0.5)]">{t("security.cookieCount")}:</span>
          <span className="text-[#00d4ff]">{cookie.count}</span>
        </div>
        <div className="space-y-2">
          {cookie.checks.map((c) => (
            <div key={c.name} className="flex items-start gap-2" style={{ fontSize: "0.75rem" }}>
              {statusIcon(c.status)}
              <div>
                <span className="text-[#e0f0ff]">{c.name}</span>
                <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.68rem" }}>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Sensitive Data */}
      <GlassCard className="p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.sensitiveTitle")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "0.7rem", color: riskColor(sensitive.totalRisks === 0 ? "safe" : "warning") }}>
              {sensitive.totalRisks === 0 ? t("security.sensitiveClean") : t("security.sensitiveFound", { n: sensitive.totalRisks })}
            </span>
            <ScoreRing score={sensitive.score} size={48} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.7rem" }}>{t("security.sensitiveLocalStorage")}</div>
            {sensitive.localStorage.map((item) => (
              <div key={item.key} className="flex items-center gap-2 py-1" style={{ fontSize: "0.72rem" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: riskColor(item.risk) }} />
                <span className="text-[rgba(0,212,255,0.7)] font-mono">{item.key}</span>
                <span className="text-[rgba(224,240,255,0.35)] truncate">{item.detail}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.7rem" }}>{t("security.sensitiveSessionStorage")}</div>
            {sensitive.sessionStorage.map((item) => (
              <div key={item.key} className="flex items-center gap-2 py-1" style={{ fontSize: "0.72rem" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: riskColor(item.risk) }} />
                <span className="text-[rgba(0,212,255,0.7)] font-mono">{item.key}</span>
                <span className="text-[rgba(224,240,255,0.35)] truncate">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function PerformanceTabContent({ state, t }: { state: ReturnType<typeof useSecurityMonitor>; t: (k: string, v?: Record<string, string | number>) => string }) {
  const { performance: perf, memory, vitals } = state;

  if (!perf || !memory) {
    return (
      <div className="flex items-center justify-center py-16 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
        {t("security.noScanYet")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Resource Analysis */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.perfResourceTitle")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: t("security.perfTotalResources"), value: String(perf.totalResources) },
            { label: t("security.perfTotalSize"), value: formatBytes(perf.totalSize) },
            { label: t("security.perfLoadTime"), value: `${perf.pageLoadTime}ms` },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-[#00d4ff]" style={{ fontSize: "1rem", fontFamily: "'Orbitron', sans-serif" }}>{m.value}</div>
              <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {perf.resources.slice(0, 5).map((r) => (
            <div key={r.name} className="flex items-center gap-2" style={{ fontSize: "0.7rem" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: r.cached ? "#00ff88" : "#ffaa00" }} />
              <span className="text-[rgba(224,240,255,0.7)] flex-1 truncate font-mono">{r.name}</span>
              <span className="text-[rgba(0,212,255,0.5)]">{formatBytes(r.size)}</span>
              <span className="text-[rgba(224,240,255,0.3)]">{r.loadTime}ms</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* JS Bundle Analysis */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.perfJsBundle")}</span>
        </div>
        {perf.jsBundles.map((b) => {
          const ratio = (b.gzipped / b.size) * 100;
          return (
            <div key={b.name} className="mb-3">
              <div className="flex items-center justify-between mb-1" style={{ fontSize: "0.72rem" }}>
                <span className="text-[rgba(224,240,255,0.7)] font-mono">{b.name}</span>
                <span className="text-[rgba(0,212,255,0.5)]">{formatBytes(b.size)} → {formatBytes(b.gzipped)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(0,180,255,0.1)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${ratio}%`,
                    background: `linear-gradient(90deg, #00d4ff, ${ratio > 50 ? "#ffaa00" : "#00ff88"})`,
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="mt-3 pt-3 border-t border-[rgba(0,180,255,0.1)]">
          <div className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>{t("security.perfLazyLoad")}</div>
          <div className="text-[#00ff88] mt-1" style={{ fontSize: "0.85rem" }}>
            ~{perf.lazyLoadSavings}% {t("security.perfImgOptimize")}
          </div>
        </div>
      </GlassCard>

      {/* Memory */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.memoryTitle")}</span>
          </div>
          <span style={{ fontSize: "0.7rem", color: riskColor(memory.leakRisk) }}>
            {t("security.memoryLeakRisk")}: {t(`security.memory${memory.leakRisk.charAt(0).toUpperCase() + memory.leakRisk.slice(1)}` as any)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: t("security.memoryUsed"), value: formatBytes(memory.usedJSHeap) },
            { label: t("security.memoryLimit"), value: formatBytes(memory.jsHeapLimit) },
            { label: t("security.memoryListeners"), value: String(memory.listeners) },
            { label: t("security.memoryDomNodes"), value: String(memory.domNodes) },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>{m.label}</div>
              <div className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{m.value}</div>
            </div>
          ))}
        </div>
        {/* Mini trend chart */}
        <div className="flex items-end gap-1 h-10">
          {memory.trend.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${(v / 60) * 100}%`,
                background: `linear-gradient(180deg, rgba(0,212,255,0.5), rgba(0,212,255,0.1))`,
                transition: "height 0.5s ease",
              }}
            />
          ))}
        </div>
      </GlassCard>

      {/* Web Vitals */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.vitalsTitle")}</span>
        </div>
        <div className="space-y-3">
          {vitals.map((v) => (
            <div key={v.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.72rem" }}>
                  {t(`security.vitals${v.name}` as any)}
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "0.85rem", color: vitalColor(v.rating), fontFamily: "'Orbitron', sans-serif" }}>
                    {v.value}{v.unit}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: "0.6rem",
                      background: `${vitalColor(v.rating)}20`,
                      color: vitalColor(v.rating),
                    }}
                  >
                    {v.rating === "good" ? t("security.vitalsGood") : v.rating === "needs-improvement" ? t("security.vitalsNeedsImprovement") : t("security.vitalsPoor")}
                  </span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-[rgba(0,180,255,0.1)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: v.rating === "good" ? "30%" : v.rating === "needs-improvement" ? "65%" : "90%",
                    background: vitalColor(v.rating),
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <div className="text-right mt-0.5" style={{ fontSize: "0.58rem", color: "rgba(0,212,255,0.3)" }}>{v.target}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function DiagnosticsTabContent({ state, t }: { state: ReturnType<typeof useSecurityMonitor>; t: (k: string, v?: Record<string, string | number>) => string }) {
  const { device, network, browser } = state;

  if (!device || !network || !browser) {
    return (
      <div className="flex items-center justify-center py-16 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
        {t("security.noScanYet")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Device */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.deviceTitle")}</span>
        </div>
        <div className="space-y-2.5">
          {[
            { label: t("security.deviceCPU"), value: `${device.cpuCores} Cores` },
            { label: t("security.deviceMemory"), value: device.memory ? `${device.memory} GB` : "N/A" },
            { label: t("security.deviceScreen"), value: device.screen },
            { label: t("security.devicePixelRatio"), value: `${device.pixelRatio}x` },
            { label: t("security.deviceTouch"), value: device.touchSupport ? t("security.deviceSupported") : t("security.deviceNotSupported") },
            { label: t("security.deviceGPU"), value: device.gpu },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between" style={{ fontSize: "0.72rem" }}>
              <span className="text-[rgba(0,212,255,0.5)]">{item.label}</span>
              <span className="text-[#e0f0ff] truncate ml-2 text-right" style={{ maxWidth: "60%" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Network */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.networkTitle")}</span>
        </div>
        <div className="space-y-2.5">
          {[
            { label: t("security.networkType"), value: network.type.toUpperCase() },
            { label: t("security.networkDownlink"), value: `${network.downlink} Mbps` },
            { label: t("security.networkRTT"), value: `${network.rtt} ms` },
            { label: t("security.networkEffective"), value: network.effectiveType.toUpperCase() },
            {
              label: t("security.networkStability"),
              value: network.isStable ? t("security.networkStable") : t("security.networkUnstable"),
              color: network.isStable ? "#00ff88" : "#ff3366",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between" style={{ fontSize: "0.72rem" }}>
              <span className="text-[rgba(0,212,255,0.5)]">{item.label}</span>
              <span style={{ color: (item as any).color || "#e0f0ff" }}>{item.value}</span>
            </div>
          ))}
        </div>
        {/* Signal strength visual */}
        <div className="mt-3 pt-3 border-t border-[rgba(0,180,255,0.1)] flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className="rounded-sm"
              style={{
                width: 6,
                height: bar * 6,
                background: bar <= 4 ? "#00ff88" : "rgba(0,180,255,0.15)",
              }}
            />
          ))}
        </div>
      </GlassCard>

      {/* Browser Compat */}
      <GlassCard className="p-4 lg:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#00d4ff]" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.browserTitle")}</span>
          </div>
          <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.68rem" }}>
            {browser.name} {browser.version}
          </span>
        </div>
        <div className="space-y-1.5">
          {browser.features.map((f) => (
            <div key={f.name} className="flex items-center justify-between" style={{ fontSize: "0.7rem" }}>
              <span className="text-[rgba(224,240,255,0.6)]">{f.name}</span>
              <div className="flex items-center gap-1.5">
                {f.supported ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00ff88" }} />
                ) : (
                  <XCircle className="w-3.5 h-3.5" style={{ color: "#ff3366" }} />
                )}
                {f.polyfillNeeded && (
                  <span className="px-1 py-0.5 rounded bg-[rgba(255,170,0,0.15)] text-[#ffaa00]" style={{ fontSize: "0.55rem" }}>
                    Polyfill
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
            {browser.features.filter((f) => f.supported).length}/{browser.features.length} {t("security.browserFeatures")}
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

function DataManagementTabContent({ state, t }: { state: ReturnType<typeof useSecurityMonitor>; t: (k: string, v?: Record<string, string | number>) => string }) {
  const { dataManagement: dm, cleanupData, exportData } = state;

  if (!dm) {
    return (
      <div className="flex items-center justify-center py-16 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
        {t("security.noScanYet")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Storage Overview */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.dataTotalStorage")}</span>
        </div>
        <div className="text-center mb-3">
          <span className="text-[#00d4ff]" style={{ fontSize: "1.5rem", fontFamily: "'Orbitron', sans-serif" }}>
            {formatBytes(dm.storage.total)}
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: "localStorage", size: dm.storage.localStorage, color: "#00d4ff" },
            { label: "sessionStorage", size: dm.storage.sessionStorage, color: "#00ff88" },
            { label: "IndexedDB", size: dm.storage.indexedDB, color: "#aa55ff" },
            { label: "Cache API", size: dm.storage.cacheAPI, color: "#ffaa00" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1" style={{ fontSize: "0.7rem" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-[rgba(224,240,255,0.6)]">{item.label}</span>
                </div>
                <span className="text-[rgba(0,212,255,0.5)]">{formatBytes(item.size)}</span>
              </div>
              <div className="h-1 rounded-full bg-[rgba(0,180,255,0.1)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: dm.storage.total > 0 ? `${Math.max(1, (item.size / dm.storage.total) * 100)}%` : "0%",
                    background: item.color,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Data Sync */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.dataSyncTitle")}</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between" style={{ fontSize: "0.75rem" }}>
            <span className="text-[rgba(0,212,255,0.5)]">{t("security.dataSyncTabs")}</span>
            <span style={{ color: dm.syncEnabled ? "#00ff88" : "rgba(224,240,255,0.3)" }}>
              {dm.syncEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex items-center justify-between" style={{ fontSize: "0.75rem" }}>
            <span className="text-[rgba(0,212,255,0.5)]">{t("security.dataLastBackup")}</span>
            <span className="text-[rgba(224,240,255,0.6)]">
              {dm.lastBackup ? new Date(dm.lastBackup).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={exportData}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(0,180,255,0.2)] bg-[rgba(0,180,255,0.05)] text-[#00d4ff] hover:bg-[rgba(0,180,255,0.1)] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              <Download className="w-3.5 h-3.5" />
              {t("security.dataSyncExport")}
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[rgba(0,180,255,0.2)] bg-[rgba(0,180,255,0.05)] text-[#00d4ff] hover:bg-[rgba(0,180,255,0.1)] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              <Upload className="w-3.5 h-3.5" />
              {t("security.dataSyncImport")}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Data Cleanup */}
      <GlassCard className="p-4 lg:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{t("security.dataCleanTitle")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: "expired" as const, label: t("security.dataCleanExpired"), count: dm.expiredItems, icon: Trash2 },
            { key: "cache" as const, label: t("security.dataCleanCache"), count: formatBytes(dm.cacheSize), icon: HardDrive },
            { key: "privacy" as const, label: t("security.dataCleanPrivacy"), count: formatBytes(dm.storage.sessionStorage), icon: Lock },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="rounded-lg border border-[rgba(0,180,255,0.1)] bg-[rgba(0,180,255,0.03)] p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-[rgba(0,212,255,0.5)]" />
                  <span className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.72rem" }}>{item.label}</span>
                </div>
                <div className="text-[#00d4ff] mb-2" style={{ fontSize: "0.9rem", fontFamily: "'Orbitron', sans-serif" }}>
                  {typeof item.count === "number" ? `${item.count} items` : item.count}
                </div>
                <button
                  onClick={() => cleanupData(item.key)}
                  className="w-full py-1.5 rounded border border-[rgba(255,51,102,0.2)] bg-[rgba(255,51,102,0.05)] text-[#ff6688] hover:bg-[rgba(255,51,102,0.1)] transition-all"
                  style={{ fontSize: "0.68rem" }}
                >
                  {t("security.dataCleanBtn")}
                </button>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function SecurityMonitor() {
  const { t } = useI18n();
  const state = useSecurityMonitor();
  const { activeTab, setActiveTab, scanStatus, startScan, lastScanTime, overallScore, overallRisk } = state;

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#00d4ff] flex items-center gap-2" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            <Shield className="w-5 h-5" />
            {t("security.title")}
          </h1>
          <p className="text-[rgba(0,212,255,0.4)] mt-1" style={{ fontSize: "0.72rem" }}>
            {t("security.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Overall Score */}
          {scanStatus === "complete" && (
            <div className="flex items-center gap-2">
              <ScoreRing score={overallScore} size={50} />
              <div>
                <div className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.6rem" }}>{t("security.score")}</div>
                <div style={{ fontSize: "0.7rem", color: riskColor(overallRisk) }}>
                  {overallRisk === "safe" ? t("security.safe") : overallRisk === "warning" ? t("security.warning") : t("security.danger")}
                </div>
              </div>
            </div>
          )}

          {/* Scan Button */}
          <button
            onClick={startScan}
            disabled={scanStatus === "scanning"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
            style={{
              fontSize: "0.75rem",
              borderColor: scanStatus === "scanning" ? "rgba(0,212,255,0.3)" : "rgba(0,212,255,0.4)",
              background: scanStatus === "scanning" ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.1)",
              color: "#00d4ff",
              cursor: scanStatus === "scanning" ? "not-allowed" : "pointer",
            }}
          >
            <ScanLine className={`w-4 h-4 ${scanStatus === "scanning" ? "animate-spin" : ""}`} />
            {scanStatus === "scanning" ? t("security.scanRunning") : scanStatus === "complete" ? t("security.rescan") : t("security.startScan")}
          </button>
        </div>
      </div>

      {/* Last scan info */}
      {lastScanTime && (
        <div className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
          {t("security.lastScan")}: {new Date(lastScanTime).toLocaleString()}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-[rgba(0,180,255,0.05)] border border-[rgba(0,180,255,0.1)]">
        {TAB_CONFIG.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all"
            style={{
              fontSize: "0.72rem",
              background: activeTab === key ? "rgba(0,212,255,0.1)" : "transparent",
              color: activeTab === key ? "#00d4ff" : "rgba(0,212,255,0.4)",
              borderBottom: activeTab === key ? "2px solid #00d4ff" : "2px solid transparent",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(`security.tabs.${key}`)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "security" && <SecurityTabContent state={state} t={t} />}
      {activeTab === "performance" && <PerformanceTabContent state={state} t={t} />}
      {activeTab === "diagnostics" && <DiagnosticsTabContent state={state} t={t} />}
      {activeTab === "dataManagement" && <DataManagementTabContent state={state} t={t} />}
    </div>
  );
}