/**
 * PWAStatusPanel.states.test.tsx
 * ================================
 * PWA 状态面板 — hook 状态矩阵测试 (S5 覆盖率长尾批 2)
 *
 * 覆盖范围 (usePWAManager 捕获式 mock, hoisted ref 控制状态):
 * - 无 ViewContext Provider → isMobile 默认 false (view?.isMobile ?? false)
 * - 移动端布局 (isMobile=true 双栅格分支)
 * - SW 状态 installing (animate-spin)
 * - 离线状态 (isOnline=false → WifiOff/离线模式)
 * - 更新可用 + 更新中 (updateAvailable / isUpdating)
 * - 清理中 (isClearing)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PWAStatusPanel } from "../components/PWAStatusPanel";
import { ViewContext } from "../lib/view-context";
import { I18nContext } from "../hooks/useI18n";
import type { I18nContextValue } from "../types";
import { zhCN } from "../i18n";
import type { CacheEntry, SWStatus } from "../types";

// ── 捕获式 mock: hoisted ref 持有可变状态, 每个 test 覆写 ──
const pwaState = vi.hoisted(() => ({
  swStatus: "active" as string,
  swVersion: "abc12345",
  isOnline: true,
  cacheEntries: [] as Array<Record<string, unknown>>,
  totalCacheSize: 2048,
  totalCacheCount: 2,
  offlineReady: true,
  updateAvailable: false,
  isUpdating: false,
  isClearing: false,
  updateSW: vi.fn(),
  clearAllCache: vi.fn(),
  clearCache: vi.fn(),
  refreshCache: vi.fn(),
  formatSize: vi.fn((n: number) => `${n} B`),
}));

vi.mock("../hooks/usePWAManager", () => ({
  usePWAManager: () => ({
    swStatus: pwaState.swStatus,
    swVersion: pwaState.swVersion,
    isOnline: pwaState.isOnline,
    cacheEntries: pwaState.cacheEntries,
    totalCacheSize: pwaState.totalCacheSize,
    totalCacheCount: pwaState.totalCacheCount,
    offlineReady: pwaState.offlineReady,
    updateAvailable: pwaState.updateAvailable,
    isUpdating: pwaState.isUpdating,
    isClearing: pwaState.isClearing,
    updateSW: pwaState.updateSW,
    clearAllCache: pwaState.clearAllCache,
    clearCache: pwaState.clearCache,
    refreshCache: pwaState.refreshCache,
    formatSize: pwaState.formatSize,
  }),
}));

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const k of keys) {
    if (result == null || typeof result !== "object") return path;
    result = (result as Record<string, unknown>)[k];
  }
  return typeof result === "string" ? result : path;
}

function createI18nValue(): I18nContextValue {
  return {
    locale: "zh-CN",
    setLocale: () => {},
    t: (key: string, vars?: Record<string, string | number>) => {
      const raw = getNestedValue(zhCN as Record<string, unknown>, key);
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_: string, k: string) =>
        vars[k] != null ? String(vars[k]) : `{${k}}`
      );
    },
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  };
}

const mobileView = {
  breakpoint: "sm" as const,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  width: 480,
  isTouch: true,
};

const desktopView = {
  breakpoint: "lg" as const,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 1280,
  isTouch: false,
};

function renderPanel(options?: { mobile?: boolean; withViewContext?: boolean }) {
  const ui = <PWAStatusPanel />;
  if (options?.withViewContext === false) {
    return render(<I18nContext.Provider value={createI18nValue()}>{ui}</I18nContext.Provider>);
  }
  return render(
    <ViewContext.Provider value={options?.mobile ? mobileView : desktopView}>
      <I18nContext.Provider value={createI18nValue()}>{ui}</I18nContext.Provider>
    </ViewContext.Provider>
  );
}

function resetState() {
  pwaState.swStatus = "active";
  pwaState.swVersion = "abc12345";
  pwaState.isOnline = true;
  pwaState.cacheEntries = [
    { name: "yyc3-assets-v1", size: 1024, count: 3, lastUpdated: Date.now() },
  ];
  pwaState.totalCacheSize = 2048;
  pwaState.totalCacheCount = 2;
  pwaState.offlineReady = true;
  pwaState.updateAvailable = false;
  pwaState.isUpdating = false;
  pwaState.isClearing = false;
  vi.clearAllMocks();
}

describe("PWAStatusPanel 状态矩阵", () => {
  beforeEach(resetState);

  // ----------------------------------------------------------
  // ViewContext 缺省
  // ----------------------------------------------------------

  it("无 ViewContext Provider 时应按桌面端布局渲染 (isMobile 兜底 false)", () => {
    renderPanel({ withViewContext: false });
    const grid = screen.getByTestId("pwa-status-panel").querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-4");
  });

  // ----------------------------------------------------------
  // 移动端布局
  // ----------------------------------------------------------

  it("移动端状态卡片区应使用双列栅格", () => {
    renderPanel({ mobile: true });
    const grids = screen.getByTestId("pwa-status-panel").querySelectorAll(".grid");
    expect(grids[0]!.className).toContain("grid-cols-2");
    expect(grids[0]!.className).not.toContain("grid-cols-4");
  });

  it("移动端操作按钮区应使用单列栅格", () => {
    renderPanel({ mobile: true });
    const grids = screen.getByTestId("pwa-status-panel").querySelectorAll(".grid");
    expect(grids[1]!.className).toContain("grid-cols-1");
    expect(grids[1]!.className).not.toContain("grid-cols-3");
  });

  it("桌面端操作按钮区应使用三列栅格", () => {
    renderPanel({ mobile: false });
    const grids = screen.getByTestId("pwa-status-panel").querySelectorAll(".grid");
    expect(grids[1]!.className).toContain("grid-cols-3");
  });

  // ----------------------------------------------------------
  // SW 状态徽标
  // ----------------------------------------------------------

  it("SW installing 状态应显示安装中并带旋转图标", () => {
    pwaState.swStatus = "installing" satisfies SWStatus;
    renderPanel();
    expect(screen.getByText("安装中")).toBeInTheDocument();
    const statusCard = screen.getByText("安装中").closest(".flex.flex-col");
    const icon = statusCard!.querySelector(".animate-spin");
    expect(icon).not.toBeNull();
  });

  it("SW active 状态不应带旋转图标", () => {
    renderPanel();
    expect(screen.getByText("运行中")).toBeInTheDocument();
    const statusCard = screen.getByText("运行中").closest(".flex.flex-col");
    expect(statusCard!.querySelector(".animate-spin")).toBeNull();
  });

  it("SW 版本号应随 swVersion 渲染", () => {
    renderPanel();
    expect(screen.getByText(/Service Worker 状态 · vabc12345/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 在线/离线
  // ----------------------------------------------------------

  it("离线时应显示离线模式文案与红色语义", () => {
    pwaState.isOnline = false;
    renderPanel();
    expect(screen.getByText("离线模式")).toBeInTheDocument();
    expect(screen.queryByText("在线")).not.toBeInTheDocument();
    const label = screen.getByText("离线模式");
    // jsdom 会把 style 中的 hex 色值规范化为 rgb()
    expect(label.getAttribute("style")).toContain("rgb(255, 51, 102)");
  });

  it("在线时应显示在线文案与绿色语义", () => {
    renderPanel();
    expect(screen.getByText("在线")).toBeInTheDocument();
    const label = screen.getByText("在线");
    expect(label.getAttribute("style")).toContain("rgb(0, 255, 136)");
  });

  // ----------------------------------------------------------
  // 离线就绪
  // ----------------------------------------------------------

  it("未就绪时应显示未就绪文案与黄色语义", () => {
    pwaState.offlineReady = false;
    renderPanel();
    expect(screen.getByText("未就绪")).toBeInTheDocument();
    const label = screen.getByText("未就绪");
    expect(label.getAttribute("style")).toContain("rgb(255, 170, 0)");
  });

  // ----------------------------------------------------------
  // SW 更新按钮
  // ----------------------------------------------------------

  it("有可用更新时应显示更新按钮并可点击", () => {
    pwaState.updateAvailable = true;
    renderPanel();
    const btn = screen.getByTestId("update-sw-btn");
    expect(btn).toBeEnabled();
    expect(screen.getByText("立即更新")).toBeInTheDocument();
  });

  it("更新中应禁用按钮并显示更新中文案", () => {
    pwaState.updateAvailable = true;
    pwaState.isUpdating = true;
    renderPanel();
    const btn = screen.getByTestId("update-sw-btn");
    expect(btn).toBeDisabled();
    expect(screen.getByText("更新中...")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 缓存统计
  // ----------------------------------------------------------

  it("应渲染缓存总大小与条目数", () => {
    renderPanel();
    expect(screen.getByText("2048 B")).toBeInTheDocument();
    expect(screen.getByText(/缓存总大小 · 2 项/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 清理按钮
  // ----------------------------------------------------------

  it("有缓存时清空按钮应可用", () => {
    renderPanel();
    expect(screen.getByTestId("clear-all-cache-btn")).toBeEnabled();
    expect(screen.getByText("清空全部缓存")).toBeInTheDocument();
  });

  it("清理中应禁用按钮并显示清理中文案", () => {
    pwaState.isClearing = true;
    renderPanel();
    const btn = screen.getByTestId("clear-all-cache-btn");
    expect(btn).toBeDisabled();
    expect(screen.getByText("清理中...")).toBeInTheDocument();
  });

  it("清理中按钮图标应带旋转动画", () => {
    pwaState.isClearing = true;
    renderPanel();
    expect(screen.getByTestId("clear-all-cache-btn").querySelector(".animate-spin")).not.toBeNull();
  });

  it("缓存明细应渲染 formatSize 后的条目大小", () => {
    renderPanel();
    expect(screen.getByTestId("cache-yyc3-assets-v1")).toBeInTheDocument();
    expect(screen.getByText(/1024 B/)).toBeInTheDocument();
  });
});
