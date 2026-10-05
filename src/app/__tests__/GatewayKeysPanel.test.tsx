/**
 * GatewayKeysPanel.test.tsx
 * =========================
 * YYC³ 网关虚拟密钥管理面板组件测试 (路由: /gateway-keys)
 *
 * 覆盖范围:
 * - 初始加载态 (加载中…) / 列表渲染 (名称/hint/归属/预算/TPM/白名单/状态)
 * - 鉴权失败 (401) 与 HTTP 错误 (500) 分支
 * - 空列表提示 / 刷新按钮
 * - 创建: 空名拦截 / 成功 (POST 载荷 + 明文一次性展示 + 复制 + 我已保存) / 失败 detail
 * - 启停 toggle (PATCH) / 删除 remove (confirm 双路径, DELETE)
 *
 * Mock 契约 (零外部依赖):
 * - fetch 经 vi.stubGlobal 注入 (响应以 { ok, status, json } 最小契约模拟)
 * - AbortSignal.timeout 以最小契约 stub (jsdom 未实现)
 * - getGatewayConfig mock (密钥走测试占位, 零真实凭据)
 * - window.confirm / navigator.clipboard stub
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GatewayKeysPanel } from "../components/GatewayKeysPanel";

vi.mock("../lib/api-config", () => ({
  getGatewayConfig: () => ({
    gatewayBase: "http://gw.test/v1",
    gatewayAdminKey: "sk-admin-test",
    gatewayApiKey: "",
  }),
}));

const fetchMock = vi.fn();

/** 最小 fetch Response 契约 */
function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

const vkFixture = {
  id: "vk-1",
  name: "vk-test",
  owner: "yanyu",
  model_whitelist: ["glm-4-flash", "qwen3:8b"],
  monthly_budget_usd: 5,
  spent_usd: 1.2345,
  rate_limit_tpm: 0,
  status: "active",
  expires_at: null,
  created_at: "2026-01-01T00:00:00Z",
  key_hint: "sk-vk-abc",
};

describe("GatewayKeysPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    // jsdom 未实现 AbortSignal.timeout — 最小契约 stub
    const realAbortSignal = globalThis.AbortSignal;
    vi.stubGlobal("AbortSignal", {
      abort: (reason?: unknown) => realAbortSignal.abort(reason),
      timeout: (_ms: number) => new AbortController().signal,
      any: (signals: AbortSignal[]) => realAbortSignal.any(signals),
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    fetchMock.mockResolvedValue(jsonResponse({ keys: [vkFixture] }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("加载中应显示 loading 态", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // 挂起
    render(<GatewayKeysPanel />);
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
  });

  it("列表应完整渲染各字段并携带鉴权头", async () => {
    render(<GatewayKeysPanel />);

    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://gw.test/v1/admin/virtual-keys",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-API-Key": "sk-admin-test",
          "Content-Type": "application/json",
        }),
      })
    );
    expect(screen.getByText("0379-World · 1 把")).toBeInTheDocument();
    expect(screen.getByText(/sk-vk-abc/)).toBeInTheDocument();
    expect(screen.getByText("yanyu")).toBeInTheDocument();
    expect(screen.getByText(/\$1\.234 \/ \$5/)).toBeInTheDocument();
    expect(screen.getByText("∞")).toBeInTheDocument();
    expect(screen.getByText("glm-4-flash, qwen3:8b")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByTitle("停用")).toBeInTheDocument();
    expect(screen.getByTitle("删除")).toBeInTheDocument();
  });

  it("401/403 应展示鉴权失败提示", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 401));
    render(<GatewayKeysPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/鉴权失败：请在系统设置填入网关 ADMIN 密钥/)
      ).toBeInTheDocument();
    });
  });

  it("非 401 HTTP 错误应展示状态码", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    render(<GatewayKeysPanel />);

    await waitFor(() => {
      expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    });
  });

  it("空列表应显示引导文案", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ keys: [] }));
    render(<GatewayKeysPanel />);

    await waitFor(() => {
      expect(screen.getByText(/暂无密钥/)).toBeInTheDocument();
    });
  });

  it("刷新按钮应重新拉取列表", async () => {
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /刷新/ }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it("创建: 空名不应发起 POST", async () => {
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /创建密钥/ }));
    expect(screen.getByText(/模型白名单/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1); // 仅初始 load
    });
  });

  it("创建成功应 POST 载荷并一次性展示明文", async () => {
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /创建密钥/ }));
    const nameInput = screen.getByPlaceholderText("vk-xxx");
    fireEvent.change(nameInput, { target: { value: "vk-new" } });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ key_id: "vk-2", plaintext_key: "sk-vk-plain-once" })
    );
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.getByText("sk-vk-plain-once")).toBeInTheDocument();
    });

    // POST 载荷校验
    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "POST"
    );
    expect(postCall?.[0]).toBe("http://gw.test/v1/admin/virtual-keys");
    expect(JSON.parse((postCall?.[1] as RequestInit).body as string)).toEqual({
      name: "vk-new",
      owner: "yanyu",
      monthly_budget_usd: 5,
      rate_limit_tpm: 0,
      model_whitelist: [],
    });
    expect(screen.getByText(/明文仅此一次展示/)).toBeInTheDocument();

    // 复制 → 我已保存 → 面板收起
    fireEvent.click(screen.getByRole("button", { name: /复制/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("sk-vk-plain-once");
    fireEvent.click(screen.getByRole("button", { name: "我已保存" }));
    expect(screen.queryByText("sk-vk-plain-once")).not.toBeInTheDocument();
  });

  it("创建失败应展示后端 detail", async () => {
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /创建密钥/ }));
    fireEvent.change(screen.getByPlaceholderText("vk-xxx"), {
      target: { value: "vk-dup" },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "名称重复" }, false, 400)
    );
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.getByText("名称重复")).toBeInTheDocument();
    });
  });

  it("toggle 应 PATCH 反转状态并重新加载", async () => {
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    fireEvent.click(screen.getByTitle("停用"));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit)?.method === "PATCH"
      );
      expect(patchCall?.[0]).toBe(
        "http://gw.test/v1/admin/virtual-keys/vk-1"
      );
      expect(JSON.parse((patchCall?.[1] as RequestInit).body as string)).toEqual({
        status: "disabled",
      });
    });
  });

  it("remove: confirm 确认后应 DELETE, 取消则不发请求", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GatewayKeysPanel />);
    await waitFor(() => {
      expect(screen.getByText("vk-test")).toBeInTheDocument();
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    fireEvent.click(screen.getByTitle("删除"));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit)?.method === "DELETE"
      );
      expect(deleteCall?.[0]).toBe(
        "http://gw.test/v1/admin/virtual-keys/vk-1"
      );
    });
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("确认删除密钥「vk-test」")
    );

    // confirm=false 路径
    confirmSpy.mockReturnValue(false);
    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByTitle("删除"));
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("disabled 密钥应显示对应状态与启用操作", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ keys: [{ ...vkFixture, status: "disabled" }] })
    );
    const { container } = render(<GatewayKeysPanel />);

    await waitFor(() => {
      expect(screen.getByText("disabled")).toBeInTheDocument();
    });
    expect(screen.getByTitle("启用")).toBeInTheDocument();
    // disabled 状态徽章颜色
    const badge = screen.getByText("disabled");
    expect(badge.style.color).toBe("rgb(248, 113, 113)");
    expect(container).toBeTruthy();
  });
});
