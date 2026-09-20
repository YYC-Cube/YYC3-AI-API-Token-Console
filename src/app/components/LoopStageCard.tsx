/**
 * LoopStageCard.tsx
 * ==================
 * 单个闭环阶段卡片
 */

import React from "react";
import {
  Activity, BarChart3, Brain, Play, CheckCircle, TrendingUp,
  Loader2, Clock,
} from "lucide-react";
import type { StageResult, StageStatus } from "../types";
import type { StageMeta } from "../types";

const iconMap: Record<string, React.ElementType> = {
  Activity, BarChart3, Brain, Play, CheckCircle, TrendingUp,
};

const statusConfig: Record<StageStatus, { color: string; label: string }> = {
  idle:      { color: "rgba(0,212,255,0.2)", label: "待执行" },
  running:   { color: "#00d4ff",             label: "执行中" },
  completed: { color: "#00ff88",             label: "已完成" },
  error:     { color: "#ff3366",             label: "错误" },
  skipped:   { color: "rgba(0,212,255,0.15)", label: "已跳过" },
};

interface LoopStageCardProps {
  meta: StageMeta;
  result: StageResult;
  index: number;
  isActive: boolean;
  showConnector?: boolean;
}

export function LoopStageCard({ meta, result, index, isActive, showConnector }: LoopStageCardProps) {
  const Icon = iconMap[meta.icon] ?? Activity;
  const stCfg = statusConfig[result.status];

  return (
    <div className="flex items-start gap-0" data-testid={`loop-stage-${meta.key}`}>
      {/* Left: Stage indicator */}
      <div className="flex flex-col items-center shrink-0 w-10">
        {/* Node circle */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
            isActive
              ? "shadow-[0_0_16px_rgba(0,212,255,0.4)]"
              : ""
          }`}
          style={{
            borderColor: result.status === "idle" ? "rgba(0,180,255,0.15)" : stCfg.color,
            backgroundColor: result.status === "idle"
              ? "rgba(0,40,80,0.3)"
              : `${stCfg.color}15`,
          }}
        >
          {result.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: stCfg.color }} />
          ) : (
            <Icon className="w-3.5 h-3.5" style={{ color: result.status === "idle" ? "rgba(0,212,255,0.3)" : stCfg.color }} />
          )}
        </div>

        {/* Connector line */}
        {showConnector && (
          <div
            className="w-0.5 flex-1 min-h-[24px] transition-all duration-500"
            style={{
              backgroundColor: result.status === "completed"
                ? `${stCfg.color}40`
                : "rgba(0,180,255,0.08)",
            }}
          />
        )}
      </div>

      {/* Right: Content */}
      <div className={`flex-1 pb-4 pl-2 ${result.status === "idle" ? "opacity-40" : ""}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>
            {meta.label}
          </span>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{
              fontSize: "0.55rem",
              color: stCfg.color,
              backgroundColor: `${stCfg.color}12`,
            }}
          >
            {stCfg.label}
          </span>
          {result.duration != null && (
            <span className="flex items-center gap-0.5 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>
              <Clock className="w-2.5 h-2.5" />
              {(result.duration / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[rgba(0,212,255,0.3)] mb-1" style={{ fontSize: "0.65rem" }}>
          {meta.description}
        </p>

        {/* Result summary */}
        {result.summary && (
          <div className="p-2 rounded-lg bg-[rgba(0,40,80,0.1)] border border-[rgba(0,180,255,0.06)] mb-1.5">
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.72rem" }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Result details */}
        {result.details.length > 0 && (
          <div className="space-y-0.5">
            {result.details.map((d, i) => (
              <p key={i} className="text-[rgba(0,212,255,0.35)] pl-2 border-l border-[rgba(0,180,255,0.08)]" style={{ fontSize: "0.65rem" }}>
                {d}
              </p>
            ))}
          </div>
        )}

        {/* Metrics */}
        {result.metrics && Object.keys(result.metrics).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {Object.entries(result.metrics).map(([k, v]) => (
              <span
                key={k}
                className="px-1.5 py-0.5 rounded bg-[rgba(0,40,80,0.15)] text-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.58rem", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}