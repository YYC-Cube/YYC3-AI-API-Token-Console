/**
 * FollowUpDrawer.test.tsx
 * ========================
 * FollowUpDrawer 组件 - 侧边抽屉详情面板测试
 *
 * 覆盖范围:
 * - 打开/关闭状态
 * - 标题、级别、状态渲染
 * - Tab 切换（详情/链路/指标/AI 建议）
 * - 关闭按钮 + ESC 键
 * - null item 不渲染
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FollowUpDrawer } from "../components/FollowUpDrawer";
import type { FollowUpItem } from "../types";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const mockItem: FollowUpItem = {
  id: "AL-0032",
  severity: "critical",
  title: "GPU-A100-03 推理延迟异常",
  source: "GPU-A100-03",
  metric: "2,450ms > 2,000ms",
  status: "active",
  timestamp: Date.now() - 5 * 60 * 1000,
  assignee: "admin",
  tags: ["推理延迟", "A100"],
  relatedAlerts: ["AL-0030"],
  chain: [
    { id: "c1", time: "10:23:45", type: "model_load", label: "模型加载", detail: "LLaMA-70B" },
    { id: "c2", time: "10:24:15", type: "alert_trigger", label: "延迟告警", detail: "#AL-0032", isCurrent: true },
  ],
};

describe("FollowUpDrawer", () => {
  let onClose: Mock;
  let onQuickFix: Mock;
  let onMarkResolved: Mock;

  beforeEach(() => {
    onClose = vi.fn();
    onQuickFix = vi.fn();
    onMarkResolved = vi.fn();
  });

  // ----------------------------------------------------------
  // Null item
  // ----------------------------------------------------------

  describe("null item", () => {
    it("item 为 null 时不应渲染任何内容", () => {
      const { container } = render(
        <FollowUpDrawer item={null} isOpen={false} onClose={onClose} />
      );
      expect(container.innerHTML).toBe("");
    });
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染（打开状态）", () => {
    it("应渲染告警标题", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("GPU-A100-03 推理延迟异常")).toBeInTheDocument();
    });

    it("应渲染严重级别标签", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("严重")).toBeInTheDocument();
    });

    it("应渲染状态标签", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("活跃")).toBeInTheDocument();
    });

    it("应渲染告警 ID", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      // 告警 ID 同时出现于时间线事件与头部徽标 → getAllBy
      expect(screen.getAllByText("#AL-0032").length).toBeGreaterThan(0);
    });

    it("应渲染指标值", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("2,450ms > 2,000ms")).toBeInTheDocument();
    });

    it("应渲染来源", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("GPU-A100-03")).toBeInTheDocument();
    });

    it("应渲染负责人", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("admin")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Tab 栏
  // ----------------------------------------------------------

  describe("Tab 栏", () => {
    it("应渲染 4 个 tab", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("详情")).toBeInTheDocument();
      expect(screen.getByText("链路 (2)")).toBeInTheDocument();
      expect(screen.getByText("指标")).toBeInTheDocument();
      expect(screen.getByText("AI 建议")).toBeInTheDocument();
    });

    it("默认应在详情 tab", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText("快速操作")).toBeInTheDocument();
    });

    it("切换到链路 tab 应显示完整操作链路", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      fireEvent.click(screen.getByText("链路 (2)"));
      expect(screen.getByText(/完整操作链路/)).toBeInTheDocument();
    });

    it("切换到指标 tab 应显示关联指标", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      fireEvent.click(screen.getByText("指标"));
      expect(screen.getByText(/关联指标/)).toBeInTheDocument();
      expect(screen.getByText("GPU 利用率")).toBeInTheDocument();
    });

    it("切换到 AI 建议 tab 应加载建议", async () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      fireEvent.click(screen.getByText("AI 建议"));
      // Should show loading first
      expect(screen.getByText("AI 智能建议")).toBeInTheDocument();
      // Wait for suggestions to load
      await waitFor(
        () => {
          expect(screen.getByText("推荐操作")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  // ----------------------------------------------------------
  // 关闭
  // ----------------------------------------------------------

  describe("关闭", () => {
    it("点击关闭按钮应触发 onClose", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      // Footer close button
      const closeButtons = screen.getAllByText("关闭");
      fireEvent.click(closeButtons[0]);
      expect(onClose).toHaveBeenCalled();
    });

    it("点击 backdrop 应触发 onClose", () => {
      const { container } = render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      // Backdrop is the fixed inset-0 div with bg-black/50
      const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/50");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it("ESC 键应触发 onClose", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // 关闭状态
  // ----------------------------------------------------------

  describe("关闭状态", () => {
    it("isOpen=false 时应有 translate-x-full 样式", () => {
      const { container } = render(
        <FollowUpDrawer item={mockItem} isOpen={false} onClose={onClose} />
      );
      const drawer = container.querySelector(".translate-x-full");
      expect(drawer).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Footer
  // ----------------------------------------------------------

  describe("Footer", () => {
    it("应渲染版本号", () => {
      render(
        <FollowUpDrawer item={mockItem} isOpen={true} onClose={onClose} />
      );
      expect(screen.getByText(/Follow-up System v1.0/)).toBeInTheDocument();
    });
  });
});