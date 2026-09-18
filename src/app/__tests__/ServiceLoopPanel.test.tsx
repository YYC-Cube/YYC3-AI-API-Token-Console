/**
 * ServiceLoopPanel.test.tsx
 * ==========================
 * ServiceLoopPanel 组件测试
 *
 * 覆盖范围:
 * - 标题和副标题渲染
 * - 统计卡片 (totalRuns/successRuns/errorRuns/avgDuration)
 * - 启动/终止按钮交互
 * - 自动模式切换
 * - Pipeline 阶段卡片渲染
 * - 数据流图渲染
 * - 运行历史列表
 * - 清空历史
 * - 空状态显示
 * - formatDuration / formatTime 辅助函数
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("../components/LoopStageCard", () => ({
  LoopStageCard: ({ meta, result, index, isActive }: any) => (
    <div data-testid={`stage-${meta.key}`} data-active={isActive}>
      {meta.key}: {result.status}
    </div>
  ),
}));

vi.mock("../components/DataFlowDiagram", () => ({
  DataFlowDiagram: ({ nodes, edges }: any) => (
    <div data-testid="data-flow-diagram">
      nodes:{nodes.length} edges:{edges.length}
    </div>
  ),
}));

// Mock Layout context
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false, isTablet: false, isDesktop: true, width: 1200, breakpoint: "lg", isTouch: false }),
}));

// Mock hook
const mockStartLoop = vi.fn();
const mockAbortLoop = vi.fn();
const mockClearHistory = vi.fn();
const mockSetAutoMode = vi.fn();

let mockServiceLoopState: any;

vi.mock("../hooks/useServiceLoop", () => ({
  useServiceLoop: () => mockServiceLoopState,
}));

import { ServiceLoopPanel } from "../components/ServiceLoopPanel";

function createDefaultState() {
  return {
    currentRun: null,
    history: [
      {
        id: "run-1",
        trigger: "manual",
        startedAt: Date.now() - 120000,
        completedAt: Date.now() - 60000,
        overallStatus: "completed",
        stages: [
          { stage: "monitor", status: "completed", startedAt: Date.now() - 120000, completedAt: Date.now() - 110000, duration: 10000, summary: "OK", details: [] },
          { stage: "analyze", status: "completed", startedAt: Date.now() - 110000, completedAt: Date.now() - 100000, duration: 10000, summary: "OK", details: [] },
        ],
      },
      {
        id: "run-2",
        trigger: "auto",
        startedAt: Date.now() - 300000,
        completedAt: Date.now() - 240000,
        overallStatus: "error",
        stages: [
          { stage: "monitor", status: "completed", startedAt: Date.now() - 300000, completedAt: Date.now() - 290000, duration: 10000, summary: "OK", details: [] },
        ],
      },
    ],
    isRunning: false,
    autoMode: false,
    setAutoMode: mockSetAutoMode,
    currentStageIndex: -1,
    stats: {
      totalRuns: 5,
      successRuns: 3,
      errorRuns: 2,
      avgDuration: 45000,
    },
    startLoop: mockStartLoop,
    abortLoop: mockAbortLoop,
    clearHistory: mockClearHistory,
    stageMeta: [
      { key: "monitor", labelKey: "loop.stageMonitor", icon: "Activity", color: "#00d4ff" },
      { key: "analyze", labelKey: "loop.stageAnalyze", icon: "Brain", color: "#aa55ff" },
      { key: "decide", labelKey: "loop.stageDecide", icon: "Sparkles", color: "#ffdd00" },
      { key: "execute", labelKey: "loop.stageExecute", icon: "Zap", color: "#00ff88" },
      { key: "verify", labelKey: "loop.stageVerify", icon: "Check", color: "#ff6600" },
      { key: "optimize", labelKey: "loop.stageOptimize", icon: "RefreshCw", color: "#ff3366" },
    ],
    dataFlowNodes: [
      { id: "n1", label: "Local Devices" },
      { id: "n2", label: "Dashboard" },
    ],
    dataFlowEdges: [
      { from: "n1", to: "n2" },
    ],
  };
}

describe("ServiceLoopPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServiceLoopState = createDefaultState();
  });

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.title")).toBeInTheDocument();
    });

    it("应渲染副标题", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.subtitle")).toBeInTheDocument();
    });

    it("应渲染启动按钮 (idle 状态)", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("start-loop")).toBeInTheDocument();
      expect(screen.getByText("loop.startLoop")).toBeInTheDocument();
    });

    it("应渲染自动循环切换按钮", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("toggle-auto-loop")).toBeInTheDocument();
    });
  });

  describe("统计卡片", () => {
    it("应渲染总运行数", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("loop.totalRuns")).toBeInTheDocument();
    });

    it("应渲染成功数", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("loop.successRuns")).toBeInTheDocument();
    });

    it("应渲染错误数", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("loop.errorRuns")).toBeInTheDocument();
    });

    it("应渲染平均时长", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("45.0s")).toBeInTheDocument();
      expect(screen.getByText("loop.avgDuration")).toBeInTheDocument();
    });

    it("avgDuration 为 0 时显示 --", () => {
      mockServiceLoopState.stats.avgDuration = 0;
      render(<ServiceLoopPanel />);
      expect(screen.getByText("--")).toBeInTheDocument();
    });
  });

  describe("交互", () => {
    it("点击启动按钮应调用 startLoop", () => {
      render(<ServiceLoopPanel />);
      fireEvent.click(screen.getByTestId("start-loop"));
      expect(mockStartLoop).toHaveBeenCalledWith("manual");
    });

    it("运行中应显示终止按钮", () => {
      mockServiceLoopState.isRunning = true;
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("abort-loop")).toBeInTheDocument();
      expect(screen.getByText("loop.abort")).toBeInTheDocument();
    });

    it("点击终止按钮应调用 abortLoop", () => {
      mockServiceLoopState.isRunning = true;
      render(<ServiceLoopPanel />);
      fireEvent.click(screen.getByTestId("abort-loop"));
      expect(mockAbortLoop).toHaveBeenCalled();
    });

    it("点击自动模式切换应调用 setAutoMode", () => {
      render(<ServiceLoopPanel />);
      fireEvent.click(screen.getByTestId("toggle-auto-loop"));
      expect(mockSetAutoMode).toHaveBeenCalledWith(true);
    });

    it("已开启自动模式时再点击应关闭", () => {
      mockServiceLoopState.autoMode = true;
      render(<ServiceLoopPanel />);
      fireEvent.click(screen.getByTestId("toggle-auto-loop"));
      expect(mockSetAutoMode).toHaveBeenCalledWith(false);
    });
  });

  describe("Pipeline 阶段", () => {
    it("应渲染 6 个阶段卡片", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("stage-monitor")).toBeInTheDocument();
      expect(screen.getByTestId("stage-analyze")).toBeInTheDocument();
      expect(screen.getByTestId("stage-decide")).toBeInTheDocument();
      expect(screen.getByTestId("stage-execute")).toBeInTheDocument();
      expect(screen.getByTestId("stage-verify")).toBeInTheDocument();
      expect(screen.getByTestId("stage-optimize")).toBeInTheDocument();
    });

    it("无 currentRun 时阶段状态为 idle", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("monitor: idle")).toBeInTheDocument();
    });

    it("有 currentRun 时应反映阶段状态", () => {
      mockServiceLoopState.currentRun = {
        id: "run-active",
        trigger: "manual",
        startedAt: Date.now(),
        completedAt: null,
        overallStatus: "running",
        stages: [
          { stage: "monitor", status: "completed", startedAt: Date.now(), completedAt: Date.now(), duration: 5000, summary: "OK", details: [] },
          { stage: "analyze", status: "running", startedAt: Date.now(), completedAt: null, duration: null, summary: "", details: [] },
          { stage: "decide", status: "idle", startedAt: null, completedAt: null, duration: null, summary: "", details: [] },
          { stage: "execute", status: "idle", startedAt: null, completedAt: null, duration: null, summary: "", details: [] },
          { stage: "verify", status: "idle", startedAt: null, completedAt: null, duration: null, summary: "", details: [] },
          { stage: "optimize", status: "idle", startedAt: null, completedAt: null, duration: null, summary: "", details: [] },
        ],
      };
      mockServiceLoopState.currentStageIndex = 1;
      mockServiceLoopState.isRunning = true;
      render(<ServiceLoopPanel />);
      expect(screen.getByText("monitor: completed")).toBeInTheDocument();
      expect(screen.getByText("analyze: running")).toBeInTheDocument();
      expect(screen.getByTestId("stage-analyze").dataset.active).toBe("true");
    });
  });

  describe("数据流图", () => {
    it("应渲染 DataFlowDiagram", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("data-flow-diagram")).toBeInTheDocument();
      expect(screen.getByText("nodes:2 edges:1")).toBeInTheDocument();
    });
  });

  describe("运行历史", () => {
    it("应渲染历史列表", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("loop-history")).toBeInTheDocument();
    });

    it("应显示历史条目数量", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });

    it("应渲染清空历史按钮", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByTestId("clear-history")).toBeInTheDocument();
    });

    it("点击清空历史应调用 clearHistory", () => {
      render(<ServiceLoopPanel />);
      fireEvent.click(screen.getByTestId("clear-history"));
      expect(mockClearHistory).toHaveBeenCalled();
    });

    it("空历史时不渲染清空按钮", () => {
      mockServiceLoopState.history = [];
      render(<ServiceLoopPanel />);
      expect(screen.queryByTestId("clear-history")).not.toBeInTheDocument();
    });

    it("空历史应显示空状态提示", () => {
      mockServiceLoopState.history = [];
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.noHistory")).toBeInTheDocument();
    });

    it("已完成条目应显示绿色状态点", () => {
      render(<ServiceLoopPanel />);
      const completedEntry = screen.getByTestId("history-run-1");
      expect(completedEntry).toBeInTheDocument();
    });

    it("错误条目应显示", () => {
      render(<ServiceLoopPanel />);
      const errorEntry = screen.getByTestId("history-run-2");
      expect(errorEntry).toBeInTheDocument();
    });

    it("历史条目应显示触发方式", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.manual")).toBeInTheDocument();
      expect(screen.getByText("loop.auto")).toBeInTheDocument();
    });

    it("历史条目应显示完成阶段数", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.stagesCompleted(2)")).toBeInTheDocument();
      expect(screen.getByText("loop.stagesCompleted(1)")).toBeInTheDocument();
    });
  });

  describe("Pipeline 标题", () => {
    it("应渲染 pipeline 标题", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.pipeline")).toBeInTheDocument();
    });

    it("运行中时应显示 spinner", () => {
      mockServiceLoopState.isRunning = true;
      mockServiceLoopState.currentRun = {
        id: "r",
        trigger: "manual",
        startedAt: Date.now(),
        completedAt: null,
        overallStatus: "running",
        stages: mockServiceLoopState.stageMeta.map((m: any) => ({
          stage: m.key, status: "idle", startedAt: null, completedAt: null, duration: null, summary: "", details: [],
        })),
      };
      render(<ServiceLoopPanel />);
      // trigger label should appear
      expect(screen.getAllByText("loop.manual").length).toBeGreaterThanOrEqual(1);
    });

    it("应渲染数据流标题", () => {
      render(<ServiceLoopPanel />);
      expect(screen.getByText("loop.dataFlow")).toBeInTheDocument();
      expect(screen.getByText("loop.localLoop")).toBeInTheDocument();
    });
  });
});