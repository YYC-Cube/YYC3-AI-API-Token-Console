/**
 * ProviderEditorModal.test.tsx
 * ==============================
 * 服务商编辑器模态框测试
 *
 * 覆盖范围:
 * - isOpen 开关渲染
 * - 新增模式: 表单填写 / 模型增删 (按钮 + Enter) / 认证方式切换 / 提交 onSave
 * - 编辑模式: 回填 / onUpdate / 内置服务商限制 (名称禁用 + 恢复默认)
 * - 遮罩与关闭按钮 resetForm + onClose
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ProviderEditorModal } from "../components/ProviderEditorModal";
import type { ModelProviderDef } from "../types";

function makeProvider(overrides: Partial<ModelProviderDef> = {}): ModelProviderDef {
  return {
    id: "zai",
    label: "Z.ai",
    baseUrl: "https://api.z.ai/api/paas/v4",
    authType: "bearer",
    models: ["glm-4.6"],
    requiresApiKey: true,
    isLocal: false,
    isBuiltin: true,
    createdAt: 1,
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof ProviderEditorModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    editingProvider: null,
    onSave: vi.fn(),
    onUpdate: vi.fn(),
  };
  return render(<ProviderEditorModal {...defaultProps} {...props} />);
}

/** 模型名输入行的 "+" 按钮 */
function getAddModelButton() {
  const row = screen.getByPlaceholderText("输入模型名称，回车添加...").parentElement!;
  return within(row).getByRole("button");
}

describe("ProviderEditorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("显示/隐藏", () => {
    it("isOpen=false 时不渲染任何内容", () => {
      const { container } = renderModal({ isOpen: false });
      expect(container.innerHTML).toBe("");
    });

    it("新增模式应显示添加标题", () => {
      renderModal();
      expect(screen.getByText("添加自定义服务商")).toBeInTheDocument();
      expect(screen.getByText("添加服务商")).toBeInTheDocument();
    });
  });

  describe("新增模式表单", () => {
    it("名称/地址为空时提交按钮禁用", () => {
      renderModal();
      expect(screen.getByText("添加服务商").closest("button")).toBeDisabled();
    });

    it("填写名称与基地址后可提交, onSave 收到默认认证配置", () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      renderModal({ onSave, onClose });
      fireEvent.change(screen.getByPlaceholderText("例如: Claude API / 本地 vLLM..."), {
        target: { value: "  My Provider " },
      });
      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/v1"), {
        target: { value: "https://api.example.com/v1" },
      });
      const submit = screen.getByText("添加服务商").closest("button")!;
      expect(submit).not.toBeDisabled();
      fireEvent.click(submit);
      expect(onSave).toHaveBeenCalledWith({
        label: "My Provider",
        baseUrl: "https://api.example.com/v1",
        authType: "bearer",
        requiresApiKey: true,
        isLocal: false,
        models: [],
      });
      expect(onClose).toHaveBeenCalled();
    });

    it("模型名为空时添加按钮禁用", () => {
      renderModal();
      expect(getAddModelButton()).toBeDisabled();
    });

    it("点击 + 按钮应添加模型", () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText("输入模型名称，回车添加..."), {
        target: { value: "glm-4.7" },
      });
      fireEvent.click(getAddModelButton());
      expect(screen.getByText("glm-4.7")).toBeInTheDocument();
      expect(screen.getByText("模型列表 (1)")).toBeInTheDocument();
    });

    it("Enter 键应添加模型", () => {
      renderModal();
      const input = screen.getByPlaceholderText("输入模型名称，回车添加...");
      fireEvent.change(input, { target: { value: "glm-4.7" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("glm-4.7")).toBeInTheDocument();
    });

    it("重复模型名不应重复添加", () => {
      renderModal();
      const input = screen.getByPlaceholderText("输入模型名称，回车添加...");
      fireEvent.change(input, { target: { value: "glm-4.7" } });
      fireEvent.click(getAddModelButton());
      fireEvent.change(input, { target: { value: "glm-4.7" } });
      fireEvent.click(getAddModelButton());
      expect(screen.getAllByText("glm-4.7")).toHaveLength(1);
    });

    it("删除按钮应移除模型", () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText("输入模型名称，回车添加..."), {
        target: { value: "glm-4.7" },
      });
      fireEvent.click(getAddModelButton());
      const row = screen.getByText("glm-4.7").closest("div")!;
      fireEvent.click(within(row).getByRole("button"));
      expect(screen.queryByText("glm-4.7")).not.toBeInTheDocument();
      expect(screen.getByText("暂无模型，请添加")).toBeInTheDocument();
    });

    it("切换认证方式为'无认证'应同步 requiresApiKey=false 与 isLocal=true", () => {
      const onSave = vi.fn();
      renderModal({ onSave });
      fireEvent.change(screen.getByPlaceholderText("例如: Claude API / 本地 vLLM..."), {
        target: { value: "Local Box" },
      });
      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/v1"), {
        target: { value: "http://localhost:8000/v1" },
      });
      fireEvent.click(screen.getByText("Bearer Token"));
      fireEvent.click(screen.getByText("无认证 (本地)"));
      // 触发按钮文案更新
      expect(screen.getByText("无认证 (本地)")).toBeInTheDocument();
      fireEvent.click(screen.getByText("添加服务商"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ authType: "none", requiresApiKey: false, isLocal: true })
      );
    });

    it("切换认证方式为 API Key Header", () => {
      renderModal();
      fireEvent.click(screen.getByText("Bearer Token"));
      fireEvent.click(screen.getByText("API Key Header"));
      expect(screen.getByText("API Key Header")).toBeInTheDocument();
    });

    it("本地服务 checkbox 切换应体现在提交载荷", () => {
      const onSave = vi.fn();
      renderModal({ onSave });
      fireEvent.change(screen.getByPlaceholderText("例如: Claude API / 本地 vLLM..."), {
        target: { value: "Local Box" },
      });
      fireEvent.change(screen.getByPlaceholderText("https://api.example.com/v1"), {
        target: { value: "http://localhost:8000/v1" },
      });
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(screen.getByText("添加服务商"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ isLocal: true, requiresApiKey: true })
      );
    });
  });

  describe("编辑模式", () => {
    it("编辑自定义服务商应回填并调用 onUpdate", () => {
      const onUpdate = vi.fn();
      const editing = makeProvider({
        id: "custom-1",
        label: "我的服务商",
        baseUrl: "https://old.example.com/v1",
        models: ["model-a", "model-b"],
        isBuiltin: false,
        isCustom: true,
      });
      renderModal({ editingProvider: editing, onUpdate });
      expect(screen.getByText("编辑服务商")).toBeInTheDocument();
      expect(screen.getByText("保存修改")).toBeInTheDocument();
      expect(screen.getByDisplayValue("我的服务商")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://old.example.com/v1")).toBeInTheDocument();
      expect(screen.getByText("model-a")).toBeInTheDocument();
      expect(screen.getByText("model-b")).toBeInTheDocument();
      fireEvent.click(screen.getByText("保存修改"));
      expect(onUpdate).toHaveBeenCalledWith("custom-1", {
        label: "我的服务商",
        baseUrl: "https://old.example.com/v1",
        authType: "bearer",
        requiresApiKey: true,
        isLocal: false,
        models: ["model-a", "model-b"],
      });
    });

    it("编辑内置服务商: 名称禁用 + 内置徽标 + 恢复默认", () => {
      const onReset = vi.fn();
      const onClose = vi.fn();
      const editing = makeProvider({ id: "zai", isBuiltin: true });
      renderModal({ editingProvider: editing, onReset, onClose });
      expect(screen.getByText("内置")).toBeInTheDocument();
      expect(screen.getByText("内置服务商名称不可修改")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Z.ai")).toBeDisabled();
      fireEvent.click(screen.getByText("恢复默认"));
      expect(onReset).toHaveBeenCalledWith("zai");
      expect(onClose).toHaveBeenCalled();
    });

    it("未提供 onReset 时不显示恢复默认按钮", () => {
      const editing = makeProvider({ isBuiltin: true });
      renderModal({ editingProvider: editing });
      expect(screen.queryByText("恢复默认")).not.toBeInTheDocument();
    });

    it("编辑 Ollama 且模型为空应显示专属提示", () => {
      const editing = makeProvider({
        id: "ollama",
        label: "Ollama",
        authType: "none",
        models: [],
        requiresApiKey: false,
        isLocal: true,
      });
      renderModal({ editingProvider: editing });
      expect(screen.getByText("Ollama 模型从本地自动检测")).toBeInTheDocument();
    });
  });

  describe("关闭行为", () => {
    it("点击遮罩应调用 onClose", () => {
      const onClose = vi.fn();
      const { container } = renderModal({ onClose });
      const backdrop = container.querySelector(".fixed")!.querySelector(".absolute")!;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it("点击关闭按钮应调用 onClose", () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const headerBar = screen.getByText("添加自定义服务商").closest(
        ".flex.items-center.justify-between"
      ) as HTMLElement;
      fireEvent.click(within(headerBar).getByRole("button"));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
