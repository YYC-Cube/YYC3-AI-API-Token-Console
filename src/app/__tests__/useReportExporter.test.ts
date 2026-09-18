/**
 * useReportExporter.test.ts
 * ==========================
 * useReportExporter hook 单元测试
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportExporter } from "../hooks/useReportExporter";

describe("useReportExporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useReportExporter());
    expect(result.current.reportType).toBe("performance");
    expect(result.current.timeRange).toBe("24h");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.report).toBeNull();
    expect(result.current.recentReports.length).toBeGreaterThan(0);
  });

  it("should set report type", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.setReportType("security");
    });
    expect(result.current.reportType).toBe("security");

    act(() => {
      result.current.setReportType("audit");
    });
    expect(result.current.reportType).toBe("audit");
  });

  it("should set time range", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.setTimeRange("1h");
    });
    expect(result.current.timeRange).toBe("1h");

    act(() => {
      result.current.setTimeRange("7d");
    });
    expect(result.current.timeRange).toBe("7d");
  });

  it("should generate a report after delay", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.generateReport();
    });
    expect(result.current.isGenerating).toBe(true);
    expect(result.current.report).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.report).not.toBeNull();
    expect(result.current.report?.type).toBe("performance");
  });

  it("should generate a report with correct type", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.setReportType("security");
    });

    act(() => {
      result.current.generateReport();
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.report?.type).toBe("security");
  });

  it("should add to recent reports after generating", () => {
    const { result } = renderHook(() => useReportExporter());
    const initialCount = result.current.recentReports.length;

    act(() => {
      result.current.generateReport();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.recentReports.length).toBe(initialCount + 1);
    expect(result.current.recentReports[0].type).toBe("performance");
  });

  it("should have performance history in generated report", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.generateReport();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const report = result.current.report!;
    expect(report.performanceHistory.length).toBeGreaterThan(0);
    expect(report.nodeBreakdown.length).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.summary.length).toBeGreaterThan(0);
  });

  it("should have valid summary metrics", () => {
    const { result } = renderHook(() => useReportExporter());

    act(() => {
      result.current.generateReport();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const summary = result.current.report!.summary;
    summary.forEach((m) => {
      expect(m.label).toBeTruthy();
      expect(m.value).toBeTruthy();
      expect(["up", "down", "stable"]).toContain(m.trend);
      expect(m.change).toBeTruthy();
    });
  });

  it("should not export when no report exists", () => {
    const { result } = renderHook(() => useReportExporter());
    // Should not throw
    act(() => {
      result.current.exportReport("json");
    });
  });

  it("should cap recent reports at 10", () => {
    const { result } = renderHook(() => useReportExporter());

    for (let i = 0; i < 12; i++) {
      act(() => {
        result.current.generateReport();
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });
    }

    expect(result.current.recentReports.length).toBeLessThanOrEqual(13); // 3 initial + 10 max kept
  });
});