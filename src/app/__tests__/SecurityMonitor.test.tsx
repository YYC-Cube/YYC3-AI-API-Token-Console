/**
 * SecurityMonitor.test.tsx
 * =========================
 * 安全与性能监控页面测试
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { SecurityMonitor } from "../components/SecurityMonitor";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

// ── Helper: 深层取值 ──
function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

// ── i18n Mock Provider ──
function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string, vars?: Record<string, string | number>) => {
      const raw = getNestedValue(zhCN as Record<string, any>, key);
      return vars ? interpolate(raw, vars) : raw;
    },
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <I18nContext.Provider value={createI18nValue()}>
        {ui}
      </I18nContext.Provider>
    </MemoryRouter>
  );
}

describe("SecurityMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the title and subtitle", () => {
    renderWithProviders(<SecurityMonitor />);
    expect(screen.getByText("安全与性能监控")).toBeInTheDocument();
    expect(screen.getByText("安全检测 · 性能分析 · 系统诊断 · 数据管理")).toBeInTheDocument();
  });

  it("renders the scan button", () => {
    renderWithProviders(<SecurityMonitor />);
    expect(screen.getByText("开始扫描")).toBeInTheDocument();
  });

  it("shows 'no scan yet' before scanning", () => {
    renderWithProviders(<SecurityMonitor />);
    expect(screen.getByText("尚未扫描")).toBeInTheDocument();
  });

  it("shows scanning state when scan button is clicked", () => {
    renderWithProviders(<SecurityMonitor />);
    const scanBtn = screen.getByText("开始扫描");
    fireEvent.click(scanBtn);
    expect(screen.getByText("扫描中...")).toBeInTheDocument();
  });

  it("shows scan results after scanning completes", () => {
    renderWithProviders(<SecurityMonitor />);
    const scanBtn = screen.getByText("开始扫描");
    fireEvent.click(scanBtn);

    // Advance timer to complete the scan (1800ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // CSP title should appear
    expect(screen.getByText("内容安全策略 (CSP)")).toBeInTheDocument();
    // Cookie title should appear
    expect(screen.getByText("Cookie 安全检查")).toBeInTheDocument();
    // Sensitive data title should appear
    expect(screen.getByText("敏感信息泄漏检测")).toBeInTheDocument();
    // Rescan button should appear
    expect(screen.getByText("重新扫描")).toBeInTheDocument();
  });

  it("switches to performance tab", () => {
    renderWithProviders(<SecurityMonitor />);

    // First scan
    fireEvent.click(screen.getByText("开始扫描"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Switch to performance tab
    const perfTab = screen.getByText("性能监控");
    fireEvent.click(perfTab);

    expect(screen.getByText("资源加载分析")).toBeInTheDocument();
    expect(screen.getByText("内存泄漏检测")).toBeInTheDocument();
  });

  it("switches to diagnostics tab", () => {
    renderWithProviders(<SecurityMonitor />);

    fireEvent.click(screen.getByText("开始扫描"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const diagTab = screen.getByText("系统诊断");
    fireEvent.click(diagTab);

    expect(screen.getByText("设备能力检测")).toBeInTheDocument();
    expect(screen.getByText("网络质量监控")).toBeInTheDocument();
    expect(screen.getByText("浏览器兼容性")).toBeInTheDocument();
  });

  it("switches to data management tab", () => {
    renderWithProviders(<SecurityMonitor />);

    fireEvent.click(screen.getByText("开始扫描"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const dataTab = screen.getByText("数据管理");
    fireEvent.click(dataTab);

    expect(screen.getByText("总存储占用")).toBeInTheDocument();
    expect(screen.getByText("数据同步")).toBeInTheDocument();
    expect(screen.getByText("数据清理")).toBeInTheDocument();
  });

  it("shows overall score after scan", () => {
    renderWithProviders(<SecurityMonitor />);
    fireEvent.click(screen.getByText("开始扫描"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Score label should appear
    expect(screen.getByText("评分")).toBeInTheDocument();
    // Safe label should appear since mock scores are high
    expect(screen.getByText("安全")).toBeInTheDocument();
  });

  it("renders all 4 tab buttons", () => {
    renderWithProviders(<SecurityMonitor />);
    // Desktop shows text labels
    expect(screen.getByText("安全检测")).toBeInTheDocument();
    expect(screen.getByText("性能监控")).toBeInTheDocument();
    expect(screen.getByText("系统诊断")).toBeInTheDocument();
    expect(screen.getByText("数据管理")).toBeInTheDocument();
  });
});