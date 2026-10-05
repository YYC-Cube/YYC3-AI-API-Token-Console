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
import type { ModelProviderDef, OllamaModel } from "../types";
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

// ============================================================
// 自定义 Provider 夹具 — 覆盖完整交互流 (选择/模型/密钥/代理/提交)
// ============================================================

const TEST_PROVIDERS: ModelProviderDef[] = [
  {
    id: "zai",
    label: "Z.ai 测试",
    baseUrl: "https://api.z.ai",
    authType: "bearer",
    models: ["glm-4.6", "glm-4.5-air"],
    requiresApiKey: true,
    isLocal: false,
  },
  {
    id: "ollama",
    label: "Ollama 测试",
    baseUrl: "http://localhost:11434",
    authType: "none",
    models: [],
    requiresApiKey: false,
    isLocal: true,
  },
  {
    id: "empty",
    label: "空模型测试",
    baseUrl: "https://empty.example.com",
    authType: "bearer",
    models: [],
    requiresApiKey: false,
    isLocal: false,
  },
];

const OLLAMA_MODELS: OllamaModel[] = [
  {
    name: "qwen3:8b",
    model: "qwen3:8b",
    modified_at: "2026-01-01T00:00:00Z",
    size: 5.2e9,
    digest: "abc123",
    details: {
      parent_model: "",
      format: "gguf",
      family: "qwen",
      parameter_size: "8B",
      quantization_level: "Q4_K_M",
    },
  },
  {
    name: "llama3:70b",
    model: "llama3:70b",
    modified_at: "2026-01-01T00:00:00Z",
    size: 42.5e9,
    digest: "def456",
    details: {
      parent_model: "",
      format: "gguf",
      family: "llama",
      parameter_size: "70B",
      quantization_level: "Q4_0",
    },
  },
];

function selectProvider(id: string) {
  fireEvent.click(screen.getByTestId("provider-select"));
  fireEvent.click(screen.getByTestId(`provider-option-${id}`));
}

describe("AddModelModal 交互流", () => {
  it("完整提交流程: 选服务商 → 选模型 → 填密钥 → onAdd", () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    renderModal({ providers: TEST_PROVIDERS, onAdd, onClose });
    selectProvider("zai");
    fireEvent.click(screen.getByTestId("model-select"));
    fireEvent.click(screen.getByTestId("model-option-glm-4.6"));
    // 需密钥服务商: 未填密钥时提交禁用
    expect(screen.getByTestId("submit-add-model")).toBeDisabled();
    fireEvent.change(screen.getByTestId("api-key-input"), { target: { value: "sk-test" } });
    expect(screen.getByTestId("submit-add-model")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("submit-add-model"));
    expect(onAdd).toHaveBeenCalledWith("zai", "glm-4.6", "sk-test", undefined, undefined);
    expect(onClose).toHaveBeenCalled();
  });

  it("模型下拉互斥: 打开模型下拉应关闭服务商下拉", () => {
    renderModal({ providers: TEST_PROVIDERS });
    selectProvider("zai");
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-dropdown")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("model-select"));
    expect(screen.queryByTestId("provider-dropdown")).not.toBeInTheDocument();
    expect(screen.getByTestId("model-dropdown")).toBeInTheDocument();
  });

  it("点击下拉外部应关闭下拉", () => {
    renderModal({ providers: TEST_PROVIDERS });
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-dropdown")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId("provider-dropdown")).not.toBeInTheDocument();
  });

  it("Enter 确认自定义模型名应回调 onAddModelToProvider 并选中", () => {
    const onAddModelToProvider = vi.fn();
    renderModal({ providers: TEST_PROVIDERS, onAddModelToProvider });
    selectProvider("zai");
    fireEvent.click(screen.getByText("输入自定义模型名"));
    const input = screen.getByPlaceholderText("输入模型名称，回车确认...");
    fireEvent.change(input, { target: { value: "glm-5-preview" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddModelToProvider).toHaveBeenCalledWith("zai", "glm-5-preview");
    expect(screen.getByTestId("model-select").textContent).toContain("glm-5-preview");
  });

  it("确认按钮提交自定义模型名", () => {
    const onAddModelToProvider = vi.fn();
    renderModal({ providers: TEST_PROVIDERS, onAddModelToProvider });
    selectProvider("zai");
    fireEvent.click(screen.getByText("输入自定义模型名"));
    fireEvent.change(screen.getByPlaceholderText("输入模型名称，回车确认..."), {
      target: { value: "glm-5-preview" },
    });
    fireEvent.click(screen.getByText("确认"));
    expect(onAddModelToProvider).toHaveBeenCalledWith("zai", "glm-5-preview");
  });

  it("自定义模型名为空时确认按钮禁用", () => {
    renderModal({ providers: TEST_PROVIDERS });
    selectProvider("zai");
    fireEvent.click(screen.getByText("输入自定义模型名"));
    expect(screen.getByText("确认").closest("button")).toBeDisabled();
  });

  it("收起自定义输入应隐藏输入框", () => {
    renderModal({ providers: TEST_PROVIDERS });
    selectProvider("zai");
    fireEvent.click(screen.getByText("输入自定义模型名"));
    expect(screen.getByPlaceholderText("输入模型名称，回车确认...")).toBeInTheDocument();
    fireEvent.click(screen.getByText("收起自定义"));
    expect(screen.queryByPlaceholderText("输入模型名称，回车确认...")).not.toBeInTheDocument();
  });

  it("代理 URL 应透传给 onAdd", () => {
    const onAdd = vi.fn();
    renderModal({ providers: TEST_PROVIDERS, onAdd });
    selectProvider("zai");
    fireEvent.click(screen.getByTestId("model-select"));
    fireEvent.click(screen.getByTestId("model-option-glm-4.5-air"));
    fireEvent.change(screen.getByTestId("api-key-input"), { target: { value: "sk-test" } });
    fireEvent.click(screen.getByText("输入代理 URL"));
    fireEvent.change(screen.getByPlaceholderText("输入代理 URL，回车确认..."), {
      target: { value: "https://proxy.yyc3.vip" },
    });
    fireEvent.click(screen.getByTestId("submit-add-model"));
    expect(onAdd).toHaveBeenCalledWith(
      "zai",
      "glm-4.5-air",
      "sk-test",
      undefined,
      "https://proxy.yyc3.vip"
    );
  });

  it("空模型服务商应显示暂无可用模型", () => {
    renderModal({ providers: TEST_PROVIDERS });
    selectProvider("empty");
    fireEvent.click(screen.getByTestId("model-select"));
    expect(screen.getByText("暂无可用模型")).toBeInTheDocument();
  });

  it("选择 Ollama 应触发拉取并显示模型详情", () => {
    const onFetchOllama = vi.fn().mockResolvedValue([]);
    renderModal({ providers: TEST_PROVIDERS, onFetchOllama, ollamaModels: OLLAMA_MODELS });
    selectProvider("ollama");
    expect(onFetchOllama).toHaveBeenCalledWith("http://localhost:11434");
    expect(screen.getByText("已检测到 2 个本地模型")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("model-select"));
    expect(screen.getByTestId("model-option-qwen3:8b").textContent).toContain("8B · Q4_K_M · 5.2GB");
    expect(screen.getByTestId("model-option-llama3:70b").textContent).toContain("70B");
  });

  it("刷新按钮应以当前 URL 重新拉取", () => {
    const onFetchOllama = vi.fn().mockResolvedValue([]);
    renderModal({ providers: TEST_PROVIDERS, onFetchOllama });
    selectProvider("ollama");
    fireEvent.change(screen.getByTestId("ollama-url-input"), {
      target: { value: "http://192.168.3.45:11434" },
    });
    fireEvent.click(screen.getByTestId("refresh-ollama"));
    expect(onFetchOllama).toHaveBeenLastCalledWith("http://192.168.3.45:11434");
  });

  it("加载中应显示加载文案", () => {
    renderModal({ providers: TEST_PROVIDERS, ollamaLoading: true, ollamaModels: [] });
    selectProvider("ollama");
    fireEvent.click(screen.getByTestId("model-select"));
    expect(screen.getByText("正在加载模型...")).toBeInTheDocument();
  });

  it("Ollama 提交无需密钥且透传端点 URL", () => {
    const onAdd = vi.fn();
    const onFetchOllama = vi.fn().mockResolvedValue([]);
    renderModal({ providers: TEST_PROVIDERS, onAdd, onFetchOllama, ollamaModels: OLLAMA_MODELS });
    selectProvider("ollama");
    fireEvent.click(screen.getByTestId("model-select"));
    fireEvent.click(screen.getByTestId("model-option-qwen3:8b"));
    expect(screen.getByTestId("submit-add-model")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("submit-add-model"));
    expect(onAdd).toHaveBeenCalledWith("ollama", "qwen3:8b", "", "http://localhost:11434", undefined);
  });

  it("点击遮罩应调用 onClose", () => {
    const onClose = vi.fn();
    const { container } = renderModal({ providers: TEST_PROVIDERS, onClose });
    const backdrop = container.querySelector('[data-testid="add-model-modal"] > div')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
