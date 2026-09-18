/**
 * DesignSystemPage.test.tsx
 * ==========================
 * DesignSystemPage 主页面测试
 *
 * 覆盖范围:
 * - 页面标题
 * - 3 个区域导航 (Design Tokens / 组件库 / 阶段审核)
 * - 区域切换
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DesignSystemPage } from "../components/design-system/DesignSystemPage";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";

function renderPage() {
  const viewValue = {
    breakpoint: "lg" as const,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1280,
    isTouch: false,
  };

  const i18nValue = {
    locale: "zh-CN" as const,
    setLocale: vi.fn(),
    t: (key: string) => key,
    locales: [],
  };

  return render(
    <ViewContext.Provider value={viewValue}>
      <I18nContext.Provider value={i18nValue}>
        <DesignSystemPage />
      </I18nContext.Provider>
    </ViewContext.Provider>
  );
}

describe("DesignSystemPage", () => {
  it("应渲染页面标题", () => {
    renderPage();
    expect(screen.getByText("YYC³ Design System")).toBeInTheDocument();
  });

  it("应有主容器", () => {
    renderPage();
    expect(screen.getByTestId("design-system-page")).toBeInTheDocument();
  });

  it("应有 3 个区域导航", () => {
    renderPage();
    expect(screen.getByTestId("section-tokens")).toBeInTheDocument();
    expect(screen.getByTestId("section-components")).toBeInTheDocument();
    expect(screen.getByTestId("section-review")).toBeInTheDocument();
  });

  it("默认应显示 Design Tokens", () => {
    renderPage();
    expect(screen.getByTestId("design-tokens")).toBeInTheDocument();
  });

  it("点击组件库应切换到 ComponentShowcase", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("section-components"));
    expect(screen.getByTestId("component-showcase")).toBeInTheDocument();
  });

  it("点击阶段审核应切换到 StageReview", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("section-review"));
    expect(screen.getByTestId("stage-review")).toBeInTheDocument();
  });
});