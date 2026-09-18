/**
 * ActionRecommender.test.tsx
 * ===========================
 * ActionRecommender 组件 - 操作推荐引擎测试
 *
 * 覆盖范围:
 * - 推荐列表渲染
 * - 应用/忽略回调
 * - 已应用列表
 * - 置信度/影响/可自动执行 标签
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionRecommender } from "../components/ActionRecommender";
import type { AIRecommendation } from "../types";

const mockRecs: AIRecommendation[] = [
  {
    id: "rec-1", patternId: "pat-1", action: "迁移模型到 GPU-A100-07",
    description: "负载 15%，延迟预计降至 800ms", impact: "high",
    confidence: 92, autoExecutable: true,
  },
  {
    id: "rec-2", patternId: "pat-1", action: "重启推理服务",
    description: "清理内存碎片", impact: "medium",
    confidence: 78, autoExecutable: true,
  },
  {
    id: "rec-3", patternId: "pat-2", action: "扩容 NAS 存储",
    description: "需要手动操作 RAID", impact: "high",
    confidence: 88, autoExecutable: false, applied: true,
  },
];

describe("ActionRecommender", () => {
  let onApply: Mock;
  let onDismiss: Mock;

  beforeEach(() => {
    onApply = vi.fn();
    onDismiss = vi.fn();
  });

  describe("基础渲染", () => {
    it("应渲染待处理推荐", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("迁移模型到 GPU-A100-07")).toBeInTheDocument();
      expect(screen.getByText("重启推理服务")).toBeInTheDocument();
    });

    it("应渲染描述", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("负载 15%，延迟预计降至 800ms")).toBeInTheDocument();
    });

    it("应渲染影响级别标签", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getAllByText("高影响").length).toBeGreaterThan(0);
      expect(screen.getByText("中影响")).toBeInTheDocument();
    });

    it("应渲染置信度", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("置信度 92%")).toBeInTheDocument();
      expect(screen.getByText("置信度 78%")).toBeInTheDocument();
    });

    it("可自动执行标签应显示", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getAllByText("可自动执行").length).toBeGreaterThan(0);
    });

    it("应有 data-testid", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByTestId("action-recommender")).toBeInTheDocument();
    });
  });

  describe("交互", () => {
    it("点击应用应触发 onApply", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByTestId("apply-rec-1"));
      expect(onApply).toHaveBeenCalledWith("rec-1");
    });

    it("点击忽略应触发 onDismiss", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      fireEvent.click(screen.getByTestId("dismiss-rec-rec-1"));
      expect(onDismiss).toHaveBeenCalledWith("rec-1");
    });
  });

  describe("已应用列表", () => {
    it("已应用推荐应显示在已应用区域", () => {
      render(<ActionRecommender recommendations={mockRecs} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("已应用 (1)")).toBeInTheDocument();
      expect(screen.getByTestId("applied-rec-3")).toBeInTheDocument();
    });
  });

  describe("空状态", () => {
    it("全部已应用时应显示空提示", () => {
      const allApplied = mockRecs.map((r) => ({ ...r, applied: true }));
      render(<ActionRecommender recommendations={allApplied} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("暂无待处理建议")).toBeInTheDocument();
    });

    it("无推荐时应显示空提示", () => {
      render(<ActionRecommender recommendations={[]} onApply={onApply} onDismiss={onDismiss} />);
      expect(screen.getByText("暂无待处理建议")).toBeInTheDocument();
    });
  });
});