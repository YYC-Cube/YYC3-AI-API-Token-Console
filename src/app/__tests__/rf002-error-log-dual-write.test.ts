/**
 * rf002-error-log-dual-write.test.ts
 * ====================================
 * RF-002 错误日志双写 - 验证测试
 *
 * 确保:
 * 1. captureError 同步写 localStorage + 异步写 IndexedDB
 * 2. clearErrorLog 同时清除两个存储路径
 * 3. getFullErrorLog 从 IndexedDB 读取完整日志
 * 4. IndexedDB 不可用时静默降级到 localStorage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock IndexedDB 操作（yyc3-storage）
vi.mock("../lib/yyc3-storage", () => ({
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbClear: vi.fn().mockResolvedValue(undefined),
}));

import { idbPut, idbGetAll, idbClear } from "../lib/yyc3-storage";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import {
  captureError,
  getErrorLog,
  clearErrorLog,
  getFullErrorLog,
} from "../lib/error-handler";

describe("RF-002: 错误日志 localStorage + IndexedDB 双写", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 1. 双写验证
  // ----------------------------------------------------------

  describe("captureError 双写", () => {
    it("应同步写入 localStorage", () => {
      captureError(new Error("test dual write"), { silent: true });
      const log = getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].message).toBe("test dual write");
    });

    it("应异步写入 IndexedDB (idbPut)", () => {
      captureError(new Error("idb write test"), { silent: true });
      expect(idbPut).toHaveBeenCalledWith(
        "errorLog",
        expect.objectContaining({ message: "idb write test" })
      );
    });

    it("多次捕获应多次调用 idbPut", () => {
      captureError(new Error("err1"), { silent: true });
      captureError(new Error("err2"), { silent: true });
      captureError(new Error("err3"), { silent: true });
      expect(idbPut).toHaveBeenCalledTimes(3);
    });
  });

  // ----------------------------------------------------------
  // 2. 清除双路径
  // ----------------------------------------------------------

  describe("clearErrorLog 双清除", () => {
    it("应清除 localStorage", () => {
      captureError(new Error("to be cleared"), { silent: true });
      clearErrorLog();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("yyc3_error_log");
      expect(getErrorLog()).toEqual([]);
    });

    it("应清除 IndexedDB errorLog store", () => {
      clearErrorLog();
      expect(idbClear).toHaveBeenCalledWith("errorLog");
    });
  });

  // ----------------------------------------------------------
  // 3. getFullErrorLog 异步读取
  // ----------------------------------------------------------

  describe("getFullErrorLog", () => {
    it("应从 IndexedDB 读取并按时间倒序返回", async () => {
      const mockEntries = [
        { id: "err_1", message: "old", timestamp: 1000, category: "UNKNOWN", severity: "error", resolved: false },
        { id: "err_2", message: "new", timestamp: 2000, category: "UNKNOWN", severity: "error", resolved: false },
      ];
      vi.mocked(idbGetAll).mockResolvedValueOnce(mockEntries);

      const log = await getFullErrorLog();
      expect(log[0].message).toBe("new");
      expect(log[1].message).toBe("old");
    });

    it("IndexedDB 失败时应降级到 localStorage", async () => {
      vi.mocked(idbGetAll).mockRejectedValueOnce(new Error("IDB unavailable"));
      captureError(new Error("fallback test"), { silent: true });

      const log = await getFullErrorLog();
      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log[0].message).toBe("fallback test");
    });
  });

  // ----------------------------------------------------------
  // 4. IndexedDB 写入失败静默降级
  // ----------------------------------------------------------

  describe("IndexedDB 写入失败静默降级", () => {
    it("idbPut 失败不应影响 localStorage 写入", () => {
      vi.mocked(idbPut).mockRejectedValueOnce(new Error("quota exceeded"));
      // captureError 不应抛出异常
      expect(() => {
        captureError(new Error("should still work"), { silent: true });
      }).not.toThrow();

      const log = getErrorLog();
      expect(log[0].message).toBe("should still work");
    });
  });
});
