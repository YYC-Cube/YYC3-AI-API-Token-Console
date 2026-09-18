/**
 * AddModelModal.test.tsx
 * =======================
 * 添加模型模态框测试
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddModelModal } from "../components/AddModelModal";
import { I18nContext } from "../hooks/useI18n";
import { MODEL_PROVIDERS } from "../hooks/useModelProvider";
import zhCN from "../i18n/zh-CN";

function getNestedValue(obj: Record<string, any>, path: string): string {
  const keys = path.split(".");
  let result: any = obj;
  for (const k of keys) {
    if (result == null) return path;
    result = result[k];
  }
  return typeof result === "string" ? result : path;
}

const mockI18n = {
  locale: "zh-CN" as const,
  setLocale: vi.fn(),
  t: (key: string, vars?: Record<string, string | number>) => {
    let raw = getNestedValue(zhCN as Record<string, any>, key);
    if (vars) {
      raw = raw.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        vars[k] != null ? String(vars[k]) : `{${k}}`
      );
    }
    return raw;
  },
  locales: [],
};

function renderModal(props: Partial<React.ComponentProps<typeof AddModelModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    providers: MODEL_PROVIDERS,
    ollamaModels: [],
    ollamaLoading: false,
    ollamaError: null,
    onFetchOllama: vi.fn().mockResolvedValue([]),
    onAdd: vi.fn(),
  };

  return render(
    <I18nContext.Provider value={mockI18n}>
      <AddModelModal {...defaultProps} {...props} />
    </I18nContext.Provider>
  );
}

describe("AddModelModal", () => {
  it("isOpen=true 时应渲染模态框", () => {
    renderModal();
    expect(screen.getByTestId("add-model-modal")).toBeInTheDocument();
  });

  it("isOpen=false 时不应渲染", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByTestId("add-model-modal")).not.toBeInTheDocument();
  });

  it("应有服务商选择按钮", () => {
    renderModal();
    expect(screen.getByTestId("provider-select")).toBeInTheDocument();
  });

  it("点击服务商应展开下拉", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-dropdown")).toBeInTheDocument();
  });

  it("下拉应包含所有 9 个提供商", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    MODEL_PROVIDERS.forEach((p) => {
      expect(screen.getByTestId(`provider-option-${p.id}`)).toBeInTheDocument();
    });
  });

  it("选择 OpenAI 后应显示模型选择和 API Key 输入", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-openai"));
    expect(screen.getByTestId("model-select")).toBeInTheDocument();
    expect(screen.getByTestId("api-key-input")).toBeInTheDocument();
  });

  it("选择 Ollama 后应显示端点输入，不显示 API Key", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    expect(screen.getByTestId("ollama-url-input")).toBeInTheDocument();
    expect(screen.queryByTestId("api-key-input")).not.toBeInTheDocument();
  });

  it("Ollama 端点默认值为 localhost:11434", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    const input = screen.getByTestId("ollama-url-input") as HTMLInputElement;
    expect(input.value).toBe("http://localhost:11434");
  });

  it("关闭按钮应调用 onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("未填完时提交按钮应禁用", () => {
    renderModal();
    const btn = screen.getByTestId("submit-add-model");
    expect(btn).toBeDisabled();
  });

  it("Ollama 有刷新按钮", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    expect(screen.getByTestId("refresh-ollama")).toBeInTheDocument();
  });

  it("ollamaError 应显示错误信息", () => {
    renderModal({ ollamaError: "连接失败" });
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    expect(screen.getByText("连接失败")).toBeInTheDocument();
  });
});
