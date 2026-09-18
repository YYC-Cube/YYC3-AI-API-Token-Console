/**
 * PWAStatusPanel.test.tsx
 * ========================
 * PWAStatusPanel 组件 - PWA 离线管理面板测试
 *
 * 覆盖范围:
 * - 标题渲染
 * - 状态卡片 (SW / 缓存 / 在线 / 离线就绪)
 * - 缓存列表
 * - 操作按钮 (更新 / 刷新 / 清空)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("PWAStatusPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      renderPanel();
      expect(screen.getByText("PWA & 离线管理")).toBeInTheDocument();
    });

    it("应有 data-testid", () => {
      renderPanel();
      expect(screen.getByTestId("pwa-status-panel")).toBeInTheDocument();
    });

    it("应渲染 SW 版本", () => {
      renderPanel();
      expect(screen.getByText(/v1\.4\.2/)).toBeInTheDocument();
    });

    it("应渲染在线状态", () => {
      renderPanel();
      expect(screen.getByText("在线")).toBeInTheDocument();
    });

    it("应渲染离线就绪", () => {
      renderPanel();
      expect(screen.getByText("离线就绪")).toBeInTheDocument();
    });
  });

  describe("缓存列表", () => {
    it("应渲染缓存条目", () => {
      renderPanel();
      expect(screen.getByTestId("cache-list")).toBeInTheDocument();
      expect(screen.getByText("yyc3-static-v1")).toBeInTheDocument();
      expect(screen.getByText("yyc3-api-cache")).toBeInTheDocument();
    });

    it("应渲染 5 个缓存条目", () => {
      renderPanel();
      expect(screen.getByTestId("cache-yyc3-static-v1")).toBeInTheDocument();
      expect(screen.getByTestId("cache-yyc3-fonts")).toBeInTheDocument();
      expect(screen.getByTestId("cache-yyc3-images")).toBeInTheDocument();
      expect(screen.getByTestId("cache-yyc3-runtime")).toBeInTheDocument();
    });
  });

  describe("操作按钮", () => {
    it("应渲染更新按钮", () => {
      renderPanel();
      expect(screen.getByTestId("update-sw-btn")).toBeInTheDocument();
    });

    it("应渲染刷新缓存按钮", () => {
      renderPanel();
      expect(screen.getByTestId("refresh-cache-btn")).toBeInTheDocument();
    });

    it("应渲染清空缓存按钮", () => {
      renderPanel();
      expect(screen.getByTestId("clear-all-cache-btn")).toBeInTheDocument();
    });

    it("点击单个缓存清理按钮应可交互", () => {
      renderPanel();
      const clearBtn = screen.getByTestId("clear-yyc3-fonts");
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);
      // 不会报错即可
    });
  });
});