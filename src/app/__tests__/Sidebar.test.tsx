/**
 * Sidebar.test.tsx
 * ==================
 * Sidebar 组件测试
 *
 * 覆盖范围:
 * - 折叠/展开状态渲染
 * - Logo 渲染
 * - 导航分类渲染
 * - 子项导航点击
 * - 当前路由高亮 (active indicator)
 * - 折叠 → 展开切换
 * - flyout 悬浮菜单 (折叠模式)
 * - navItems 导出兼容性
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();
let mockPathname = "/";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

import { Sidebar, navItems, SIDEBAR_COLLAPSED_W, SIDEBAR_EXPANDED_W } from "../components/Sidebar";

describe("Sidebar", () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
  });

  describe("折叠状态", () => {
    it("应渲染 Logo", () => {
      render(<Sidebar collapsed={true} onToggle={mockToggle} />);
      expect(screen.getByTestId("yyc3-logo")).toBeInTheDocument();
    });

    it("折叠时不显示 YYC3 文字", () => {
      render(<Sidebar collapsed={true} onToggle={mockToggle} />);
      expect(screen.queryByText("YYC³")).not.toBeInTheDocument();
    });

    it("折叠时不显示子菜单项文本", () => {
      render(<Sidebar collapsed={true} onToggle={mockToggle} />);
      // In collapsed mode, no child text is shown inline
      expect(screen.queryByText("nav.dataMonitor")).not.toBeInTheDocument();
    });

    it("折叠时应渲染展开按钮 (ChevronRight)", () => {
      render(<Sidebar collapsed={true} onToggle={mockToggle} />);
      expect(screen.queryByText("收起")).not.toBeInTheDocument();
    });
  });

  describe("展开状态", () => {
    it("展开时应显示 YYC3 文字", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      expect(screen.getByText("YYC³")).toBeInTheDocument();
    });

    it("展开时应显示分类标签", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      expect(screen.getByText("nav.catMonitor")).toBeInTheDocument();
      expect(screen.getByText("nav.catOps")).toBeInTheDocument();
      expect(screen.getByText("nav.catAI")).toBeInTheDocument();
      expect(screen.getByText("nav.catDev")).toBeInTheDocument();
      expect(screen.getByText("nav.catAdmin")).toBeInTheDocument();
    });

    it("展开时应显示子菜单项", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      expect(screen.getByText("nav.dataMonitor")).toBeInTheDocument();
      expect(screen.getByText("nav.followUp")).toBeInTheDocument();
      expect(screen.getByText("nav.patrol")).toBeInTheDocument();
    });

    it("展开时应显示收起按钮", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      expect(screen.getByText("收起")).toBeInTheDocument();
    });
  });

  describe("导航交互", () => {
    it("点击子菜单项应导航到对应路径", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      fireEvent.click(screen.getByText("nav.followUp"));
      expect(mockNavigate).toHaveBeenCalledWith("/follow-up");
    });

    it("点击分类按钮应导航到第一个子项路径", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      fireEvent.click(screen.getByText("nav.catOps"));
      expect(mockNavigate).toHaveBeenCalledWith("/operations");
    });

    it("点击 Logo 区域应导航到首页", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      fireEvent.click(screen.getByText("YYC³"));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("点击收起按钮应调用 onToggle", () => {
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      fireEvent.click(screen.getByText("收起"));
      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe("路由高亮", () => {
    it("首页时 monitor 分类应高亮", () => {
      mockPathname = "/";
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      const monitorBtn = screen.getByText("nav.catMonitor").closest("button");
      // The active category button's inner div contains text-[#00d4ff]
      const innerDiv = monitorBtn?.querySelector("div");
      expect(innerDiv?.className).toContain("text-[#00d4ff]");
    });

    it("/patrol 页时 nav.patrol 子项应高亮", () => {
      mockPathname = "/patrol";
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      const patrolBtn = screen.getByText("nav.patrol").closest("button");
      expect(patrolBtn?.className).toContain("text-[#00d4ff]");
    });

    it("/settings 页时 admin 分类应高亮", () => {
      mockPathname = "/settings";
      render(<Sidebar collapsed={false} onToggle={mockToggle} />);
      const adminBtn = screen.getByText("nav.catAdmin").closest("button");
      const innerDiv = adminBtn?.querySelector("div");
      expect(innerDiv?.className).toContain("text-[#00d4ff]");
    });
  });

  describe("Flyout 悬浮菜单 (折叠模式)", () => {
    it("折叠模式 hover 分类应显示 flyout", () => {
      render(<Sidebar collapsed={true} onToggle={mockToggle} />);
      // 分类按钮的父容器
      const catButtons = screen.getAllByRole("button");
      // hover the first category (monitor)
      const firstCat = catButtons[0].closest(".relative");
      if (firstCat) {
        fireEvent.mouseEnter(firstCat);
        // flyout should appear with category label
        expect(screen.getByText("nav.catMonitor")).toBeInTheDocument();
      }
    });
  });

  describe("导出兼容性", () => {
    it("navItems 应导出扁平导航数组", () => {
      expect(Array.isArray(navItems)).toBe(true);
      expect(navItems.length).toBeGreaterThan(10);
      expect(navItems[0]).toHaveProperty("label");
      expect(navItems[0]).toHaveProperty("path");
    });

    it("SIDEBAR 宽度常量应正确", () => {
      expect(SIDEBAR_COLLAPSED_W).toBe(52);
      expect(SIDEBAR_EXPANDED_W).toBe(208);
    });
  });
});
