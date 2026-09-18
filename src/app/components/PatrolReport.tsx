/**
 * PatrolReport.tsx
 * ==================
 * 巡查报告详情
 * 按类别分组展示检查结果
 */

import React, { useState } from "react";
import {
  CheckCircle, AlertTriangle, XCircle, SkipForward, Shield,
  Clock, Timer, ChevronDown, ChevronUp,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { PatrolResult, PatrolCheckItem, CheckStatus } from "../types";

interface PatrolReportProps {
  result: PatrolResult;
  embedded?: boolean;
}

const statusConfig: Record<CheckStatus, { icon: React.ElementType; color: string; label: string }> = {
  pass:     { icon: CheckCircle,   color: "#00ff88", label: "通过" },
  warning:  { icon: AlertTriangle, color: "#ffaa00", label: "警告" },
  critical: { icon: XCircle,       color: "#ff3366", label: "严重" },
  skipped:  { icon: SkipForward,   color: "rgba(0,212,255,0.3)", label: "跳过" },
};

export function PatrolReport({ result, embedded = false }: PatrolReportProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group checks by category
  const grouped = result.checks.reduce<Record<string, PatrolCheckItem[]>>((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Health score color
  const scoreColor =
    result.healthScore >= 90 ? "#00ff88" :
    result.healthScore >= 70 ? "#ffaa00" :
    "#ff3366";

  const Container = embedded ? "div" : GlassCard;

  return (
    <Container className={embedded ? "" : "p-4"} data-testid="patrol-report">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${scoreColor}12` }}
          >
            <span
              style={{ fontSize: "1.1rem", fontFamily: "'Orbitron', sans-serif", color: scoreColor }}
            >
              {result.healthScore}
            </span>
          </div>
          <div>
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>
              巡查报告
            </h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>
                <Clock className="w-3 h-3" />
                {new Date(result.timestamp).toLocaleString("zh-CN")}
              </span>
              <span className="flex items-center gap-1 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>
                <Timer className="w-3 h-3" />
                耗时 {result.duration}s
              </span>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  fontSize: "0.58rem",
                  backgroundColor: "rgba(0,212,255,0.08)",
                  color: "rgba(0,212,255,0.5)",
                }}
              >
                {result.triggeredBy === "manual" ? "手动" : result.triggeredBy === "auto" ? "自动" : "计划"}
              </span>
            </div>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge count={result.passCount} status="pass" />
          <Badge count={result.warningCount} status="warning" />
          <Badge count={result.criticalCount} status="critical" />
        </div>
      </div>

      {/* Category groups */}
      {Object.entries(grouped).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(grouped).map(([category, checks]) => {
            const isExpanded = expandedCategories.has(category);
            const categoryStatus = checks.some((c) => c.status === "critical")
              ? "critical"
              : checks.some((c) => c.status === "warning")
              ? "warning"
              : "pass";
            const cfg = statusConfig[categoryStatus];

            return (
              <div
                key={category}
                className="rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.06)] overflow-hidden"
              >
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgba(0,40,80,0.2)] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                      {category}
                    </span>
                    <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                      ({checks.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.3)]" />
                  )}
                </button>

                {/* Expanded checks */}
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {checks.map((check) => {
                      const st = statusConfig[check.status];
                      const StIcon = st.icon;
                      return (
                        <div
                          key={check.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.1)]"
                        >
                          <StIcon className="w-3.5 h-3.5 shrink-0" style={{ color: st.color }} />
                          <span className="text-[#c0dcf0] flex-1 min-w-0 truncate" style={{ fontSize: "0.75rem" }}>
                            {check.label}
                          </span>
                          <span className="text-[rgba(0,212,255,0.5)] shrink-0" style={{ fontSize: "0.7rem" }}>
                            {check.value}
                          </span>
                          {check.detail && (
                            <span className="text-[rgba(0,212,255,0.25)] shrink-0 hidden sm:inline" style={{ fontSize: "0.62rem" }}>
                              {check.detail}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
            巡查历史报告（无详细检查数据）
          </p>
        </div>
      )}
    </Container>
  );
}

// ============================================================
// Badge
// ============================================================

function Badge({ count, status }: { count: number; status: CheckStatus }) {
  const cfg = statusConfig[status];
  if (count === 0) return null;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded"
      style={{
        fontSize: "0.62rem",
        backgroundColor: `${cfg.color}12`,
        color: cfg.color,
      }}
    >
      <cfg.icon className="w-3 h-3" />
      {count}
    </span>
  );
}