/**
 * ServiceLoopPanel.tsx
 * =====================
 * 一站式服务闭环主面板 · 路由: /loop
 *
 * 8.1 监测 → 分析 → 决策 → 执行 → 验证 → 优化
 * 8.2 数据流向可视化
 *
 * 已迁移 i18n: 所有文本使用 t() 函数
 */

import React, { useContext } from "react";
import {
  RefreshCw, Loader2, Play, Square, Trash2, History,
  ToggleLeft, ToggleRight, Workflow,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { LoopStageCard } from "./LoopStageCard";
import { DataFlowDiagram } from "./DataFlowDiagram";
import { useServiceLoop } from "../hooks/useServiceLoop";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ServiceLoopPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    currentRun,
    history,
    isRunning,
    autoMode,
    setAutoMode,
    currentStageIndex,
    stats,
    startLoop,
    abortLoop,
    clearHistory,
    stageMeta,
    dataFlowNodes,
    dataFlowEdges,
  } = useServiceLoop();

  const triggerLabel = (trigger: string) =>
    trigger === "manual" ? t("loop.manual") : trigger === "auto" ? t("loop.auto") : t("loop.alert");

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Workflow className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("loop.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("loop.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoMode(!autoMode)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.68rem" }}
            data-testid="toggle-auto-loop"
          >
            {autoMode ? (
              <ToggleRight className="w-4 h-4 text-[#00ff88]" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {t("loop.autoLoop")}
          </button>

          {isRunning ? (
            <button
              onClick={abortLoop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)] transition-all"
              style={{ fontSize: "0.72rem" }}
              data-testid="abort-loop"
            >
              <Square className="w-3.5 h-3.5" />
              {t("loop.abort")}
            </button>
          ) : (
            <button
              onClick={() => startLoop("manual")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-all"
              style={{ fontSize: "0.72rem" }}
              data-testid="start-loop"
            >
              <Play className="w-3.5 h-3.5" />
              {t("loop.startLoop")}
            </button>
          )}
        </div>
      </div>

      {/* ======== Stats ======== */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.totalRuns}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>{t("loop.totalRuns")}</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#00ff88]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.successRuns}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>{t("loop.successRuns")}</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ff3366]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.errorRuns}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>{t("loop.errorRuns")}</p>
        </GlassCard>
        <GlassCard className="p-3 flex flex-col items-center">
          <span className="text-[#ffaa00]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', monospace" }}>
            {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "--"}
          </span>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>{t("loop.avgDuration")}</p>
        </GlassCard>
      </div>

      {/* ======== Main Content ======== */}
      <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-[#00d4ff] ${isRunning ? "animate-spin" : ""}`} />
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
                {t("loop.pipeline")}
              </h3>
              {currentRun && (
                <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                  {triggerLabel(currentRun.trigger)}
                </span>
              )}
            </div>
            {isRunning && <Loader2 className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" />}
          </div>

          <div data-testid="loop-pipeline">
            {stageMeta.map((meta, i) => {
              const result = currentRun?.stages[i] ?? {
                stage: meta.key,
                status: "idle" as const,
                startedAt: null,
                completedAt: null,
                duration: null,
                summary: "",
                details: [],
              };
              return (
                <LoopStageCard
                  key={meta.key}
                  meta={meta}
                  result={result}
                  index={i}
                  isActive={currentStageIndex === i}
                  showConnector={i < stageMeta.length - 1}
                />
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Workflow className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              {t("loop.dataFlow")}
            </h3>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.6rem" }}>
              {t("loop.localLoop")}
            </span>
          </div>
          <DataFlowDiagram nodes={dataFlowNodes} edges={dataFlowEdges} isMobile={isMobile} />
        </GlassCard>
      </div>

      {/* ======== Run History ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
              {t("loop.runHistory")}
            </h3>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.6rem" }}>
              ({history.length})
            </span>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.3)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.04)] transition-all"
              style={{ fontSize: "0.62rem" }}
              data-testid="clear-history"
            >
              <Trash2 className="w-3 h-3" />
              {t("loop.clearHistory")}
            </button>
          )}
        </div>

        <div className="space-y-1" data-testid="loop-history">
          {history.length > 0 ? (
            history.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
                data-testid={`history-${run.id}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      run.overallStatus === "completed" ? "#00ff88" :
                      run.overallStatus === "error" ? "#ff3366" : "rgba(0,212,255,0.3)",
                  }}
                />
                <span className="text-[rgba(0,212,255,0.4)] shrink-0" style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatTime(run.startedAt)}
                </span>
                <span className="text-[rgba(0,212,255,0.3)] shrink-0" style={{ fontSize: "0.6rem" }}>
                  {triggerLabel(run.trigger)}
                </span>
                <span className="text-[#c0dcf0] flex-1 min-w-0 truncate" style={{ fontSize: "0.7rem" }}>
                  {t("loop.stagesCompleted", { n: run.stages.filter((s) => s.status === "completed").length })}
                </span>
                {run.completedAt && (
                  <span className="text-[rgba(0,212,255,0.25)] shrink-0" style={{ fontSize: "0.6rem" }}>
                    {formatDuration(run.completedAt - run.startedAt)}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.78rem" }}>
                {t("loop.noHistory")}
              </p>
              <p className="text-[rgba(0,212,255,0.15)] mt-1" style={{ fontSize: "0.65rem" }}>
                {t("loop.noHistoryHint")}
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}