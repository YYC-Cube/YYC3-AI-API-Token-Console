/**
 * pwa-i18n-types.test.ts
 * ========================
 * PWA & 离线 + 国际化 类型定义验证
 *
 * 覆盖范围:
 * - SWStatus / CacheEntry / PWAState
 * - Locale / LocaleInfo
 */

import { describe, it, expect } from "vitest";
import type {
  SWStatus,
  CacheEntry,
  PWAState,
  Locale,
  LocaleInfo,
} from "../types";

describe("PWA & 离线类型定义 (第 17 类)", () => {
  it("SWStatus 应支持 6 种状态", () => {
    const statuses: SWStatus[] = [
      "idle", "installing", "waiting", "active", "error", "unsupported",
    ];
    expect(statuses.length).toBe(6);
  });

  it("CacheEntry 应有完整字段", () => {
    const entry: CacheEntry = {
      name: "yyc3-static-v1",
      size: 2400000,
      count: 48,
      lastUpdated: Date.now(),
    };
    expect(entry.name).toBe("yyc3-static-v1");
  });

  it("PWAState 应有完整字段", () => {
    const state: PWAState = {
      swStatus: "active",
      swVersion: "1.4.2",
      isOnline: true,
      cacheEntries: [],
      totalCacheSize: 5390000,
      offlineReady: true,
      lastCacheUpdate: Date.now(),
    };
    expect(state.offlineReady).toBe(true);
  });
});

describe("国际化类型定义 (第 18 类)", () => {
  it("Locale 应支持 2 种语言", () => {
    const locales: Locale[] = ["zh-CN", "en-US"];
    expect(locales.length).toBe(2);
  });

  it("LocaleInfo 应有完整字段", () => {
    const info: LocaleInfo = {
      code: "zh-CN",
      label: "简体中文",
      nativeLabel: "简体中文",
    };
    expect(info.nativeLabel).toBe("简体中文");
  });
});
