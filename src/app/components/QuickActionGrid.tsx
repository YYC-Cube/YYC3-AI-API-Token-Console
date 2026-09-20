/**
 * QuickActionGrid.tsx
 * ====================
 * 快速操作网格 · 操作中心核心组件
 */

import React, { useState } from "react";
import {
  RotateCw, Upload, Trash2, Download, FileText, RefreshCw,
  ArrowRightLeft, Pause, Play, HeartPulse, HardDrive, Terminal,
  Loader2, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import type { OperationItem, OperationStatus } from "../types";

const iconMap: Record<string, React.ElementType> = {
  RotateCw, Upload, Trash2, Download, FileText, RefreshCw,
  ArrowRightLeft, Pause, Play, HeartPulse, HardDrive, Terminal,
};

const statusIcon: Record<OperationStatus, React.ElementType | null> = {
  pending: null,
  running: Loader2,
  success: CheckCircle,
  failed: XCircle,
  cancelled: null,
};

const statusColor: Record<OperationStatus, string> = {
  pending: "rgba(0,212,255,0.5)",
  running: "#00d4ff",
  success: "#00ff88",
  failed: "#ff3366",
  cancelled: "rgba(0,212,255,0.3)",
};

interface QuickActionGridProps {
  actions: OperationItem[];
  isExecuting: string | null;
  onExecute: (actionId: string) => void;
  isMobile?: boolean;
}

export function QuickActionGrid({ actions, isExecuting, onExecute, isMobile = false }: QuickActionGridProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleClick = (action: OperationItem) => {
    if (action.status === "running") return;
    if (action.dangerous && confirmId !== action.id) {
      setConfirmId(action.id);
      return;
    }
    setConfirmId(null);
    onExecute(action.id);
  };

  return (
    <div
      className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-4"}`}
      data-testid="quick-action-grid"
    >
      {actions.map((action) => {
        const Icon = iconMap[action.icon] ?? Terminal;
        const StIcon = statusIcon[action.status];
        const isRunning = action.status === "running";
        const isConfirming = confirmId === action.id;

        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={isRunning}
            className={`relative p-3 rounded-xl text-left transition-all group ${
              isRunning
                ? "bg-[rgba(0,212,255,0.04)] border border-[rgba(0,180,255,0.1)] cursor-wait"
                : isConfirming
                ? "bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.25)] hover:border-[rgba(255,51,102,0.4)]"
                : "bg-[rgba(8,25,55,0.7)] border border-[rgba(0,180,255,0.1)] hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,40,80,0.2)]"
            }`}
            data-testid={`action-${action.id}`}
          >
            {/* Danger warning badge */}
            {action.dangerous && !isConfirming && (
              <div className="absolute top-1.5 right-1.5">
                <AlertTriangle className="w-3 h-3 text-[#ffaa00] opacity-50" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${statusColor[action.status]}12` }}
              >
                {isRunning ? (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: statusColor[action.status] }}
                  />
                ) : StIcon ? (
                  <StIcon className="w-4 h-4" style={{ color: statusColor[action.status] }} />
                ) : (
                  <Icon className="w-4 h-4" style={{ color: statusColor[action.status] }} />
                )}
              </div>
            </div>

            <p
              className="text-[#e0f0ff] mb-0.5 truncate"
              style={{ fontSize: "0.78rem" }}
            >
              {isConfirming ? `确认 ${action.label}？` : action.label}
            </p>
            <p
              className="text-[rgba(0,212,255,0.35)] truncate"
              style={{ fontSize: "0.65rem" }}
            >
              {isConfirming ? "再次点击执行" : action.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
