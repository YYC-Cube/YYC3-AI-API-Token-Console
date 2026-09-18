/**
 * OperationLogStream.test.tsx
 * ============================
 * OperationLogStream 组件 - 实时日志流测试
 *
 * 覆盖范围:
 * - 日志列表渲染
 * - 筛选 Tab 切换
 * - 搜索输入框
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OperationLogStream } from "../components/OperationLogStream";
import type { OperationLogEntry } from "../types";

const mockLogs: OperationLogEntry[] = [
  { id: "log1", timestamp: Date.now(), category: "node",   action: "重启节点 GPU-A100-03", user: "admin",  status: "success", duration: 2500 },
  { id: "log2", timestamp: Date.now() - 60000, category: "model",  action: "部署 LLaMA-70B",       user: "dev_yang", status: "success", duration: 5000 },
  { id: "log3", timestamp: Date.now() - 120000, category: "system", action: "清理推理缓存",         user: "admin",  status: "failed", duration: 800 },
  { id: "log4", timestamp: Date.now() - 180000, category: "task",   action: "暂停推理队列",         user: "admin",  status: "running" },
];

describe("OperationLogStream", () => {
  let onFilterChange: Mock;
  let onSearchChange: Mock;

  beforeEach(() => {
    onFilterChange = vi.fn();
    onSearchChange = vi.fn();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("操作日志")).toBeInTheDocument();
    });

    it("应渲染日志数量", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("(4)")).toBeInTheDocument();
    });

    it("应渲染所有日志操作名", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("重启节点 GPU-A100-03")).toBeInTheDocument();
      expect(screen.getByText("部署 LLaMA-70B")).toBeInTheDocument();
      expect(screen.getByText("清理推理缓存")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("operation-log-stream")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 筛选 Tab
  // ----------------------------------------------------------

  describe("筛选 Tab", () => {
    it("应渲染 4 个筛选按钮", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("实时流")).toBeInTheDocument();
      expect(screen.getByText("按类型")).toBeInTheDocument();
      expect(screen.getByText("按用户")).toBeInTheDocument();
      expect(screen.getByText("搜索")).toBeInTheDocument();
    });

    it("点击搜索 tab 应触发 onFilterChange", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      fireEvent.click(screen.getByTestId("log-filter-search"));
      expect(onFilterChange).toHaveBeenCalledWith("search");
    });
  });

  // ----------------------------------------------------------
  // 搜索
  // ----------------------------------------------------------

  describe("搜索", () => {
    it("filter=search 时应显示搜索框", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="search" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByTestId("log-search-input")).toBeInTheDocument();
    });

    it("filter=all 时不应显示搜索框", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.queryByTestId("log-search-input")).not.toBeInTheDocument();
    });

    it("输入搜索内容应触发 onSearchChange", () => {
      render(
        <OperationLogStream logs={mockLogs} filter="search" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      const input = screen.getByTestId("log-search-input");
      fireEvent.change(input, { target: { value: "重启" } });
      expect(onSearchChange).toHaveBeenCalledWith("重启");
    });
  });

  // ----------------------------------------------------------
  // 空状态
  // ----------------------------------------------------------

  describe("空状态", () => {
    it("无日志时应显示空提示", () => {
      render(
        <OperationLogStream logs={[]} filter="all" onFilterChange={onFilterChange} searchQuery="" onSearchChange={onSearchChange} />
      );
      expect(screen.getByText("暂无操作日志")).toBeInTheDocument();
    });
  });
});