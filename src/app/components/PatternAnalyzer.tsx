/**
 * PatternAnalyzer.tsx
 * ====================
 * 模式分析器 · 展示检测到的异常模式卡片
 */

import React from "react";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  X, Clock, Repeat,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { DetectedPattern, PatternSeverity } from "../types";

const severityConfig: Record<PatternSeverity, { color: string; bg: string; label: string }> = {
  critical: { color: "#ff0044", bg: "rgba(255,0,68,0.08)", label: "严重" },
  high:     { color: "#ff3366", bg: "rgba(255,51,102,0.08)", label: "高" },
  medium:   { color: "#ffaa00", bg: "rgba(255,170,0,0.08)", label: "中" },
  low:      { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", label: "低" },
};

const trendIcon: Record<string, React.ElementType> = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const trendLabel: Record<string, string> = {
  rising: "上升",
  stable: "稳定",
  declining: "下降",
};

interface PatternAnalyzerProps {
  patterns: DetectedPattern[];
  onDismiss: (patternId: string) => void;
  onSelectPattern?: (patternId: string) => void;
  selectedPatternId?: string | null;
}

export function PatternAnalyzer({
  patterns, onDismiss, onSelectPattern, selectedPatternId,
}: PatternAnalyzerProps) {
  return (
    <div className="space-y-2" data-testid="pattern-analyzer">
      {patterns.length > 0 ? (
        patterns.map((pat) => {
          const sev = severityConfig[pat.severity];
          const TrendIc = trendIcon[pat.trend];
          const isSelected = selectedPatternId === pat.id;

          return (
            <div
              key={pat.id}
              onClick={() => onSelectPattern?.(pat.id)}
              className={`relative p-3 rounded-xl border transition-all ${
                isSelected
                  ? "border-[rgba(0,212,255,0.3)] bg-[rgba(0,40,80,0.18)]"
                  : "border-[rgba(0,180,255,0.08)] bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)]"
              } ${onSelectPattern ? "cursor-pointer" : ""}`}
              data-testid={`pattern-${pat.id}`}
            >
              {/* Severity indicator */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: sev.color }}
              />

              <div className="pl-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ fontSize: "0.58rem", color: sev.color, backgroundColor: sev.bg }}
                    >
                      {sev.label}
                    </span>
                    <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                      {pat.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(pat.id);
                    }}
                    className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] text-[rgba(0,212,255,0.2)] hover:text-[rgba(0,212,255,0.5)] transition-all shrink-0"
                    data-testid={`dismiss-${pat.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-[rgba(0,212,255,0.4)] mb-2" style={{ fontSize: "0.7rem" }}>
                  {pat.description}
                </p>

                {/* Metric badge */}
                <div
                  className="inline-block px-2 py-1 rounded-lg mb-2"
                  style={{ backgroundColor: sev.bg, fontSize: "0.68rem", color: sev.color }}
                >
                  {pat.metric}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                    <AlertTriangle className="w-3 h-3" />
                    {pat.source}
                  </span>
                  <span className="flex items-center gap-1 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                    <Repeat className="w-3 h-3" />
                    {pat.occurrences} 次
                  </span>
                  <span className="flex items-center gap-1 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                    <TrendIc className="w-3 h-3" />
                    趋势 {trendLabel[pat.trend]}
                  </span>
                  <span className="flex items-center gap-1 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                    <Clock className="w-3 h-3" />
                    {new Date(pat.detectedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-8">
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.82rem" }}>
            未检测到异常模式
          </p>
          <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.7rem" }}>
            系统运行正常
          </p>
        </div>
      )}
    </div>
  );
}
