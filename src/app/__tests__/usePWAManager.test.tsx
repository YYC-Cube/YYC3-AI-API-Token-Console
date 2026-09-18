/**
 * usePWAManager.test.tsx
 * ========================
 * usePWAManager Hook - PWA 缓存管理测试
 *
 * 覆盖范围:
 * - 初始状态
 * - 缓存统计 (总大小 / 总数 / 离线就绪)
 * - updateSW
 * - clearAllCache
 * - clearCache (单个)
 * - refreshCache
 * - formatSize
 * - pwaState 概览
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePWAManager } from "../hooks/usePWAManager";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe("usePWAManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初始状态", () => {
    it("swStatus 应为 active", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.swStatus).toBe("active");
    });

    it("swVersion 应有值", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.swVersion).toBe("1.4.2");
    });

    it("cacheEntries 应有 5 个条目", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.cacheEntries.length).toBe(5);
    });

    it("updateAvailable 初始为 true", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.updateAvailable).toBe(true);
    });

    it("isOnline 应为 true", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("缓存统计", () => {
    it("totalCacheSize 应为所有条目之和", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.totalCacheSize).toBeGreaterThan(0);
    });

    it("totalCacheCount 应为所有条目 count 之和", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.totalCacheCount).toBeGreaterThan(0);
    });

    it("offlineReady 应为 true (SW active + 3+ 缓存)", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.offlineReady).toBe(true);
    });
  });

  describe("updateSW", () => {
    it("更新后版本应变为 1.5.0", async () => {
      const { result } = renderHook(() => usePWAManager());
      await act(async () => {
        await result.current.updateSW();
      });
      expect(result.current.swVersion).toBe("1.5.0");
      expect(result.current.updateAvailable).toBe(false);
    });
  });

  describe("clearAllCache", () => {
    it("清空后 cacheEntries 应为空", async () => {
      const { result } = renderHook(() => usePWAManager());
      await act(async () => {
        await result.current.clearAllCache();
      });
      expect(result.current.cacheEntries.length).toBe(0);
      expect(result.current.totalCacheSize).toBe(0);
    });
  });

  describe("clearCache (单个)", () => {
    it("应移除指定缓存条目", async () => {
      const { result } = renderHook(() => usePWAManager());
      const before = result.current.cacheEntries.length;
      await act(async () => {
        await result.current.clearCache("yyc3-fonts");
      });
      expect(result.current.cacheEntries.length).toBe(before - 1);
      expect(result.current.cacheEntries.find((e) => e.name === "yyc3-fonts")).toBeUndefined();
    });
  });

  describe("refreshCache", () => {
    it("刷新后 lastUpdated 应更新", async () => {
      const { result } = renderHook(() => usePWAManager());
      const beforeTs = result.current.cacheEntries[0].lastUpdated;
      await act(async () => {
        await result.current.refreshCache();
      });
      expect(result.current.cacheEntries[0].lastUpdated).toBeGreaterThanOrEqual(beforeTs);
    });
  });

  describe("formatSize", () => {
    it("格式化字节", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(500)).toBe("500B");
    });

    it("格式化 KB", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(3072)).toBe("3.0KB");
    });

    it("格式化 MB", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(2400000)).toBe("2.3MB");
    });
  });

  describe("pwaState 概览", () => {
    it("应返回完整 PWA 状态对象", () => {
      const { result } = renderHook(() => usePWAManager());
      const state = result.current.pwaState;
      expect(state.swStatus).toBe("active");
      expect(state.swVersion).toBe("1.4.2");
      expect(state.offlineReady).toBe(true);
      expect(state.cacheEntries.length).toBe(5);
    });
  });
});
