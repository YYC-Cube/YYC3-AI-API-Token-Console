/**
 * AIDiagnostics.tsx
 * ===================
 * AI 辅助诊断模块
 * 模式识别 · 异常分析 · 自动解决方案 · 预测性维护
 * 赛博朋克风格 #060e1f + #00d4ff
 */

import React from "react";
import {
  BrainCircuit, Play, Loader2, Search, Zap,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Minus, Target, Lightbulb, Clock, ArrowRight,
  Activity, Eye, BarChart3, ChevronRight,
  Cpu, MemoryStick, Wifi, HardDrive,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { useAIDiagnostics } from "../hooks/useAIDiagnostics";
import type {
  PatternType,
  ConfidenceLevel,
  ActionPriority,
  DiagnosticPattern,
  AnomalyRecord,
  SuggestedAction,
  PredictiveForecast,
} from "../types";
import { useWebSocketData } from "../hooks/useWebSocketData";

// ============================================================
// Helpers
// ============================================================

function confidenceColor(c: ConfidenceLevel): string {
  if (c === "high") return "#00ff88";
  if (c === "medium") return "#ffaa00";
  return "rgba(0,212,255,0.5)";
}

function priorityColor(p: ActionPriority): string {
  if (p === "urgent") return "#ff3366";
  if (p === "recommended") return "#ffaa00";
  return "#00d4ff";
}

function patternTypeLabel(type: PatternType, t: (k: string) => string): string {
  const map: Record<PatternType, string> = {
    recurring: t("aiDiag.patternRecurring"),
    gradual: t("aiDiag.patternGradual"),
    spike: t("aiDiag.patternSpike"),
    correlation: t("aiDiag.patternCorrelation"),
    seasonal: t("aiDiag.patternSeasonal"),
  };
  return map[type] || type;
}

function riskColor(risk: string): string {
  if (risk === "danger") return "#ff3366";
  if (risk === "warning") return "#ffaa00";
  return "#00ff88";
}

function metricIcon(metric: string) {
  if (metric.includes("GPU")) return <Cpu className="w-3.5 h-3.5" />;
  if (metric.includes("内存") || metric.includes("Memory")) return <MemoryStick className="w-3.5 h-3.5" />;
  if (metric.includes("网络") || metric.includes("Network")) return <Wifi className="w-3.5 h-3.5" />;
  if (metric.includes("延迟") || metric.includes("Latency")) return <Activity className="w-3.5 h-3.5" />;
  return <BarChart3 className="w-3.5 h-3.5" />;
}

// ============================================================
// Sub Components
// ============================================================

function PatternCard({ pattern, t }: { pattern: DiagnosticPattern; t: (k: string) => string }) {
  const maxVal = Math.max(...pattern.dataPoints);
  return (
    <GlassCard
      className="p-4"
      glowColor={pattern.severity === "critical" ? "rgba(255,51,102,0.08)" : pattern.severity === "warning" ? "rgba(255,170,0,0.05)" : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{pattern.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.58rem",
              background: `${confidenceColor(pattern.confidence)}15`,
              color: confidenceColor(pattern.confidence),
            }}
          >
            {t(`aiDiag.confidence${pattern.confidence.charAt(0).toUpperCase() + pattern.confidence.slice(1)}`)}
          </span>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.58rem",
              background: "rgba(0,212,255,0.08)",
              color: "rgba(0,212,255,0.6)",
            }}
          >
            {patternTypeLabel(pattern.type, t)}
          </span>
        </div>
      </div>

      <p className="text-[rgba(224,240,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>
        {pattern.description}
      </p>

      {/* Mini spark chart */}
      <div className="flex items-end gap-0.5 h-10 mb-2">
        {pattern.dataPoints.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{
              height: `${(v / maxVal) * 100}%`,
              background: v > maxVal * 0.85
                ? "rgba(255,51,102,0.6)"
                : v > maxVal * 0.65
                ? "rgba(255,170,0,0.4)"
                : "rgba(0,212,255,0.3)",
              transition: "height 0.3s ease",
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between" style={{ fontSize: "0.62rem" }}>
        <div className="flex items-center gap-1.5">
          {metricIcon(pattern.metric)}
          <span className="text-[rgba(0,212,255,0.5)]">{pattern.metric}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[rgba(224,240,255,0.3)]">
          <Target className="w-3 h-3" />
          {pattern.affectedNodes.join(", ")}
        </div>
      </div>
    </GlassCard>
  );
}

function AnomalyRow({ anomaly, t }: { anomaly: AnomalyRecord; t: (k: string) => string }) {
  const deviationColor = anomaly.deviation > 100 ? "#ff3366" : anomaly.deviation > 30 ? "#ffaa00" : "#00d4ff";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.15)] transition-all">
      <div className="shrink-0">
        <AlertTriangle className="w-4 h-4" style={{ color: deviationColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#e0f0ff] font-mono" style={{ fontSize: "0.75rem" }}>{anomaly.nodeId}</span>
          <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>{anomaly.metric}</span>
        </div>
        <div className="flex items-center gap-3 mb-1" style={{ fontSize: "0.68rem" }}>
          <span className="text-[rgba(224,240,255,0.4)]">{t("aiDiag.expected")}: {anomaly.expectedValue}</span>
          <ArrowRight className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
          <span style={{ color: deviationColor }}>{t("aiDiag.actual")}: {anomaly.actualValue}</span>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ fontSize: "0.58rem", background: `${deviationColor}15`, color: deviationColor }}
          >
            +{anomaly.deviation.toFixed(1)}%
          </span>
        </div>
        <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.65rem" }}>
          {t("aiDiag.rootCause")}: {anomaly.rootCause}
        </p>
      </div>
      <div className="text-[rgba(0,212,255,0.3)] shrink-0" style={{ fontSize: "0.58rem" }}>
        {new Date(anomaly.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  executing,
  onExecute,
  t,
}: {
  action: SuggestedAction;
  executing: boolean;
  onExecute: () => void;
  t: (k: string) => string;
}) {
  return (
    <GlassCard className="p-4" glowColor={action.priority === "urgent" ? "rgba(255,51,102,0.06)" : undefined}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" style={{ color: priorityColor(action.priority) }} />
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{action.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.58rem",
              background: `${priorityColor(action.priority)}15`,
              color: priorityColor(action.priority),
            }}
          >
            {t(`aiDiag.priority${action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}`)}
          </span>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.58rem",
              background: `${confidenceColor(action.confidence)}15`,
              color: confidenceColor(action.confidence),
            }}
          >
            {t(`aiDiag.confidence${action.confidence.charAt(0).toUpperCase() + action.confidence.slice(1)}`)}
          </span>
        </div>
      </div>

      <p className="text-[rgba(224,240,255,0.5)] mb-2" style={{ fontSize: "0.72rem" }}>
        {action.description}
      </p>

      <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: "0.65rem" }}>
        <Zap className="w-3 h-3 text-[#00ff88]" />
        <span className="text-[#00ff88]">{action.estimatedImpact}</span>
      </div>

      {/* Steps */}
      <div className="space-y-1.5 mb-3">
        {action.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2" style={{ fontSize: "0.68rem" }}>
            <span
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
              style={{
                background: "rgba(0,212,255,0.1)",
                color: "rgba(0,212,255,0.6)",
                fontSize: "0.55rem",
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              {i + 1}
            </span>
            <span className="text-[rgba(224,240,255,0.5)]">{step}</span>
          </div>
        ))}
      </div>

      {/* Execute Button */}
      {action.autoExecutable && (
        <button
          onClick={onExecute}
          disabled={executing}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border transition-all"
          style={{
            fontSize: "0.72rem",
            borderColor: executing ? "rgba(0,212,255,0.2)" : "rgba(0,255,136,0.3)",
            background: executing ? "rgba(0,212,255,0.05)" : "rgba(0,255,136,0.08)",
            color: executing ? "rgba(0,212,255,0.5)" : "#00ff88",
            cursor: executing ? "not-allowed" : "pointer",
          }}
        >
          {executing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("aiDiag.executing")}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              {t("aiDiag.executeAction")}
            </>
          )}
        </button>
      )}
    </GlassCard>
  );
}

function ForecastCard({ forecast, t }: { forecast: PredictiveForecast; t: (k: string) => string }) {
  const trendColor = forecast.trend === "up" ? "#ff6666" : forecast.trend === "down" ? "#00ff88" : "rgba(0,212,255,0.5)";
  const TrendIcon = forecast.trend === "up" ? TrendingUp : forecast.trend === "down" ? TrendingDown : Minus;

  return (
    <GlassCard className="p-4" glowColor={forecast.riskLevel === "danger" ? "rgba(255,51,102,0.06)" : undefined}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {metricIcon(forecast.metric)}
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>{forecast.metric}</span>
        </div>
        <span
          className="px-1.5 py-0.5 rounded"
          style={{
            fontSize: "0.58rem",
            background: `${riskColor(forecast.riskLevel)}15`,
            color: riskColor(forecast.riskLevel),
          }}
        >
          {forecast.riskLevel === "safe" ? t("aiDiag.riskSafe") : forecast.riskLevel === "warning" ? t("aiDiag.riskWarning") : t("aiDiag.riskDanger")}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div>
          <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>{t("aiDiag.currentValue")}</div>
          <div className="text-[#e0f0ff]" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            {forecast.currentValue}
          </div>
        </div>
        <TrendIcon className="w-5 h-5" style={{ color: trendColor }} />
        <div>
          <div className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>{forecast.timeframe}</div>
          <div style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif", color: riskColor(forecast.riskLevel) }}>
            {forecast.predictedValue}
          </div>
        </div>
      </div>

      <p className="text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.68rem" }}>
        {forecast.explanation}
      </p>
    </GlassCard>
  );
}

// ============================================================
// Main Component
// ============================================================

export function AIDiagnostics() {
  const { t } = useI18n();
  // Integrate with WebSocket live data
  const wsData = useWebSocketData();
  const {
    status, session, history,
    activeView, setActiveView,
    executingAction, startDiagnosis, executeAction,
  } = useAIDiagnostics({
    liveNodes: wsData.nodes,
    liveQPS: wsData.liveQPS,
    liveLatency: wsData.liveLatency,
  });

  const views: { key: typeof activeView; labelKey: string; icon: React.ElementType }[] = [
    { key: "patterns", labelKey: "aiDiag.viewPatterns", icon: Search },
    { key: "anomalies", labelKey: "aiDiag.viewAnomalies", icon: AlertTriangle },
    { key: "actions", labelKey: "aiDiag.viewActions", icon: Lightbulb },
    { key: "forecasts", labelKey: "aiDiag.viewForecasts", icon: Eye },
  ];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#00d4ff] flex items-center gap-2" style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif" }}>
            <BrainCircuit className="w-5 h-5" />
            {t("aiDiag.title")}
          </h1>
          <p className="text-[rgba(0,212,255,0.4)] mt-1" style={{ fontSize: "0.72rem" }}>
            {t("aiDiag.subtitle")}
          </p>
        </div>
        <button
          onClick={startDiagnosis}
          disabled={status === "analyzing"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all"
          style={{
            fontSize: "0.78rem",
            borderColor: status === "analyzing" ? "rgba(0,212,255,0.2)" : "rgba(0,212,255,0.4)",
            background: status === "analyzing" ? "rgba(0,212,255,0.05)" : "rgba(0,212,255,0.12)",
            color: "#00d4ff",
            cursor: status === "analyzing" ? "not-allowed" : "pointer",
          }}
        >
          {status === "analyzing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("aiDiag.analyzing")}
            </>
          ) : (
            <>
              <BrainCircuit className="w-4 h-4" />
              {t("aiDiag.startDiagnosis")}
            </>
          )}
        </button>
      </div>

      {/* Stats / Summary */}
      {session && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div className="flex-1">
              <div className="text-[rgba(0,212,255,0.5)] mb-1" style={{ fontSize: "0.68rem" }}>
                {t("aiDiag.aiSummary")}
              </div>
              <p className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.78rem" }}>
                {session.summary}
              </p>
              <div className="flex items-center gap-4 mt-2" style={{ fontSize: "0.62rem" }}>
                <span className="flex items-center gap-1 text-[#00d4ff]">
                  <Search className="w-3 h-3" /> {session.patterns.length} {t("aiDiag.patternsFound")}
                </span>
                <span className="flex items-center gap-1 text-[#ffaa00]">
                  <AlertTriangle className="w-3 h-3" /> {session.anomalies.length} {t("aiDiag.anomaliesFound")}
                </span>
                <span className="flex items-center gap-1 text-[#00ff88]">
                  <Lightbulb className="w-3 h-3" /> {session.actions.length} {t("aiDiag.actionsGenerated")}
                </span>
                <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]">
                  <Clock className="w-3 h-3" /> {((session.completedAt! - session.startedAt) / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* View Tabs */}
      {session && (
        <div className="flex gap-1 p-1 rounded-lg bg-[rgba(0,180,255,0.05)] border border-[rgba(0,180,255,0.1)]">
          {views.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-all"
              style={{
                fontSize: "0.72rem",
                background: activeView === key ? "rgba(0,212,255,0.1)" : "transparent",
                color: activeView === key ? "#00d4ff" : "rgba(0,212,255,0.4)",
                borderBottom: activeView === key ? "2px solid #00d4ff" : "2px solid transparent",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {session && activeView === "patterns" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {session.patterns.map((p) => (
            <PatternCard key={p.id} pattern={p} t={t} />
          ))}
        </div>
      )}

      {session && activeView === "anomalies" && (
        <div className="space-y-2">
          {session.anomalies.map((a) => (
            <AnomalyRow key={a.id} anomaly={a} t={t} />
          ))}
        </div>
      )}

      {session && activeView === "actions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {session.actions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              executing={executingAction === a.id}
              onExecute={() => executeAction(a.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {session && activeView === "forecasts" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {session.forecasts.map((f) => (
            <ForecastCard key={f.metric} forecast={f} t={t} />
          ))}
        </div>
      )}

      {/* History */}
      {!session && status !== "analyzing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Empty State */}
          <GlassCard className="p-12 flex items-center justify-center">
            <div className="text-center">
              <BrainCircuit className="w-12 h-12 text-[rgba(0,212,255,0.12)] mx-auto mb-4" />
              <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>
                {t("aiDiag.emptyHint")}
              </p>
            </div>
          </GlassCard>

          {/* History */}
          <GlassCard className="p-4">
            <div className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.72rem" }}>
              {t("aiDiag.diagHistory")}
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all"
                >
                  <BrainCircuit className="w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                  <div className="flex-1">
                    <div className="text-[rgba(224,240,255,0.6)]" style={{ fontSize: "0.72rem" }}>
                      {h.patterns} {t("aiDiag.patternsFound")} · {h.actions} {t("aiDiag.actionsGenerated")}
                    </div>
                    <div className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.58rem" }}>
                      {new Date(h.time).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Analyzing Animation */}
      {status === "analyzing" && (
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(0,212,255,0.15)]" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00d4ff] animate-spin" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#aa55ff] animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <BrainCircuit className="absolute inset-0 m-auto w-6 h-6 text-[#00d4ff]" />
            </div>
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.68rem" }}>
              {t("aiDiag.analyzingHint")}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}