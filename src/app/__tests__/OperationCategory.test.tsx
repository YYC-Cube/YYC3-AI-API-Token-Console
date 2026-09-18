/**
 * OperationCategory.test.tsx
 * ===========================
 * OperationCategory 组件 - 操作分类标签页测试
 *
 * 覆盖范围:
 * - 渲染「全部」+ 5 个分类按钮
 * - 切换分类回调
 * - 激活态样式
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OperationCategory } from "../components/OperationCategory";
import { CATEGORY_META } from "../hooks/useOperationCenter";

describe("OperationCategory", () => {
  let onChange: Mock;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("应渲染「全部」按钮", () => {
    render(<OperationCategory categories={CATEGORY_META} active="all" onChange={onChange} />);
    expect(screen.getByText("全部")).toBeInTheDocument();
  });

  it("应渲染 5 个分类按钮", () => {
    render(<OperationCategory categories={CATEGORY_META} active="all" onChange={onChange} />);
    expect(screen.getByText("节点操作")).toBeInTheDocument();
    expect(screen.getByText("模型操作")).toBeInTheDocument();
    expect(screen.getByText("任务操作")).toBeInTheDocument();
    expect(screen.getByText("系统操作")).toBeInTheDocument();
    expect(screen.getByText("自定义")).toBeInTheDocument();
  });

  it("点击分类应触发 onChange", () => {
    render(<OperationCategory categories={CATEGORY_META} active="all" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("category-node"));
    expect(onChange).toHaveBeenCalledWith("node");
  });

  it("点击全部应触发 onChange('all')", () => {
    render(<OperationCategory categories={CATEGORY_META} active="node" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("category-all"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("激活分类按钮应有对应颜色样式", () => {
    render(<OperationCategory categories={CATEGORY_META} active="node" onChange={onChange} />);
    const btn = screen.getByTestId("category-node");
    expect(btn.style.color).toBe("rgb(0, 212, 255)"); // #00d4ff
  });

  it("非激活分类按钮应有默认透明样式", () => {
    render(<OperationCategory categories={CATEGORY_META} active="node" onChange={onChange} />);
    const btn = screen.getByTestId("category-model");
    expect(btn.className).toContain("text-[rgba(0,212,255,0.4)]");
  });

  it("应有 data-testid", () => {
    render(<OperationCategory categories={CATEGORY_META} active="all" onChange={onChange} />);
    expect(screen.getByTestId("operation-category")).toBeInTheDocument();
  });
});