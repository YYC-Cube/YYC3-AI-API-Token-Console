/**
 * OperationChain.tsx
 * ===================
 * 时间线式操作链路展示
 * 展示告警/异常的完整操作链路，当前事件高亮
 */

import React from "react";
import {
  Cpu, Play, AlertTriangle, Zap, Wrench, CheckCircle, Server,
} from "lucide-react";
import type { ChainEvent, ChainEventType } from "../types";

interface OperationChainProps {
  events: ChainEvent[];
  compact?: boolean;
}

const eventConfig: Record<ChainEventType, { icon: typeof Cpu; color: string; label: string }> = {
  model_load:     { icon: Cpu,           color: "#00d4ff", label: "模型加载" },
  task_start:     { icon: Play,          color: "#00ff88", label: "任务启动" },
  alert_trigger:  { icon: AlertTriangle, color: "#ff3366", label: "告警触发" },
  auto_action:    { icon: Zap,           color: "#ffdd00", label: "自动操作" },
  manual_action:  { icon: Wrench,        color: "#aa55ff", label: "手动操作" },
  resolved:       { icon: CheckCircle,   color: "#00ff88", label: "已解决" },
  system_event:   { icon: Server,        color: "#00d4ff", label: "系统事件" },
};

export function OperationChain({ events, compact = false }: OperationChainProps) {
  if (!events.length) {
    return (
      <div className="text-center py-4">
        <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.75rem" }}>
          暂无操作链路数据
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event, idx) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex items-start gap-3">
            {/* Vertical line */}
            {!isLast && (
              <div
                className="absolute left-[13px] top-[28px] w-[2px]"
                style={{
                  height: compact ? "24px" : "32px",
                  background: event.isCurrent
                    ? `linear-gradient(180deg, ${config.color}, rgba(0,180,255,0.15))`
                    : "rgba(0,180,255,0.1)",
                }}
              />
            )}

            {/* Node dot */}
            <div
              className={`
                relative shrink-0 w-[28px] h-[28px] rounded-full flex items-center justify-center
                ${event.isCurrent
                  ? "ring-2 ring-offset-1 ring-offset-[#060e1f]"
                  : ""
                }
              `}
              style={{
                backgroundColor: `${config.color}18`,
                borderColor: event.isCurrent ? config.color : "transparent",
                ...(event.isCurrent
                  ? ({ "--tw-ring-color": config.color } as React.CSSProperties)
                  : {}),
              }}
            >
              <Icon
                className="w-3.5 h-3.5"
                style={{ color: event.isCurrent ? config.color : `${config.color}99` }}
              />
              {event.isCurrent && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: config.color }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${compact ? "pb-3" : "pb-4"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[rgba(0,212,255,0.5)] shrink-0"
                  style={{ fontSize: "0.68rem", fontFamily: "'Rajdhani', monospace" }}
                >
                  {event.time}
                </span>
                <span
                  className={event.isCurrent ? "text-[#e0f0ff]" : "text-[#c0dcf0]"}
                  style={{ fontSize: "0.78rem" }}
                >
                  {event.label}
                </span>
                {event.isCurrent && (
                  <span
                    className="px-1.5 py-0.5 rounded bg-[rgba(255,51,102,0.15)] text-[#ff3366] shrink-0"
                    style={{ fontSize: "0.58rem" }}
                  >
                    当前
                  </span>
                )}
              </div>
              <p
                className="text-[rgba(0,212,255,0.35)] mt-0.5 truncate"
                style={{ fontSize: "0.7rem" }}
              >
                {event.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
