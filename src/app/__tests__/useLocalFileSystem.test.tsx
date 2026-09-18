/**
 * useLocalFileSystem.test.tsx
 * ============================
 * useLocalFileSystem Hook - 本地文件系统状态管理测试
 *
 * 覆盖范围:
 * - 初始状态 (文件树 / 面包屑 / 日志)
 * - 目录导航 + 面包屑更新
 * - 文件选择
 * - goUp 返回上级
 * - 日志筛选 (级别 / 来源 / 搜索)
 * - 报告生成
 * - 格式化工具
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalFileSystem } from "../hooks/useLocalFileSystem";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("useLocalFileSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("fileTree 应有 5 个根目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.fileTree.length).toBe(5);
    });

    it("currentPath 默认为 ~/.yyc3-cloudpivot", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot");
    });

    it("currentItems 应返回 5 个根目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.currentItems.length).toBe(5);
    });

    it("breadcrumbs 初始只有根路径", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.breadcrumbs.length).toBe(1);
      expect(result.current.breadcrumbs[0].label).toBe("~/.yyc3-cloudpivot");
    });

    it("selectedFile 初始为 null", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.selectedFile).toBeNull();
    });

    it("logs 应有初始数据", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.allLogs.length).toBe(50);
    });

    it("reports 初始为空", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.reports.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 目录导航
  // ----------------------------------------------------------

  describe("目录导航", () => {
    it("navigateTo 应更新 currentPath", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs");
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("导航后 breadcrumbs 应更新", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs/node");
      });
      expect(result.current.breadcrumbs.length).toBe(3);
      expect(result.current.breadcrumbs[2].label).toBe("node");
    });

    it("导航后 currentItems 应返回子目录", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs");
      });
      expect(result.current.currentItems.length).toBe(2); // node, system
    });

    it("selectFile 对目录应导航进入", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const logsDir = result.current.currentItems.find((f) => f.name === "logs")!;
      act(() => {
        result.current.selectFile(logsDir);
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("selectFile 对文件应设置 selectedFile", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/configs");
      });
      const file = result.current.currentItems.find((f) => f.name === "patrol.json")!;
      act(() => {
        result.current.selectFile(file);
      });
      expect(result.current.selectedFile?.name).toBe("patrol.json");
    });
  });

  // ----------------------------------------------------------
  // goUp
  // ----------------------------------------------------------

  describe("goUp", () => {
    it("在子目录时应返回上级", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.navigateTo("~/.yyc3-cloudpivot/logs/node");
      });
      act(() => {
        result.current.goUp();
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot/logs");
    });

    it("在根目录时 goUp 不做任何操作", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.goUp();
      });
      expect(result.current.currentPath).toBe("~/.yyc3-cloudpivot");
    });
  });

  // ----------------------------------------------------------
  // 日志筛选
  // ----------------------------------------------------------

  describe("日志筛选", () => {
    it("按级别 error 筛选", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.setLogLevelFilter("error");
      });
      expect(result.current.logs.every((l) => l.level === "error")).toBe(true);
      expect(result.current.logs.length).toBeGreaterThan(0);
    });

    it("按来源筛选", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const source = result.current.logSources[0];
      act(() => {
        result.current.setLogSourceFilter(source);
      });
      expect(result.current.logs.every((l) => l.source === source)).toBe(true);
    });

    it("搜索日志", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      act(() => {
        result.current.setLogSearchQuery("推理");
      });
      expect(result.current.logs.every((l) => l.message.includes("推理") || l.source.includes("推理"))).toBe(true);
    });

    it("logSources 应有去重的来源列表", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      const unique = new Set(result.current.logSources);
      expect(result.current.logSources.length).toBe(unique.size);
    });
  });

  // ----------------------------------------------------------
  // 报告生成
  // ----------------------------------------------------------

  describe("报告生成", () => {
    it("生成 JSON 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "performance",
          format: "json",
          dateRange: "today",
          includeCharts: true,
          includeRawData: false,
        });
      });
      expect(result.current.reports.length).toBe(1);
      expect(result.current.reports[0].filename).toContain(".json");
      expect(result.current.reports[0].previewContent).toContain("nodeHealth");
    });

    it("生成 Markdown 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "health",
          format: "markdown",
          dateRange: "week",
          includeCharts: false,
          includeRawData: true,
        });
      });
      expect(result.current.reports.length).toBe(1);
      expect(result.current.reports[0].filename).toContain(".md");
      expect(result.current.reports[0].previewContent).toContain("# YYC³");
    });

    it("生成 CSV 报告", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      await act(async () => {
        await result.current.generateReport({
          type: "security",
          format: "csv",
          dateRange: "month",
          includeCharts: false,
          includeRawData: true,
        });
      });
      expect(result.current.reports[0].filename).toContain(".csv");
    });

    it("isGenerating 在生成过程中应为 true", async () => {
      const { result } = renderHook(() => useLocalFileSystem());
      let wasGenerating = false;

      const promise = act(async () => {
        const p = result.current.generateReport({
          type: "performance", format: "json", dateRange: "today",
          includeCharts: false, includeRawData: false,
        });
        // Check immediately after call
        wasGenerating = result.current.isGenerating;
        await p;
      });

      await promise;
      expect(result.current.isGenerating).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // formatSize
  // ----------------------------------------------------------

  describe("formatSize", () => {
    it("应格式化字节", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(500)).toBe("500B");
    });

    it("应格式化 KB", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(2048)).toBe("2.0KB");
    });

    it("应格式化 MB", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(2400000)).toBe("2.3MB");
    });

    it("null/undefined 返回 --", () => {
      const { result } = renderHook(() => useLocalFileSystem());
      expect(result.current.formatSize(undefined)).toBe("--");
    });
  });
});