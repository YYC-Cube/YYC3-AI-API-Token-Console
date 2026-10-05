/**
 * OperationCenter.test.tsx
 * =========================
 * OperationCenter.tsx — 操作中心主界面
 *
 * 覆盖范围:
 * - 头部标题 / 快捷操作计数
 * - 四大子区块透传渲染 (mock)
 * - ViewContext isMobile 透传
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("../hooks/useOperationCenter", () => ({
  useOperationCenter: () => ({
    categories: [{ id: "gpu" }, { id: "db" }],
    activeCategory: "gpu",
    setActiveCategory: vi.fn(),
    actions: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
    isExecuting: false,
    executeAction: vi.fn(),
    templates: [{ id: "t1" }],
    runTemplate: vi.fn(),
    addTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    logs: [{ id: "l1" }],
    logFilter: "all",
    setLogFilter: vi.fn(),
    searchQuery: "",
    setSearchQuery: vi.fn(),
  }),
}));

vi.mock("../components/OperationCategory", () => ({
  OperationCategory: (props: any) => (
    <div data-testid="op-category" data-active={String(props.active)} data-count={props.categories.length} />
  ),
}));

vi.mock("../components/QuickActionGrid", () => ({
  QuickActionGrid: (props: any) => (
    <div data-testid="quick-grid" data-mobile={String(props.isMobile)} data-count={props.actions.length} />
  ),
}));

vi.mock("../components/OperationTemplate", () => ({
  OperationTemplate: () => <div data-testid="op-templates" />,
}));

vi.mock("../components/OperationLogStream", () => ({
  OperationLogStream: (props: any) => (
    <div data-testid="log-stream" data-mobile={String(props.isMobile)} />
  ),
}));

import { OperationCenter } from "../components/OperationCenter";
import { ViewContext } from "../lib/view-context";

function renderOp(isMobile: boolean) {
  return render(
    <ViewContext.Provider value={{ isMobile } as any}>
      <OperationCenter />
    </ViewContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OperationCenter", () => {
  it("应渲染头部标题 / 副标题 / 快捷操作计数", () => {
    renderOp(false);
    expect(screen.getByText("operations.title")).toBeInTheDocument();
    expect(screen.getByText("operations.subtitle")).toBeInTheDocument();
    expect(screen.getByText("operations.quickActions")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("应透传分类与操作数据到子区块", () => {
    renderOp(false);
    expect(screen.getByTestId("op-category")).toHaveAttribute("data-active", "gpu");
    expect(screen.getByTestId("op-category")).toHaveAttribute("data-count", "2");
    expect(screen.getByTestId("quick-grid")).toHaveAttribute("data-count", "3");
    expect(screen.getByTestId("op-templates")).toBeInTheDocument();
    expect(screen.getByTestId("log-stream")).toBeInTheDocument();
  });

  it("桌面端 isMobile=false 应透传给网格与日志流", () => {
    renderOp(false);
    expect(screen.getByTestId("quick-grid")).toHaveAttribute("data-mobile", "false");
    expect(screen.getByTestId("log-stream")).toHaveAttribute("data-mobile", "false");
  });

  it("移动端 isMobile=true 应透传 (ViewContext 缺省时为 false)", () => {
    const { rerender } = renderOp(true);
    expect(screen.getByTestId("quick-grid")).toHaveAttribute("data-mobile", "true");
    expect(screen.getByTestId("log-stream")).toHaveAttribute("data-mobile", "true");

    rerender(<OperationCenter />);
    expect(screen.getByTestId("quick-grid")).toHaveAttribute("data-mobile", "false");
  });
});
