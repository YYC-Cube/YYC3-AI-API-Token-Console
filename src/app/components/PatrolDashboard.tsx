/**
 * PatrolDashboard.tsx
 * =====================
 * 巡查模式主面板
 * 路由: /patrol
 *
 * i18n 已迁移
 */

import React, { useContext } from "react";
import {
  Play, Pause, Clock, CheckCircle, AlertTriangle, XCircle,
  Settings, Calendar, Timer, Loader2, Shield,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { PatrolScheduler } from "./PatrolScheduler";
import { PatrolReport } from "./PatrolReport";
import { PatrolHistory } from "./PatrolHistory";
import { usePatrol } from "../hooks/usePatrol";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

export function PatrolDashboard() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    patrolStatus,
    currentResult,
    history,
    schedule,
    progress,
    selectedReport,
    runPatrol,
    toggleAutoPatrol,
    updateInterval,
    viewReport,
    closeReport,
  } = usePatrol();

  const [showScheduler, setShowScheduler] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("patrol.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("patrol.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.3)] transition-all"
            style={{ fontSize: "0.75rem" }}
          >
            <Settings className="w-3.5 h-3.5" />
            {t("patrol.patrolPlan")}
          </button>
          <button
            onClick={() => runPatrol("manual")}
            disabled={patrolStatus === "running"}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${
              patrolStatus === "running"
                ? "bg-[rgba(0,212,255,0.05)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.3)] cursor-wait"
                : "bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] hover:shadow-[0_0_15px_rgba(0,180,255,0.1)]"
            }`}
            style={{ fontSize: "0.75rem" }}
          >
            {patrolStatus === "running" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {patrolStatus === "running" ? t("common.loading") : t("patrol.manualPatrol")}
          </button>
        </div>
      </div>

      {/* ======== Scheduler Panel (toggle) ======== */}
      {showScheduler && (
        <PatrolScheduler
          schedule={schedule}
          onToggle={toggleAutoPatrol}
          onIntervalChange={updateInterval}
        />
      )}

      {/* ======== Progress Bar (when running) ======== */}
      {patrolStatus === "running" && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 text-[#00d4ff] animate-spin" />
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
              {t("common.loading")} {progress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(0,180,255,0.08)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #00d4ff, #00ff88)",
                boxShadow: "0 0 10px rgba(0,212,255,0.3)",
              }}
            />
          </div>
        </GlassCard>
      )}

      {/* ======== Stats Overview ======== */}
      <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-2`}>
        <StatCard
          label={t("patrol.nodeHealth")}
          value={currentResult ? `${currentResult.healthScore}%` : "--"}
          icon={Shield}
          color={currentResult && currentResult.healthScore < 80 ? "#ff3366" : "#00ff88"}
        />
        <StatCard
          label={t("common.success")}
          value={currentResult ? `${currentResult.passCount}/${currentResult.totalChecks}` : "--"}
          icon={CheckCircle}
          color="#00ff88"
        />
        <StatCard
          label={t("common.warning")}
          value={currentResult ? String(currentResult.warningCount) : "--"}
          icon={AlertTriangle}
          color="#ffaa00"
        />
        <StatCard
          label={t("ai.severity.critical")}
          value={currentResult ? String(currentResult.criticalCount) : "--"}
          icon={XCircle}
          color="#ff3366"
        />
      </div>

      {/* ======== Schedule Status Strip ======== */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>
              <Timer className="w-3.5 h-3.5" />
              {t("patrol.autoPatrol")}:
              <span className={schedule.enabled ? "text-[#00ff88]" : "text-[rgba(0,212,255,0.3)]"}>
                {schedule.enabled ? `${schedule.interval} min` : t("common.none")}
              </span>
            </span>
            {schedule.lastRun && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
                <Clock className="w-3 h-3" />
                {t("pwa.lastSync")}: {new Date(schedule.lastRun).toLocaleTimeString("zh-CN")}
              </span>
            )}
            {schedule.nextRun && schedule.enabled && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
                <Calendar className="w-3 h-3" />
                {t("common.next")}: {new Date(schedule.nextRun).toLocaleTimeString("zh-CN")}
              </span>
            )}
          </div>
          <button
            onClick={() => toggleAutoPatrol(!schedule.enabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              schedule.enabled
                ? "bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88]"
                : "bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.4)]"
            }`}
            style={{ fontSize: "0.7rem" }}
          >
            {schedule.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {schedule.enabled ? t("common.cancel") : t("common.confirm")}
          </button>
        </div>
      </GlassCard>

      {/* ======== Current Result Detail ======== */}
      {currentResult && currentResult.checks.length > 0 && (
        <PatrolReport result={currentResult} embedded />
      )}

      {/* ======== History ======== */}
      <PatrolHistory
        history={history}
        onViewReport={viewReport}
        isMobile={isMobile}
      />

      {/* ======== Report Modal ======== */}
      {selectedReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeReport} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl bg-[rgba(6,14,31,0.98)] border border-[rgba(0,180,255,0.15)] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-6">
            <button
              onClick={closeReport}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[rgba(255,51,102,0.1)] transition-all"
            >
              <XCircle className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
            </button>
            <PatrolReport result={selectedReport} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
            {label}
          </p>
          <p
            className="text-[#e0f0ff]"
            style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}
          >
            {value}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}