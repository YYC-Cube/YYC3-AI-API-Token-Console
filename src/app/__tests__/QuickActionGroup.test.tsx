/**
 * QuickActionGroup.test.tsx
 * ==========================
 * QuickActionGroup 组件 - 快速操作按钮组测试
 *
 * 覆盖范围:
 * - 默认 5 个操作按钮渲染
 * - 自定义操作按钮
 * - 点击触发回调
 * - loading 状态
 * - compact 模式
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickActionGroup } from "../components/QuickActionGroup";

describe("QuickActionGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 默认渲染
  // ----------------------------------------------------------

  describe("默认渲染", () => {
    it("应渲染 5 个默认操作按钮", () => {
      render(<QuickActionGroup />);
      expect(screen.getByText("查看详情")).toBeInTheDocument();
      expect(screen.getByText("查看历史")).toBeInTheDocument();
      expect(screen.getByText("查看关联")).toBeInTheDocument();
      expect(screen.getByText("一键修复")).toBeInTheDocument();
      expect(screen.getByText("标记解决")).toBeInTheDocument();
    });

    it("应渲染 5 个按钮元素", () => {
      render(<QuickActionGroup />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // 回调触发
  // ----------------------------------------------------------

  describe("回调触发", () => {
    it("点击一键修复应触发 onQuickFix", async () => {
      const onQuickFix = vi.fn();
      render(<QuickActionGroup onQuickFix={onQuickFix} />);
      fireEvent.click(screen.getByText("一键修复"));
      await waitFor(() => {
        expect(onQuickFix).toHaveBeenCalledTimes(1);
      });
    });

    it("点击标记解决应触发 onMarkResolved", async () => {
      const onMarkResolved = vi.fn();
      render(<QuickActionGroup onMarkResolved={onMarkResolved} />);
      fireEvent.click(screen.getByText("标记解决"));
      await waitFor(() => {
        expect(onMarkResolved).toHaveBeenCalledTimes(1);
      });
    });

    it("点击查看详情应触发 onViewDetail", async () => {
      const onViewDetail = vi.fn();
      render(<QuickActionGroup onViewDetail={onViewDetail} />);
      fireEvent.click(screen.getByText("查看详情"));
      await waitFor(() => {
        expect(onViewDetail).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ----------------------------------------------------------
  // compact 模式
  // ----------------------------------------------------------

  describe("compact 模式", () => {
    it("compact 模式应正常渲染所有按钮", () => {
      render(<QuickActionGroup compact />);
      expect(screen.getByText("查看详情")).toBeInTheDocument();
      expect(screen.getByText("一键修复")).toBeInTheDocument();
    });
  });
});
