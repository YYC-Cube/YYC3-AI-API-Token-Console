/**
 * LogViewer.test.tsx
 * ===================
 * LogViewer 组件 - 日志查看器测试
 *
 * 覆盖范围:
 * - 日志条目渲染
 * - 级别筛选按钮
 * - 来源筛选下拉框
 * - 搜索输入
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogViewer } from "../components/LogViewer";
import type { LogEntry } from "../types";

const mockLogs: LogEntry[] = [
  { id: "l1", timestamp: Date.now(),        level: "info",  source: "GPU-A100-01", message: "推理完成 延迟 820ms" },
  { id: "l2", timestamp: Date.now() - 60000, level: "warn",  source: "system",      message: "温度接近阈值 78°C" },
  { id: "l3", timestamp: Date.now() - 120000,level: "error", source: "GPU-A100-03", message: "推理超时 5000ms" },
  { id: "l4", timestamp: Date.now() - 180000,level: "debug", source: "scheduler",   message: "心跳 ack 12ms" },
];

const sources = ["GPU-A100-01", "GPU-A100-03", "system", "scheduler"];

describe("LogViewer", () => {
  let onLevelChange: Mock;
  let onSourceChange: Mock;
  let onSearchChange: Mock;

  beforeEach(() => {
    onLevelChange = vi.fn();
    onSourceChange = vi.fn();
    onSearchChange = vi.fn();
  });

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("日志查看器")).toBeInTheDocument();
    });

    it("应渲染日志数量", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("(4 条)")).toBeInTheDocument();
    });

    it("应渲染日志消息", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("推理完成 延迟 820ms")).toBeInTheDocument();
      expect(screen.getByText("推理超时 5000ms")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("log-viewer")).toBeInTheDocument();
    });
  });

  describe("级别筛选", () => {
    it("应渲染 6 个级别按钮", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("level-all")).toBeInTheDocument();
      expect(screen.getByTestId("level-error")).toBeInTheDocument();
      expect(screen.getByTestId("level-warn")).toBeInTheDocument();
    });

    it("点击级别按钮应触发 onLevelChange", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      fireEvent.click(screen.getByTestId("level-error"));
      expect(onLevelChange).toHaveBeenCalledWith("error");
    });
  });

  describe("来源筛选", () => {
    it("应渲染来源下拉框", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("source-filter")).toBeInTheDocument();
    });

    it("更改来源应触发 onSourceChange", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      fireEvent.change(screen.getByTestId("source-filter"), { target: { value: "system" } });
      expect(onSourceChange).toHaveBeenCalledWith("system");
    });
  });

  describe("搜索", () => {
    it("应渲染搜索框", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("log-search")).toBeInTheDocument();
    });

    it("输入搜索应触发 onSearchChange", () => {
      render(
        <LogViewer logs={mockLogs} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={sources} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      fireEvent.change(screen.getByTestId("log-search"), { target: { value: "超时" } });
      expect(onSearchChange).toHaveBeenCalledWith("超时");
    });
  });

  describe("空状态", () => {
    it("无日志时应显示空提示", () => {
      render(
        <LogViewer logs={[]} levelFilter="all" sourceFilter="all" searchQuery=""
          sources={[]} onLevelChange={onLevelChange} onSourceChange={onSourceChange}
          onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("暂无匹配日志")).toBeInTheDocument();
    });
  });
});