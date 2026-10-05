/**
 * FollowUpCard.test.tsx
 * ======================
 * FollowUpCard 组件 - 告警卡片测试
 *
 * 覆盖范围:
 * - 基础渲染（标题、指标、来源、标签）
 * - 严重级别显示
 * - 状态标签显示
 * - 展开/折叠操作链路
 * - 回调触发（抽屉、修复、解决）
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FollowUpCard } from "../components/FollowUpCard";
import type { FollowUpItem } from "../types";

// Mock react-router (needed by sub-components)
vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const mockItem: FollowUpItem = {
  id: "AL-0032",
  severity: "critical",
  title: "GPU-A100-03 推理延迟异常",
  source: "GPU-A100-03",
  metric: "2,450ms > 2,000ms (阈值)",
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

describe("FollowUpCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染告警标题", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("GPU-A100-03 推理延迟异常")).toBeInTheDocument();
    });

    it("应渲染告警指标", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("2,450ms > 2,000ms (阈值)")).toBeInTheDocument();
    });

    it("应渲染来源", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("GPU-A100-03")).toBeInTheDocument();
    });

    it("应渲染严重级别标签", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("严重")).toBeInTheDocument();
    });

    it("应渲染状态标签", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("活跃")).toBeInTheDocument();
    });

    it("应渲染负责人", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("应渲染标签", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("推理延迟")).toBeInTheDocument();
      expect(screen.getByText("A100")).toBeInTheDocument();
    });

    it("应渲染操作链路步数", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("2 步操作链路")).toBeInTheDocument();
    });

    it("应渲染快速操作按钮", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.getByText("查看详情")).toBeInTheDocument();
      expect(screen.getByText("一键修复")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 展开/折叠
  // ----------------------------------------------------------

  describe("展开/折叠", () => {
    it("默认不展开操作链路", () => {
      render(<FollowUpCard item={mockItem} />);
      expect(screen.queryByText("操作链路")).not.toBeInTheDocument();
    });

    it("点击展开按钮后应显示操作链路", () => {
      render(<FollowUpCard item={mockItem} />);
      // Find the expand button (ChevronDown icon button)
      const buttons = screen.getAllByRole("button");
      const expandBtn = buttons.find(
        (b) => b.querySelector("svg") && !b.textContent?.trim()
      );
      if (expandBtn) {
        fireEvent.click(expandBtn);
        expect(screen.getByText("操作链路")).toBeInTheDocument();
      }
    });
  });

  // ----------------------------------------------------------
  // 回调
  // ----------------------------------------------------------

  describe("回调", () => {
    it("应调用 onOpenDrawer", () => {
      const onOpenDrawer = vi.fn();
      render(<FollowUpCard item={mockItem} onOpenDrawer={onOpenDrawer} />);
      // Click the external link button
      const buttons = screen.getAllByRole("button");
      // The ExternalLink button is one of the first buttons
      const drawerBtn = buttons.find((b) => b.getAttribute("title") === "打开详情面板");
      if (drawerBtn) {
        fireEvent.click(drawerBtn);
        expect(onOpenDrawer).toHaveBeenCalledWith(mockItem);
      }
    });
  });

  // ----------------------------------------------------------
  // 不同严重级别
  // ----------------------------------------------------------

  describe("严重级别变体", () => {
    it("warning 级别应显示「警告」", () => {
      const warningItem = { ...mockItem, severity: "warning" as const };
      render(<FollowUpCard item={warningItem} />);
      expect(screen.getByText("警告")).toBeInTheDocument();
    });

    it("error 级别应显示「错误」", () => {
      const errorItem = { ...mockItem, severity: "error" as const };
      render(<FollowUpCard item={errorItem} />);
      expect(screen.getByText("错误")).toBeInTheDocument();
    });

    it("info 级别应显示「信息」", () => {
      const infoItem = { ...mockItem, severity: "info" as const };
      render(<FollowUpCard item={infoItem} />);
      expect(screen.getByText("信息")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 不同状态
  // ----------------------------------------------------------

  describe("状态变体", () => {
    it("investigating 状态应显示「排查中」", () => {
      const item = { ...mockItem, status: "investigating" as const };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("排查中")).toBeInTheDocument();
    });

    it("resolved 状态应显示「已解决」", () => {
      const item = { ...mockItem, status: "resolved" as const };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("已解决")).toBeInTheDocument();
    });

    it("ignored 状态应显示「已忽略」", () => {
      const item = { ...mockItem, status: "ignored" as const };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("已忽略")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 覆盖率补测 A 域: 时间相对值 / 回调 / compact / 展开链路
  // ----------------------------------------------------------

  describe("时间相对值 (getTimeAgo)", () => {
    it("1 分钟内应显示「刚刚」", () => {
      const item = { ...mockItem, timestamp: Date.now() - 10 * 1000 };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("刚刚")).toBeInTheDocument();
    });

    it("1 小时内应显示分钟数", () => {
      const item = { ...mockItem, timestamp: Date.now() - 5 * 60 * 1000 };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("5 分钟前")).toBeInTheDocument();
    });

    it("24 小时内应显示小时数", () => {
      const item = { ...mockItem, timestamp: Date.now() - 3 * 60 * 60 * 1000 };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("3 小时前")).toBeInTheDocument();
    });

    it("超过 24 小时应显示天数", () => {
      const item = { ...mockItem, timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000 };
      render(<FollowUpCard item={item} />);
      expect(screen.getByText("2 天前")).toBeInTheDocument();
    });
  });

  describe("快速操作回调", () => {
    // QuickActionGroup 经 600ms 模拟延迟后调用回调, 需 fake timers 推进
    afterEach(() => {
      vi.useRealTimers();
    });

    it("点击一键修复应调用 onQuickFix", async () => {
      vi.useFakeTimers();
      const onQuickFix = vi.fn();
      render(<FollowUpCard item={mockItem} onQuickFix={onQuickFix} />);
      fireEvent.click(screen.getByText("一键修复"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(onQuickFix).toHaveBeenCalledWith(mockItem);
    });

    it("点击标记解决应调用 onMarkResolved", async () => {
      vi.useFakeTimers();
      const onMarkResolved = vi.fn();
      render(<FollowUpCard item={mockItem} onMarkResolved={onMarkResolved} />);
      fireEvent.click(screen.getByText("标记解决"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(onMarkResolved).toHaveBeenCalledWith(mockItem);
    });
  });

  describe("compact 变体", () => {
    it("compact=true 应正常渲染内容", () => {
      render(<FollowUpCard item={mockItem} compact={true} />);
      expect(screen.getByText("GPU-A100-03 推理延迟异常")).toBeInTheDocument();
      expect(screen.getByText("严重")).toBeInTheDocument();
    });
  });

  describe("展开操作链路 (确定性)", () => {
    it("点击展开按钮后应渲染链路事件", () => {
      render(<FollowUpCard item={mockItem} />);
      // 展开按钮: svg-only 且无 title (区别于 drawer 按钮)
      const expandBtn = screen
        .getAllByRole("button")
        .find((b) => !b.getAttribute("title") && !b.textContent?.trim());
      expect(expandBtn).toBeDefined();
      fireEvent.click(expandBtn!);
      expect(screen.getByText("操作链路")).toBeInTheDocument();
      expect(screen.getByText("模型加载")).toBeInTheDocument();
      expect(screen.getByText("延迟告警")).toBeInTheDocument();
    });

    it("再次点击应折叠链路", () => {
      render(<FollowUpCard item={mockItem} />);
      const expandBtn = screen
        .getAllByRole("button")
        .find((b) => !b.getAttribute("title") && !b.textContent?.trim())!;
      fireEvent.click(expandBtn);
      expect(screen.getByText("操作链路")).toBeInTheDocument();
      fireEvent.click(expandBtn);
      expect(screen.queryByText("操作链路")).not.toBeInTheDocument();
    });
  });
});
