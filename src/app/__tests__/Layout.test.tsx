/**
 * Layout.test.tsx
 * ================
 * Layout 组件测试
 *
 * 覆盖范围:
 * - 上下文提供: WebSocketContext / ViewContext
 * - TopBar 渲染
 * - Sidebar 渲染 (桌面端)
 * - BottomNav 渲染 (移动端)
 * - AIAssistant 浮窗渲染
 * - CommandPalette / IntegratedTerminal 渲染
 * - Suspense fallback 渲染
 * - 背景元素渲染
 * - 导出: WebSocketContext / ViewContext
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// ── Mocks ──

const mockNavigate = vi.fn();

/** react-router mock 的可变状态: pathname / 是否挂起 Outlet (触发 Suspense fallback) */
const routerState = vi.hoisted(() => ({
  pathname: "/",
  suspendOutlet: false,
  resolveOutlet: null as null | (() => void),
}));

/** 捕获 useKeyboardShortcuts 收到的配置, 供快捷键用例直接调用回调 */
const shortcutConfigs = vi.hoisted(() => [] as any[]);

vi.mock("react-router", async () => {
  const ReactModule = await import("react");
  // 挂起式 Outlet: promise 仅在 resolveOutlet() 调用后 resolve → 触发 Suspense fallback
  const LazyOutlet = ReactModule.lazy(
    () =>
      new Promise<{ default: React.ComponentType }>((resolve) => {
        routerState.resolveOutlet = () =>
          resolve({ default: () => <div data-testid="outlet">Page Content</div> });
      })
  );
  return {
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: routerState.pathname }),
    Outlet: () =>
      routerState.suspendOutlet ? (
        <LazyOutlet />
      ) : (
        <div data-testid="outlet">Page Content</div>
      ),
  };
});

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("motion/react", () => ({
  // 批6: 生产组件已切 m.*（LazyMotion 模式）, mock 须同时提供 m 键
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  m: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock hooks
const mockWsData = {
  connectionState: "simulated",
  reconnectCount: 0,
  lastSyncTime: "14:30:00",
  manualReconnect: vi.fn(),
  liveQPS: 3800,
  qpsTrend: "+5%",
  liveLatency: 45,
  latencyTrend: "-2%",
  activeNodes: "7/8",
  gpuUtil: "82%",
  tokenThroughput: "130K/s",
  storageUsed: "12TB",
  nodes: [],
  throughputHistory: [],
};

let mockView = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 1440,
  breakpoint: "xl",
  isTouch: false,
};

vi.mock("../hooks/useWebSocketData", () => ({
  useWebSocketData: () => mockWsData,
}));

vi.mock("../hooks/useMobileView", () => ({
  useMobileView: () => mockView,
}));

vi.mock("../hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: (config: unknown) => {
    shortcutConfigs.push(config);
  },
}));

// Mock sub-components with data-testid
vi.mock("../components/TopBar", () => ({
  TopBar: (props: any) => (
    <div data-testid="topbar" data-mobile={props.isMobile} data-mobile-menu-open={props.mobileMenuOpen}>
      <button data-testid="topbar-mobile-menu-btn" onClick={props.onToggleMobileMenu} />
      <button data-testid="topbar-terminal-btn" onClick={props.onToggleTerminal} />
    </div>
  ),
}));

vi.mock("../components/Sidebar", () => ({
  Sidebar: (props: any) => (
    <div data-testid="sidebar" data-collapsed={props.collapsed}>
      <button data-testid="sidebar-toggle" onClick={props.onToggle} />
    </div>
  ),
}));

vi.mock("../components/BottomNav", () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock("../components/AIAssistant", () => ({
  AIAssistant: () => <div data-testid="ai-assistant" />,
}));

vi.mock("../components/CommandPalette", () => ({
  CommandPalette: (props: any) => (
    <div data-testid="command-palette" data-open={props.isOpen}>
      <button data-testid="command-palette-close" onClick={props.onClose} />
    </div>
  ),
}));

vi.mock("../components/IntegratedTerminal", () => ({
  IntegratedTerminal: (props: any) => (
    <div data-testid="integrated-terminal" data-open={props.open}>
      <button data-testid="integrated-terminal-close" onClick={props.onClose} />
    </div>
  ),
}));

vi.mock("../components/PWAInstallPrompt", () => ({
  PWAInstallPrompt: () => <div data-testid="pwa-prompt" />,
}));

vi.mock("../components/OfflineIndicator", () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator" />,
}));

vi.mock("../components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/supabaseClient", () => ({
  isGhostMode: () => false,
}));

// AuthContext mock
vi.mock("../lib/authContext", () => ({
  AuthContext: React.createContext({
    logout: vi.fn(),
    userEmail: "test@yyc3.local",
    userRole: "admin",
    isGhost: false,
  }),
}));

import { Layout } from "../components/Layout";
import { WebSocketContext, ViewContext } from "../lib/view-context";

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockView = {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1440,
      breakpoint: "xl",
      isTouch: false,
    };
    routerState.pathname = "/";
    routerState.suspendOutlet = false;
    shortcutConfigs.length = 0;
  });

  describe("基础渲染", () => {
    it("应渲染 TopBar", () => {
      render(<Layout />);
      expect(screen.getByTestId("topbar")).toBeInTheDocument();
    });

    it("应渲染页面内容出口 (Outlet)", () => {
      render(<Layout />);
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    it("应渲染 AI 助手", () => {
      render(<Layout />);
      expect(screen.getByTestId("ai-assistant")).toBeInTheDocument();
    });

    it("应渲染命令面板", () => {
      render(<Layout />);
      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("应渲染集成终端", () => {
      render(<Layout />);
      expect(screen.getByTestId("integrated-terminal")).toBeInTheDocument();
    });

    it("应渲染 PWA 提示", () => {
      render(<Layout />);
      expect(screen.getByTestId("pwa-prompt")).toBeInTheDocument();
    });

    it("应渲染离线指示器", () => {
      render(<Layout />);
      expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
    });

    it("应渲染 Toast 容器", () => {
      render(<Layout />);
      expect(screen.getByTestId("toaster")).toBeInTheDocument();
    });

    it("应渲染 ErrorBoundary", () => {
      render(<Layout />);
      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    });
  });

  describe("桌面端布局", () => {
    it("桌面端应渲染 Sidebar", () => {
      render(<Layout />);
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("桌面端不应渲染 BottomNav", () => {
      render(<Layout />);
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });
  });

  describe("移动端布局", () => {
    beforeEach(() => {
      mockView = {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        width: 375,
        breakpoint: "sm",
        isTouch: true,
      };
    });

    it("移动端不应渲染 Sidebar", () => {
      render(<Layout />);
      expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    });

    it("移动端应渲染 BottomNav", () => {
      render(<Layout />);
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });
  });

  describe("平板端布局", () => {
    beforeEach(() => {
      mockView = {
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        width: 768,
        breakpoint: "md",
        isTouch: true,
      };
    });

    it("平板端不应渲染 Sidebar", () => {
      render(<Layout />);
      expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    });

    it("平板端应渲染 BottomNav", () => {
      render(<Layout />);
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });
  });

  describe("全局快捷键联动", () => {
    it("onSearch 应打开命令面板", () => {
      render(<Layout />);
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "false");
      act(() => shortcutConfigs[shortcutConfigs.length - 1].onSearch());
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "true");
    });

    it("onEscape 应关闭已打开的命令面板与终端", () => {
      render(<Layout />);
      act(() => {
        shortcutConfigs[shortcutConfigs.length - 1].onSearch();
        shortcutConfigs[shortcutConfigs.length - 1].onToggleTerminal();
      });
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "true");
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "true");
      act(() => shortcutConfigs[shortcutConfigs.length - 1].onEscape());
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "false");
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "false");
    });

    it("onToggleTerminal 应切换终端开关", () => {
      render(<Layout />);
      const cfg = shortcutConfigs[shortcutConfigs.length - 1];
      act(() => cfg.onToggleTerminal());
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "true");
      act(() => cfg.onToggleTerminal());
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "false");
    });
  });

  describe("顶栏与侧栏交互", () => {
    it("移动菜单按钮应切换 mobileMenuOpen", () => {
      render(<Layout />);
      expect(screen.getByTestId("topbar")).toHaveAttribute("data-mobile-menu-open", "false");
      fireEvent.click(screen.getByTestId("topbar-mobile-menu-btn"));
      expect(screen.getByTestId("topbar")).toHaveAttribute("data-mobile-menu-open", "true");
      fireEvent.click(screen.getByTestId("topbar-mobile-menu-btn"));
      expect(screen.getByTestId("topbar")).toHaveAttribute("data-mobile-menu-open", "false");
    });

    it("顶栏终端按钮应切换终端开关", () => {
      render(<Layout />);
      fireEvent.click(screen.getByTestId("topbar-terminal-btn"));
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "true");
      fireEvent.click(screen.getByTestId("topbar-terminal-btn"));
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "false");
    });

    it("侧栏折叠按钮应切换 collapsed", () => {
      render(<Layout />);
      // 默认折叠
      expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
      fireEvent.click(screen.getByTestId("sidebar-toggle"));
      expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "false");
      fireEvent.click(screen.getByTestId("sidebar-toggle"));
      expect(screen.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
    });
  });

  describe("浮层关闭回调", () => {
    it("CommandPalette onClose 应关闭面板", () => {
      render(<Layout />);
      act(() => shortcutConfigs[shortcutConfigs.length - 1].onSearch());
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "true");
      fireEvent.click(screen.getByTestId("command-palette-close"));
      expect(screen.getByTestId("command-palette")).toHaveAttribute("data-open", "false");
    });

    it("IntegratedTerminal onClose 应关闭终端", () => {
      render(<Layout />);
      act(() => shortcutConfigs[shortcutConfigs.length - 1].onToggleTerminal());
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "true");
      fireEvent.click(screen.getByTestId("integrated-terminal-close"));
      expect(screen.getByTestId("integrated-terminal")).toHaveAttribute("data-open", "false");
    });
  });

  describe("路由与 Suspense", () => {
    it("路由为 /ai-family 时仍渲染页面出口", () => {
      routerState.pathname = "/ai-family";
      render(<Layout />);
      expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    it("懒加载期间应渲染 Suspense fallback", async () => {
      routerState.suspendOutlet = true;
      render(<Layout />);
      expect(screen.getByText("Loading module...")).toBeInTheDocument();
      act(() => routerState.resolveOutlet!());
      await waitFor(() => expect(screen.getByTestId("outlet")).toBeInTheDocument());
    });
  });

  describe("上下文导出", () => {
    it("WebSocketContext 应正确导出", () => {
      expect(WebSocketContext).toBeDefined();
      expect(typeof WebSocketContext.Provider).toBe("object");
    });

    it("ViewContext 应正确导出", () => {
      expect(ViewContext).toBeDefined();
      expect(typeof ViewContext.Provider).toBe("object");
    });
  });
});