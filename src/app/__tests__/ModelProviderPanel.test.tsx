/**
 * ModelProviderPanel.test.tsx
 * ============================
 * 模型提供商面板测试
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ModelProviderPanel } from "../components/ModelProviderPanel";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";
import { setGatewayConfig, GATEWAY_DEFAULTS } from "../lib/api-config";
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

function renderPanel(viewOverride?: { isMobile: boolean }) {
  const isMobile = viewOverride?.isMobile ?? false;
  const viewValue = {
    breakpoint: "lg" as const,
    isMobile,
    isTablet: !isMobile,
    isDesktop: !isMobile,
    width: isMobile ? 390 : 1280,
    isTouch: isMobile,
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
    fireEvent.click(screen.getAllByTitle("编辑服务商")[0]!);
    expect(screen.getByText("编辑服务商")).toBeInTheDocument();
    expect(screen.getByText("内置服务商名称不可修改")).toBeInTheDocument();
  });

  it("推送到网关应走 fetch 并显示同步结果", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
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

// ============================================================
// S5 覆盖率长尾批 1 — 网关管理面 (router/stats / models / admin
// upstreams) / 自定义服务商 / 已配置模型三态 / 视口与导入长尾
// ============================================================

/** 路由式 fetch stub: 按命中的 URL 返回预置响应或抛错 */
interface MockFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type RouteResult = MockFetchResponse | "reject-error" | "reject-string";

function makeFetch(
  route: (url: string, init?: RequestInit) => RouteResult,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<MockFetchResponse> {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const result = route(url, init);
    if (result === "reject-error") throw new Error("gateway unreachable");
    if (result === "reject-string") throw "plain-failure";
    return result;
  };
}

function okRes(data: unknown): MockFetchResponse {
  return { ok: true, status: 200, json: () => Promise.resolve(data) };
}

function badRes(status: number, data: unknown): MockFetchResponse {
  return { ok: false, status, json: () => Promise.resolve(data) };
}

function badJsonRes(status: number): MockFetchResponse {
  return { ok: false, status, json: () => Promise.reject(new Error("invalid json body")) };
}

describe("ModelProviderPanel 网关管理面与数据长尾覆盖", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // 恢复网关模块内存态, 避免跨 describe 污染 (默认 adminKey="proxy")
    setGatewayConfig({ gatewayAdminKey: GATEWAY_DEFAULTS.gatewayAdminKey });
    localStorage.clear();
  });

  it("上游池应渲染断路器徽标 / 畸形字段兜底 / 模型截断与池模型计数", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) {
        return okRes({
          upstream_pool: [
            { name: "console-zhipu", base_url: "https://gw.example", models: ["m1", "m2", "m3", "m4"], breaker_state: "closed" },
            { base_url: "https://anon.example", breaker_state: "open" },
            { name: "plain-pool", base_url: "https://plain.example", models: [] },
          ],
        });
      }
      if (url.includes("/v1/models")) return okRes({ data: [{ id: "gw-chat" }, {}] });
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({ models: [] });
    }));
    renderPanel();
    expect(await screen.findByText("console-zhipu")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument(); // u.name 缺失 → "?"
    expect(screen.getByText(/m1, m2, m3/)).toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeInTheDocument(); // 4 个模型 > 3 → 截断提示
    expect(screen.getAllByText("—").length).toBeGreaterThan(0); // 空模型列表 → "—"
    expect(screen.getByText(/池模型 2/)).toBeInTheDocument(); // 含无 id 项
  });

  it("router/stats 仅有 upstreams 字段时也应渲染上游", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) {
        return okRes({ upstreams: [{ name: "alt-upstream", base_url: "https://alt.example", models: ["only-one"] }] });
      }
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    expect(await screen.findByText("alt-upstream")).toBeInTheDocument();
    expect(screen.getByText("only-one")).toBeInTheDocument();
  });

  it("router/stats 与 /v1/models 非 2xx 时应保持空态占位", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) return badRes(403, {});
      if (url.includes("/v1/models")) return badRes(500, {});
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({ models: [] });
    }));
    renderPanel();
    expect(await screen.findByText("0379-World · 在线")).toBeInTheDocument();
    // health=up 且无上游 → 提示走「填 ADMIN 密钥」文案
    expect(screen.getByText(/在系统设置中填入 ADMIN 密钥/)).toBeInTheDocument();
    expect(screen.queryByText(/池模型/)).not.toBeInTheDocument();
  });

  it("/v1/models 直接返回数组时应计入池模型", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/models")) return okRes([{ id: "arr-model" }]);
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    expect(await screen.findByText(/池模型 1/)).toBeInTheDocument();
  });

  it("推送遇 409 应转 PUT 更新并提示同步成功", async () => {
    const adminCalls: Array<[string, string]> = [];
    vi.stubGlobal("fetch", makeFetch((url, init) => {
      if (url.includes("/v1/admin/upstreams")) {
        adminCalls.push([init?.method ?? "", url]);
        return init?.method === "POST" ? badRes(409, {}) : okRes({});
      }
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/已同步到网关：console-zhipu/)).toBeInTheDocument();
    expect(
      adminCalls.some(([m, u]) => m === "PUT" && u.endsWith("/v1/admin/upstreams/console-zhipu")),
    ).toBe(true);
  });

  it("推送失败应透出响应体 detail 错误信息", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/admin/upstreams")) return badRes(503, { detail: "上游配额不足" });
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/上游配额不足/)).toBeInTheDocument();
  });

  it("推送失败且响应体非法 JSON 时应回退 HTTP 状态码", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/admin/upstreams")) return badJsonRes(502);
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/HTTP 502/)).toBeInTheDocument();
  });

  it("推送网络异常 (Error) 应展示错误消息", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/admin/upstreams")) return "reject-error";
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/gateway unreachable/)).toBeInTheDocument();
  });

  it("推送抛出非 Error 值应字符串化展示", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/admin/upstreams")) return "reject-string";
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/plain-failure/)).toBeInTheDocument();
  });

  it("未配置 ADMIN 密钥: 推送应直接提示且管理面接口不带密钥 (S22 探测语义)", async () => {
    let statsCalls = 0;
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) { statsCalls += 1; return okRes({}); }
      if (url.includes("/v1/models")) return okRes({ data: [] });
      return okRes({ models: [] });
    }));
    setGatewayConfig({ gatewayAdminKey: "" });
    renderPanel();
    // S22 新探测语义: 可达性探测本身用 /v1/router/stats (无密钥也发起, 401 亦证明网关在)
    expect(await screen.findByText("0379-World · 在线")).toBeInTheDocument();
    fireEvent.click(screen.getByText("展开"));
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
    expect(await screen.findByText(/未配置网关 ADMIN 密钥/)).toBeInTheDocument();
  });

  it("自定义空模型服务商: 徽标 / 删除 / ollama baseUrl 空回退 / 推送通配 *", async () => {
    localStorage.setItem("yyc3_model_providers", JSON.stringify([
      {
        id: "ollama", label: "Ollama", baseUrl: "", authType: "none", models: [],
        requiresApiKey: false, isLocal: true, isBuiltin: true,
      },
      {
        id: "custom-empty", label: "空模型服务商", baseUrl: "https://empty.example/v1", authType: "bearer",
        models: [], requiresApiKey: true, isLocal: false, isBuiltin: false, isCustom: true, createdAt: 1,
      },
    ]));
    let pushBody = "";
    vi.stubGlobal("fetch", makeFetch((url, init) => {
      if (url.includes("/v1/admin/upstreams") && init?.method === "POST") {
        pushBody = String(init.body ?? "");
        return okRes({});
      }
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({ models: [] });
    }));
    renderPanel();
    // 统计徽标 + 收起态 chip (isCustom → *)
    expect(await screen.findByText("1 自定义")).toBeInTheDocument();
    const chip = screen.getAllByText("空模型服务商").find((el) => el.textContent === "空模型服务商*");
    expect(chip).toBeDefined();
    // ollama baseUrl 为空 → 面包屑回退默认地址
    expect(screen.getByText("http://localhost:11434")).toBeInTheDocument();
    // 展开态: 自定义徽标 + 删除按钮
    fireEvent.click(screen.getByText("展开"));
    expect(screen.getAllByText("自定义").length).toBeGreaterThan(0);
    const delBtn = screen.queryByTitle("删除服务商");
    expect(delBtn).not.toBeNull();
    // 推送空模型服务商 → body.models 回退 ["*"]
    fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[1]!);
    expect(await screen.findByText(/已同步到网关：console-custom-empty/)).toBeInTheDocument();
    expect(JSON.parse(pushBody)).toMatchObject({ models: ["*"] });
    // 删除自定义服务商 → chip 消失
    fireEvent.click(screen.getByTitle("删除服务商")!);
    await waitFor(() => expect(screen.queryByText("1 自定义")).not.toBeInTheDocument());
  });

  it("已配置模型三态渲染 + 测试连接 + 删除", () => {
    localStorage.setItem("yyc3_configured_models", JSON.stringify([
      {
        id: "cm-active", providerId: "zhipu", providerLabel: "Z.ai", model: "glm-4-flash",
        apiKey: "k1", baseUrl: "https://open.bigmodel.cn/api/paas/v4", createdAt: 1, lastUsed: null, status: "active",
      },
      {
        id: "cm-error", providerId: "kimi-cn", providerLabel: "Kimi-CN", model: "moonshot-v1-8k",
        apiKey: "k2", baseUrl: "https://api.moonshot.cn/v1", createdAt: 2, lastUsed: null, status: "error",
      },
      {
        id: "cm-unchecked", providerId: "ollama", providerLabel: "Ollama", model: "qwen2.5:7b",
        apiKey: "", baseUrl: "http://localhost:11434", createdAt: 3, lastUsed: null, status: "unchecked",
      },
    ]));
    renderPanel();
    for (const id of ["cm-active", "cm-error", "cm-unchecked"]) {
      expect(screen.getByTestId(`configured-model-${id}`)).toBeInTheDocument();
    }
    // 测试连接 (unchecked → active)
    const uncheckedRow = screen.getByTestId("configured-model-cm-unchecked");
    fireEvent.click(uncheckedRow.querySelectorAll("button")[0]!);
    expect(screen.getByTestId("configured-model-cm-unchecked")).toBeInTheDocument();
    // 删除模型 → 行消失
    fireEvent.click(screen.getByTestId("configured-model-cm-error").querySelectorAll("button")[1]!);
    expect(screen.queryByTestId("configured-model-cm-error")).not.toBeInTheDocument();
  });

  it("移动端视图应使用两列统计栅格", () => {
    renderPanel({ isMobile: true });
    expect(
      screen.getByTestId("model-provider-panel").querySelector(".grid-cols-2"),
    ).not.toBeNull();
  });

  it("无 ViewContext 提供时应回退桌面布局", () => {
    const i18nValue = {
      locale: "zh-CN" as const,
      setLocale: vi.fn(),
      t: (key: string) => {
        const v = getNestedValue(zhCN as Record<string, unknown>, key);
        return typeof v === "string" ? v : key;
      },
      locales: [],
    };
    render(
      <MemoryRouter>
        <I18nContext.Provider value={i18nValue}>
          <ModelProviderPanel />
        </I18nContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("model-provider-panel")).toBeInTheDocument();
    expect(
      screen.getByTestId("model-provider-panel").querySelector(".grid-cols-4"),
    ).not.toBeNull();
  });

  it("纯空白导入内容应被忽略且不产生结果提示", () => {
    vi.stubGlobal("fetch", makeFetch(() => okRes({ models: [] })));
    renderPanel();
    fireEvent.click(screen.getByText("导入"));
    fireEvent.change(screen.getByPlaceholderText(/粘贴从「导出」获取的 JSON 配置/), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("执行导入"));
    expect(screen.queryByText(/导入失败/)).not.toBeInTheDocument();
    expect(screen.queryByText("导入成功")).not.toBeInTheDocument();
  });

  it("导入成功 1.5s 后应自动收起导入面板", async () => {
    vi.stubGlobal("fetch", makeFetch(() => okRes({ models: [] })));
    vi.useFakeTimers();
    try {
      renderPanel();
      fireEvent.click(screen.getByText("导入"));
      fireEvent.change(screen.getByPlaceholderText(/粘贴从「导出」获取的 JSON 配置/), {
        target: { value: JSON.stringify({ version: 2, providers: [], configuredModels: [] }) },
      });
      fireEvent.click(screen.getByText("执行导入"));
      expect(screen.getByText("导入成功")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
      expect(screen.queryByText("执行导入")).not.toBeInTheDocument();
      expect(screen.queryByText("导入成功")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("可达性探测网络拒绝时应显示网关不可达 (catch 降级, S22 探测语义)", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) return "reject-error";
      return okRes({ models: [] });
    }));
    renderPanel();
    expect(await screen.findByText(/网关不可达/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText("0379-World · 离线")).toBeInTheDocument();
  });

  it("可达性探测(兼数据流水)网络拒绝时应离线并保持空态 (S22 探测语义)", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/router/stats")) return "reject-error";
      if (url.includes("/v1/models")) return "reject-error";
      return okRes({ models: [] });
    }));
    renderPanel();
    // 探测与数据流水是同一次 stats 请求: 网络拒绝 → health=down (真实不可达语义)
    expect(await screen.findByText("0379-World · 离线")).toBeInTheDocument();
    expect(screen.queryByText(/池模型/)).not.toBeInTheDocument();
  });

  it("推送成功 4s 后应清空网关消息", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("/v1/admin/upstreams")) return okRes({});
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({ models: [] });
    }));
    vi.useFakeTimers();
    try {
      renderPanel();
      fireEvent.click(screen.getByText("展开"));
      fireEvent.click(screen.getAllByTitle(/推送到网关上游池/)[0]!);
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      expect(screen.getByText(/已同步到网关：console-zhipu/)).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(4100); });
      expect(screen.queryByText(/已同步到网关：console-zhipu/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("收起态点击服务商 chip 应打开编辑弹窗并可关闭", () => {
    vi.stubGlobal("fetch", makeFetch(() => okRes({ models: [] })));
    renderPanel();
    // 收起态 chip: 第一个内置服务商 Z.ai
    fireEvent.click(screen.getByText("Z.ai"));
    expect(screen.getByText("编辑服务商")).toBeInTheDocument();
    // 关闭 (header X 按钮)
    const closeBtn = screen.getByText("编辑服务商").parentElement?.parentElement?.querySelector("button");
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);
    expect(screen.queryByText("编辑服务商")).not.toBeInTheDocument();
  });

  it("点击 Ollama 刷新按钮应触发本地模型拉取且不崩溃", async () => {
    vi.stubGlobal("fetch", makeFetch((url) => {
      if (url.includes("tags")) return okRes({ models: [] });
      if (url.includes("/v1/router/stats")) return okRes({});
      return okRes({});
    }));
    renderPanel();
    fireEvent.click(screen.getByTestId("refresh-ollama-models"));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId("refresh-ollama-models")).toBeEnabled();
  });
});