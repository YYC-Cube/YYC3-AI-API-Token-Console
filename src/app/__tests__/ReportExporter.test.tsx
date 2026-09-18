/**
 * ReportExporter.test.tsx
 * ========================
 * ReportExporter 组件测试
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { ReportExporter } from "../components/ReportExporter";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

// ── Mock recharts to avoid rendering issues in jsdom ──
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="recharts-responsive">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="recharts-area-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="recharts-line-chart">{children}</div>,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string, vars?: Record<string, string | number>) => {
      const raw = getNestedValue(zhCN as Record<string, any>, key);
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        vars[k] != null ? String(vars[k]) : `{${k}}`
      );
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

describe("ReportExporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page title", () => {
    renderWithProviders(<ReportExporter />);
    expect(screen.getByText("性能报表")).toBeInTheDocument();
  });

  it("renders report type options", () => {
    renderWithProviders(<ReportExporter />);
    expect(screen.getByText("性能分析")).toBeInTheDocument();
    expect(screen.getByText("安全审计")).toBeInTheDocument();
    expect(screen.getByText("操作审计")).toBeInTheDocument();
    expect(screen.getByText("综合分析")).toBeInTheDocument();
  });

  it("renders time range options", () => {
    renderWithProviders(<ReportExporter />);
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText("30d")).toBeInTheDocument();
  });

  it("renders empty state initially", () => {
    renderWithProviders(<ReportExporter />);
    expect(screen.getByText(/选择报表类型和时间范围/)).toBeInTheDocument();
  });

  it("renders recent reports", () => {
    renderWithProviders(<ReportExporter />);
    expect(screen.getByText("历史报表")).toBeInTheDocument();
  });

  it("generates a report on click", () => {
    renderWithProviders(<ReportExporter />);
    const generateBtn = screen.getByText("生成报表");
    fireEvent.click(generateBtn);

    // Should show generating state
    expect(screen.getByText("正在生成...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should show report content
    expect(screen.getByText("节点明细")).toBeInTheDocument();
    expect(screen.getByText("优化建议")).toBeInTheDocument();
    expect(screen.getByText("导出格式")).toBeInTheDocument();
  });

  it("renders export buttons after report generation", () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("CSV / Excel")).toBeInTheDocument();
    expect(screen.getByText("PDF / Print")).toBeInTheDocument();
  });

  it("renders charts after generation", () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("GPU / CPU 利用率趋势")).toBeInTheDocument();
    expect(screen.getByText("P50 延迟趋势")).toBeInTheDocument();
  });

  it("renders node breakdown table", () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("GPU-A100-01")).toBeInTheDocument();
    expect(screen.getByText("GPU-A100-03")).toBeInTheDocument();
  });
});