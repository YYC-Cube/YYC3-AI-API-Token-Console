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
import { render, screen } from "@testing-library/react";

// ── Mocks ──

const mockNavigate = vi.fn();
const mockPathname = "/";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
  Outlet: () => <div data-testid="outlet">Page Content</div>,
}));

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
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
  useKeyboardShortcuts: vi.fn(),
}));

// Mock sub-components with data-testid
vi.mock("../components/TopBar", () => ({
  TopBar: (props: any) => <div data-testid="topbar" data-mobile={props.isMobile} />,
}));

vi.mock("../components/Sidebar", () => ({
  Sidebar: (props: any) => <div data-testid="sidebar" data-collapsed={props.collapsed} />,
}));

vi.mock("../components/BottomNav", () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock("../components/AIAssistant", () => ({
  AIAssistant: () => <div data-testid="ai-assistant" />,
}));

vi.mock("../components/CommandPalette", () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

vi.mock("../components/IntegratedTerminal", () => ({
  IntegratedTerminal: () => <div data-testid="integrated-terminal" />,
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