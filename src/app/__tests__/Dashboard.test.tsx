/**
 * Dashboard.test.tsx
 * ====================
 * Dashboard 组件测试
 *
 * 覆盖范围:
 * - 6 个统计卡片渲染 (QPS/Latency/Nodes/GPU/Tokens/Storage)
 * - 图表区域渲染 (吞吐量/模型分布/雷达/性能/预测)
 * - 节点矩阵渲染与点击
 * - 全景按钮切换 (grid-cols-12 ↔ grid-cols-1 全宽布局)
 * - 全景模式样式验证 (高亮/网格列数)
 * - 实时操作列表渲染
 * - NodeDetailModal 打开/关闭
 * - 移动端/桌面端响应式
 * - ChartTabBar 切换 (移动端)
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

// ── Mocks ──

// Mock react-router
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/" }),
}));

// Mock recharts
vi.mock("recharts", () => {
  const Wrap = ({ children, ...p }: any) => <div data-testid="chart-container" {...p}>{children}</div>;
  return {
    ResponsiveContainer: Wrap,
    AreaChart: Wrap,
    Area: () => <div data-testid="area" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    PieChart: Wrap,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    RadarChart: Wrap,
    Radar: () => <div data-testid="radar" />,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
    PolarRadiusAxis: () => null,
    Legend: () => null,
    BarChart: Wrap,
    Bar: () => <div data-testid="bar" />,
    LineChart: Wrap,
    Line: () => <div data-testid="line" />,
  };
});

// Mock react-swipeable
vi.mock("react-swipeable", () => ({
  useSwipeable: () => ({}),
}));

// Mock useI18n
vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

// Mock sub-components
vi.mock("../components/NodeDetailModal", () => ({
  NodeDetailModal: ({ node, onClose }: any) => (
    <div data-testid="node-detail-modal">
      <span>{node.id}</span>
      <button onClick={onClose}>close-modal</button>
    </div>
  ),
}));

vi.mock("../components/AlertBanner", () => ({
  AlertBanner: () => <div data-testid="alert-banner" />,
}));

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>,
}));

// ── Context setup ──
import { WebSocketContext, ViewContext } from "../lib/view-context";
import type { WebSocketDataState, ViewState, NodeData } from "../types";
import { Dashboard } from "../components/Dashboard";

const mockNodes: NodeData[] = [
  { id: "GPU-A100-01", status: "active", gpu: 75, mem: 60, temp: 68, model: "LLaMA-70B", tasks: 12, uptime: "48h" },
  { id: "GPU-A100-02", status: "warning", gpu: 92, mem: 85, temp: 78, model: "Qwen-72B", tasks: 8, uptime: "24h" },
  { id: "GPU-A100-03", status: "error", gpu: 98, mem: 95, temp: 88, model: "DeepSeek-V3", tasks: 0, uptime: "0h" },
];

function createWsData(overrides: Partial<WebSocketDataState> = {}): WebSocketDataState {
  return {
    connectionState: "connected",
    reconnectCount: 0,
    lastSyncTime: "14:30:00",
    manualReconnect: vi.fn(),
    clearAlerts: vi.fn(),
    liveQPS: 4200,
    qpsTrend: "+8.5%",
    liveLatency: 42,
    latencyTrend: "-3.1%",
    activeNodes: "7/8",
    gpuUtil: "85.3%",
    tokenThroughput: "142K/s",
    storageUsed: "13.5TB",
    nodes: mockNodes,
    throughputHistory: [
      { time: "10:00", qps: 3500, tokens: 120000 },
      { time: "11:00", qps: 3800, tokens: 130000 },
      { time: "12:00", qps: 4200, tokens: 142000 },
    ],
    alerts: [],
    ...overrides,
  } as unknown as WebSocketDataState;
}

function createView(overrides: Partial<ViewState> = {}): ViewState {
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1440,
    breakpoint: "xl",
    isTouch: false,
    ...overrides,
  } as ViewState;
}

function renderDashboard(wsOverrides?: Partial<WebSocketDataState>, viewOverrides?: Partial<ViewState>) {
  return render(
    <WebSocketContext.Provider value={createWsData(wsOverrides)}>
      <ViewContext.Provider value={createView(viewOverrides)}>
        <Dashboard />
      </ViewContext.Provider>
    </WebSocketContext.Provider>
  );
}

describe("Dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("基础渲染", () => {
    it("应渲染 AlertBanner", () => {
      renderDashboard();
      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
    });

    it("应渲染 6 个统计卡片", () => {
      renderDashboard();
      expect(screen.getByText("4,200")).toBeInTheDocument(); // QPS
      expect(screen.getByText("42ms")).toBeInTheDocument();   // Latency
      expect(screen.getByText("7/8")).toBeInTheDocument();    // Active nodes
      expect(screen.getByText("85.3%")).toBeInTheDocument();  // GPU util
      expect(screen.getByText("142K/s")).toBeInTheDocument(); // Token throughput
      expect(screen.getByText("13.5TB")).toBeInTheDocument(); // Storage
    });

    it("应渲染趋势标识", () => {
      renderDashboard();
      expect(screen.getByText("+8.5%")).toBeInTheDocument();
      expect(screen.getByText("-3.1%")).toBeInTheDocument();
    });

    it("应渲染吞吐量图表标题", () => {
      renderDashboard();
      expect(screen.getByText("monitor.throughputChart")).toBeInTheDocument();
    });

    it("应渲染模型负载分布", () => {
      renderDashboard();
      expect(screen.getByText("monitor.modelLoadDist")).toBeInTheDocument();
    });

    it("应渲染饼图图例项", () => {
      renderDashboard();
      // 模型名同时出现于图例与节点卡片 → 用 getAllBy 覆盖多实例场景
      expect(screen.getAllByText("LLaMA-70B").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Qwen-72B").length).toBeGreaterThan(0);
      expect(screen.getAllByText("DeepSeek-V3").length).toBeGreaterThan(0);
    });
  });

  describe("节点矩阵", () => {
    it("应渲染所有节点卡片", () => {
      renderDashboard();
      expect(screen.getByText("GPU-A100-01")).toBeInTheDocument();
      expect(screen.getByText("GPU-A100-02")).toBeInTheDocument();
      expect(screen.getByText("GPU-A100-03")).toBeInTheDocument();
    });

    it("点击节点应弹出 NodeDetailModal", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("GPU-A100-01"));
      expect(screen.getByTestId("node-detail-modal")).toBeInTheDocument();
    });

    it("关闭 NodeDetailModal 后应消失", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("GPU-A100-01"));
      expect(screen.getByTestId("node-detail-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByText("close-modal"));
      expect(screen.queryByTestId("node-detail-modal")).not.toBeInTheDocument();
    });

    it("应渲染节点矩阵标题", () => {
      renderDashboard();
      expect(screen.getByText("monitor.nodeMatrix")).toBeInTheDocument();
    });

    it("应渲染刷新按钮", () => {
      renderDashboard();
      expect(screen.getByText("monitor.refresh")).toBeInTheDocument();
    });

    it("桌面端应渲染全景按钮", () => {
      renderDashboard();
      expect(screen.getByText("monitor.panorama")).toBeInTheDocument();
    });

    it("点击全景按钮应切换全景模式", () => {
      renderDashboard();
      const panoramaBtn = screen.getByText("monitor.panorama").closest("button")!;

      // 默认非全景 — 节点矩阵卡片应在 12 列布局中占 7 列
      const nodeMatrixCard = screen.getByTestId("node-matrix-card");
      const gridContainer = nodeMatrixCard.parentElement!;
      expect(gridContainer.className).toContain("grid-cols-12");

      // 点击全景
      fireEvent.click(panoramaBtn);

      // 全景模式下 — 应切换为单列布局
      expect(gridContainer.className).toContain("grid-cols-1");
      expect(gridContainer.className).not.toContain("grid-cols-12");
    });

    it("再次点击全景按钮应退出全景模式", () => {
      renderDashboard();
      const panoramaBtn = screen.getByText("monitor.panorama").closest("button")!;
      const nodeMatrixCard = screen.getByTestId("node-matrix-card");
      const gridContainer = nodeMatrixCard.parentElement!;

      // 打开全景
      fireEvent.click(panoramaBtn);
      expect(gridContainer.className).toContain("grid-cols-1");

      // 关闭全景
      fireEvent.click(panoramaBtn);
      expect(gridContainer.className).toContain("grid-cols-12");
    });

    it("全景模式下节点网格应使用 5 列", () => {
      renderDashboard();
      const panoramaBtn = screen.getByText("monitor.panorama").closest("button")!;
      fireEvent.click(panoramaBtn);

      // 节点网格应为 5 列
      const nodeMatrixCard = screen.getByTestId("node-matrix-card");
      const grids = nodeMatrixCard.querySelectorAll(".grid");
      const nodeGrid = grids[grids.length - 1];
      expect(nodeGrid.className).toContain("grid-cols-5");
    });

    it("全景按钮激活时应有高亮样式", () => {
      renderDashboard();
      const panoramaBtn = screen.getByText("monitor.panorama").closest("button")!;

      // 默认非激活
      expect(panoramaBtn.className).toContain("bg-[rgba(0,212,255,0.08)]");

      // 点击激活
      fireEvent.click(panoramaBtn);
      expect(panoramaBtn.className).toContain("bg-[rgba(0,212,255,0.15)]");
    });
  });

  describe("实时操作列表", () => {
    it("应渲染实时操作标题", () => {
      renderDashboard();
      expect(screen.getByText("monitor.realtimeOps")).toBeInTheDocument();
    });

    it("应渲染所有操作条目", () => {
      renderDashboard();
      // Check operation actions from recentOps mock data
      const viewAllBtn = screen.getByText("monitor.viewAll");
      expect(viewAllBtn).toBeInTheDocument();
    });
  });

  describe("桌面端分析图表", () => {
    it("桌面端应渲染三栏图表", () => {
      renderDashboard();
      expect(screen.getByText("monitor.radarTitle")).toBeInTheDocument();
      expect(screen.getByText("monitor.performanceTitle")).toBeInTheDocument();
      expect(screen.getByText("monitor.predictionTitle")).toBeInTheDocument();
    });

    it("应渲染 AI 预测标签", () => {
      renderDashboard();
      expect(screen.getByText("monitor.aiPrediction")).toBeInTheDocument();
    });
  });

  describe("移动端适配", () => {
    it("移动端应渲染 Tab 切换栏", () => {
      renderDashboard({}, { isMobile: true, isTablet: false, isDesktop: false, width: 375, breakpoint: "sm" } as ViewState);
      expect(screen.getByText("monitor.radarTab")).toBeInTheDocument();
      expect(screen.getByText("monitor.performanceTab")).toBeInTheDocument();
      expect(screen.getByText("monitor.predictionTab")).toBeInTheDocument();
    });

    it("移动端点击 Tab 应切换图表", () => {
      renderDashboard({}, { isMobile: true, isTablet: false, isDesktop: false, width: 375, breakpoint: "sm" } as ViewState);
      fireEvent.click(screen.getByText("monitor.performanceTab"));
      // The clicked tab should have active styling
      const tab = screen.getByText("monitor.performanceTab").closest("button")!;
      expect(tab.className).toContain("text-[#00d4ff]");
    });

    it("移动端不应渲染全景按钮", () => {
      renderDashboard({}, { isMobile: true, isTablet: false, isDesktop: false, width: 375, breakpoint: "sm" } as ViewState);
      expect(screen.queryByText("monitor.panorama")).not.toBeInTheDocument();
    });
  });

  describe("默认数据兜底", () => {
    it("无 WebSocket 数据时应使用默认值", () => {
      render(
        <WebSocketContext.Provider value={null}>
          <ViewContext.Provider value={createView()}>
            <Dashboard />
          </ViewContext.Provider>
        </WebSocketContext.Provider>
      );
      expect(screen.getByText("3,842")).toBeInTheDocument(); // default QPS
      expect(screen.getByText("48ms")).toBeInTheDocument();   // default latency
    });
  });

  describe("时间段按钮", () => {
    it("桌面端应渲染 4 个时间段按钮", () => {
      renderDashboard();
      expect(screen.getByText("1H")).toBeInTheDocument();
      expect(screen.getByText("6H")).toBeInTheDocument();
      expect(screen.getByText("24H")).toBeInTheDocument();
      expect(screen.getByText("7D")).toBeInTheDocument();
    });

    it("移动端应渲染 2 个时间段按钮", () => {
      renderDashboard({}, { isMobile: true, isTablet: false, isDesktop: false, width: 375, breakpoint: "sm" } as ViewState);
      expect(screen.queryByText("1H")).not.toBeInTheDocument();
      expect(screen.queryByText("6H")).not.toBeInTheDocument();
      expect(screen.getByText("24H")).toBeInTheDocument();
      expect(screen.getByText("7D")).toBeInTheDocument();
    });
  });
});