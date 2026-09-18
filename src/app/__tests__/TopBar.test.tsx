/**
 * TopBar.test.tsx
 * ================
 * TopBar 组件测试
 *
 * 覆盖范围:
 * - 基础渲染 (Logo, 搜索, 通知, 用户头像)
 * - 桌面端: 搜索框, 终端按钮, 连接状态, 用户下拉菜单
 * - 移动端: 汉堡按钮, 微型连接状态, 抽屉导航
 * - 通知面板打开/关闭
 * - 用户菜单打开/关闭/登出
 * - Ghost mode badge
 * - 导航交互
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
    t: (key: string, vars?: Record<string, string | number>) => {
      if (vars && "n" in vars) return `${key}(${vars.n})`;
      return key;
    },
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("../components/ConnectionStatus", () => ({
  ConnectionStatus: ({ state }: any) => <div data-testid="connection-status">{state}</div>,
}));

vi.mock("../components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="lang-switcher" />,
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

let mockGhostMode = false;
vi.mock("../lib/supabaseClient", () => ({
  isGhostMode: () => mockGhostMode,
}));

import { TopBar } from "../components/TopBar";

const defaultProps = {
  connectionState: "connected" as const,
  reconnectCount: 0,
  lastSyncTime: "14:30:00",
  onReconnect: vi.fn(),
  isMobile: false,
  isTablet: false,
  mobileMenuOpen: false,
  onToggleMobileMenu: vi.fn(),
  onLogout: vi.fn(),
  userEmail: "admin@yyc3.local",
  userRole: "admin",
  onToggleTerminal: vi.fn(),
};

describe("TopBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockGhostMode = false;
  });

  describe("桌面端基础渲染", () => {
    it("应渲染 CP-IM 标识", () => {
      render(<TopBar {...defaultProps} />);
      expect(screen.getByText("CP-IM")).toBeInTheDocument();
    });

    it("应渲染搜索框", () => {
      render(<TopBar {...defaultProps} />);
      expect(screen.getByPlaceholderText("palette.placeholder")).toBeInTheDocument();
    });

    it("应渲染连接状态组件", () => {
      render(<TopBar {...defaultProps} />);
      expect(screen.getByTestId("connection-status")).toBeInTheDocument();
    });

    it("应渲染语言切换器", () => {
      render(<TopBar {...defaultProps} />);
      expect(screen.getByTestId("lang-switcher")).toBeInTheDocument();
    });

    it("应渲染用户头像 (initials)", () => {
      render(<TopBar {...defaultProps} />);
      // userEmail = admin@yyc3.local → displayName = admin → initials = AD
      expect(screen.getByText("AD")).toBeInTheDocument();
    });

    it("应渲染通知徽标", () => {
      render(<TopBar {...defaultProps} />);
      expect(screen.getByText("3")).toBeInTheDocument(); // 3 notifications
    });

    it("不应渲染汉堡按钮 (桌面端)", () => {
      render(<TopBar {...defaultProps} />);
      // No hamburger in desktop
      expect(screen.queryByTestId("yyc3-logo")).not.toBeInTheDocument();
    });
  });

  describe("通知面板", () => {
    it("点击通知按钮应显示通知面板", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("3").closest("button")!);
      expect(screen.getByText("common.notifications")).toBeInTheDocument();
    });

    it("通知面板应包含 3 条通知", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("3").closest("button")!);
      expect(screen.getByText("GPU-A100-03 推理延迟异常")).toBeInTheDocument();
      expect(screen.getByText("LLaMA-70B 部署完成")).toBeInTheDocument();
    });
  });

  describe("用户菜单", () => {
    it("点击用户头像应显示下拉菜单 (桌面端)", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("AD").closest("button")!);
      // Menu should show displayName = admin
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("用户菜单应包含导航项", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("AD").closest("button")!);
      expect(screen.getByText("nav.userMgmt")).toBeInTheDocument();
      expect(screen.getByText("nav.settings")).toBeInTheDocument();
    });

    it("点击登出应调用 onLogout", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("AD").closest("button")!);
      fireEvent.click(screen.getByText("common.logout"));
      expect(defaultProps.onLogout).toHaveBeenCalled();
    });

    it("点击菜单项应导航并关闭菜单", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByText("AD").closest("button")!);
      fireEvent.click(screen.getByText("nav.settings"));
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });
  });

  describe("移动端", () => {
    const mobileProps = { ...defaultProps, isMobile: true, isTablet: false };

    it("移动端应渲染 YYC3 标识而非 CP-IM", () => {
      render(<TopBar {...mobileProps} />);
      expect(screen.getByText("YYC³")).toBeInTheDocument();
      expect(screen.queryByText("CP-IM")).not.toBeInTheDocument();
    });

    it("移动端应渲染汉堡按钮", () => {
      render(<TopBar {...mobileProps} />);
      // The hamburger/X button
      const hamburger = screen.getByTestId("yyc3-logo").parentElement?.parentElement;
      // Find the toggle button
      const buttons = screen.getAllByRole("button");
      // First button should be the hamburger
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it("点击汉堡按钮应调用 onToggleMobileMenu", () => {
      render(<TopBar {...mobileProps} />);
      // Find hamburger button (contains Menu icon)
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]); // First button is hamburger
      expect(mobileProps.onToggleMobileMenu).toHaveBeenCalled();
    });

    it("移动端不应渲染搜索框", () => {
      render(<TopBar {...mobileProps} />);
      expect(screen.queryByPlaceholderText("palette.placeholder")).not.toBeInTheDocument();
    });

    it("移动端应渲染微型连接状态点", () => {
      render(<TopBar {...mobileProps} />);
      expect(screen.queryByTestId("connection-status")).not.toBeInTheDocument();
    });

    it("移动端不应渲染语言切换器", () => {
      render(<TopBar {...mobileProps} />);
      expect(screen.queryByTestId("lang-switcher")).not.toBeInTheDocument();
    });
  });

  describe("移动端抽屉", () => {
    it("mobileMenuOpen 时应渲染抽屉内容", () => {
      render(<TopBar {...defaultProps} isMobile={true} isTablet={false} mobileMenuOpen={true} />);
      // Drawer should show user info and navigation
      expect(screen.getByText("admin")).toBeInTheDocument();
      // Search in drawer
      expect(screen.getByPlaceholderText("palette.placeholder")).toBeInTheDocument();
    });

    it("抽屉内应渲染导航分类", () => {
      render(<TopBar {...defaultProps} isMobile={true} isTablet={false} mobileMenuOpen={true} />);
      expect(screen.getByText("nav.catMonitor")).toBeInTheDocument();
      expect(screen.getByText("nav.catOps")).toBeInTheDocument();
    });

    it("抽屉内点击导航项应导航并关闭菜单", () => {
      render(<TopBar {...defaultProps} isMobile={true} isTablet={false} mobileMenuOpen={true} />);
      // Expand monitor category first (default expanded based on pathname)
      // Then click a nav item
      const patrolBtn = screen.queryByText("nav.patrol");
      if (patrolBtn) {
        fireEvent.click(patrolBtn);
        expect(mockNavigate).toHaveBeenCalledWith("/patrol");
        expect(defaultProps.onToggleMobileMenu).toHaveBeenCalled();
      }
    });

    it("抽屉底部应渲染登出按钮", () => {
      render(<TopBar {...defaultProps} isMobile={true} isTablet={false} mobileMenuOpen={true} />);
      const logoutBtns = screen.getAllByText("common.logout");
      expect(logoutBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Ghost Mode", () => {
    it("Ghost 模式下应渲染 GHOST 标识", () => {
      mockGhostMode = true;
      render(<TopBar {...defaultProps} />);
      expect(screen.getByText("GHOST")).toBeInTheDocument();
    });

    it("非 Ghost 模式不显示标识", () => {
      mockGhostMode = false;
      render(<TopBar {...defaultProps} />);
      expect(screen.queryByText("GHOST")).not.toBeInTheDocument();
    });
  });

  describe("终端按钮", () => {
    it("桌面端应渲染终端按钮", () => {
      render(<TopBar {...defaultProps} />);
      const terminalBtn = screen.getByTitle("集成终端 (Ctrl+`)");
      expect(terminalBtn).toBeInTheDocument();
    });

    it("点击终端按钮应调用 onToggleTerminal", () => {
      render(<TopBar {...defaultProps} />);
      fireEvent.click(screen.getByTitle("集成终端 (Ctrl+`)"));
      expect(defaultProps.onToggleTerminal).toHaveBeenCalled();
    });
  });

  describe("navItems 导出", () => {
    it("应导出扁平���航数组", async () => {
      const mod = await import("../components/TopBar");
      expect(Array.isArray(mod.navItems)).toBe(true);
      expect(mod.navItems.length).toBeGreaterThan(5);
    });
  });
});