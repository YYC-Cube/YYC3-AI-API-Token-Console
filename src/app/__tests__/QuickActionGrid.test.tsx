/**
 * QuickActionGrid.test.tsx
 * =========================
 * QuickActionGrid 组件 - 快速操作网格测试
 *
 * 覆盖范围:
 * - 操作列表渲染
 * - 点击执行回调
 * - 危险操作二次确认
 * - running 状态禁用
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActionGrid } from "../components/QuickActionGrid";
import type { OperationItem } from "../types";

const mockActions: OperationItem[] = [
  { id: "qa1", category: "node",   label: "重启节点",  description: "重启 GPU 节点", icon: "RotateCw", status: "pending" },
  { id: "qa2", category: "model",  label: "部署模型",  description: "部署新模型",    icon: "Upload",   status: "pending" },
  { id: "qa3", category: "system", label: "清理缓存",  description: "清理缓存",     icon: "Trash2",   status: "pending" },
  { id: "qa4", category: "node",   label: "批量重启",  description: "批量重启节点",  icon: "RefreshCw", status: "pending", dangerous: true },
  { id: "qa5", category: "system", label: "执行中操作", description: "测试",         icon: "Terminal",  status: "running" },
];

describe("QuickActionGrid", () => {
  let onExecute: Mock;

  beforeEach(() => {
    onExecute = vi.fn();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染所有操作项", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      expect(screen.getByText("重启节点")).toBeInTheDocument();
      expect(screen.getByText("部署模型")).toBeInTheDocument();
      expect(screen.getByText("清理缓存")).toBeInTheDocument();
      expect(screen.getByText("批量重启")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      expect(screen.getByTestId("quick-action-grid")).toBeInTheDocument();
    });

    it("应渲染操作描述", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      expect(screen.getByText("重启 GPU 节点")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 点击执行
  // ----------------------------------------------------------

  describe("点击执行", () => {
    it("点击普通操作应触发 onExecute", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      fireEvent.click(screen.getByTestId("action-qa1"));
      expect(onExecute).toHaveBeenCalledWith("qa1");
    });

    it("点击危险操作第一次应显示确认提示", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      fireEvent.click(screen.getByTestId("action-qa4"));
      expect(onExecute).not.toHaveBeenCalled();
      expect(screen.getByText("确认 批量重启？")).toBeInTheDocument();
    });

    it("再次点击危险操作应执行", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} />);
      fireEvent.click(screen.getByTestId("action-qa4"));
      fireEvent.click(screen.getByTestId("action-qa4"));
      expect(onExecute).toHaveBeenCalledWith("qa4");
    });

    it("running 状态的操作应禁用", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting="qa5" onExecute={onExecute} />);
      const btn = screen.getByTestId("action-qa5");
      expect(btn).toBeDisabled();
    });
  });

  // ----------------------------------------------------------
  // 移动端
  // ----------------------------------------------------------

  describe("移动端", () => {
    it("isMobile 时应使用 2 列网格", () => {
      render(<QuickActionGrid actions={mockActions} isExecuting={null} onExecute={onExecute} isMobile />);
      const grid = screen.getByTestId("quick-action-grid");
      expect(grid.className).toContain("grid-cols-2");
    });
  });
});