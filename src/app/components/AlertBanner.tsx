/**
 * AlertBanner.tsx
 * ================
 * Dashboard 内嵌告警横幅 · 快速跳转到一键跟进系统
 * 显示活跃告警计数、最新严重告警摘要、一键跳转按钮
 */

import React from "react";
import { useNavigate } from "react-router";
import {
  Bell, AlertTriangle, XCircle, ChevronRight, Shield,
} from "lucide-react";

// Mock alert summary (matches useFollowUp data)
const ALERT_SUMMARY = {
  total: 5,
  critical: 1,
  error: 1,
  warning: 2,
  latestTitle: "GPU-A100-03 推理延迟异常",
  latestSource: "GPU-A100-03",
  latestMetric: "2,450ms > 2,000ms",
};

interface AlertBannerProps {
  compact?: boolean;
}

export function AlertBanner({ compact = false }: AlertBannerProps) {
  const navigate = useNavigate();

  const hasCritical = ALERT_SUMMARY.critical > 0;
  const hasWarnings = ALERT_SUMMARY.warning > 0 || ALERT_SUMMARY.error > 0;

  return (
    <div
      data-testid="alert-banner"
      onClick={() => navigate("/follow-up")}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer
        transition-all duration-300 group
        ${hasCritical
          ? "bg-[rgba(255,51,102,0.04)] border border-[rgba(255,51,102,0.2)] hover:border-[rgba(255,51,102,0.4)] hover:shadow-[0_0_25px_rgba(255,51,102,0.08)]"
          : hasWarnings
          ? "bg-[rgba(255,170,0,0.04)] border border-[rgba(255,170,0,0.15)] hover:border-[rgba(255,170,0,0.3)]"
          : "bg-[rgba(0,212,255,0.03)] border border-[rgba(0,180,255,0.1)] hover:border-[rgba(0,180,255,0.25)]"
        }
      `}
    >
      {/* Severity strip on left */}
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: hasCritical ? "#ff3366" : hasWarnings ? "#ffaa00" : "#00d4ff" }}
      />

      <div className={`flex items-center gap-3 ${compact ? "px-3 py-2 pl-4" : "px-4 py-3 pl-5"}`}>
        {/* Icon */}
        <div
          className={`shrink-0 rounded-lg flex items-center justify-center ${compact ? "w-8 h-8" : "w-9 h-9"}`}
          style={{ backgroundColor: hasCritical ? "rgba(255,51,102,0.1)" : "rgba(255,170,0,0.1)" }}
        >
          {hasCritical ? (
            <XCircle className="w-4 h-4 text-[#ff3366]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#ffaa00]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
              {ALERT_SUMMARY.latestTitle}
            </span>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                fontSize: "0.58rem",
                backgroundColor: "rgba(255,51,102,0.12)",
                color: "#ff3366",
              }}
            >
              {ALERT_SUMMARY.latestMetric}
            </span>
          </div>
          {!compact && (
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>
                {ALERT_SUMMARY.total} 条告警
              </span>
              {ALERT_SUMMARY.critical > 0 && (
                <span className="text-[#ff3366]" style={{ fontSize: "0.62rem" }}>
                  {ALERT_SUMMARY.critical} 严重
                </span>
              )}
              {ALERT_SUMMARY.error > 0 && (
                <span className="text-[#ff6600]" style={{ fontSize: "0.62rem" }}>
                  {ALERT_SUMMARY.error} 错误
                </span>
              )}
              {ALERT_SUMMARY.warning > 0 && (
                <span className="text-[#ffaa00]" style={{ fontSize: "0.62rem" }}>
                  {ALERT_SUMMARY.warning} 警告
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="hidden sm:inline text-[rgba(0,212,255,0.5)] group-hover:text-[#00d4ff] transition-colors"
            style={{ fontSize: "0.72rem" }}
          >
            一键跟进
          </span>
          <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.4)] group-hover:text-[#00d4ff] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}
