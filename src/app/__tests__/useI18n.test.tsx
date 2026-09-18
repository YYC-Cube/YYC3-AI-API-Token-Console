/**
 * useI18n.test.tsx
 * ==================
 * useI18n Hook + i18n 语言包测试
 *
 * 覆盖范围:
 * - 默认语言 (zh-CN)
 * - 切换语言 (en-US)
 * - t() 函数嵌套 key 解析
 * - t() 函数模板变量插值
 * - 不存在的 key 返回原 key
 * - localStorage 持久化
 * - 语言列表
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useI18nProvider, SUPPORTED_LOCALES } from "../hooks/useI18n";

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
});

describe("useI18n", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  describe("默认语言", () => {
    it("默认应为 zh-CN", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.locale).toBe("zh-CN");
    });

    it("t() 应返回中文", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.t("common.loading")).toBe("加载中...");
    });
  });

  describe("切换语言", () => {
    it("切换到 en-US 后 t() 应返回英文", () => {
      const { result } = renderHook(() => useI18nProvider());
      act(() => {
        result.current.setLocale("en-US");
      });
      expect(result.current.locale).toBe("en-US");
      expect(result.current.t("common.loading")).toBe("Loading...");
    });

    it("切换后 localStorage 应持久化", () => {
      const { result } = renderHook(() => useI18nProvider());
      act(() => {
        result.current.setLocale("en-US");
      });
      expect(storage["yyc3_locale"]).toBe("en-US");
    });

    it("切回 zh-CN 应正常", () => {
      const { result } = renderHook(() => useI18nProvider());
      act(() => {
        result.current.setLocale("en-US");
      });
      act(() => {
        result.current.setLocale("zh-CN");
      });
      expect(result.current.t("common.loading")).toBe("加载中...");
    });
  });

  describe("t() 嵌套 key", () => {
    it("应解析多层嵌套 key", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.t("nav.dataMonitor")).toBe("数据监控");
      expect(result.current.t("operations.categories.node")).toBe("节点操作");
    });

    it("不存在的 key 应返回原 key", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.t("nonexistent.key")).toBe("nonexistent.key");
    });
  });

  describe("t() 模板变量", () => {
    it("应正确替换 {n} 变量", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.t("common.minutesAgo", { n: 5 })).toBe("5 分钟前");
      expect(result.current.t("common.hoursAgo", { n: 2 })).toBe("2 小时前");
    });

    it("英文也应正确替换变量", () => {
      const { result } = renderHook(() => useI18nProvider());
      act(() => {
        result.current.setLocale("en-US");
      });
      expect(result.current.t("common.minutesAgo", { n: 5 })).toBe("5 min ago");
    });
  });

  describe("语言列表", () => {
    it("应有 2 种语言", () => {
      expect(SUPPORTED_LOCALES.length).toBe(2);
    });

    it("应包含 zh-CN 和 en-US", () => {
      expect(SUPPORTED_LOCALES.find((l) => l.code === "zh-CN")).toBeDefined();
      expect(SUPPORTED_LOCALES.find((l) => l.code === "en-US")).toBeDefined();
    });

    it("locales 应通过 Hook 返回", () => {
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.locales.length).toBe(2);
    });
  });

  describe("localStorage 恢复", () => {
    it("有保存偏好时应恢复", () => {
      storage["yyc3_locale"] = "en-US";
      const { result } = renderHook(() => useI18nProvider());
      expect(result.current.locale).toBe("en-US");
    });
  });
});
