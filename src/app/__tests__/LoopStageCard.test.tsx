/**
 * LoopStageCard.test.tsx
 * ========================
 * LoopStageCard 组件 - 闭环阶段卡片测试
 *
 * 覆盖范围:
 * - 渲染标签 / 描述 / 状态
 * - idle / running / completed 状态表现
 * - 结果 summary / details / metrics
 * - 连接线
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoopStageCard } from "../components/LoopStageCard";
import type { StageResult } from "../types";
import type { StageMeta } from "../types";

const mockMeta: StageMeta = {
  key: "monitor",
  label: "监测层",
  icon: "Activity",
  color: "#00d4ff",
  description: "实时数据采集 · 指标监控 · 异常检测",
};

describe("LoopStageCard", () => {
  describe("idle 状态", () => {
    const idleResult: StageResult = {
      stage: "monitor",
      status: "idle",
      startedAt: null,
      completedAt: null,
      duration: null,
      summary: "",
      details: [],
    };

    it("应渲染阶段标签", () => {
      render(<LoopStageCard meta={mockMeta} result={idleResult} index={0} isActive={false} />);
      expect(screen.getByText("监测层")).toBeInTheDocument();
    });

    it("应显示待执行状态", () => {
      render(<LoopStageCard meta={mockMeta} result={idleResult} index={0} isActive={false} />);
      expect(screen.getByText("待执行")).toBeInTheDocument();
    });

    it("应渲染描述", () => {
      render(<LoopStageCard meta={mockMeta} result={idleResult} index={0} isActive={false} />);
      expect(screen.getByText("实时数据采集 · 指标监控 · 异常检测")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(<LoopStageCard meta={mockMeta} result={idleResult} index={0} isActive={false} />);
      expect(screen.getByTestId("loop-stage-monitor")).toBeInTheDocument();
    });
  });

  describe("running 状态", () => {
    const runningResult: StageResult = {
      stage: "monitor",
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      duration: null,
      summary: "",
      details: [],
    };

    it("应显示执行中状态", () => {
      render(<LoopStageCard meta={mockMeta} result={runningResult} index={0} isActive={true} />);
      expect(screen.getByText("执行中")).toBeInTheDocument();
    });
  });

  describe("completed 状态", () => {
    const completedResult: StageResult = {
      stage: "monitor",
      status: "completed",
      startedAt: Date.now() - 1500,
      completedAt: Date.now(),
      duration: 1500,
      summary: "采集 13 个节点数据",
      details: ["GPU-A100-03 推理延迟异常", "其余 11 个节点正常"],
      metrics: { nodes_scanned: 13, anomalies: 2 },
    };

    it("应显示已完成状态", () => {
      render(<LoopStageCard meta={mockMeta} result={completedResult} index={0} isActive={false} />);
      expect(screen.getByText("已完成")).toBeInTheDocument();
    });

    it("应渲染 summary", () => {
      render(<LoopStageCard meta={mockMeta} result={completedResult} index={0} isActive={false} />);
      expect(screen.getByText("采集 13 个节点数据")).toBeInTheDocument();
    });

    it("应渲染 details", () => {
      render(<LoopStageCard meta={mockMeta} result={completedResult} index={0} isActive={false} />);
      expect(screen.getByText("GPU-A100-03 推理延迟异常")).toBeInTheDocument();
    });

    it("应渲染 metrics", () => {
      render(<LoopStageCard meta={mockMeta} result={completedResult} index={0} isActive={false} />);
      expect(screen.getByText("nodes_scanned: 13")).toBeInTheDocument();
      expect(screen.getByText("anomalies: 2")).toBeInTheDocument();
    });

    it("应渲染耗时", () => {
      render(<LoopStageCard meta={mockMeta} result={completedResult} index={0} isActive={false} />);
      expect(screen.getByText("1.5s")).toBeInTheDocument();
    });
  });

  describe("连接线", () => {
    const idleResult: StageResult = {
      stage: "monitor", status: "idle",
      startedAt: null, completedAt: null, duration: null,
      summary: "", details: [],
    };

    it("showConnector=true 应渲染连接线", () => {
      const { container } = render(
        <LoopStageCard meta={mockMeta} result={idleResult} index={0} isActive={false} showConnector />
      );
      // 连接线是 w-0.5 的 div
      const connector = container.querySelector(".w-0\\.5");
      expect(connector).toBeTruthy();
    });
  });
});