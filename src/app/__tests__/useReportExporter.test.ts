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

// ============================================================
// 导出链路 (JSON / CSV / 可打印 HTML) — Blob/URL/anchor/window.open 全 stub
// ============================================================

import type { Mock } from "vitest";

describe("useReportExporter 导出链路", () => {
  let downloads: string[];
  let createObjectURL: Mock;
  let revokeObjectURL: Mock;
  let clickSpy: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    downloads = [];
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
    vi.restoreAllMocks();
  });

  /** 生成一份报告并推进 1.5s 延迟 */
  async function generateReadyReport(type?: "audit" | "comprehensive") {
    const { result } = renderHook(() => useReportExporter());
    if (type) {
      act(() => {
        result.current.setReportType(type);
      });
    }
    act(() => {
      result.current.generateReport();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    return result;
  }

  it("exportReport json 应走 Blob 下载链路", async () => {
    const result = await generateReadyReport();

    act(() => {
      result.current.exportReport("json");
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^yyc3-performance-report-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportReport csv 应走 Blob 下载链路", async () => {
    const result = await generateReadyReport();

    act(() => {
      result.current.exportReport("csv");
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads[0]).toMatch(/^yyc3-performance-report-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportReport print 应打开新窗口写入 Blob URL", async () => {
    const result = await generateReadyReport();
    const fakeWin = {
      location: { href: "" },
      document: { close: vi.fn() },
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);

    act(() => {
      result.current.exportReport("print");
    });

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fakeWin.location.href).toBe("blob:mock-url");
    expect(fakeWin.document.close).toHaveBeenCalledTimes(1);

    // 60s 后延迟回收 Blob URL
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("window.open 被拦截 (返回 null) 时 print 导出应静默跳过", async () => {
    const result = await generateReadyReport();
    vi.spyOn(window, "open").mockReturnValue(null);

    act(() => {
      result.current.exportReport("print");
    });

    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("audit 类型报告标题应为操作审计报表", async () => {
    const result = await generateReadyReport("audit");
    expect(result.current.report?.title).toBe("操作审计报表");
    expect(result.current.report?.timeRange.label).toBe("最近 24 小时");
  });
});