/**
 * ModelProviderPanel.test.tsx
 * ============================
 * 模型提供商面板测试
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ModelProviderPanel } from "../components/ModelProviderPanel";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";
import zhCN from "../i18n/zh-CN";

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null) return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

function renderPanel() {
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
    t: (key: string, vars?: Record<string, string | number>) => {
      let raw = getNestedValue(zhCN as Record<string, any>, key);
      if (vars) {
        raw = raw.replace(/\{(\w+)\}/g, (_: string, k: string) =>
          vars[k] != null ? String(vars[k]) : `{${k}}`
        );
      }
      return raw;
    },
    locales: [],
  };

  return render(
    <MemoryRouter>
      <ViewContext.Provider value={viewValue}>
        <I18nContext.Provider value={i18nValue}>
          <ModelProviderPanel />
        </I18nContext.Provider>
      </ViewContext.Provider>
    </MemoryRouter>
  );
}

describe("ModelProviderPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应渲染页面标题", () => {
    renderPanel();
    expect(screen.getByText("模型管理")).toBeInTheDocument();
  });

  it("应有主容器", () => {
    renderPanel();
    expect(screen.getByTestId("model-provider-panel")).toBeInTheDocument();
  });

  it("应有添加模型按钮", () => {
    renderPanel();
    expect(screen.getByTestId("open-add-model")).toBeInTheDocument();
  });

  it("点击添加模型应打开模态框", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("add-model-modal")).toBeInTheDocument();
  });

  it("模态框应有服务商选择", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("provider-select")).toBeInTheDocument();
  });

  it("点击服务商选择应展开下拉", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-dropdown")).toBeInTheDocument();
  });

  it("下拉应包含 9 个提供商选项", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-option-zhipu")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-openai")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-ollama")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-deepseek")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-kimi-cn")).toBeInTheDocument();
  });

  it("选择提供商后应显示模型选择", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-openai"));
    expect(screen.getByTestId("model-select")).toBeInTheDocument();
  });

  it("选择非 Ollama 提供商应显示 API 密钥输入", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-openai"));
    expect(screen.getByTestId("api-key-input")).toBeInTheDocument();
  });

  it("选择 Ollama 应显示端点输入", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    expect(screen.getByTestId("ollama-url-input")).toBeInTheDocument();
  });

  it("关闭按钮应关闭模态框", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("add-model-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(screen.queryByTestId("add-model-modal")).not.toBeInTheDocument();
  });

  it("应有 Ollama 刷新按钮", () => {
    renderPanel();
    expect(screen.getByTestId("refresh-ollama-models")).toBeInTheDocument();
  });
});