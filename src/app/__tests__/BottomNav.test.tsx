/**
 * BottomNav.test.tsx
 * ===================
 * BottomNav 组件 - 4+1 "更多" 模式测试
 *
 * 覆盖范围:
 * - 4 核心 Tab 渲染 (监控/跟进/操作/巡查)
 * - "更多" 按钮渲染
 * - 导航点击跳转
 * - 当前路由高亮
 * - "更多" 抽屉打开/关闭
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();
let mockPathname = "/";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

import { BottomNav } from "../components/BottomNav";

describe("BottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
  });

  describe("基础渲染", () => {
    it("应渲染 4 个核心 Tab + 1 个更多按钮", () => {
      render(<BottomNav />);
      // 4 primary + 1 more = 5 buttons
      expect(screen.getByText("监控")).toBeInTheDocument();
      expect(screen.getByText("跟进")).toBeInTheDocument();
      expect(screen.getByText("操作")).toBeInTheDocument();
      expect(screen.getByText("巡查")).toBeInTheDocument();
      expect(screen.getByText("更多")).toBeInTheDocument();
    });

    it("应渲染 5 个按钮 (4 Tab + 更多)", () => {
      render(<BottomNav />);
      expect(screen.getAllByRole("button").length).toBe(5);
    });
  });

  describe("导航点击", () => {
    it("点击跟进应导航到 /follow-up", () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText("跟进"));
      expect(mockNavigate).toHaveBeenCalledWith("/follow-up");
    });

    it("点击巡查应导航到 /patrol", () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText("巡查"));
      expect(mockNavigate).toHaveBeenCalledWith("/patrol");
    });

    it("点击操作应导航到 /operations", () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText("操作"));
      expect(mockNavigate).toHaveBeenCalledWith("/operations");
    });

    it("点击监控应导航到 /", () => {
      mockPathname = "/settings";
      render(<BottomNav />);
      fireEvent.click(screen.getByText("监控"));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("路由高亮", () => {
    it("首页时监控按钮应有激活样式", () => {
      mockPathname = "/";
      render(<BottomNav />);
      // 激活样式应用在文字 span 上
      const label = screen.getByText("监控");
      expect(label.className).toContain("text-[#00d4ff]");
    });

    it("跟进页时跟进按钮应有激活样式", () => {
      mockPathname = "/follow-up";
      render(<BottomNav />);
      const label = screen.getByText("跟进");
      expect(label.className).toContain("text-[#00d4ff]");
    });

    it("非核心页面时更多按钮应有激活样式", () => {
      mockPathname = "/files";
      render(<BottomNav />);
      const label = screen.getByText("更多");
      expect(label.className).toContain("text-[#00d4ff]");
    });
  });

  describe("更多抽屉", () => {
    it("点击更多应打开抽屉", () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText("更多"));
      // 抽屉中应有分类导航项（首类为「运维管理」）
      expect(screen.getByText("运维管理")).toBeInTheDocument();
    });
  });
});
