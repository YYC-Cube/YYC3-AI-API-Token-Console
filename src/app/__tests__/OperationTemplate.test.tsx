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
import { render, screen, fireEvent, within } from "@testing-library/react";
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

  // ----------------------------------------------------------
  // 相对时间格式化 (formatTimeAgo 全分支) · S5 批 2
  // ----------------------------------------------------------

  describe("上次使用相对时间", () => {
    it("1 分钟内应显示「刚刚」", () => {
      render(
        <OperationTemplate templates={[{ ...mockTemplates[0]!, lastUsed: Date.now() }]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText(/上次使用 刚刚/)).toBeInTheDocument();
    });

    it("1 小时内应显示「N分钟前」", () => {
      render(
        <OperationTemplate templates={[{ ...mockTemplates[0]!, lastUsed: Date.now() - 5 * 60 * 1000 }]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText(/上次使用 5分钟前/)).toBeInTheDocument();
    });

    it("24 小时内应显示「N小时前」", () => {
      render(
        <OperationTemplate templates={[{ ...mockTemplates[0]!, lastUsed: Date.now() - 2 * 60 * 60 * 1000 }]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText(/上次使用 2小时前/)).toBeInTheDocument();
    });

    it("超过 24 小时应显示「N天前」", () => {
      render(
        <OperationTemplate templates={[{ ...mockTemplates[0]!, lastUsed: Date.now() - 3 * 24 * 60 * 60 * 1000 }]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.getByText(/上次使用 3天前/)).toBeInTheDocument();
    });

    it("无 lastUsed 时不应渲染上次使用信息", () => {
      render(
        <OperationTemplate templates={[mockTemplates[1]!]} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      expect(screen.queryByText(/上次使用/)).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 展开/折叠步骤 · S5 批 2
  // ----------------------------------------------------------

  describe("展开/折叠", () => {
    /** 模板行内按钮顺序: 执行(title=执行模板) / 展开(无 title) / 删除(title=删除模板) */
    function getExpandButton(tplId: string): HTMLElement {
      const row = screen.getByTestId(`template-${tplId}`);
      const buttons = within(row).getAllByRole("button");
      const runBtn = buttons.find((b) => b.getAttribute("title") === "执行模板")!;
      const deleteBtn = buttons.find((b) => b.getAttribute("title") === "删除模板")!;
      const expandBtn = buttons.find((b) => b !== runBtn && b !== deleteBtn);
      return expandBtn!;
    }

    it("点击展开按钮应显示步骤明细", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(getExpandButton("tpl1"));
      expect(screen.getByText("步骤 (3)")).toBeInTheDocument();
      expect(screen.getByText("选择节点")).toBeInTheDocument();
      expect(screen.getByText("上传权重")).toBeInTheDocument();
      expect(screen.getByText("冒烟测试")).toBeInTheDocument();
    });

    it("再次点击展开按钮应折叠步骤明细", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      const expandBtn = getExpandButton("tpl1");
      fireEvent.click(expandBtn);
      expect(screen.getByText("步骤 (3)")).toBeInTheDocument();
      fireEvent.click(expandBtn);
      expect(screen.queryByText("步骤 (3)")).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 新建表单补充分支 · S5 批 2
  // ----------------------------------------------------------

  describe("新建表单 (扩展)", () => {
    it("名称为空时点击创建不应触发 onAddTemplate (禁用守卫)", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      fireEvent.click(screen.getByTestId("create-template-btn"));
      expect(onAddTemplate).not.toHaveBeenCalled();
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
    });

    it("填写描述与多行步骤(含空行)应解析步骤并透传", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      fireEvent.change(screen.getByTestId("template-name-input"), { target: { value: "带步骤模板" } });

      // 描述输入框 (表单内第二个 input, 无 testid → 通过 placeholder 定位)
      fireEvent.change(screen.getByPlaceholderText("简要描述"), { target: { value: "描述文本" } });

      // 分类下拉切换为 model
      const select = screen.getByDisplayValue("系统操作");
      fireEvent.change(select, { target: { value: "model" } });

      // 多行步骤, 含空行 → filter(Boolean) 过滤
      fireEvent.change(screen.getByPlaceholderText(/步骤（每行一个）/), {
        target: { value: "第一步\n\n  第二步  \n第三步" },
      });

      fireEvent.click(screen.getByTestId("create-template-btn"));
      expect(onAddTemplate).toHaveBeenCalledWith("带步骤模板", "描述文本", "model", ["第一步", "第二步", "第三步"]);

      // 创建后表单应关闭并重置
      expect(screen.queryByTestId("template-name-input")).not.toBeInTheDocument();
    });

    it("点击取消按钮应关闭创建表单", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      fireEvent.click(screen.getByText("取消"));
      expect(screen.queryByTestId("template-name-input")).not.toBeInTheDocument();
    });

    it("再次点击新建按钮应切换关闭表单", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      expect(screen.getByTestId("template-name-input")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("add-template-btn"));
      expect(screen.queryByTestId("template-name-input")).not.toBeInTheDocument();
    });

    it("步骤文本框输入应响应变更", () => {
      render(
        <OperationTemplate templates={mockTemplates} onRunTemplate={onRunTemplate} onDeleteTemplate={onDeleteTemplate} onAddTemplate={onAddTemplate} />
      );
      fireEvent.click(screen.getByTestId("add-template-btn"));
      const textarea = screen.getByPlaceholderText(/步骤（每行一个）/);
      fireEvent.change(textarea, { target: { value: "唯一步骤" } });
      expect(textarea).toHaveValue("唯一步骤");
    });
  });

  // ----------------------------------------------------------
  // 非构造分支说明 · S5 批 2
  // ----------------------------------------------------------
  // OperationTemplate.tsx L149/L151 `catMeta?.color ?? "#00d4ff"` 的 fallback 分支
  // 不可构造: category 类型为 OperationCategoryType 五值联合 (node/model/task/system/custom),
  // CATEGORY_META 覆盖全部五个 key, 类型安全约束下 catMeta 恒有值;
  // 双重断言绕过类型系统违背零 any 红线, 故不构造。
});