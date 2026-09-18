/**
 * filesystem-types.test.ts
 * =========================
 * 本地文件系统 + 快捷键 类型定义验证
 *
 * 覆盖范围:
 * - FileItem / FileItemType
 * - LogEntry / LogLevel
 * - ReportConfig / ReportResult / ReportType / ReportFormat
 * - KeyboardShortcut
 */

import { describe, it, expect } from "vitest";
import type {
  FileItem,
  FileItemType,
  LogEntry,
  LogLevel,
  ReportConfig,
  ReportResult,
  ReportType,
  ReportFormat,
  KeyboardShortcut,
} from "../types";

describe("本地文件系统类型定义 (第 13 类)", () => {
  it("FileItemType 应支持 file 和 directory", () => {
    const types: FileItemType[] = ["file", "directory"];
    expect(types.length).toBe(2);
  });

  it("FileItem 应支持完整目录定义", () => {
    const dir: FileItem = {
      id: "d1",
      name: "logs",
      type: "directory",
      path: "~/.yyc3-cloudpivot/logs",
      modifiedAt: Date.now(),
      children: [],
    };
    expect(dir.type).toBe("directory");
  });

  it("FileItem 应支持完整文件定义", () => {
    const file: FileItem = {
      id: "f1",
      name: "app.log",
      type: "file",
      size: 1200000,
      path: "~/.yyc3-cloudpivot/logs/app.log",
      extension: "log",
      modifiedAt: Date.now(),
    };
    expect(file.extension).toBe("log");
  });

  it("LogLevel 应支持 5 种级别", () => {
    const levels: LogLevel[] = ["debug", "info", "warn", "error", "fatal"];
    expect(levels.length).toBe(5);
  });

  it("LogEntry 应有完整字段", () => {
    const entry: LogEntry = {
      id: "l1",
      timestamp: Date.now(),
      level: "error",
      source: "GPU-A100-03",
      message: "推理超时",
      detail: "超过 5000ms",
    };
    expect(entry.level).toBe("error");
  });

  it("ReportType 应支持 4 种", () => {
    const types: ReportType[] = ["performance", "health", "security", "custom"];
    expect(types.length).toBe(4);
  });

  it("ReportFormat 应支持 3 种", () => {
    const formats: ReportFormat[] = ["json", "markdown", "csv"];
    expect(formats.length).toBe(3);
  });

  it("ReportConfig 应有完整字段", () => {
    const config: ReportConfig = {
      type: "performance",
      format: "json",
      dateRange: "today",
      includeCharts: true,
      includeRawData: false,
    };
    expect(config.type).toBe("performance");
  });

  it("ReportResult 应有完整字段", () => {
    const result: ReportResult = {
      id: "rpt-1",
      config: { type: "health", format: "markdown", dateRange: "week", includeCharts: false, includeRawData: true },
      generatedAt: Date.now(),
      filename: "report.md",
      size: 4500,
      previewContent: "# Report",
    };
    expect(result.filename).toBe("report.md");
  });
});

describe("快捷键类型定义 (第 14 类)", () => {
  it("KeyboardShortcut 应有完整字段", () => {
    const shortcut: KeyboardShortcut = {
      id: "operations",
      keys: "⌘+Shift+O",
      description: "操作中心",
      category: "全局",
      action: () => {},
    };
    expect(shortcut.keys).toBe("⌘+Shift+O");
  });
});