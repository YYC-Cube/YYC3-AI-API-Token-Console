/**
 * FollowUpPanel.tsx
 * ==================
 * 一键跟进系统 · 主面板页面
 * 路由: /follow-up
 *
 * i18n 已迁移
 */

import React, { useContext } from "react";
import {
  AlertTriangle, AlertCircle, XCircle, Info, Filter, Bell,
  Activity, CheckCircle,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { FollowUpCard } from "./FollowUpCard";
import { FollowUpDrawer } from "./FollowUpDrawer";
import { useFollowUp } from "../hooks/useFollowUp";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

export function FollowUpPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    items,
    stats,
    drawerItem,
    drawerOpen,
    filterSeverity,
    filterStatus,
    setFilterSeverity,
    setFilterStatus,
    openDrawer,
    closeDrawer,
    quickFix,
    markResolved,
  } = useFollowUp();

  const severityFilters = [
    { key: "all" as const,      label: t("common.all"),          icon: Filter,        color: "#00d4ff" },
    { key: "critical" as const, label: t("ai.severity.critical"), icon: XCircle,       color: "#ff3366" },
    { key: "error" as const,    label: t("common.error"),         icon: AlertTriangle, color: "#ff6600" },
    { key: "warning" as const,  label: t("common.warning"),       icon: AlertCircle,   color: "#ffaa00" },
    { key: "info" as const,     label: t("common.info"),          icon: Info,          color: "#00d4ff" },
  ];

  const statusFilters = [
    { key: "all" as const,           label: t("common.all") },
    { key: "active" as const,        label: t("pwa.online") },
    { key: "investigating" as const, label: t("ai.analyzing") },
    { key: "resolved" as const,      label: t("followUp.markResolved") },
    { key: "ignored" as const,       label: t("ai.dismiss") },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,51,102,0.1)] flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#ff3366]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("followUp.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("followUp.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.68rem" }}>
            {stats.total} {t("common.all")}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-2`}>
        <StatCard label={t("ai.severity.critical")} value={stats.critical} icon={XCircle} color="#ff3366" />
        <StatCard label={t("common.error")} value={stats.error} icon={AlertTriangle} color="#ff6600" />
        <StatCard label={t("ai.analyzing")} value={stats.investigating} icon={Activity} color="#ffaa00" />
        <StatCard label={t("followUp.markResolved")} value={stats.resolved} icon={CheckCircle} color="#00ff88" />
      </div>

      {/* Filters */}
      <GlassCard className="p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[rgba(0,212,255,0.35)] mr-1" style={{ fontSize: "0.68rem" }}>
              {t("ai.severity.critical").charAt(0)}:
            </span>
            {severityFilters.map((f) => {
              const Icon = f.icon;
              const isActive = filterSeverity === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterSeverity(f.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    isActive
                      ? "border border-[rgba(0,212,255,0.25)]"
                      : "border border-transparent hover:border-[rgba(0,180,255,0.1)]"
                  }`}
                  style={{
                    fontSize: "0.68rem",
                    backgroundColor: isActive ? `${f.color}12` : "transparent",
                    color: isActive ? f.color : "rgba(0,212,255,0.4)",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {f.label}
                  {f.key !== "all" && (
                    <span style={{ fontSize: "0.58rem", opacity: 0.6 }}>
                      ({f.key === "critical" ? stats.critical : f.key === "error" ? stats.error : f.key === "warning" ? stats.warning : stats.total - stats.critical - stats.error - stats.warning})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-5 bg-[rgba(0,180,255,0.1)]" />

          <div className="flex items-center gap-1 flex-wrap">
            {statusFilters.map((f) => {
              const isActive = filterStatus === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    isActive
                      ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                      : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.1)]"
                  }`}
                  style={{ fontSize: "0.68rem" }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Alert Cards */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <FollowUpCard
              key={item.id}
              item={item}
              onOpenDrawer={openDrawer}
              onQuickFix={quickFix}
              onMarkResolved={markResolved}
              compact={isMobile}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-10 h-10 text-[#00ff88] mb-3 opacity-50" />
            <p className="text-[#e0f0ff] mb-1" style={{ fontSize: "0.9rem" }}>
              {t("common.noData")}
            </p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.72rem" }}>
              {t("palette.noResults")}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Drawer */}
      <FollowUpDrawer
        item={drawerItem}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        onQuickFix={quickFix}
        onMarkResolved={markResolved}
        isMobile={isMobile}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>{label}</p>
          <p className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>{value}</p>
        </div>
      </div>
    </GlassCard>
  );
}