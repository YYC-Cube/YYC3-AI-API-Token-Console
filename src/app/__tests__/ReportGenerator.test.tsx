/**
 * ReportGenerator.test.tsx
 * =========================
 * ReportGenerator 组件 - 报告生成器测试
 *
 * 覆盖范围:
 * - 表单渲染 (类型 / 格式 / 时间范围)
 * - 生成按钮
 * - 已生成报告列表
 * - 预览面板
 * - 复选框选项
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportGenerator } from "../components/ReportGenerator";
import type { ReportResult } from "../types";

const mockReports: ReportResult[] = [
  {
    id: "rpt-1",
    config: { type: "performance", format: "json", dateRange: "today", includeCharts: true, includeRawData: false },
    generatedAt: Date.now() - 3600000,
    filename: "yyc3-performance-2026-02-25.json",
    size: 4500,
    previewContent: '{"report":{"type":"performance"}}',
  },
];

describe("ReportGenerator", () => {
  let onGenerate: Mock;

  beforeEach(() => {
    onGenerate = vi.fn();
  });

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByText("报告生成器")).toBeInTheDocument();
    });

    it("应渲染 4 个报告类型按钮", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("type-performance")).toBeInTheDocument();
      expect(screen.getByTestId("type-health")).toBeInTheDocument();
      expect(screen.getByTestId("type-security")).toBeInTheDocument();
      expect(screen.getByTestId("type-custom")).toBeInTheDocument();
    });

    it("应渲染 3 个格式按钮", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("format-json")).toBeInTheDocument();
      expect(screen.getByTestId("format-markdown")).toBeInTheDocument();
      expect(screen.getByTestId("format-csv")).toBeInTheDocument();
    });

    it("应渲染 3 个时间范围按钮", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("range-today")).toBeInTheDocument();
      expect(screen.getByTestId("range-week")).toBeInTheDocument();
      expect(screen.getByTestId("range-month")).toBeInTheDocument();
    });

    it("应渲染生成按钮", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("generate-btn")).toBeInTheDocument();
    });

    it("应渲染复选框", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("include-charts")).toBeInTheDocument();
      expect(screen.getByTestId("include-rawdata")).toBeInTheDocument();
    });
  });

  describe("生成操作", () => {
    it("点击生成按钮应触发 onGenerate", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      fireEvent.click(screen.getByTestId("generate-btn"));
      expect(onGenerate).toHaveBeenCalledWith({
        type: "performance",
        format: "json",
        dateRange: "today",
        includeCharts: true,
        includeRawData: false,
      });
    });

    it("切换类型后应传递正确 config", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      fireEvent.click(screen.getByTestId("type-health"));
      fireEvent.click(screen.getByTestId("format-markdown"));
      fireEvent.click(screen.getByTestId("range-week"));
      fireEvent.click(screen.getByTestId("generate-btn"));
      expect(onGenerate).toHaveBeenCalledWith({
        type: "health",
        format: "markdown",
        dateRange: "week",
        includeCharts: true,
        includeRawData: false,
      });
    });

    it("isGenerating 时应显示加载状态", () => {
      render(<ReportGenerator reports={[]} isGenerating={true} onGenerate={onGenerate} />);
      expect(screen.getByText("生成中...")).toBeInTheDocument();
    });

    it("isGenerating 时生成按钮应禁用", () => {
      render(<ReportGenerator reports={[]} isGenerating={true} onGenerate={onGenerate} />);
      expect(screen.getByTestId("generate-btn")).toBeDisabled();
    });
  });

  describe("已生成报告", () => {
    it("有报告时应渲染已生成报告列表", () => {
      render(<ReportGenerator reports={mockReports} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.getByTestId("report-list")).toBeInTheDocument();
      expect(screen.getByText("yyc3-performance-2026-02-25.json")).toBeInTheDocument();
    });

    it("点击预览按钮应显示预览内容", () => {
      render(<ReportGenerator reports={mockReports} isGenerating={false} onGenerate={onGenerate} />);
      fireEvent.click(screen.getByTestId("preview-rpt-1"));
      expect(screen.getByTestId("report-preview")).toBeInTheDocument();
    });

    it("无报告时不应渲染报告列表", () => {
      render(<ReportGenerator reports={[]} isGenerating={false} onGenerate={onGenerate} />);
      expect(screen.queryByTestId("report-list")).not.toBeInTheDocument();
    });
  });
});