/**
 * useAISuggestion.test.tsx
 * =========================
 * useAISuggestion Hook - AI 辅助决策状态管理测试
 *
 * 覆盖范围:
 * - 初始状态 (模式 / 推荐 / 健康度)
 * - 模式排序 (按严重级别)
 * - applyRecommendation
 * - dismissRecommendation
 * - dismissPattern
 * - getRecommendationsForPattern
 * - runAnalysis
 * - stats 统计
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAISuggestion } from "../hooks/useAISuggestion";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("useAISuggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("应有 5 个异常模式", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.patterns.length).toBe(5);
    });

    it("应有 8 个推荐操作", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.recommendations.length).toBe(8);
    });

    it("overallHealth 应为合理值 (0-100)", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.overallHealth).toBeGreaterThanOrEqual(0);
      expect(result.current.overallHealth).toBeLessThanOrEqual(100);
    });

    it("isAnalyzing 初始为 false", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.isAnalyzing).toBe(false);
    });

    it("enabledAutoSuggestion 初始为 true", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.enabledAutoSuggestion).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 模式排序
  // ----------------------------------------------------------

  describe("模式排序", () => {
    it("critical 应排在最前", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.patterns[0].severity).toBe("critical");
    });

    it("low 应排在最后", () => {
      const { result } = renderHook(() => useAISuggestion());
      const last = result.current.patterns[result.current.patterns.length - 1];
      expect(last.severity).toBe("low");
    });
  });

  // ----------------------------------------------------------
  // 统计
  // ----------------------------------------------------------

  describe("stats", () => {
    it("应有正确的模式统计", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.stats.totalPatterns).toBe(5);
      expect(result.current.stats.criticalCount).toBe(1);
      expect(result.current.stats.highCount).toBe(1);
    });

    it("totalRecommendations 应为未应用数", () => {
      const { result } = renderHook(() => useAISuggestion());
      expect(result.current.stats.totalRecommendations).toBe(8);
      expect(result.current.stats.appliedCount).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 关联查询
  // ----------------------------------------------------------

  describe("getRecommendationsForPattern", () => {
    it("应返回关联的推荐", () => {
      const { result } = renderHook(() => useAISuggestion());
      const recs = result.current.getRecommendationsForPattern("pat-1");
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.every((r) => r.patternId === "pat-1")).toBe(true);
    });

    it("不存在的 pattern 应返回空", () => {
      const { result } = renderHook(() => useAISuggestion());
      const recs = result.current.getRecommendationsForPattern("nonexistent");
      expect(recs.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 操作
  // ----------------------------------------------------------

  describe("applyRecommendation", () => {
    it("应用后 applied 应为 true", async () => {
      const { result } = renderHook(() => useAISuggestion());
      const recId = result.current.recommendations[0].id;

      await act(async () => {
        await result.current.applyRecommendation(recId);
      });

      const updated = result.current.recommendations.find((r) => r.id === recId);
      expect(updated?.applied).toBe(true);
    });

    it("应用后 appliedCount 应增加", async () => {
      const { result } = renderHook(() => useAISuggestion());
      const before = result.current.stats.appliedCount;

      await act(async () => {
        await result.current.applyRecommendation(result.current.recommendations[0].id);
      });

      expect(result.current.stats.appliedCount).toBe(before + 1);
    });
  });

  describe("dismissRecommendation", () => {
    it("忽略后应移除推荐", () => {
      const { result } = renderHook(() => useAISuggestion());
      const recId = result.current.recommendations[0].id;
      const before = result.current.recommendations.length;

      act(() => {
        result.current.dismissRecommendation(recId);
      });

      expect(result.current.recommendations.length).toBe(before - 1);
      expect(result.current.recommendations.find((r) => r.id === recId)).toBeUndefined();
    });
  });

  describe("dismissPattern", () => {
    it("忽略模式后应移除模式和关联推荐", () => {
      const { result } = renderHook(() => useAISuggestion());
      const patId = "pat-1";
      const relatedRecsBefore = result.current.recommendations.filter((r) => r.patternId === patId).length;

      act(() => {
        result.current.dismissPattern(patId);
      });

      expect(result.current.patterns.find((p) => p.id === patId)).toBeUndefined();
      expect(result.current.recommendations.filter((r) => r.patternId === patId).length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // runAnalysis
  // ----------------------------------------------------------

  describe("runAnalysis", () => {
    it("执行后 lastAnalyzedAt 应更新", async () => {
      const { result } = renderHook(() => useAISuggestion());
      const before = result.current.lastAnalyzedAt;

      await act(async () => {
        await result.current.runAnalysis();
      });

      expect(result.current.lastAnalyzedAt).toBeGreaterThan(before);
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 开关
  // ----------------------------------------------------------

  describe("enabledAutoSuggestion", () => {
    it("切换自动建议开关", () => {
      const { result } = renderHook(() => useAISuggestion());
      act(() => {
        result.current.setEnabledAutoSuggestion(false);
      });
      expect(result.current.enabledAutoSuggestion).toBe(false);
    });
  });
});
