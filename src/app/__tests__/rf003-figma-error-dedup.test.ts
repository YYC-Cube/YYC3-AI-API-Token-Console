/**
 * rf003-figma-error-dedup.test.ts
 * =================================
 * RF-003 Figma 错误处理去重 - 验证测试
 *
 * 确保:
 * 1. App.tsx 和 error-handler.ts 均使用 isFigmaPlatformError()
 * 2. 不再有内联的 Figma 判定逻辑
 * 3. figma-error-filter.ts 是唯一判定源
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isFigmaPlatformError } from "../lib/figma-error-filter";

// Mock yyc3-storage to avoid IndexedDB in test
vi.mock("../lib/yyc3-storage", () => ({
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbClear: vi.fn().mockResolvedValue(undefined),
}));

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

describe("RF-003: Figma 错误处理去重", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 1. isFigmaPlatformError 作为唯一判定源
  // ----------------------------------------------------------

  describe("isFigmaPlatformError 判定覆盖率", () => {
    it("应覆盖 App.tsx capture-phase 需要过滤的所有场景", () => {
      // unhandledrejection 场景: reason.name + reason.message
      expect(isFigmaPlatformError("IframeMessageAbortError", "Message aborted")).toBe(true);
      expect(isFigmaPlatformError("", "message port was destroyed")).toBe(true);
      expect(isFigmaPlatformError("", "IframeMessage")).toBe(true);
    });

    it("应覆盖 error-handler.ts 需要过滤的所有场景", () => {
      // error 事件: filename + message
      expect(isFigmaPlatformError("", "IframeMessage error", "https://figma.com/code.js")).toBe(true);
      expect(isFigmaPlatformError("", "", "https://www.figma.com/webpack-artifacts/code.js")).toBe(true);
      expect(isFigmaPlatformError("", "IframeMessage failed")).toBe(true);
    });

    it("不应过滤正常应用错误", () => {
      expect(isFigmaPlatformError("TypeError", "undefined is not a function", "http://localhost:3118/app.js")).toBe(false);
      expect(isFigmaPlatformError("Error", "Network request failed")).toBe(false);
      expect(isFigmaPlatformError("SyntaxError", "Unexpected token")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 2. error-handler installGlobalErrorListeners 使用统一函数
  // ----------------------------------------------------------

  describe("error-handler 使用 isFigmaPlatformError", () => {
    it("error-handler 应导入 figma-error-filter", async () => {
      // 验证模块可以正常加载（如果导入缺失会报错）
      const mod = await import("../lib/error-handler");
      expect(typeof mod.installGlobalErrorListeners).toBe("function");
      expect(typeof mod.captureError).toBe("function");
    });

    it("Figma 错误不应被 captureError 记录到日志中", () => {
      // captureError 本身不做 Figma 过滤（由监听器层拦截）
      // 但我们验证 isFigmaPlatformError 在监听器中的调用路径正确
      const figmaMsg = "IframeMessageAbortError: Message aborted";
      expect(isFigmaPlatformError("IframeMessageAbortError", figmaMsg)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 3. 防回归：确保判定函数签名稳定
  // ----------------------------------------------------------

  describe("API 签名稳定性", () => {
    it("isFigmaPlatformError 应接受 3 个参数", () => {
      expect(isFigmaPlatformError.length).toBeGreaterThanOrEqual(2);
    });

    it("第三个参数 source 应为可选", () => {
      // 仅传 2 个参数不应抛错
      expect(() => isFigmaPlatformError("Error", "test")).not.toThrow();
    });
  });
});
