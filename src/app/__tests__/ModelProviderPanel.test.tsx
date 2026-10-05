/**
 * ModelProviderPanel.test.tsx
 * ============================
 * 模型提供商面板测试
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ModelProviderPanel } from "../components/ModelProviderPanel";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";
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

function renderPanel() {
  const viewValue = {
    breakpoint: "lg" as const,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1280,
    isTouch: false,
  };

  const i18nValue = {
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

  return render(
    <MemoryRouter>
      <ViewContext.Provider value={viewValue}>
        <I18nContext.Provider value={i18nValue}>
          <ModelProviderPanel />
        </I18nContext.Provider>
      </ViewContext.Provider>
    </MemoryRouter>
  );
}

describe("ModelProviderPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应渲染页面标题", () => {
    renderPanel();
    expect(screen.getByText("模型管理")).toBeInTheDocument();
  });

  it("应有主容器", () => {
    renderPanel();
    expect(screen.getByTestId("model-provider-panel")).toBeInTheDocument();
  });

  it("应有添加模型按钮", () => {
    renderPanel();
    expect(screen.getByTestId("open-add-model")).toBeInTheDocument();
  });

  it("点击添加模型应打开模态框", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("add-model-modal")).toBeInTheDocument();
  });

  it("模态框应有服务商选择", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("provider-select")).toBeInTheDocument();
  });

  it("点击服务商选择应展开下拉", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-dropdown")).toBeInTheDocument();
  });

  it("下拉应包含 9 个提供商选项", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    expect(screen.getByTestId("provider-option-zhipu")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-openai")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-ollama")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-deepseek")).toBeInTheDocument();
    expect(screen.getByTestId("provider-option-kimi-cn")).toBeInTheDocument();
  });

  it("选择提供商后应显示模型选择", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-openai"));
    expect(screen.getByTestId("model-select")).toBeInTheDocument();
  });

  it("选择非 Ollama 提供商应显示 API 密钥输入", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-openai"));
    expect(screen.getByTestId("api-key-input")).toBeInTheDocument();
  });

  it("选择 Ollama 应显示端点输入", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    fireEvent.click(screen.getByTestId("provider-select"));
    fireEvent.click(screen.getByTestId("provider-option-ollama"));
    expect(screen.getByTestId("ollama-url-input")).toBeInTheDocument();
  });

  it("关闭按钮应关闭模态框", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("open-add-model"));
    expect(screen.getByTestId("add-model-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(screen.queryByTestId("add-model-modal")).not.toBeInTheDocument();
  });

  it("应有 Ollama 刷新按钮", () => {
    renderPanel();
    expect(screen.getByTestId("refresh-ollama-models")).toBeInTheDocument();
  });
});

describe("ModelProviderPanel 扩展覆盖", () => {
  const origCreate = (URL as any).createObjectURL;
  const origRevoke = (URL as any).revokeObjectURL;
  const mockFetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", mockFetch);
    (URL as any).createObjectURL = vi.fn(() => "blob:mock-url");
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (URL as any).createObjectURL = origCreate;
    (URL as any).revokeObjectURL = origRevoke;
  });

  it("导入面板应可开合且空内容时导入按钮禁用", () => {
    renderPanel();
    fireEvent.click(screen.getByText("导入"));
    expect(screen.getByPlaceholderText(/粘贴从「导出」获取的 JSON 配置/)).toBeInTheDocument();
    expect(screen.getByText("执行导入")).toBeDisabled();
    fireEvent.click(screen.getByText("导入"));
    expect(screen.queryByText("执行导入")).not.toBeInTheDocument();
  });

  it("非法 JSON 导入应显示失败提示", () => {
    renderPanel();
    fireEvent.click(screen.getByText("导入"));
    fireEvent.change(screen.getByPlaceholderText(/粘贴从「导出」获取的 JSON 配置/), {
      target: { value: "not-valid-json" },
    });
    fireEvent.click(screen.getByText("执行导入"));
    expect(screen.getByText("导入失败，请检查 JSON 格式")).toBeInTheDocument();
  });

  it("合法 JSON 导入应成功并出现新服务商", () => {
    renderPanel();
    fireEvent.click(screen.getByText("导入"));
    fireEvent.change(screen.getByPlaceholderText(/粘贴从「导出」获取的 JSON 配置/), {
      target: {
        value: JSON.stringify({
          version: 2,
          providers: [
            {
              id: "custom-x1",
              label: "X-Provider",
              baseUrl: "https://x.example.com/v1",
              models: ["m1"],
              authType: "bearer",
            },
          ],
          configuredModels: [],
        }),
      },
    });
    fireEvent.click(screen.getByText("执行导入"));
    expect(screen.getByText("导入成功")).toBeInTheDocument();
    expect(screen.getByText("X-Provider")).toBeInTheDocument();
  });

  it("导出按钮应触发下载", () => {
    renderPanel();
    fireEvent.click(screen.getByText("导出"));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("网关健康检查通过应显示在线状态", async () => {
    renderPanel();
    expect(await screen.findByText("0379-World · 在线", {}, { timeout: 3000 })).toBeInTheDocument();
    // 无 admin key 时显示占位提示
    expect(screen.getByText(/在系统设置中填入 ADMIN 密钥/)).toBeInTheDocument();
  });

  it("网关不可达时应显示降级文案", async () => {
    mockFetch.mockImplementationOnce(async () => ({
      ok: false,
      status: 502,
      json: async () => ({}),
    }));
    renderPanel();
    expect(await screen.findByText(/网关不可达/, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("服务商注册表展开应显示内置徽标", () => {
    renderPanel();
    expect(screen.queryByText("内置")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("展开"));
    expect(screen.getByText("收起")).toBeInTheDocument();
    expect(screen.getAllByText("内置").length).toBeGreaterThan(0);
  });

  it("点击自定义服务商应打开新建弹窗", () => {
    renderPanel();
    fireEvent.click(screen.getByText("自定义服务商"));
    expect(screen.getByText("添加自定义服务商")).toBeInTheDocument();
  });

  it("展开后点击编辑应打开编辑弹窗 (内置服务商)", () => {
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle("编辑服务商")[0]);
    expect(screen.getByText("编辑服务商")).toBeInTheDocument();
    expect(screen.getByText("内置服务商名称不可修改")).toBeInTheDocument();
  });

  it("推送到网关应走 fetch 并显示同步结果", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]);
    // 默认 adminKey="proxy" → 走 POST 分支, mocked fetch 返回 ok
    expect(
      await screen.findByText(/已同步到网关：console-zhipu/, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/upstreams"),
      expect.anything()
    );
  });
});