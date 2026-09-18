/**
 * PatrolHistory.tsx
 * ==================
 * 巡查历史记录列表
 * 支持时间范围筛选、查看历史报告
 */

import React, { useState } from "react";
import {
  Clock, Calendar, Shield, ChevronRight, CheckCircle,
  AlertTriangle, XCircle, User, Zap, Timer,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { PatrolResult } from "../types";

interface PatrolHistoryProps {
  history: PatrolResult[];
  onViewReport: (result: PatrolResult) => void;
  isMobile?: boolean;
}

type TimeRange = "recent" | "daily" | "weekly" | "custom";

const timeRangeFilters: { key: TimeRange; label: string }[] = [
  { key: "recent",  label: "最近" },
  { key: "daily",   label: "每日" },
  { key: "weekly",  label: "每周" },
  { key: "custom",  label: "自定义范围" },
];

function filterByRange(items: PatrolResult[], range: TimeRange): PatrolResult[] {
  const now = Date.now();
  switch (range) {
    case "recent":
      return items.slice(0, 10);
    case "daily":
      return items.filter((i) => now - i.timestamp < 24 * 60 * 60 * 1000);
    case "weekly":
      return items.filter((i) => now - i.timestamp < 7 * 24 * 60 * 60 * 1000);
    case "custom":
      return items;
    default:
      return items;
  }
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  return `${days} 天前`;
}

const triggerLabel: Record<string, { label: string; icon: React.ElementType }> = {
  manual:    { label: "手动", icon: User },
  auto:      { label: "自动", icon: Zap },
  scheduled: { label: "计划", icon: Calendar },
};

export function PatrolHistory({ history, onViewReport, isMobile = false }: PatrolHistoryProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("recent");
  const filtered = filterByRange(history, timeRange);

  return (
    <GlassCard className="p-4" data-testid="patrol-history">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            巡查历史
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({filtered.length})
          </span>
        </div>
      </div>

      {/* Time range filter */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {timeRangeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setTimeRange(f.key)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              timeRange === f.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.1)]"
            }`}
            style={{ fontSize: "0.68rem" }}
            data-testid={`range-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History list */}
      {filtered.length > 0 ? (
        <div className="space-y-1.5">
          {filtered.map((item) => {
            const scoreColor =
              item.healthScore >= 90 ? "#00ff88" :
              item.healthScore >= 70 ? "#ffaa00" :
              "#ff3366";
            const trig = triggerLabel[item.triggeredBy] ?? triggerLabel.auto;
            const TrigIcon = trig.icon;

            return (
              <button
                key={item.id}
                onClick={() => onViewReport(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[rgba(0,40,80,0.1)] border border-[rgba(0,180,255,0.05)] hover:border-[rgba(0,180,255,0.15)] hover:bg-[rgba(0,40,80,0.2)] transition-all group text-left"
                data-testid={`history-${item.id}`}
              >
                {/* Health score */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${scoreColor}10` }}
                >
                  <span
                    style={{ fontSize: "0.82rem", fontFamily: "'Orbitron', sans-serif", color: scoreColor }}
                  >
                    {item.healthScore}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#c0dcf0]" style={{ fontSize: "0.75rem" }}>
                      {new Date(item.timestamp).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.6rem" }}>
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {!isMobile && (
                      <>
                        <span className="flex items-center gap-0.5 text-[#00ff88]" style={{ fontSize: "0.62rem" }}>
                          <CheckCircle className="w-2.5 h-2.5" /> {item.passCount}
                        </span>
                        {item.warningCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[#ffaa00]" style={{ fontSize: "0.62rem" }}>
                            <AlertTriangle className="w-2.5 h-2.5" /> {item.warningCount}
                          </span>
                        )}
                        {item.criticalCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[#ff3366]" style={{ fontSize: "0.62rem" }}>
                            <XCircle className="w-2.5 h-2.5" /> {item.criticalCount}
                          </span>
                        )}
                      </>
                    )}
                    <span className="flex items-center gap-0.5 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.58rem" }}>
                      <TrigIcon className="w-2.5 h-2.5" /> {trig.label}
                    </span>
                    <span className="flex items-center gap-0.5 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>
                      <Timer className="w-2.5 h-2.5" /> {item.duration}s
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.2)] group-hover:text-[#00d4ff] transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
            当前范围内没有巡查记录
          </p>
        </div>
      )}
    </GlassCard>
  );
}