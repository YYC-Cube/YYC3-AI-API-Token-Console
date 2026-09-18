/**
 * ActionRecommender.tsx
 * ======================
 * 操作推荐引擎 · 展示 AI 推荐操作列表
 */

import React from "react";
import {
  CheckCircle, XCircle, Zap, Bot, ArrowRight,
  Shield, Loader2,
} from "lucide-react";
import type { AIRecommendation } from "../types";

const impactConfig: Record<string, { color: string; label: string }> = {
  high:   { color: "#00ff88", label: "高影响" },
  medium: { color: "#ffaa00", label: "中影响" },
  low:    { color: "#00d4ff", label: "低影响" },
};

interface ActionRecommenderProps {
  recommendations: AIRecommendation[];
  onApply: (recId: string) => void;
  onDismiss: (recId: string) => void;
  isApplying?: string | null;
}

export function ActionRecommender({
  recommendations, onApply, onDismiss, isApplying,
}: ActionRecommenderProps) {
  const pending = recommendations.filter((r) => !r.applied);
  const applied = recommendations.filter((r) => r.applied);

  return (
    <div className="space-y-2" data-testid="action-recommender">
      {/* Pending recommendations */}
      {pending.length > 0 ? (
        pending.map((rec) => {
          const imp = impactConfig[rec.impact];
          const applying = isApplying === rec.id;

          return (
            <div
              key={rec.id}
              className="p-3 rounded-xl bg-[rgba(0,40,80,0.08)] border border-[rgba(0,180,255,0.06)] hover:bg-[rgba(0,40,80,0.14)] transition-all"
              data-testid={`rec-${rec.id}`}
            >
              {/* Action line */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00ff88] shrink-0 mt-0.5" />
                  <span className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                    {rec.action}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[rgba(0,212,255,0.4)] ml-5.5 mb-2" style={{ fontSize: "0.7rem" }}>
                {rec.description}
              </p>

              {/* Meta + Actions row */}
              <div className="flex items-center justify-between ml-5.5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {/* Impact */}
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{ fontSize: "0.58rem", color: imp.color, backgroundColor: `${imp.color}15` }}
                  >
                    {imp.label}
                  </span>
                  {/* Confidence */}
                  <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                    置信度 {rec.confidence}%
                  </span>
                  {/* Auto-executable */}
                  {rec.autoExecutable && (
                    <span className="flex items-center gap-0.5 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>
                      <Zap className="w-2.5 h-2.5" />
                      可自动执行
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onApply(rec.id)}
                    disabled={applying}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-all disabled:opacity-40"
                    style={{ fontSize: "0.65rem" }}
                    data-testid={`apply-${rec.id}`}
                  >
                    {applying ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3 h-3" />
                    )}
                    {applying ? "执行中" : "应用"}
                  </button>
                  <button
                    onClick={() => onDismiss(rec.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[rgba(0,212,255,0.3)] hover:text-[rgba(0,212,255,0.6)] hover:bg-[rgba(0,212,255,0.04)] transition-all"
                    style={{ fontSize: "0.65rem" }}
                    data-testid={`dismiss-rec-${rec.id}`}
                  >
                    忽略
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-6">
          <Bot className="w-8 h-8 text-[rgba(0,212,255,0.15)] mx-auto mb-2" />
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
            暂无待处理建议
          </p>
        </div>
      )}

      {/* Applied recommendations */}
      {applied.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,180,255,0.06)]">
          <p className="text-[rgba(0,212,255,0.25)] mb-2" style={{ fontSize: "0.65rem" }}>
            已应用 ({applied.length})
          </p>
          <div className="space-y-1">
            {applied.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-2 p-2 rounded-lg opacity-50"
                data-testid={`applied-${rec.id}`}
              >
                <Shield className="w-3 h-3 text-[#00ff88] shrink-0" />
                <span className="text-[rgba(0,212,255,0.4)] line-through" style={{ fontSize: "0.7rem" }}>
                  {rec.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
