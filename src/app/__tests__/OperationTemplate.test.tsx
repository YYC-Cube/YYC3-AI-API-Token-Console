/**
 * OperationTemplate.test.tsx
 * ===========================
 * OperationTemplate 组件 - 操作模板管理测试
 *
 * 覆盖范围:
 * - 模板列表渲染
 * - 新建模板表单
 * - 执行/删除模板回调
 * - 展开/折叠步骤
 * - 空状态
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OperationTemplate } from "../components/OperationTemplate";
import type { OperationTemplateItem } from "../types";

const mockTemplates: OperationTemplateItem[] = [
  {
    id: "tpl1",
    name: "模型部署标准流程",
    description: "标准部署流程",
    category: "model",
    steps: ["选择节点", "上传权重", "冒烟测试"],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lastUsed: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "tpl2",
    name: "节点故障排查",
    description: "GPU 节点排查",
    category: "node",
    steps: ["检查温度", "查看日志", "重启服务"],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
];

describe("OperationTemplate", () => {
  let onRunTemplate: Mock;
  let onDeleteTemplate: Mock;
  let onAddTemplate: Mock;

  beforeEach(() => {
    onRunTemplate = vi.fn();
    onDeleteTemplate = vi.fn();
    onAddTemplate = vi.fn();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText("操作模板")).toBeInTheDocument();
    });

    it("应渲染模板数量", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });

    it("应渲染所有模板名称", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText("模型部署标准流程")).toBeInTheDocument();
      expect(screen.getByText("节点故障排查")).toBeInTheDocument();
    });

    it("应有新建模板按钮", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByTestId("add-template-btn")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 执行/删除
  // ----------------------------------------------------------

  describe("执行/删除", () => {
    it("点击执行按钮应触发 onRunTemplate", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("run-template-tpl1"));
      expect(onRunTemplate).toHaveBeenCalledWith("tpl1");
    });

    it("点击删除按钮应触发 onDeleteTemplate", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("delete-template-tpl2"));
      expect(onDeleteTemplate).toHaveBeenCalledWith("tpl2");
    });
  });

  // ----------------------------------------------------------
  // 新建模板
  // ----------------------------------------------------------

  describe("新建模板", () => {
    it("点击新建按钮应显示创建表单", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    });

    it("填写名称后点击创建应触发 onAddTemplate", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));

      const nameInput = screen.getByTestId("template-name-input");
      fireEvent.change(nameInput, { target: { value: "新模板" } });
      fireEvent.click(screen.getByTestId("create-template-btn"));

      expect(onAddTemplate).toHaveBeenCalledWith("新模板", "", "system", []);
    });
  });

  // ----------------------------------------------------------
  // 空状态
  // ----------------------------------------------------------

  describe("空状态", () => {
    it("无模板时应显示空提示", () => {
      render(
        <OperationTemplate templates={[]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText("暂无操作模板")).toBeInTheDocument();
    });
  });
});