/**
 * QuickActionGroup.tsx
 * =====================
 * 一键操作按钮组
 * 根据告警上下文显示快速操作按钮
 */

import React, { useState } from "react";
import {
  Eye, History, Link2, Wrench, CheckCircle,
  Loader2,
} from "lucide-react";

interface ActionDef {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: "default" | "primary" | "warning" | "danger" | "success";
  onClick: () => void;
}

interface QuickActionGroupProps {
  actions?: ActionDef[];
  onViewDetail?: () => void;
  onViewHistory?: () => void;
  onViewRelated?: () => void;
  onQuickFix?: () => void;
  onMarkResolved?: () => void;
  compact?: boolean;
}

const variantStyles: Record<string, string> = {
  default:
    "bg-[rgba(0,40,80,0.3)] border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.7)] hover:border-[rgba(0,212,255,0.35)] hover:text-[#00d4ff] hover:bg-[rgba(0,40,80,0.5)]",
  primary:
    "bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.18)] hover:border-[rgba(0,212,255,0.4)] hover:shadow-[0_0_12px_rgba(0,180,255,0.15)]",
  warning:
    "bg-[rgba(255,170,0,0.08)] border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.15)] hover:border-[rgba(255,170,0,0.35)]",
  danger:
    "bg-[rgba(255,51,102,0.08)] border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)] hover:border-[rgba(255,51,102,0.35)]",
  success:
    "bg-[rgba(0,255,136,0.08)] border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] hover:border-[rgba(0,255,136,0.35)]",
};

export function QuickActionGroup({
  actions,
  onViewDetail,
  onViewHistory,
  onViewRelated,
  onQuickFix,
  onMarkResolved,
  compact = false,
}: QuickActionGroupProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Default actions if none provided
  const defaultActions: ActionDef[] = [
    { id: "detail",   label: "查看详情", icon: Eye,         variant: "default",  onClick: onViewDetail ?? (() => {}) },
    { id: "history",  label: "查看历史", icon: History,      variant: "default",  onClick: onViewHistory ?? (() => {}) },
    { id: "related",  label: "查看关联", icon: Link2,        variant: "default",  onClick: onViewRelated ?? (() => {}) },
    { id: "fix",      label: "一键修复", icon: Wrench,       variant: "primary",  onClick: onQuickFix ?? (() => {}) },
    { id: "resolve",  label: "标记解决", icon: CheckCircle,  variant: "success",  onClick: onMarkResolved ?? (() => {}) },
  ];

  const finalActions = actions ?? defaultActions;

  const handleClick = async (action: ActionDef) => {
    setLoadingId(action.id);
    // Simulate async action
    await new Promise((r) => setTimeout(r, 600));
    action.onClick();
    setLoadingId(null);
  };

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
      {finalActions.map((action) => {
        const Icon = action.icon;
        const isLoading = loadingId === action.id;
        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={isLoading}
            className={`
              flex items-center gap-1.5 rounded-lg border transition-all duration-200
              ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}
              ${variantStyles[action.variant]}
              disabled:opacity-50 disabled:cursor-wait
            `}
            style={{ fontSize: compact ? "0.68rem" : "0.75rem" }}
          >
            {isLoading ? (
              <Loader2 className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} animate-spin`} />
            ) : (
              <Icon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
