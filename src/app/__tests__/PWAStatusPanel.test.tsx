/**
 * PWAStatusPanel.test.tsx
 * ========================
 * PWAStatusPanel 组件 — PWA 离线管理面板测试 (批10: 适配真数据 hook)
 *
 * 覆盖范围:
 * - jsdom 降级渲染 (unsupported / 无缓存 / 未就绪 / 更新按钮隐藏)
 * - stub 真数据渲染 (缓存条目 / 离线就绪 / 单删交互)
 * - 操作按钮 (刷新 / 清空)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PWAStatusPanel } from "../components/PWAStatusPanel";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";
import { zhCN } from "../i18n";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

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
      let val = getNestedValue(zhCN as Record<string, any>, key);
      if (vars) {
        val = val.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? `{${k}}`));
      }
      return val;
    },
    locales: [
      { code: "zh-CN" as const, label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US" as const, label: "English",  nativeLabel: "English" },
    ],
  };

  return render(
    <ViewContext.Provider value={viewValue}>
      <I18nContext.Provider value={i18nValue}>
        <PWAStatusPanel />
      </I18nContext.Provider>
    </ViewContext.Provider>
  );
}

/** stub caches + navigator.serviceWorker (壳 + 1 个资产缓存) */
function stubProdBrowser() {
  const SHELL = "yyc3-shell-v1";
  const ASSETS = "yyc3-assets-v1";
  const shellUrl = new URL("index.html", window.location.href).href;
  const makeRes = (len: number, body: string) => ({
    headers: { get: (k: string) => (k.toLowerCase() === "content-length" ? String(len) : null) },
    clone: () => makeRes(len, body),
    text: async () => body,
  });
  const entries: Record<string, Array<{ url: string; len: number; body?: string }>> = {
    [SHELL]: [{ url: shellUrl, len: 2048, body: "<html>shell</html>" }],
    [ASSETS]: [{ url: "https://localhost:3000/assets/a.js", len: 1024 }],
  };
  const cacheByKey = new Map(
    Object.entries(entries).map(([name, list]) => [
      name,
      {
        keys: vi.fn(async () => list.map((e) => ({ url: e.url }))),
        match: vi.fn(async (req: { url: string } | string) => {
          const url = typeof req === "string" ? req : req.url;
          const hit = list.find((e) => e.url === url);
          return hit ? makeRes(hit.len, hit.body ?? "x") : undefined;
        }),
      },
    ])
  );
  vi.stubGlobal("caches", {
    keys: vi.fn(async () => [...cacheByKey.keys()]),
    open: vi.fn(async (name: string) => cacheByKey.get(name)),
    delete: vi.fn(async () => true),
  });
  const reg = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    update: vi.fn(async () => undefined),
    active: { scriptURL: "/sw.js" },
    waiting: null,
    installing: null,
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn(async () => reg) },
  });
  return { SHELL, ASSETS };
}

describe("PWAStatusPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.unstubAllGlobals();
  });

  describe("jsdom 降级渲染 (无 SW / 无 Cache Storage)", () => {
    it("应渲染标题", () => {
      renderPanel();
      expect(screen.getByText("PWA & 离线管理")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      renderPanel();
      expect(screen.getByTestId("pwa-status-panel")).toBeInTheDocument();
    });

    it("SW 探测降级为 unsupported 且版本占位 —", async () => {
      renderPanel();
      await waitFor(() => expect(screen.getByText("不支持")).toBeInTheDocument());
      expect(screen.getByText("Service Worker 状态 · v—")).toBeInTheDocument();
    });

    it("应渲染在线状态", () => {
      renderPanel();
      expect(screen.getByText("在线")).toBeInTheDocument();
    });

    it("无壳缓存时应显示未就绪", () => {
      renderPanel();
      expect(screen.getByText("未就绪")).toBeInTheDocument();
    });
  });

  describe("缓存列表 (降级)", () => {
    it("无缓存时应显示空态", () => {
      renderPanel();
      expect(screen.getByTestId("cache-list")).toBeInTheDocument();
      expect(screen.getByText("缓存为空")).toBeInTheDocument();
    });
  });

  describe("操作按钮 (降级)", () => {
    it("updateAvailable=false 时不渲染更新按钮", () => {
      renderPanel();
      expect(screen.queryByTestId("update-sw-btn")).not.toBeInTheDocument();
    });

    it("应渲染刷新缓存按钮", () => {
      renderPanel();
      expect(screen.getByTestId("refresh-cache-btn")).toBeInTheDocument();
    });

    it("无缓存时清空按钮应禁用", () => {
      renderPanel();
      expect(screen.getByTestId("clear-all-cache-btn")).toBeDisabled();
    });
  });

  describe("真数据渲染 (stub caches + serviceWorker)", () => {
    it("应渲染缓存条目与离线就绪", async () => {
      const { SHELL, ASSETS } = stubProdBrowser();
      renderPanel();
      await waitFor(() => expect(screen.getByTestId(`cache-${ASSETS}`)).toBeInTheDocument());
      expect(screen.getByTestId(`cache-${SHELL}`)).toBeInTheDocument();
      expect(screen.getByText("离线就绪")).toBeInTheDocument();
    });

    it("点击单个缓存清理按钮应移除对应条目", async () => {
      const { ASSETS } = stubProdBrowser();
      renderPanel();
      await waitFor(() => expect(screen.getByTestId(`cache-${ASSETS}`)).toBeInTheDocument());
      fireEvent.click(screen.getByTestId(`clear-${ASSETS}`));
      await waitFor(() =>
        expect(screen.queryByTestId(`cache-${ASSETS}`)).not.toBeInTheDocument()
      );
    });
  });
});
