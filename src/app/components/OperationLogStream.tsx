/**
 * OperationLogStream.tsx
 * =======================
 * 实时操作日志流组件
 */

import React from "react";
import {
  Search, Radio, CheckCircle, XCircle, Loader2, Clock,
  Server, Brain, ListTodo, Settings, Puzzle,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { CATEGORY_META } from "../hooks/useOperationCenter";
import type { OperationLogEntry, OperationStatus, LogFilterType } from "../types";

const statusConfig: Record<OperationStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending:    { icon: Clock,       color: "rgba(0,212,255,0.4)", label: "待执行" },
  running:    { icon: Loader2,     color: "#00d4ff",             label: "执行中" },
  success:    { icon: CheckCircle, color: "#00ff88",             label: "成功" },
  failed:     { icon: XCircle,     color: "#ff3366",             label: "失败" },
  cancelled:  { icon: XCircle,     color: "rgba(0,212,255,0.3)", label: "已取消" },
};

const catIconMap: Record<string, React.ElementType> = {
  node: Server, model: Brain, task: ListTodo, system: Settings, custom: Puzzle,
};

const filterTabs: { key: LogFilterType; label: string }[] = [
  { key: "all",        label: "实时流" },
  { key: "byCategory", label: "按类型" },
  { key: "byUser",     label: "按用户" },
  { key: "search",     label: "搜索" },
];

interface OperationLogStreamProps {
  logs: OperationLogEntry[];
  filter: LogFilterType;
  onFilterChange: (f: LogFilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isMobile?: boolean;
}

export function OperationLogStream({
  logs, filter, onFilterChange, searchQuery, onSearchChange, isMobile = false,
}: OperationLogStreamProps) {
  return (
    <GlassCard className="p-4" data-testid="operation-log-stream">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#00ff88]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            操作日志
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({logs.length})
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === tab.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.1)]"
            }`}
            style={{ fontSize: "0.68rem" }}
            data-testid={`log-filter-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {filter === "search" && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索操作或用户..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] outline-none focus:border-[rgba(0,212,255,0.3)]"
            style={{ fontSize: "0.75rem" }}
            data-testid="log-search-input"
          />
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.15) transparent" }}>
        {logs.length > 0 ? (
          logs.map((entry) => {
            const st = statusConfig[entry.status];
            const StIcon = st.icon;
            const CatIcon = catIconMap[entry.category] ?? Puzzle;
            const catMeta = CATEGORY_META.find((c) => c.key === entry.category);
            const isRunning = entry.status === "running";

            return (
              <div
                key={entry.id}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-[rgba(0,40,80,0.08)] hover:bg-[rgba(0,40,80,0.15)] transition-all group"
                data-testid={`log-${entry.id}`}
              >
                {/* Status icon */}
                <StIcon
                  className={`w-3.5 h-3.5 shrink-0 ${isRunning ? "animate-spin" : ""}`}
                  style={{ color: st.color }}
                />

                {/* Category icon */}
                <CatIcon
                  className="w-3 h-3 shrink-0"
                  style={{ color: catMeta?.color ?? "#00d4ff", opacity: 0.5 }}
                />

                {/* Action */}
                <span className="text-[#c0dcf0] flex-1 min-w-0 truncate" style={{ fontSize: "0.73rem" }}>
                  {entry.action}
                </span>

                {/* User */}
                <span className="text-[rgba(0,212,255,0.3)] shrink-0 hidden sm:inline" style={{ fontSize: "0.62rem" }}>
                  {entry.user}
                </span>

                {/* Duration */}
                {entry.duration != null && (
                  <span className="text-[rgba(0,212,255,0.2)] shrink-0 hidden md:inline" style={{ fontSize: "0.58rem" }}>
                    {entry.duration}ms
                  </span>
                )}

                {/* Time */}
                <span className="text-[rgba(0,212,255,0.25)] shrink-0" style={{ fontSize: "0.6rem", fontFamily: "'Orbitron', monospace" }}>
                  {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
              暂无操作日志
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
