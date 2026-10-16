/**
 * AISuggestionPanel.test.tsx
 * ===========================
 * AISuggestionPanel 直连测试 (路由: /ai)
 *
 * 覆盖范围:
 * - 头部渲染: 标题 / 副标题 / Tab 按钮 (analysis | chat)
 * - Tab 切换: chat 显示 SDKChatPanel 且隐藏分析操作区
 * - 健康度色阶四档 (>=80 / >=60 / >=40 / 其余) + 环形图数值
 * - stats 徽标: criticalCount / appliedRecs 的 >0 与 =0 分支
 * - lastAnalyzedAt: null → "--" / <1min / <60min / >=60min 三档时间文案
 * - enabledAutoSuggestion 开关: ToggleRight/ToggleLeft 分支 + 回调取反
 * - isAnalyzing: 分析中禁用 + Loader 文案, 空闲恢复
 * - handleApply: applyingId 置位/复位 (deferred promise)
 * - displayedRecs: 选中模式过滤 / 取消选择还原 / 切换选择
 * - ViewContext: 无 Provider (null) / isMobile true / false 布局分支
 *
 * Mock 契约 (零外部依赖):
 * - useAISuggestion 全 mock (可变状态对象, beforeEach 重置)
 * - useI18n mock: t(key) → key, 带 vars 时附加 ":值" 便于断言插值
 * - PatternAnalyzer / ActionRecommender / SDKChatPanel 皆为轻量桩 (透传回调)
 * - ViewContext 使用真实模块 + Provider 包裹 (null 分支直接裸渲染)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AISuggestionPanel } from "../components/AISuggestionPanel";
import { ViewContext } from "../lib/view-context";
import type { ViewState } from "../types";

// ============================================================
// Mock 中心
// ============================================================

const ai = vi.hoisted(() => ({
  patterns: [{ id: "pat-1" }, { id: "pat-2" }],
  recommendations: [
    { id: "rec-1" },
    { id: "rec-2" },
    { id: "rec-3" },
  ],
  overallHealth: 85,
  isAnalyzing: false,
  lastAnalyzedAt: null as number | null,
  enabledAutoSuggestion: true,
  setEnabledAutoSuggestion: vi.fn((next: boolean) => {
    ai.enabledAutoSuggestion = next;
  }),
  stats: {
    totalPatterns: 2,
    criticalCount: 0,
    pendingRecs: 3,
    appliedRecs: 0,
  },
  runAnalysis: vi.fn(),
  applyRecommendation: vi.fn(() => Promise.resolve()),
  dismissRecommendation: vi.fn(),
  dismissPattern: vi.fn(),
  getRecommendationsForPattern: vi.fn((): { id: string }[] => []),
}));

vi.mock("../hooks/useAISuggestion", () => ({
  useAISuggestion: () => ai,
}));

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${Object.values(vars).join(",")}` : key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: [],
  }),
}));

vi.mock("../components/PatternAnalyzer", () => ({
  PatternAnalyzer: ({
    patterns,
    selectedPatternId,
    onSelectPattern,
    onDismiss,
  }: {
    patterns: { id: string }[];
    selectedPatternId: string | null;
    onSelectPattern: (id: string) => void;
    onDismiss: (id: string) => void;
  }) => (
    <div data-testid="pattern-analyzer">
      <span data-testid="pa-count">{patterns.length}</span>
      <span data-testid="pa-selected">{selectedPatternId ?? "none"}</span>
      <button data-testid="pa-select-1" onClick={() => onSelectPattern("pat-1")}>
        select-1
      </button>
      <button data-testid="pa-select-2" onClick={() => onSelectPattern("pat-2")}>
        select-2
      </button>
      <button data-testid="pa-dismiss" onClick={() => onDismiss("pat-2")}>
        dismiss
      </button>
    </div>
  ),
}));

vi.mock("../components/ActionRecommender", () => ({
  ActionRecommender: ({
    recommendations,
    isApplying,
    onApply,
    onDismiss,
  }: {
    recommendations: { id: string }[];
    isApplying: string | null;
    onApply: (id: string) => void;
    onDismiss: (id: string) => void;
  }) => (
    <div data-testid="action-recommender">
      <span data-testid="ar-count">{recommendations.length}</span>
      <span data-testid="ar-applying">{isApplying ?? "none"}</span>
      <button data-testid="ar-apply" onClick={() => onApply("rec-1")}>
        apply
      </button>
      <button data-testid="ar-dismiss" onClick={() => onDismiss("rec-1")}>
        dismiss
      </button>
    </div>
  ),
}));

vi.mock("../components/SDKChatPanel", () => ({
  SDKChatPanel: () => <div data-testid="sdk-chat-panel" />,
}));

// ============================================================
// Fixtures
// ============================================================

function resetAi() {
  ai.patterns = [{ id: "pat-1" }, { id: "pat-2" }];
  ai.recommendations = [{ id: "rec-1" }, { id: "rec-2" }, { id: "rec-3" }];
  ai.overallHealth = 85;
  ai.isAnalyzing = false;
  ai.lastAnalyzedAt = null;
  ai.enabledAutoSuggestion = true;
  ai.setEnabledAutoSuggestion.mockImplementation((next: boolean) => {
    ai.enabledAutoSuggestion = next;
  });
  ai.stats = { totalPatterns: 2, criticalCount: 0, pendingRecs: 3, appliedRecs: 0 };
  ai.runAnalysis.mockReset();
  ai.applyRecommendation.mockReset();
  ai.applyRecommendation.mockImplementation(() => Promise.resolve());
  ai.dismissRecommendation.mockReset();
  ai.dismissPattern.mockReset();
  ai.getRecommendationsForPattern.mockReset();
  ai.getRecommendationsForPattern.mockImplementation((): { id: string }[] => []);
}

function makeView(isMobile: boolean): ViewState {
  return {
    breakpoint: isMobile ? "sm" : "lg",
    isMobile,
    isTablet: false,
    isDesktop: !isMobile,
    width: isMobile ? 480 : 1200,
    isTouch: false,
  };
}

function renderMobile(ui: React.ReactElement) {
  return render(<ViewContext.Provider value={makeView(true)}>{ui}</ViewContext.Provider>);
}

/** 渲染后取根节点下第 N 个子块 (0=头部, 1=健康度统计格, 2=模式/推荐格) */
function analysisGrid(container: HTMLElement, index: number): Element {
  const root = container.firstChild as HTMLElement;
  return root.children[index]!;
}

beforeEach(() => {
  resetAi();
});

// ============================================================
// 测试
// ============================================================

describe("AISuggestionPanel", () => {
  // ----------------------------------------------------------
  // 头部与默认 Tab
  // ----------------------------------------------------------

  it("无 ViewContext Provider 时应正常渲染 (view=null → isMobile=false)", () => {
    const { container } = render(<AISuggestionPanel />);
    expect(screen.getByText("ai.title")).toBeInTheDocument();
    expect(screen.getByText("ai.subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("tab-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("tab-chat")).toBeInTheDocument();
    // 桌面布局: 统计四列
    expect(analysisGrid(container, 1).className).toContain("grid-cols-4");
    expect(analysisGrid(container, 2).className).toContain("grid-cols-2");
  });

  it("isMobile=true 时应使用移动端栅格", () => {
    const { container } = renderMobile(<AISuggestionPanel />);
    expect(analysisGrid(container, 1).className).toContain("grid-cols-2");
    expect(analysisGrid(container, 2).className).toContain("grid-cols-1");
  });

  it("默认 Tab 为 analysis: 显示分析区, 不显示对话区", () => {
    render(<AISuggestionPanel />);
    expect(screen.getByTestId("pattern-analyzer")).toBeInTheDocument();
    expect(screen.getByTestId("action-recommender")).toBeInTheDocument();
    expect(screen.queryByTestId("sdk-chat-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("toggle-auto")).toBeInTheDocument();
    expect(screen.getByTestId("run-analysis")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Tab 切换
  // ----------------------------------------------------------

  it("切换到 chat Tab 应显示 SDKChatPanel 并隐藏分析操作区", () => {
    render(<AISuggestionPanel />);
    fireEvent.click(screen.getByTestId("tab-chat"));
    expect(screen.getByTestId("sdk-chat-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("pattern-analyzer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("toggle-auto")).not.toBeInTheDocument();
    expect(screen.queryByTestId("run-analysis")).not.toBeInTheDocument();

    // 切回 analysis
    fireEvent.click(screen.getByTestId("tab-analysis"));
    expect(screen.queryByTestId("sdk-chat-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("pattern-analyzer")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 健康度色阶 (四档边界)
  // ----------------------------------------------------------

  it("overallHealth>=80 应使用绿色环 (#00ff88)", () => {
    const { container } = render(<AISuggestionPanel />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(container.querySelector('circle[stroke="#00ff88"]')).not.toBeNull();
  });

  it("overallHealth>=60 应使用黄色环 (#ffaa00)", () => {
    ai.overallHealth = 60;
    const { container } = render(<AISuggestionPanel />);
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(container.querySelector('circle[stroke="#ffaa00"]')).not.toBeNull();
  });

  it("overallHealth>=40 应使用橙色环 (#ff6600)", () => {
    ai.overallHealth = 45;
    const { container } = render(<AISuggestionPanel />);
    expect(container.querySelector('circle[stroke="#ff6600"]')).not.toBeNull();
  });

  it("overallHealth<40 应使用红色环 (#ff0044)", () => {
    ai.overallHealth = 12;
    const { container } = render(<AISuggestionPanel />);
    expect(container.querySelector('circle[stroke="#ff0044"]')).not.toBeNull();
  });

  // ----------------------------------------------------------
  // stats 徽标分支
  // ----------------------------------------------------------

  it("criticalCount>0 应渲染 critical 徽标, appliedRecs>0 应渲染 applied 徽标", () => {
    ai.stats = { totalPatterns: 2, criticalCount: 2, pendingRecs: 3, appliedRecs: 4 };
    render(<AISuggestionPanel />);
    expect(
      screen.getByText("2 ai.severity.critical", { selector: "span" })
    ).toBeInTheDocument();
    expect(screen.getByText("4 ai.applied", { selector: "span" })).toBeInTheDocument();
  });

  it("criticalCount=0 / appliedRecs=0 时不渲染徽标", () => {
    render(<AISuggestionPanel />);
    expect(screen.queryByText("ai.severity.critical")).not.toBeInTheDocument();
    expect(screen.queryByText("ai.applied")).not.toBeInTheDocument();
    // 统计数值本身仍在 (模式数/待处理数)
    expect(screen.getAllByText("2", { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("3", { selector: "span" }).length).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // lastAnalyzedAt 时间文案 (三档 + null)
  // ----------------------------------------------------------

  it("lastAnalyzedAt=null 应显示 --", () => {
    render(<AISuggestionPanel />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("1 分钟内应显示 justNow", () => {
    ai.lastAnalyzedAt = Date.now() - 30 * 1000;
    render(<AISuggestionPanel />);
    expect(screen.getByText("common.justNow")).toBeInTheDocument();
  });

  it("1-60 分钟应显示 minutesAgo 并带分钟数", () => {
    ai.lastAnalyzedAt = Date.now() - 5 * 60000;
    render(<AISuggestionPanel />);
    expect(screen.getByText("common.minutesAgo:5")).toBeInTheDocument();
  });

  it("超过 60 分钟应显示 hoursAgo 并带小时数", () => {
    ai.lastAnalyzedAt = Date.now() - 120 * 60000;
    render(<AISuggestionPanel />);
    expect(screen.getByText("common.hoursAgo:2")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 自动分析开关
  // ----------------------------------------------------------

  it("enabledAutoSuggestion=true 时点击开关应回调取反为 false", () => {
    render(<AISuggestionPanel />);
    fireEvent.click(screen.getByTestId("toggle-auto"));
    expect(ai.setEnabledAutoSuggestion).toHaveBeenCalledWith(false);
  });

  it("enabledAutoSuggestion=false 时点击开关应回调取反为 true", () => {
    ai.enabledAutoSuggestion = false;
    render(<AISuggestionPanel />);
    fireEvent.click(screen.getByTestId("toggle-auto"));
    expect(ai.setEnabledAutoSuggestion).toHaveBeenCalledWith(true);
  });

  // ----------------------------------------------------------
  // 手动重新分析
  // ----------------------------------------------------------

  it("isAnalyzing=false 时按钮可用, 点击应触发 runAnalysis", () => {
    render(<AISuggestionPanel />);
    const btn = screen.getByTestId("run-analysis");
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent("ai.reAnalyze");
    fireEvent.click(btn);
    expect(ai.runAnalysis).toHaveBeenCalledTimes(1);
  });

  it("isAnalyzing=true 时按钮禁用并显示分析中文案", () => {
    ai.isAnalyzing = true;
    render(<AISuggestionPanel />);
    const btn = screen.getByTestId("run-analysis");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("ai.analyzing");
  });

  // ----------------------------------------------------------
  // 推荐应用 (applyingId 置位/复位)
  // ----------------------------------------------------------

  it("应用推荐期间 isApplying 应为该 id, 完成后复位为 null", async () => {
    let resolveApply: () => void = () => {};
    ai.applyRecommendation.mockImplementation(
      () => new Promise<void>((res) => { resolveApply = res; })
    );
    render(<AISuggestionPanel />);
    expect(screen.getByTestId("ar-applying")).toHaveTextContent("none");

    fireEvent.click(screen.getByTestId("ar-apply"));
    expect(ai.applyRecommendation).toHaveBeenCalledWith("rec-1");
    expect(screen.getByTestId("ar-applying")).toHaveTextContent("rec-1");

    await act(async () => { resolveApply(); });
    expect(screen.getByTestId("ar-applying")).toHaveTextContent("none");
  });

  // ----------------------------------------------------------
  // displayedRecs 过滤 (选中 / 取消 / 切换)
  // ----------------------------------------------------------

  it("选中模式后应显示该模式关联推荐, 再次点击取消还原", () => {
    ai.getRecommendationsForPattern.mockReturnValue([{ id: "rec-9" }]);
    render(<AISuggestionPanel />);
    expect(screen.getByTestId("ar-count")).toHaveTextContent("3");
    expect(screen.getByTestId("pa-selected")).toHaveTextContent("none");

    fireEvent.click(screen.getByTestId("pa-select-1"));
    expect(ai.getRecommendationsForPattern).toHaveBeenCalledWith("pat-1");
    expect(screen.getByTestId("pa-selected")).toHaveTextContent("pat-1");
    expect(screen.getByTestId("ar-count")).toHaveTextContent("1");

    // 再次点击同一模式 → 取消选择
    fireEvent.click(screen.getByTestId("pa-select-1"));
    expect(screen.getByTestId("pa-selected")).toHaveTextContent("none");
    expect(screen.getByTestId("ar-count")).toHaveTextContent("3");
  });

  it("从空选择点击另一模式应直接选中 (非取反分支)", () => {
    render(<AISuggestionPanel />);
    fireEvent.click(screen.getByTestId("pa-select-2"));
    expect(screen.getByTestId("pa-selected")).toHaveTextContent("pat-2");
  });

  // ----------------------------------------------------------
  // 忽略回调透传
  // ----------------------------------------------------------

  it("onDismiss 应透传 dismissPattern / dismissRecommendation", () => {
    render(<AISuggestionPanel />);
    fireEvent.click(screen.getByTestId("pa-dismiss"));
    expect(ai.dismissPattern).toHaveBeenCalledWith("pat-2");
    fireEvent.click(screen.getByTestId("ar-dismiss"));
    expect(ai.dismissRecommendation).toHaveBeenCalledWith("rec-1");
  });
});
