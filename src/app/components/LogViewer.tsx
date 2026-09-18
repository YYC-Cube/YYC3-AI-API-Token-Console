/**
 * LogViewer.tsx
 * ==============
 * 日志查看器组件 · 筛选 / 搜索 / 实时日志流
 */

import React from "react";
import {
  Search, Filter, Bug, Info, AlertTriangle, XCircle, Skull,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { LogEntry, LogLevel } from "../types";

const levelConfig: Record<LogLevel, { icon: React.ElementType; color: string; label: string }> = {
  debug: { icon: Bug,            color: "rgba(0,212,255,0.4)", label: "DEBUG" },
  info:  { icon: Info,           color: "#00d4ff",             label: "INFO" },
  warn:  { icon: AlertTriangle,  color: "#ffaa00",             label: "WARN" },
  error: { icon: XCircle,        color: "#ff3366",             label: "ERROR" },
  fatal: { icon: Skull,          color: "#ff0044",             label: "FATAL" },
};

const levels: Array<LogLevel | "all"> = ["all", "debug", "info", "warn", "error", "fatal"];

interface LogViewerProps {
  logs: LogEntry[];
  levelFilter: LogLevel | "all";
  sourceFilter: string;
  searchQuery: string;
  sources: string[];
  onLevelChange: (level: LogLevel | "all") => void;
  onSourceChange: (source: string) => void;
  onSearchChange: (query: string) => void;
  isMobile?: boolean;
}

export function LogViewer({
  logs, levelFilter, sourceFilter, searchQuery, sources,
  onLevelChange, onSourceChange, onSearchChange, isMobile = false,
}: LogViewerProps) {
  return (
    <GlassCard className="p-4" data-testid="log-viewer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            日志查看器
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({logs.length} 条)
          </span>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Level filter */}
        <div className="flex items-center gap-1">
          {levels.map((lvl) => {
            const isActive = levelFilter === lvl;
            const cfg = lvl !== "all" ? levelConfig[lvl] : null;
            return (
              <button
                key={lvl}
                onClick={() => onLevelChange(lvl)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  isActive
                    ? "bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)]"
                    : "border border-transparent hover:border-[rgba(0,180,255,0.1)]"
                }`}
                style={{
                  fontSize: "0.65rem",
                  color: isActive ? (cfg?.color ?? "#00d4ff") : "rgba(0,212,255,0.4)",
                }}
                data-testid={`level-${lvl}`}
              >
                {lvl === "all" ? "全部" : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Source filter */}
        <select
          value={sourceFilter}
          onChange={(e) => onSourceChange(e.target.value)}
          className="px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] outline-none"
          style={{ fontSize: "0.68rem" }}
          data-testid="source-filter"
        >
          <option value="all">全部来源</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[rgba(0,212,255,0.3)]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索日志..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] outline-none focus:border-[rgba(0,212,255,0.3)]"
            style={{ fontSize: "0.68rem" }}
            data-testid="log-search"
          />
        </div>
      </div>

      {/* Log entries */}
      <div
        className="space-y-0.5 overflow-y-auto pr-1"
        style={{
          maxHeight: isMobile ? "45vh" : "50vh",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,180,255,0.15) transparent",
        }}
        data-testid="log-entries"
      >
        {logs.length > 0 ? (
          logs.map((entry) => {
            const cfg = levelConfig[entry.level];
            const LevelIcon = cfg.icon;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-[rgba(0,40,80,0.12)] transition-all group"
                data-testid={`log-entry-${entry.id}`}
              >
                {/* Timestamp */}
                <span
                  className="text-[rgba(0,212,255,0.25)] shrink-0 mt-0.5"
                  style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {new Date(entry.timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  })}
                </span>

                {/* Level badge */}
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded mt-0.5"
                  style={{
                    fontSize: "0.55rem",
                    color: cfg.color,
                    backgroundColor: `${cfg.color}12`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {cfg.label}
                </span>

                {/* Source */}
                <span
                  className="text-[rgba(0,212,255,0.35)] shrink-0 mt-0.5 hidden sm:inline"
                  style={{ fontSize: "0.62rem" }}
                >
                  [{entry.source}]
                </span>

                {/* Message */}
                <span className="text-[#c0dcf0] flex-1 min-w-0" style={{ fontSize: "0.72rem" }}>
                  {entry.message}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
              暂无匹配日志
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
