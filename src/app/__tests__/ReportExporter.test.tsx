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
    // P0-4: 报表真实源采集 — 单测零网络红线, URL 路由桩（三源全通）
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/v1/admin/usage/summary")) {
        return { ok: true, json: async () => ({ days: 1, total_calls: 10, total_cost_usd: 0.5, groups: [] }) } as unknown as Response;
      }
      if (url.includes("/v1/models/stats")) {
        return { ok: true, json: async () => [{ model_id: "vllm-flagship", usage_count: 10, avg_latency_ms: 100, error_rate: 0.01, total_tokens: 1000 }] } as unknown as Response;
      }
      if (url.includes("/console/metrics")) {
        return {
          ok: true,
          json: async () => ({
            activeCount: "1/1",
            nodes: [],
            gateway: {
              health: { status: "healthy", system: { cpu_percent: 30, memory_percent: 50, disk_percent: 60 } },
              router: { upstream_pool: [{ name: "vllm-flagship", breaker_state: "closed" }, { name: "bge-embed-nim", status: "open" }] },
            },
          }),
        } as unknown as Response;
      }
      throw new Error("offline: " + url);
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it("generates a report on click", async () => {
    renderWithProviders(<ReportExporter />);
    const generateBtn = screen.getByText("生成报表");
    fireEvent.click(generateBtn);

    // Should show generating state
    expect(screen.getByText("正在生成...")).toBeInTheDocument();

    // P0-4: 真实源 async 采集 — 冲刷微任务（无定时器延迟）
    await act(async () => {});

    // Should show report content
    expect(screen.getByText("节点明细")).toBeInTheDocument();
    expect(screen.getByText("优化建议")).toBeInTheDocument();
    expect(screen.getByText("导出格式")).toBeInTheDocument();
  });

  it("renders export buttons after report generation", async () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    await act(async () => {});

    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(screen.getByText("CSV / Excel")).toBeInTheDocument();
    expect(screen.getByText("PDF / Print")).toBeInTheDocument();
  });

  it("renders charts after generation", async () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    await act(async () => {});

    expect(screen.getByText("GPU / CPU 利用率趋势")).toBeInTheDocument();
    expect(screen.getByText("P50 延迟趋势")).toBeInTheDocument();
  });

  it("renders node breakdown table（真实上游池节点）", async () => {
    renderWithProviders(<ReportExporter />);
    fireEvent.click(screen.getByText("生成报表"));

    await act(async () => {});

    // P0-4: 节点明细 = 网关上游池真实节点（替换 GPU-A100 假节点）
    expect(screen.getByText("vllm-flagship")).toBeInTheDocument();
    expect(screen.getByText("bge-embed-nim")).toBeInTheDocument();
    expect(screen.getByText("nas-gateway")).toBeInTheDocument();
  });
});