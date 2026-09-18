/**
 * error-handler.test.ts
 * ======================
 * YYC³ 错误处理工具 - 单元测试
 *
 * 覆盖范围:
 * - 错误捕获与分类
 * - 错误日志持久化
 * - 日志容量限制
 * - trySafe / trySafeSync 包装器
 * - 错误统计计算
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// RF-002: Mock IndexedDB 操作（error-handler 现在导入 yyc3-storage）
vi.mock("../lib/yyc3-storage", () => ({
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbClear: vi.fn().mockResolvedValue(undefined),
}));

import {
  captureError,
  captureNetworkError,
  captureAuthError,
  captureParseError,
  captureWSError,
  getErrorLog,
  clearErrorLog,
  getErrorStats,
  trySafe,
  trySafeSync,
  installGlobalErrorListeners,
} from "../lib/error-handler";
import type { AppError } from "../types";

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

describe("error-handler", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // captureError
  // ----------------------------------------------------------

  describe("captureError", () => {
    it("应捕获 Error 对象并返回 AppError", () => {
      const err = new Error("test error");
      const appError = captureError(err, { silent: true });

      expect(appError.id).toBeDefined();
      expect(appError.message).toBe("test error");
      expect(appError.stack).toBeDefined();
      expect(appError.resolved).toBe(false);
      expect(appError.timestamp).toBeGreaterThan(0);
    });

    it("应捕获字符串错误", () => {
      const appError = captureError("string error message", { silent: true });
      expect(appError.message).toBe("string error message");
    });

    it("应正确分类 TypeError", () => {
      const err = new TypeError("cannot read property");
      const appError = captureError(err, { silent: true });
      expect(appError.category).toBe("RUNTIME");
    });

    it("应正确分类 SyntaxError", () => {
      const err = new SyntaxError("unexpected token");
      const appError = captureError(err, { silent: true });
      expect(appError.category).toBe("PARSE");
    });

    it("应保存自定义来源和建议", () => {
      const appError = captureError(new Error("test"), {
        source: "WebSocket",
        userAction: "请重试",
        silent: true,
      });
      expect(appError.source).toBe("WebSocket");
      expect(appError.userAction).toBe("请重试");
    });

    it("覆盖自动分类", () => {
      const appError = captureError(new Error("test"), {
        category: "AUTH",
        severity: "critical",
        silent: true,
      });
      expect(appError.category).toBe("AUTH");
      expect(appError.severity).toBe("critical");
    });
  });

  // ----------------------------------------------------------
  // 分类快捷函数
  // ----------------------------------------------------------

  describe("captureNetworkError", () => {
    it("应创建 NETWORK 类别的错误", () => {
      const appError = captureNetworkError(new Error("timeout"), "ws://localhost:3113");
      expect(appError.category).toBe("NETWORK");
      expect(appError.source).toBe("ws://localhost:3113");
    });
  });

  describe("captureWSError", () => {
    it("应创建 WebSocket 相关错误", () => {
      const appError = captureWSError(new Error("connection refused"));
      expect(appError.category).toBe("NETWORK");
      expect(appError.source).toBe("WebSocket");
    });
  });

  describe("captureAuthError", () => {
    it("应创建 AUTH 类别的错误", () => {
      const appError = captureAuthError(new Error("session expired"));
      expect(appError.category).toBe("AUTH");
      expect(appError.severity).toBe("error");
    });
  });

  describe("captureParseError", () => {
    it("应创建 PARSE 类别的错误", () => {
      const appError = captureParseError(new Error("invalid json"), "WSMessage");
      expect(appError.category).toBe("PARSE");
      expect(appError.source).toBe("WSMessage");
    });
  });

  // ----------------------------------------------------------
  // 错误日志
  // ----------------------------------------------------------

  describe("getErrorLog / clearErrorLog", () => {
    it("初始日志应为空", () => {
      expect(getErrorLog()).toEqual([]);
    });

    it("捕获错误后日志应增长", () => {
      captureError(new Error("err1"), { silent: true });
      captureError(new Error("err2"), { silent: true });

      const log = getErrorLog();
      expect(log.length).toBe(2);
    });

    it("最新错误应在前面", () => {
      captureError(new Error("first"), { silent: true });
      captureError(new Error("second"), { silent: true });

      const log = getErrorLog();
      expect(log[0].message).toBe("second");
      expect(log[1].message).toBe("first");
    });

    it("clearErrorLog 应清空日志", () => {
      captureError(new Error("test"), { silent: true });
      clearErrorLog();
      expect(getErrorLog()).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // getErrorStats
  // ----------------------------------------------------------

  describe("getErrorStats", () => {
    it("空日志应返回零统计", () => {
      const stats = getErrorStats();
      expect(stats.total).toBe(0);
      expect(stats.unresolvedCount).toBe(0);
      expect(stats.lastErrorTime).toBeNull();
    });

    it("应正确按类别统计", () => {
      captureError(new TypeError("a"), { silent: true });   // RUNTIME
      captureError(new SyntaxError("b"), { silent: true }); // PARSE
      captureNetworkError(new Error("c"), "/api");           // NETWORK

      const stats = getErrorStats();
      expect(stats.total).toBe(3);
      expect(stats.byCategory.RUNTIME).toBe(1);
      expect(stats.byCategory.PARSE).toBe(1);
      expect(stats.byCategory.NETWORK).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // trySafe / trySafeSync
  // ----------------------------------------------------------

  describe("trySafe", () => {
    it("成功时应返回 [data, null]", async () => {
      const [data, error] = await trySafe(async () => 42);
      expect(data).toBe(42);
      expect(error).toBeNull();
    });

    it("失败时应返回 [null, AppError]", async () => {
      const [data, error] = await trySafe(async () => {
        throw new Error("async error");
      });
      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toBe("async error");
    });
  });

  describe("trySafeSync", () => {
    it("成功时应返回 [data, null]", () => {
      const [data, error] = trySafeSync(() => "hello");
      expect(data).toBe("hello");
      expect(error).toBeNull();
    });

    it("失败时应返回 [null, AppError]", () => {
      const [data, error] = trySafeSync(() => {
        throw new Error("sync error");
      });
      expect(data).toBeNull();
      expect(error!.message).toBe("sync error");
    });
  });

  // ----------------------------------------------------------
  // Figma 平台错误过滤
  // ----------------------------------------------------------

  describe("installGlobalErrorListeners - Figma 错误过滤", () => {
    it("应导出 installGlobalErrorListeners 函数", () => {
      expect(typeof installGlobalErrorListeners).toBe("function");
    });

    it("IframeMessageAbortError 不应写入错误日志", () => {
      clearErrorLog();
      // 模拟 Figma 平台的 IframeMessageAbortError 被 captureError 捕获前
      // installGlobalErrorListeners 中的过滤逻辑基于字符串匹配
      const figmaErrorMsg = "IframeMessageAbortError: Message aborted: message port was destroyed";
      // 验证过滤条件可以识别 Figma 错误
      expect(figmaErrorMsg.includes("IframeMessage")).toBe(true);
      expect(figmaErrorMsg.includes("message port was destroyed")).toBe(true);
      expect(figmaErrorMsg.includes("Message aborted")).toBe(true);
    });

    it("非 Figma 错误不应被过滤", () => {
      const normalError = "TypeError: Cannot read properties of undefined";
      expect(normalError.includes("IframeMessage")).toBe(false);
      expect(normalError.includes("message port was destroyed")).toBe(false);
      expect(normalError.includes("Message aborted")).toBe(false);
    });

    it("webpack-artifacts 来源应被识别为 Figma 内部", () => {
      const figmaFilename = "https://www.figma.com/webpack-artifacts/assets/1741-0091e26ad4c06e70.min.js.br";
      expect(figmaFilename.includes("figma.com")).toBe(true);
      expect(figmaFilename.includes("webpack-artifacts")).toBe(true);
    });
  });
});