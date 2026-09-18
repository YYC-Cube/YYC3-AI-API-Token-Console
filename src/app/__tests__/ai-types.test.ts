/**
 * ai-types.test.ts
 * ==================
 * AI 辅助决策 + 命令面板 类型定义验证
 *
 * 覆盖范围:
 * - AnomalyPatternType / PatternSeverity
 * - DetectedPattern / AIRecommendation / AIAnalysisResult
 * - CommandPaletteItem
 */

import { describe, it, expect } from "vitest";
import type {
  AnomalyPatternType,
  PatternSeverity,
  DetectedPattern,
  AIRecommendation,
  AIAnalysisResult,
  CommandPaletteItem,
} from "../types";

describe("AI 辅助决策类型定义 (第 15 类)", () => {
  it("AnomalyPatternType 应支持 6 种模式", () => {
    const types: AnomalyPatternType[] = [
      "latency_spike", "memory_pressure", "gpu_overheat",
      "throughput_drop", "error_burst", "storage_near_full",
    ];
    expect(types.length).toBe(6);
  });

  it("PatternSeverity 应支持 4 种级别", () => {
    const sevs: PatternSeverity[] = ["low", "medium", "high", "critical"];
    expect(sevs.length).toBe(4);
  });

  it("DetectedPattern 应有完整字段", () => {
    const p: DetectedPattern = {
      id: "pat-1",
      type: "latency_spike",
      severity: "high",
      title: "延迟异常",
      description: "连续超时",
      source: "GPU-A100-03",
      metric: "2,450ms",
      detectedAt: Date.now(),
      occurrences: 3,
      trend: "rising",
    };
    expect(p.trend).toBe("rising");
  });

  it("AIRecommendation 应有完整字段", () => {
    const r: AIRecommendation = {
      id: "rec-1",
      patternId: "pat-1",
      action: "迁移模型",
      description: "负载降低",
      impact: "high",
      confidence: 92,
      autoExecutable: true,
      applied: false,
    };
    expect(r.confidence).toBe(92);
  });

  it("AIAnalysisResult 应有完整字段", () => {
    const result: AIAnalysisResult = {
      patterns: [],
      recommendations: [],
      overallHealth: 85,
      analysisTime: 2500,
      lastAnalyzedAt: Date.now(),
    };
    expect(result.overallHealth).toBe(85);
  });
});

describe("命令面板类型定义 (第 16 类)", () => {
  it("CommandPaletteItem 应有完整字段", () => {
    const item: CommandPaletteItem = {
      id: "nav-1",
      label: "数据监控",
      description: "实时面板",
      category: "导航",
      icon: "Activity",
      shortcut: "⌘K",
      action: () => {},
    };
    expect(item.shortcut).toBe("⌘K");
  });

  it("CommandPaletteItem 可选字段", () => {
    const item: CommandPaletteItem = {
      id: "nav-2",
      label: "设置",
      category: "导航",
      action: () => {},
    };
    expect(item.description).toBeUndefined();
    expect(item.icon).toBeUndefined();
  });
});
