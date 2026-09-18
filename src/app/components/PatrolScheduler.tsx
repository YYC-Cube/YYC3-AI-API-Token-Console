/**
 * PatrolScheduler.tsx
 * =====================
 * 巡查计划配置面板
 * 设置自动巡查间隔、开关
 */

import React from "react";
import { Clock, Timer, ToggleLeft, ToggleRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { PatrolSchedule, PatrolInterval } from "../types";

interface PatrolSchedulerProps {
  schedule: PatrolSchedule;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: PatrolInterval) => void;
}

const INTERVALS: { value: PatrolInterval; label: string }[] = [
  { value: 5,  label: "5 分钟" },
  { value: 10, label: "10 分钟" },
  { value: 15, label: "15 分钟" },
  { value: 30, label: "30 分钟" },
  { value: 60, label: "1 小时" },
];

export function PatrolScheduler({ schedule, onToggle, onIntervalChange }: PatrolSchedulerProps) {
  return (
    <GlassCard className="p-4" data-testid="patrol-scheduler">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-[#00d4ff]" />
        <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
          巡查计划配置
        </h3>
      </div>

      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>自动巡查</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>
              按设定间隔自动执行系统巡检
            </p>
          </div>
          <button
            onClick={() => onToggle(!schedule.enabled)}
            className="p-1 transition-all"
            data-testid="patrol-toggle"
          >
            {schedule.enabled ? (
              <ToggleRight className="w-8 h-8 text-[#00ff88]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-[rgba(0,212,255,0.3)]" />
            )}
          </button>
        </div>

        {/* Interval selector */}
        <div>
          <p className="text-[rgba(0,212,255,0.5)] mb-2" style={{ fontSize: "0.72rem" }}>
            巡查间隔
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((item) => (
              <button
                key={item.value}
                onClick={() => onIntervalChange(item.value)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  schedule.interval === item.value
                    ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                    : "text-[rgba(0,212,255,0.4)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)]"
                }`}
                style={{ fontSize: "0.72rem" }}
                data-testid={`interval-${item.value}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule info */}
        <div className="p-3 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div className="flex items-center gap-4 flex-wrap">
            {schedule.lastRun && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                <Clock className="w-3 h-3" />
                上次巡查: {new Date(schedule.lastRun).toLocaleString("zh-CN")}
              </span>
            )}
            {schedule.nextRun && schedule.enabled && (
              <span className="flex items-center gap-1.5 text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                <Clock className="w-3 h-3" />
                下次巡查: {new Date(schedule.nextRun).toLocaleString("zh-CN")}
              </span>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}