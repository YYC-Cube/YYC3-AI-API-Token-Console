/**
 * service-test/results-view.tsx — 测试结果卡片（批7 拆分）
 * ========================================================
 * 单条 TestResult 的展开式结果卡: 头部状态行 + 步骤明细 + 修复建议。
 */
import { AlertTriangle, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { GlassCard } from "../GlassCard";
import { STATUS_META } from "./types";
import type { TestResult } from "./types";

export function ResultCard({ result: r, expanded, onToggle }: {
  result: TestResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusMeta = STATUS_META[r.overallStatus];
  const OverallIcon = statusMeta.icon;
  const CategoryIcon = r.icon || Globe;
  const isRunning = r.overallStatus === "running";

  return (
    <GlassCard className="overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${r.color}15` }}
        >
          <CategoryIcon className="w-4 h-4" style={{ color: r.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.82rem" }}>
              {r.name}
            </span>
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ fontSize: "0.55rem", color: r.category === "ai" ? "#00d4ff" : r.category === "db" ? "#336791" : "#7b2ff7", backgroundColor: r.category === "ai" ? "rgba(0,212,255,0.06)" : r.category === "db" ? "rgba(51,103,145,0.1)" : "rgba(123,47,247,0.08)" }}
            >
              {r.category === "ai" ? "AI" : r.category === "db" ? "DB" : r.category === "websocket" ? "WS" : "NET"}
            </span>
          </div>
          {r.completedAt && (
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.58rem" }}>
              耗时 {r.completedAt - (r.startedAt || r.completedAt)}ms · {new Date(r.completedAt).toLocaleTimeString("zh-CN")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <OverallIcon
            className={`w-4.5 h-4.5 ${isRunning ? "animate-spin" : ""}`}
            style={{ color: statusMeta.color }}
          />
          <span style={{ color: statusMeta.color, fontSize: "0.72rem" }}>
            {statusMeta.label}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[rgba(0,180,255,0.06)]">
          {/* Steps */}
          <div className="mt-3 space-y-1.5">
            {r.steps.map((step, i) => {
              const sm = STATUS_META[step.status];
              const StepIcon = sm.icon;
              return (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(0,20,40,0.3)]">
                  <StepIcon
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${step.status === "running" ? "animate-spin" : ""}`}
                    style={{ color: sm.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                        {step.label}
                      </span>
                      {step.latencyMs !== undefined && (
                        <span className="text-[rgba(0,212,255,0.25)] font-mono" style={{ fontSize: "0.58rem" }}>
                          {step.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <p className="text-[rgba(224,240,255,0.45)] mt-0.5 whitespace-pre-wrap" style={{ fontSize: "0.65rem" }}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggestion */}
          {r.suggestion && (
            <div className="mt-3 p-3 rounded-xl bg-[rgba(255,170,0,0.05)] border border-[rgba(255,170,0,0.15)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#ffaa00]" />
                <span className="text-[#ffaa00]" style={{ fontSize: "0.7rem" }}>建议</span>
              </div>
              <p className="text-[rgba(224,240,255,0.5)] whitespace-pre-wrap" style={{ fontSize: "0.65rem" }}>
                {r.suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
