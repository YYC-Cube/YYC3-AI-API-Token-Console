/**
 * FollowUpPanel.test.tsx
 * =======================
 * FollowUpPanel.tsx — 一键跟进系统主面板
 *
 * 覆盖范围:
 * - 头部 / 统计卡 (mock useFollowUp)
 * - 严重级别与状态过滤按钮交互
 * - 卡片列表渲染 + compact 透传 / 空列表占位
 * - 抽屉状态透传
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../hooks/useFollowUp", async () => {
  const { vi } = await import("vitest");
  return { useFollowUp: vi.fn() };
});

vi.mock("../components/FollowUpCard", () => ({
  FollowUpCard: (props: any) => (
    <div data-testid="fu-card" data-compact={String(!!props.compact)}>{props.item.title}</div>
  ),
}));

vi.mock("../components/FollowUpDrawer", () => ({
  FollowUpDrawer: (props: any) => (
    <div data-testid="fu-drawer" data-open={String(props.isOpen)} />
  ),
}));

import { FollowUpPanel } from "../components/FollowUpPanel";
import { ViewContext } from "../lib/view-context";
import { useFollowUp } from "../hooks/useFollowUp";

const followUpItems = [
  { id: "AL-1", severity: "critical", title: "GPU 推理延迟", source: "GPU-A100-03", status: "active", timestamp: Date.now(), chain: [] },
  { id: "AL-2", severity: "info", title: "DB 连接池告警", source: "NAS", status: "resolved", timestamp: Date.now(), chain: [] },
];

/** 构造 useFollowUp 可控返回 (每次新建 mock fn, 自包含) */
function makeFollowUpReturn(overrides: Record<string, unknown> = {}) {
  return {
    items: followUpItems,
    allItems: followUpItems,
    stats: { total: 5, critical: 1, error: 2, warning: 1, investigating: 1, resolved: 1 },
    drawerItem: null,
    drawerOpen: false,
    filterSeverity: "all",
    filterStatus: "all",
    setFilterSeverity: vi.fn(),
    setFilterStatus: vi.fn(),
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    quickFix: vi.fn(),
    markResolved: vi.fn(),
    ...overrides,
  } as any;
}

let current: ReturnType<typeof makeFollowUpReturn>;

function renderPanel(isMobile = false) {
  return render(
    <ViewContext.Provider value={{ isMobile } as any}>
      <FollowUpPanel />
    </ViewContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  current = makeFollowUpReturn();
  vi.mocked(useFollowUp).mockReturnValue(current);
});

describe("FollowUpPanel", () => {
  it("应渲染头部标题 / 副标题 / 总数", () => {
    renderPanel();
    expect(screen.getByText("followUp.title")).toBeInTheDocument();
    expect(screen.getByText("followUp.subtitle")).toBeInTheDocument();
    expect(screen.getByText("5 common.all")).toBeInTheDocument();
  });

  it("应渲染 4 张统计卡数值", () => {
    renderPanel();
    // label 文案同时出现在过滤行与统计卡, 用 getAllByText 断言
    expect(screen.getAllByText("ai.severity.critical").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("common.error").length).toBeGreaterThanOrEqual(1);
    // error 计数 2 唯一出现于统计卡数值
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("应渲染严重级别过滤按钮并响应点击", () => {
    renderPanel();
    // severity error 按钮计数 "(2)" 唯一, 借此定位按钮
    fireEvent.click(screen.getByText("(2)").closest("button")!);
    expect(current.setFilterSeverity).toHaveBeenCalledWith("error");
  });

  it("应渲染状态过滤按钮并响应点击", () => {
    renderPanel();
    // 状态行按钮无图标, 直接匹配其文案 (统计卡内同名文案在 span 中, closest 不命中 button)
    const statusBtn = screen.getAllByText("followUp.markResolved").find(
      (el) => el.closest("button") !== null && el.textContent === "followUp.markResolved",
    )!.closest("button")!;
    fireEvent.click(statusBtn);
    expect(current.setFilterStatus).toHaveBeenCalledWith("resolved");
  });

  it("应渲染告警卡片列表", () => {
    renderPanel();
    const cards = screen.getAllByTestId("fu-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("GPU 推理延迟");
    expect(cards[1]).toHaveTextContent("DB 连接池告警");
  });

  it("桌面端卡片应为非 compact, 移动端为 compact", () => {
    const { rerender } = renderPanel(false);
    expect(screen.getAllByTestId("fu-card")[0]).toHaveAttribute("data-compact", "false");

    rerender(
      <ViewContext.Provider value={{ isMobile: true } as any}>
        <FollowUpPanel />
      </ViewContext.Provider>,
    );
    expect(screen.getAllByTestId("fu-card")[0]).toHaveAttribute("data-compact", "true");
  });

  it("抽屉默认关闭", () => {
    renderPanel();
    expect(screen.getByTestId("fu-drawer")).toHaveAttribute("data-open", "false");
  });

  it("无告警项时应显示空态占位", () => {
    vi.mocked(useFollowUp).mockReturnValueOnce(
      makeFollowUpReturn({
        items: [],
        allItems: [],
        stats: { total: 0, critical: 0, error: 0, warning: 0, investigating: 0, resolved: 0 },
      }),
    );
    renderPanel();
    expect(screen.queryByTestId("fu-card")).not.toBeInTheDocument();
    expect(screen.getByText("common.noData")).toBeInTheDocument();
    expect(screen.getByText("palette.noResults")).toBeInTheDocument();
  });
});
