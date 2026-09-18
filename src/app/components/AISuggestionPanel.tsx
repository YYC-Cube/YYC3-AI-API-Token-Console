/**
 * AISuggestionPanel.tsx
 * ======================
 * AI 辅助决策主面板 · 路由: /ai
 *
 * 功能:
 * - Tab 1: AI 分析 (异常模式 + 推荐操作) — 原有功能
 * - Tab 2: AI 对话 (SDKChatPanel) — 新增
 *
 * i18n 已迁移
 */

import React, { useState, useContext } from "react";
import {
  Bot, RefreshCw, Activity, AlertTriangle,
  CheckCircle, Loader2, ToggleLeft, ToggleRight,
  MessageSquare,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { PatternAnalyzer } from "./PatternAnalyzer";
import { ActionRecommender } from "./ActionRecommender";
import { SDKChatPanel } from "./SDKChatPanel";
import { useAISuggestion } from "../hooks/useAISuggestion";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

type AITab = "analysis" | "chat";

export function AISuggestionPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    patterns,
    recommendations,
    overallHealth,
    isAnalyzing,
    lastAnalyzedAt,
    enabledAutoSuggestion,
    setEnabledAutoSuggestion,
    stats,
    runAnalysis,
    applyRecommendation,
    dismissRecommendation,
    dismissPattern,
    getRecommendationsForPattern,
  } = useAISuggestion();

  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AITab>("analysis");

  const handleApply = async (recId: string) => {
    setApplyingId(recId);
    await applyRecommendation(recId);
    setApplyingId(null);
  };

  const displayedRecs = selectedPatternId
    ? getRecommendationsForPattern(selectedPatternId)
    : recommendations;

  const healthColor =
    overallHealth >= 80 ? "#00ff88" :
    overallHealth >= 60 ? "#ffaa00" :
    overallHealth >= 40 ? "#ff6600" : "#ff0044";

  function formatTimeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("common.justNow");
    if (min < 60) return t("common.minutesAgo", { n: min });
    return t("common.hoursAgo", { n: Math.floor(min / 60) });
  }

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("ai.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("ai.subtitle")}
            </p>
          </div>
        </div>

        {/* Tab 切换 + 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* Tab 按钮 */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.15)" }}>
            <button
              onClick={() => setActiveTab("analysis")}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={{
                fontSize: "0.72rem",
                background: activeTab === "analysis" ? "rgba(0,212,255,0.12)" : "transparent",
                color: activeTab === "analysis" ? "#00d4ff" : "rgba(0,212,255,0.4)",
              }}
              data-testid="tab-analysis"
            >
              <Activity className="w-3.5 h-3.5" />
              {t("sdk.analysisTab")}
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={{
                fontSize: "0.72rem",
                background: activeTab === "chat" ? "rgba(0,212,255,0.12)" : "transparent",
                color: activeTab === "chat" ? "#00d4ff" : "rgba(0,212,255,0.4)",
                borderLeft: "1px solid rgba(0,212,255,0.15)",
              }}
              data-testid="tab-chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t("sdk.chatTab")}
            </button>
          </div>

          {/* 分析 Tab 的操作按钮 */}
          {activeTab === "analysis" && (
            <>
              <button
                onClick={() => setEnabledAutoSuggestion(!enabledAutoSuggestion)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                style={{ fontSize: "0.68rem" }}
                data-testid="toggle-auto"
              >
                {enabledAutoSuggestion ? (
                  <ToggleRight className="w-4 h-4 text-[#00ff88]" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {t("ai.autoAnalysis")}
              </button>

              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all disabled:opacity-40"
                style={{ fontSize: "0.72rem" }}
                data-testid="run-analysis"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {isAnalyzing ? t("ai.analyzing") : t("ai.reAnalyze")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======== Tab: Analysis ======== */}
      {activeTab === "analysis" && (
        <>
          {/* Health + Stats */}
          <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-2">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke="rgba(0,180,255,0.08)" strokeWidth="4"
                  />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke={healthColor} strokeWidth="4"
                    strokeDasharray={`${overallHealth * 1.76} 176`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontSize: "1rem", color: healthColor, fontFamily: "'Orbitron', monospace" }}>
                    {overallHealth}
                  </span>
                </div>
              </div>
              <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                {t("ai.systemHealth")}
              </p>
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#ffaa00] mb-2" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "1.2rem", fontFamily: "'Orbitron', monospace" }}>
                {stats.totalPatterns}
              </span>
              <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                {t("ai.anomalyPatterns")}
              </p>
              {stats.criticalCount > 0 && (
                <span className="text-[#ff0044] mt-0.5" style={{ fontSize: "0.58rem" }}>
                  {stats.criticalCount} {t("ai.severity.critical")}
                </span>
              )}
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#00ff88] mb-2" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "1.2rem", fontFamily: "'Orbitron', monospace" }}>
                {stats.pendingRecs}
              </span>
              <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                {t("ai.pendingSuggestions")}
              </p>
              {stats.appliedRecs > 0 && (
                <span className="text-[#00ff88] mt-0.5" style={{ fontSize: "0.58rem" }}>
                  {stats.appliedRecs} {t("ai.applied")}
                </span>
              )}
            </GlassCard>

            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <Activity className="w-6 h-6 text-[#00d4ff] mb-2" />
              <span className="text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                {lastAnalyzedAt ? formatTimeAgo(lastAnalyzedAt) : "--"}
              </span>
              <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>
                {t("ai.lastAnalysis")}
              </p>
            </GlassCard>
          </div>

          {/* Pattern + Recommendations */}
          <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <PatternAnalyzer
              patterns={patterns}
              selectedPatternId={selectedPatternId}
              onSelectPattern={(id) => setSelectedPatternId(id === selectedPatternId ? null : id)}
              onDismiss={dismissPattern}
            />
            <ActionRecommender
              recommendations={displayedRecs}
              isApplying={applyingId}
              onApply={handleApply}
              onDismiss={dismissRecommendation}
            />
          </div>
        </>
      )}

      {/* ======== Tab: Chat ======== */}
      {activeTab === "chat" && (
        <SDKChatPanel />
      )}
    </div>
  );
}