/**
 * FollowUpCard.tsx
 * =================
 * 告警/异常跟进卡片
 * 显示告警信息、严重级别、操作链路摘要，支持展开操作
 */

import React, { useState } from "react";
import {
  AlertTriangle, AlertCircle, Info, XCircle, ChevronDown, ChevronUp,
  Clock, User, Tag, ExternalLink,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { OperationChain } from "./OperationChain";
import { QuickActionGroup } from "./QuickActionGroup";
import type { FollowUpItem, FollowUpSeverity, FollowUpStatus } from "../types";

interface FollowUpCardProps {
  item: FollowUpItem;
  onOpenDrawer?: (item: FollowUpItem) => void;
  onQuickFix?: (item: FollowUpItem) => void;
  onMarkResolved?: (item: FollowUpItem) => void;
  compact?: boolean;
}

const severityConfig: Record<FollowUpSeverity, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  critical: {
    icon: XCircle,
    color: "#ff3366",
    bg: "rgba(255,51,102,0.06)",
    border: "rgba(255,51,102,0.25)",
    label: "严重",
  },
  error: {
    icon: AlertTriangle,
    color: "#ff6600",
    bg: "rgba(255,102,0,0.06)",
    border: "rgba(255,102,0,0.2)",
    label: "错误",
  },
  warning: {
    icon: AlertCircle,
    color: "#ffaa00",
    bg: "rgba(255,170,0,0.06)",
    border: "rgba(255,170,0,0.2)",
    label: "警告",
  },
  info: {
    icon: Info,
    color: "#00d4ff",
    bg: "rgba(0,212,255,0.04)",
    border: "rgba(0,180,255,0.15)",
    label: "信息",
  },
};

const statusLabels: Record<FollowUpStatus, { label: string; color: string }> = {
  active:        { label: "活跃", color: "#ff3366" },
  investigating: { label: "排查中", color: "#ffaa00" },
  resolved:      { label: "已解决", color: "#00ff88" },
  ignored:       { label: "已忽略", color: "rgba(0,212,255,0.3)" },
};

export function FollowUpCard({
  item,
  onOpenDrawer,
  onQuickFix,
  onMarkResolved,
  compact = false,
}: FollowUpCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sev = severityConfig[item.severity];
  const SevIcon = sev.icon;
  const st = statusLabels[item.status];

  const timeAgo = getTimeAgo(item.timestamp);

  return (
    <GlassCard
      className="overflow-hidden"
      glowColor={item.severity === "critical" ? "rgba(255,51,102,0.08)" : undefined}
    >
      {/* Severity strip */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ backgroundColor: sev.color }}
      />

      <div className={compact ? "p-3 pl-4" : "p-4 pl-5"}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
              style={{ backgroundColor: `${sev.color}15` }}
            >
              <SevIcon className="w-4 h-4" style={{ color: sev.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "0.58rem",
                    backgroundColor: `${sev.color}15`,
                    color: sev.color,
                  }}
                >
                  {sev.label}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: "0.58rem",
                    backgroundColor: `${st.color}15`,
                    color: st.color,
                  }}
                >
                  {st.label}
                </span>
              </div>
              <h4
                className="text-[#e0f0ff] mt-1 truncate"
                style={{ fontSize: "0.88rem" }}
              >
                {item.title}
              </h4>
              {item.metric && (
                <p
                  className="mt-0.5"
                  style={{ fontSize: "0.72rem", color: sev.color }}
                >
                  {item.metric}
                </p>
              )}
            </div>
          </div>

          {/* Expand / Drawer toggle */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenDrawer && (
              <button
                onClick={() => onOpenDrawer(item)}
                className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-all"
                title="打开详情面板"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-all"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
              )}
            </button>
          </div>
        </div>

        {/* Meta info row */}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="flex items-center gap-1 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
          <span className="flex items-center gap-1 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
            <Tag className="w-3 h-3" />
            {item.source}
          </span>
          {item.assignee && (
            <span className="flex items-center gap-1 text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
              <User className="w-3 h-3" />
              {item.assignee}
            </span>
          )}
          {item.chain.length > 0 && (
            <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.62rem" }}>
              {item.chain.length} 步操作链路
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-[rgba(0,40,80,0.4)] text-[rgba(0,212,255,0.45)] border border-[rgba(0,180,255,0.08)]"
                style={{ fontSize: "0.6rem" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick Actions - always visible */}
        <QuickActionGroup
          compact
          onViewDetail={onOpenDrawer ? () => onOpenDrawer(item) : undefined}
          onQuickFix={onQuickFix ? () => onQuickFix(item) : undefined}
          onMarkResolved={onMarkResolved ? () => onMarkResolved(item) : undefined}
        />

        {/* Expanded: Operation Chain */}
        {expanded && item.chain.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[rgba(0,180,255,0.08)]">
            <h5
              className="text-[rgba(0,212,255,0.5)] mb-3 flex items-center gap-1.5"
              style={{ fontSize: "0.72rem" }}
            >
              操作链路
            </h5>
            <OperationChain events={item.chain} compact />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================================
// Helpers
// ============================================================

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}
