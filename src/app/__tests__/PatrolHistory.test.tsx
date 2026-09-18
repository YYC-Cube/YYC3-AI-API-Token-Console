/**
 * PatrolHistory.test.tsx
 * =======================
 * PatrolHistory 组件 - 巡查历史记录测试
 *
 * 覆盖范围:
 * - 历史记录列表渲染
 * - 时间范围筛选
 * - 查看报告回调
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatrolHistory } from "../components/PatrolHistory";
import type { PatrolResult } from "../types";

function makeResult(offset: number, triggeredBy: "manual" | "auto" | "scheduled" = "auto"): PatrolResult {
  const ts = Date.now() - offset;
  return {
    id: `patrol-${ts}`,
    timestamp: ts,
    duration: 10,
    status: "completed",
    healthScore: 95,
    totalChecks: 20,
    passCount: 18,
    warningCount: 2,
    criticalCount: 0,
    skippedCount: 0,
    checks: [],
    triggeredBy,
  };
}

const mockHistory: PatrolResult[] = [
  makeResult(30 * 60 * 1000, "auto"),
  makeResult(60 * 60 * 1000, "manual"),
  makeResult(2 * 60 * 60 * 1000, "scheduled"),
  makeResult(6 * 60 * 60 * 1000, "auto"),
  makeResult(25 * 60 * 60 * 1000, "auto"),
  makeResult(3 * 24 * 60 * 60 * 1000, "scheduled"),
];

describe("PatrolHistory", () => {
  let onViewReport: Mock;

  beforeEach(() => {
    onViewReport = vi.fn();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染巡查历史标题", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      expect(screen.getByText("巡查历史")).toBeInTheDocument();
    });

    it("应渲染时间范围筛选按钮", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      expect(screen.getByText("最近")).toBeInTheDocument();
      expect(screen.getByText("每日")).toBeInTheDocument();
      expect(screen.getByText("每周")).toBeInTheDocument();
      expect(screen.getByText("自定义范围")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      expect(screen.getByTestId("patrol-history")).toBeInTheDocument();
    });

    it("默认应显示最近 10 条（或全部不足 10 条时）", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      const items = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("data-testid")?.startsWith("history-")
      );
      expect(items.length).toBe(mockHistory.length); // all 6 shown since < 10
    });
  });

  // ----------------------------------------------------------
  // 时间范围筛选
  // ----------------------------------------------------------

  describe("时间范围筛选", () => {
    it("切换到每日应只显示 24h 内记录", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      fireEvent.click(screen.getByTestId("range-daily"));
      const items = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("data-testid")?.startsWith("history-")
      );
      // 30min, 60min, 2h, 6h are within 24h
      expect(items.length).toBe(4);
    });

    it("切换到每周应显示 7 天内记录", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      fireEvent.click(screen.getByTestId("range-weekly"));
      const items = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("data-testid")?.startsWith("history-")
      );
      // 30min, 60min, 2h, 6h, 25h are within 7 days
      expect(items.length).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // 查看报告回调
  // ----------------------------------------------------------

  describe("查看报告", () => {
    it("点击历史项应触发 onViewReport", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      const items = screen.getAllByRole("button").filter((b) =>
        b.getAttribute("data-testid")?.startsWith("history-")
      );
      fireEvent.click(items[0]);
      expect(onViewReport).toHaveBeenCalledTimes(1);
      expect(onViewReport).toHaveBeenCalledWith(mockHistory[0]);
    });
  });

  // ----------------------------------------------------------
  // 空状态
  // ----------------------------------------------------------

  describe("空状态", () => {
    it("无历史数据时应显示空提示", () => {
      render(<PatrolHistory history={[]} onViewReport={onViewReport} />);
      expect(screen.getByText("当前范围内没有巡查记录")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 健康分数颜色
  // ----------------------------------------------------------

  describe("健康分数颜色", () => {
    it("高分 (>90) 应渲染健康度分数", () => {
      render(<PatrolHistory history={mockHistory} onViewReport={onViewReport} />);
      const scoreElements = screen.getAllByText("95");
      expect(scoreElements.length).toBeGreaterThan(0);
    });
  });
});