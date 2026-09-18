/**
 * PWAStatusPanel.tsx
 * ===================
 * PWA & 离线管理面板 · 路由: /pwa (嵌入系统设置)
 *
 * 功能:
 * - Service Worker 状态显示
 * - 缓存管理（查看/清理/刷新）
 * - 离线就绪状态
 * - SW 更新
 */

import React, { useContext } from "react";
import {
  Wifi, WifiOff, HardDrive, RefreshCw, Trash2,
  Download, CheckCircle, XCircle, Loader2, Shield, Database,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { usePWAManager } from "../hooks/usePWAManager";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";
import type { SWStatus } from "../types";

const swStatusConfig: Record<SWStatus, { color: string; icon: React.ElementType }> = {
  idle:        { color: "rgba(0,212,255,0.4)",  icon: Shield },
  installing:  { color: "#ffaa00",              icon: Loader2 },
  waiting:     { color: "#ffaa00",              icon: RefreshCw },
  active:      { color: "#00ff88",              icon: CheckCircle },
  error:       { color: "#ff3366",              icon: XCircle },
  unsupported: { color: "rgba(0,212,255,0.25)", icon: XCircle },
};

export function PWAStatusPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    swStatus,
    swVersion,
    isOnline,
    cacheEntries,
    totalCacheSize,
    totalCacheCount,
    offlineReady,
    updateAvailable,
    isUpdating,
    isClearing,
    updateSW,
    clearAllCache,
    clearCache,
    refreshCache,
    formatSize,
  } = usePWAManager();

  const swCfg = swStatusConfig[swStatus];
  const SWIcon = swCfg.icon;

  return (
    <div className="space-y-4" data-testid="pwa-status-panel">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("pwa.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("pwa.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ======== Status Cards ======== */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {/* SW Status */}
        <GlassCard className="p-4 flex flex-col items-center justify-center">
          <SWIcon
            className={`w-6 h-6 mb-2 ${swStatus === "installing" ? "animate-spin" : ""}`}
            style={{ color: swCfg.color }}
          />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
            {t(`pwa.swStates.${swStatus}`)}
          </span>
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
            {t("pwa.swStatus")} · v{swVersion}
          </p>
        </GlassCard>

        {/* Cache size */}
        <GlassCard className="p-4 flex flex-col items-center justify-center">
          <HardDrive className="w-6 h-6 text-[#00d4ff] mb-2" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.95rem", fontFamily: "'Orbitron', monospace" }}>
            {formatSize(totalCacheSize)}
          </span>
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
            {t("pwa.cacheSize")} · {t("pwa.items").replace("{n}", String(totalCacheCount))}
          </p>
        </GlassCard>

        {/* Online status */}
        <GlassCard className="p-4 flex flex-col items-center justify-center">
          {isOnline ? (
            <Wifi className="w-6 h-6 text-[#00ff88] mb-2" />
          ) : (
            <WifiOff className="w-6 h-6 text-[#ff3366] mb-2" />
          )}
          <span
            className="text-[#e0f0ff]"
            style={{ fontSize: "0.82rem", color: isOnline ? "#00ff88" : "#ff3366" }}
          >
            {isOnline ? t("pwa.online") : t("pwa.offline")}
          </span>
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
            {t("pwa.networkStatusLabel")}
          </p>
        </GlassCard>

        {/* Offline ready */}
        <GlassCard className="p-4 flex flex-col items-center justify-center">
          {offlineReady ? (
            <CheckCircle className="w-6 h-6 text-[#00ff88] mb-2" />
          ) : (
            <XCircle className="w-6 h-6 text-[#ffaa00] mb-2" />
          )}
          <span
            className="text-[#e0f0ff]"
            style={{ fontSize: "0.82rem", color: offlineReady ? "#00ff88" : "#ffaa00" }}
          >
            {offlineReady ? t("pwa.offlineReady") : t("pwa.notOfflineReady")}
          </span>
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
            {t("pwa.offlineCapability")}
          </p>
        </GlassCard>
      </div>

      {/* ======== Action buttons ======== */}
      <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
        {/* Update SW */}
        {updateAvailable && (
          <button
            onClick={updateSW}
            disabled={isUpdating}
            className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,255,136,0.06)] border border-[rgba(0,255,136,0.15)] hover:bg-[rgba(0,255,136,0.1)] transition-all disabled:opacity-40"
            data-testid="update-sw-btn"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 text-[#00ff88] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-[#00ff88]" />
            )}
            <div className="text-left">
              <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>
                {isUpdating ? t("pwa.updating") : t("pwa.updateNow")}
              </p>
              <p className="text-[rgba(0,255,136,0.4)]" style={{ fontSize: "0.6rem" }}>
                v{swVersion} → v1.5.0
              </p>
            </div>
          </button>
        )}

        {/* Refresh cache */}
        <button
          onClick={refreshCache}
          className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,212,255,0.2)] transition-all"
          data-testid="refresh-cache-btn"
        >
          <RefreshCw className="w-4 h-4 text-[#00d4ff] opacity-50" />
          <div className="text-left">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>{t("pwa.refreshCache")}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>{t("pwa.refreshCacheDesc")}</p>
          </div>
        </button>

        {/* Clear all cache */}
        <button
          onClick={clearAllCache}
          disabled={isClearing || cacheEntries.length === 0}
          className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(255,51,102,0.04)] border border-[rgba(255,51,102,0.1)] hover:bg-[rgba(255,51,102,0.08)] transition-all disabled:opacity-40"
          data-testid="clear-all-cache-btn"
        >
          {isClearing ? (
            <Loader2 className="w-4 h-4 text-[#ff3366] animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-[#ff3366] opacity-50" />
          )}
          <div className="text-left">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>
              {isClearing ? t("pwa.clearing") : t("pwa.clearAllCache")}
            </p>
            <p className="text-[rgba(255,51,102,0.4)]" style={{ fontSize: "0.6rem" }}>
              {t("pwa.release").replace("{size}", formatSize(totalCacheSize))}
            </p>
          </div>
        </button>
      </div>

      {/* ======== Cache details ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            {t("pwa.cacheDetails")}
          </h3>
          <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.62rem" }}>
            ({cacheEntries.length})
          </span>
        </div>

        <div className="space-y-1" data-testid="cache-list">
          {cacheEntries.length > 0 ? (
            cacheEntries.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                data-testid={`cache-${entry.name}`}
              >
                <Database className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    {entry.name}
                  </p>
                  <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                    {formatSize(entry.size)} · {t("pwa.items").replace("{n}", String(entry.count))} · {new Date(entry.lastUpdated).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => clearCache(entry.name)}
                  className="p-1.5 rounded-lg text-[rgba(0,212,255,0.2)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.06)] transition-all shrink-0"
                  data-testid={`clear-${entry.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
                {t("pwa.cacheEmpty")}
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}