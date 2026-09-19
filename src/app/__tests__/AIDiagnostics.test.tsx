/**
 * AIDiagnostics.test.tsx
 * ========================
 * AIDiagnostics 组件测试
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AIDiagnostics } from "../components/AIDiagnostics";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";

// ── Mock useWebSocketData ──
vi.mock("../hooks/useWebSocketData", () => ({
  useWebSocketData: () => ({
    connectionState: "simulated",
    reconnectCount: 0,
    lastSyncTime: "2026-03-01 10:00:00",
    liveQPS: 3842,
    qpsTrend: "+12.3%",
    liveLatency: 48,
    latencyTrend: "-5.2%",
    activeNodes: "7/8",
    gpuUtil: "82.4%",
    tokenThroughput: "138K/s",
    storageUsed: "12.8TB",
    nodes: [
      { id: "GPU-A100-01", status: "active", gpu: 87, mem: 72, temp: 68, model: "LLaMA-70B", tasks: 128 },
      { id: "GPU-A100-02", status: "active", gpu: 92, mem: 85, temp: 74, model: "Qwen-72B", tasks: 156 },
      { id: "GPU-A100-03", status: "warning", gpu: 98, mem: 94, temp: 82, model: "DeepSeek-V3", tasks: 89 },
    ],
    throughputHistory: [],
    alerts: [],
    manualReconnect: () => {},
    clearAlerts: () => {},
  }),
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

describe("AIDiagnostics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the page title", () => {
    renderWithProviders(<AIDiagnostics />);
    expect(screen.getByText("AI 辅助诊断")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderWithProviders(<AIDiagnostics />);
    // 以源码 i18n 副标题为准: "模式别 · 异常分析 · ..."
    expect(screen.getByText(/异常分析/)).toBeInTheDocument();
  });

  it("renders the start diagnosis button", () => {
    renderWithProviders(<AIDiagnostics />);
    expect(screen.getByText("启动诊断")).toBeInTheDocument();
  });

  it("renders empty state hint", () => {
    renderWithProviders(<AIDiagnostics />);
    expect(screen.getByText(/点击「启动诊断」/)).toBeInTheDocument();
  });

  it("renders diagnosis history", () => {
    renderWithProviders(<AIDiagnostics />);
    expect(screen.getByText("诊断历史")).toBeInTheDocument();
  });

  it("shows analyzing state when diagnosis starts", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));
    expect(screen.getByText("AI 正在分析...")).toBeInTheDocument();
  });

  it("completes diagnosis and shows summary", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("AI 诊断摘要")).toBeInTheDocument();
    // Summary should mention WebSocket enhancement
    expect(screen.getByText(/WebSocket/)).toBeInTheDocument();
  });

  it("shows view tabs after diagnosis", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("模式识别")).toBeInTheDocument();
    expect(screen.getByText("异常分析")).toBeInTheDocument();
    expect(screen.getByText("解决方案")).toBeInTheDocument();
    expect(screen.getByText("趋势预测")).toBeInTheDocument();
  });

  it("shows pattern cards after diagnosis", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should show pattern with live node data
    expect(screen.getByText(/GPU 利用率/)).toBeInTheDocument();
  });

  it("switches to anomalies view", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    fireEvent.click(screen.getByText("异常分析"));
    // Should show anomaly data with node IDs
    expect(screen.getByText(/GPU-A100/)).toBeInTheDocument();
  });

  it("switches to forecasts view", () => {
    renderWithProviders(<AIDiagnostics />);
    fireEvent.click(screen.getByText("启动诊断"));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    fireEvent.click(screen.getByText("趋势预测"));
    expect(screen.getByText(/未来 24 小时/)).toBeInTheDocument();
  });

  it("disables button during analysis", () => {
    renderWithProviders(<AIDiagnostics />);
    const btn = screen.getByText("启动诊断").closest("button")!;
    fireEvent.click(btn);

    expect(btn).toBeDisabled();
  });
});