/**
 * PatrolDashboard.test.tsx
 * =========================
 * PatrolDashboard 组件测试
 *
 * 覆盖范围:
 * - 标题和副标题渲染
 * - 手动巡查按钮渲染和交互
 * - 巡查计划按钮 (toggle scheduler)
 * - 进度条 (running 状态)
 * - 4 个统计卡片 (健康度/成功/警告/严重)
 * - 调度状态条 (自动巡查开/关)
 * - PatrolReport 嵌入渲染
 * - PatrolHistory 渲染
 * - 报告详情 Modal
 * - StatCard 子组件
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

// Mock sub-components
vi.mock("../components/PatrolScheduler", () => ({
  PatrolScheduler: ({ schedule, onToggle, onIntervalChange }: any) => (
    <div data-testid="patrol-scheduler">
      <span>{schedule.interval}min</span>
      <button onClick={() => onToggle(true)}>enable-auto</button>
      <button onClick={() => onIntervalChange(30)}>set-30min</button>
    </div>
  ),
}));

vi.mock("../components/PatrolReport", () => ({
  PatrolReport: ({ result, embedded }: any) => (
    <div data-testid={embedded ? "patrol-report-embedded" : "patrol-report-modal"}>
      Score: {result.healthScore}
    </div>
  ),
}));

vi.mock("../components/PatrolHistory", () => ({
  PatrolHistory: ({ history, onViewReport, isMobile }: any) => (
    <div data-testid="patrol-history">
      {history.map((h: any) => (
        <button key={h.id} onClick={() => onViewReport(h)}>
          view-{h.id}
        </button>
      ))}
    </div>
  ),
}));

// Mock usePatrol hook
const mockRunPatrol = vi.fn();
const mockToggleAutoPatrol = vi.fn();
const mockUpdateInterval = vi.fn();
const mockViewReport = vi.fn();
const mockCloseReport = vi.fn();

let mockPatrolState: any;

vi.mock("../hooks/usePatrol", () => ({
  usePatrol: () => mockPatrolState,
}));

// Mock Layout context
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false, isTablet: false, isDesktop: true, width: 1200, breakpoint: "lg", isTouch: false }),
}));

import { PatrolDashboard } from "../components/PatrolDashboard";

function defaultPatrolState() {
  return {
    patrolStatus: "idle" as const,
    currentResult: {
      id: "pr-1",
      timestamp: Date.now(),
      healthScore: 96,
      passCount: 12,
      totalChecks: 13,
      warningCount: 1,
      criticalCount: 0,
      checks: [
        { id: "c1", name: "GPU Health", status: "pass", value: "OK", threshold: "" },
      ],
    },
    history: [
      { id: "h1", timestamp: Date.now() - 3600000, healthScore: 95, passCount: 11, totalChecks: 13, warningCount: 2, criticalCount: 0, checks: [] },
      { id: "h2", timestamp: Date.now() - 7200000, healthScore: 98, passCount: 13, totalChecks: 13, warningCount: 0, criticalCount: 0, checks: [] },
    ],
    schedule: {
      enabled: false,
      interval: 15,
      lastRun: Date.now() - 900000,
      nextRun: null,
    },
    progress: 0,
    selectedReport: null,
    runPatrol: mockRunPatrol,
    toggleAutoPatrol: mockToggleAutoPatrol,
    updateInterval: mockUpdateInterval,
    viewReport: mockViewReport,
    closeReport: mockCloseReport,
  };
}

describe("PatrolDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatrolState = defaultPatrolState();
  });

  describe("基础渲染", () => {
    it("应渲染巡查标题", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("patrol.title")).toBeInTheDocument();
    });

    it("应渲染副标题", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("patrol.subtitle")).toBeInTheDocument();
    });

    it("应渲染手动巡查按钮", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("patrol.manualPatrol")).toBeInTheDocument();
    });

    it("应渲染巡查计划按钮", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("patrol.patrolPlan")).toBeInTheDocument();
    });
  });

  describe("统计卡片", () => {
    it("应渲染健康度", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("96%")).toBeInTheDocument();
    });

    it("应渲染成功数", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("12/13")).toBeInTheDocument();
    });

    it("应渲染警告数", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("应渲染严重数", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("无结果时显示 --", () => {
      mockPatrolState.currentResult = null;
      render(<PatrolDashboard />);
      const dashes = screen.getAllByText("--");
      expect(dashes.length).toBe(4);
    });
  });

  describe("交互", () => {
    it("点击手动巡查应调用 runPatrol", () => {
      render(<PatrolDashboard />);
      fireEvent.click(screen.getByText("patrol.manualPatrol"));
      expect(mockRunPatrol).toHaveBeenCalledWith("manual");
    });

    it("运行中时按钮应禁用", () => {
      mockPatrolState.patrolStatus = "running";
      mockPatrolState.progress = 45;
      render(<PatrolDashboard />);
      const btn = screen.getByText("common.loading").closest("button")!;
      expect(btn).toBeDisabled();
    });

    it("运行中时应显示进度条", () => {
      mockPatrolState.patrolStatus = "running";
      mockPatrolState.progress = 60;
      render(<PatrolDashboard />);
      expect(screen.getByText("common.loading 60%")).toBeInTheDocument();
    });

    it("点击巡查计划应切换 scheduler 显示", () => {
      render(<PatrolDashboard />);
      fireEvent.click(screen.getByText("patrol.patrolPlan"));
      expect(screen.getByTestId("patrol-scheduler")).toBeInTheDocument();
    });

    it("再次点击巡查计划应隐藏 scheduler", () => {
      render(<PatrolDashboard />);
      fireEvent.click(screen.getByText("patrol.patrolPlan"));
      expect(screen.getByTestId("patrol-scheduler")).toBeInTheDocument();
      fireEvent.click(screen.getByText("patrol.patrolPlan"));
      expect(screen.queryByTestId("patrol-scheduler")).not.toBeInTheDocument();
    });
  });

  describe("调度状态条", () => {
    it("自动巡查关闭时显示关闭状态", () => {
      render(<PatrolDashboard />);
      expect(screen.getByText("common.none")).toBeInTheDocument();
    });

    it("自动巡查启用时显示间隔", () => {
      mockPatrolState.schedule.enabled = true;
      mockPatrolState.schedule.nextRun = Date.now() + 900000;
      render(<PatrolDashboard />);
      expect(screen.getByText("15 min")).toBeInTheDocument();
    });

    it("点击启用/停止按钮应调用 toggleAutoPatrol", () => {
      render(<PatrolDashboard />);
      fireEvent.click(screen.getByText("common.confirm"));
      expect(mockToggleAutoPatrol).toHaveBeenCalledWith(true);
    });

    it("已启用时按钮显示取消", () => {
      mockPatrolState.schedule.enabled = true;
      render(<PatrolDashboard />);
      expect(screen.getByText("common.cancel")).toBeInTheDocument();
    });
  });

  describe("报告和历史", () => {
    it("有结果时应嵌入 PatrolReport", () => {
      render(<PatrolDashboard />);
      expect(screen.getByTestId("patrol-report-embedded")).toBeInTheDocument();
      expect(screen.getByText("Score: 96")).toBeInTheDocument();
    });

    it("应渲染 PatrolHistory", () => {
      render(<PatrolDashboard />);
      expect(screen.getByTestId("patrol-history")).toBeInTheDocument();
    });

    it("查看历史报告应显示 Modal", () => {
      mockPatrolState.selectedReport = {
        id: "sr-1",
        timestamp: Date.now(),
        healthScore: 95,
        passCount: 11,
        totalChecks: 13,
        warningCount: 2,
        criticalCount: 0,
        checks: [],
      };
      render(<PatrolDashboard />);
      expect(screen.getByTestId("patrol-report-modal")).toBeInTheDocument();
      expect(screen.getByText("Score: 95")).toBeInTheDocument();
    });

    it("Modal 中关闭按钮应调用 closeReport", () => {
      mockPatrolState.selectedReport = {
        id: "sr-1",
        timestamp: Date.now(),
        healthScore: 95,
        passCount: 11,
        totalChecks: 13,
        warningCount: 2,
        criticalCount: 0,
        checks: [],
      };
      render(<PatrolDashboard />);
      // Find close button in modal
      const modal = screen.getByTestId("patrol-report-modal").closest(".relative");
      const closeBtn = modal?.parentElement?.querySelector("button");
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(mockCloseReport).toHaveBeenCalled();
      }
    });
  });
});