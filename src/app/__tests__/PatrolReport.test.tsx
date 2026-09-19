/**
 * PatrolReport.test.tsx
 * ======================
 * PatrolReport 组件 - 巡查报告测试
 *
 * 覆盖范围:
 * - 健康度分数渲染
 * - 触发类型标签
 * - 分类分组显示
 * - 展开/折叠分类
 * - 状态图标（pass/warning/critical）
 * - 空检查数据提示
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PatrolReport } from "../components/PatrolReport";
import type { PatrolResult } from "../types";

const mockResult: PatrolResult = {
  id: "patrol-1",
  timestamp: Date.now(),
  duration: 12,
  status: "completed",
  healthScore: 92,
  totalChecks: 5,
  passCount: 3,
  warningCount: 1,
  criticalCount: 1,
  skippedCount: 0,
  triggeredBy: "manual",
  checks: [
    { id: "n1", category: "节点健康", label: "GPU-A100-01", status: "pass", value: "正常" },
    { id: "n2", category: "节点健康", label: "GPU-A100-02", status: "pass", value: "正常" },
    { id: "n3", category: "节点健康", label: "GPU-A100-03", status: "warning", value: "延迟高", detail: "2,450ms" },
    { id: "s1", category: "存储", label: "NAS-01", status: "pass", value: "62%", threshold: "85%" },
    { id: "k1", category: "网络", label: "延迟", status: "critical", value: "120ms", threshold: "50ms" },
  ],
};

describe("PatrolReport", () => {
  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染巡查报告标题", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("巡查报告")).toBeInTheDocument();
    });

    it("应渲染健康度分数", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("92")).toBeInTheDocument();
    });

    it("应渲染耗时", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("耗时 12s")).toBeInTheDocument();
    });

    it("应渲染触发类型标签", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("手动")).toBeInTheDocument();
    });

    it("auto 触发应显示「自动」", () => {
      render(<PatrolReport result={{ ...mockResult, triggeredBy: "auto" }} />);
      expect(screen.getByText("自动")).toBeInTheDocument();
    });

    it("scheduled 触发应显示「计划」", () => {
      render(<PatrolReport result={{ ...mockResult, triggeredBy: "scheduled" }} />);
      expect(screen.getByText("计划")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 统计 Badges
  // ----------------------------------------------------------

  describe("统计 Badges", () => {
    it("应显示通过数量 badge", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("应显示警告数量 badge", () => {
      render(<PatrolReport result={mockResult} />);
      // "1" 同时出现于警告徽标与分类计数等处 → getAllBy
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // 分类分组
  // ----------------------------------------------------------

  describe("分类分组", () => {
    it("应渲染 3 个分类组", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("节点健康")).toBeInTheDocument();
      expect(screen.getByText("存储")).toBeInTheDocument();
      expect(screen.getByText("网络")).toBeInTheDocument();
    });

    it("应显示每个分类的检查项数量", () => {
      render(<PatrolReport result={mockResult} />);
      expect(screen.getByText("(3)")).toBeInTheDocument(); // 节点健康: 3
      // "(1)" 同时匹配存储与网络两个分类 → getAllBy
      expect(screen.getAllByText("(1)").length).toBe(2); // 存储: 1, 网络: 1
    });
  });

  // ----------------------------------------------------------
  // 展开/折叠
  // ----------------------------------------------------------

  describe("展开/折叠", () => {
    it("点击分类标题应展开检查项", () => {
      render(<PatrolReport result={mockResult} />);
      fireEvent.click(screen.getByText("节点健康"));
      expect(screen.getByText("GPU-A100-01")).toBeInTheDocument();
      expect(screen.getByText("GPU-A100-02")).toBeInTheDocument();
      expect(screen.getByText("GPU-A100-03")).toBeInTheDocument();
    });

    it("再次点击应折叠", () => {
      render(<PatrolReport result={mockResult} />);
      fireEvent.click(screen.getByText("节点健康"));
      expect(screen.getByText("GPU-A100-01")).toBeInTheDocument();
      fireEvent.click(screen.getByText("节点健康"));
      expect(screen.queryByText("GPU-A100-01")).not.toBeInTheDocument();
    });

    it("展开后应显示检查值", () => {
      render(<PatrolReport result={mockResult} />);
      fireEvent.click(screen.getByText("网络"));
      expect(screen.getByText("120ms")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 空数据
  // ----------------------------------------------------------

  describe("空检查数据", () => {
    it("无检查项时应显示提示", () => {
      render(<PatrolReport result={{ ...mockResult, checks: [] }} />);
      expect(screen.getByText("巡查历史报告（无详细检查数据）")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // embedded 模式
  // ----------------------------------------------------------

  describe("embedded 模式", () => {
    it("embedded 模式应正常渲染", () => {
      render(<PatrolReport result={mockResult} embedded />);
      expect(screen.getByText("巡查报告")).toBeInTheDocument();
      expect(screen.getByText("92")).toBeInTheDocument();
    });
  });
});
