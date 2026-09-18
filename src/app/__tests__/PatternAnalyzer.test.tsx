/**
 * PatternAnalyzer.test.tsx
 * =========================
 * PatternAnalyzer 组件 - 异常模式分析器测试
 *
 * 覆盖范围:
 * - 模式列表渲染
 * - 严重级别标签
 * - 忽略/选中回调
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatternAnalyzer } from "../components/PatternAnalyzer";
import type { DetectedPattern } from "../types";

const mockPatterns: DetectedPattern[] = [
  {
    id: "pat-1", type: "latency_spike", severity: "critical",
    title: "GPU-A100-03 延迟异常", description: "连续超时",
    source: "GPU-A100-03", metric: "2,450ms > 2,000ms",
    detectedAt: Date.now(), occurrences: 3, trend: "rising",
  },
  {
    id: "pat-2", type: "memory_pressure", severity: "medium",
    title: "显存压力过大", description: "89%+ 占用",
    source: "GPU-A100-03", metric: "89% > 85%",
    detectedAt: Date.now(), occurrences: 5, trend: "stable",
  },
];

describe("PatternAnalyzer", () => {
  let onDismiss: Mock;
  let onSelectPattern: Mock;

  beforeEach(() => {
    onDismiss = vi.fn();
    onSelectPattern = vi.fn();
  });

  describe("基础渲染", () => {
    it("应渲染所有模式标题", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getByText("GPU-A100-03 延迟异常")).toBeInTheDocument();
      expect(screen.getByText("显存压力过大")).toBeInTheDocument();
    });

    it("应渲染严重级别标签", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getByText("严重")).toBeInTheDocument();
      expect(screen.getByText("中")).toBeInTheDocument();
    });

    it("应渲染指标", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getByText("2,450ms > 2,000ms")).toBeInTheDocument();
    });

    it("应渲染来源", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getAllByText("GPU-A100-03").length).toBeGreaterThan(0);
    });

    it("应渲染趋势", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getByText("趋势 上升")).toBeInTheDocument();
      expect(screen.getByText("趋势 稳定")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      expect(screen.getByTestId("pattern-analyzer")).toBeInTheDocument();
    });
  });

  describe("交互", () => {
    it("点击忽略应触发 onDismiss", () => {
      render(<PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByTestId("dismiss-pat-1"));
      expect(onDismiss).toHaveBeenCalledWith("pat-1");
    });

    it("点击模式应触发 onSelectPattern", () => {
      render(
        <PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} onSelectPattern={onSelectPattern} />
      );
      fireEvent.click(screen.getByTestId("pattern-pat-2"));
      expect(onSelectPattern).toHaveBeenCalledWith("pat-2");
    });

    it("选中模式应有高亮样式", () => {
      render(
        <PatternAnalyzer patterns={mockPatterns} onDismiss={onDismiss} selectedPatternId="pat-1" />
      );
      const el = screen.getByTestId("pattern-pat-1");
      expect(el.className).toContain("border-[rgba(0,212,255,0.3)]");
    });
  });

  describe("空状态", () => {
    it("无模式时应显示正常提示", () => {
      render(<PatternAnalyzer patterns={[]} onDismiss={onDismiss} />);
      expect(screen.getByText("未检测到异常模式")).toBeInTheDocument();
    });
  });
});