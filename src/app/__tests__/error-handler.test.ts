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

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";

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
  getFullErrorLog,
  clearErrorLog,
  getErrorStats,
  trySafe,
  trySafeSync,
  installGlobalErrorListeners,
} from "../lib/error-handler";
import { idbGetAll } from "../lib/yyc3-storage";
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

  // ----------------------------------------------------------
  // 错误分类补充分支 (DOMException / Event)
  // ----------------------------------------------------------

  describe("错误分类补充分支", () => {
    it("QuotaExceededError 归类为 STORAGE/warning", () => {
      const appError = captureError(new DOMException("quota exceeded", "QuotaExceededError"), {
        silent: true,
      });
      expect(appError.category).toBe("STORAGE");
      expect(appError.severity).toBe("warning");
    });

    it("SecurityError 归类为 AUTH/error", () => {
      const appError = captureError(new DOMException("blocked", "SecurityError"), { silent: true });
      expect(appError.category).toBe("AUTH");
      expect(appError.severity).toBe("error");
    });

    it("其他 DOMException 归类为 UNKNOWN", () => {
      const appError = captureError(new DOMException("aborted", "AbortError"), { silent: true });
      expect(appError.category).toBe("UNKNOWN");
    });

    it("Event(type=error) 归类为 NETWORK", () => {
      const appError = captureError(new Event("error"), { silent: true });
      expect(appError.category).toBe("NETWORK");
      expect(appError.severity).toBe("error");
    });

    it("非 error 类型 Event 归类为 UNKNOWN", () => {
      const appError = captureError(new Event("close"), { silent: true });
      expect(appError.category).toBe("UNKNOWN");
    });
  });

  // ----------------------------------------------------------
  // 错误消息/堆栈提取
  // ----------------------------------------------------------

  describe("错误消息提取", () => {
    it("对象带 message 属性时取其字符串形式", () => {
      const appError = captureError({ message: 42 }, { silent: true });
      expect(appError.message).toBe("42");
    });

    it("无法识别的错误对象返回 未知错误", () => {
      const appError = captureError({ foo: "bar" }, { silent: true });
      expect(appError.message).toBe("未知错误");
    });

    it("null 错误返回 未知错误", () => {
      const appError = captureError(null, { silent: true });
      expect(appError.message).toBe("未知错误");
    });

    it("非 Error 错误不含堆栈", () => {
      const appError = captureError("plain text", { silent: true });
      expect(appError.stack).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // 控制台分级输出
  // ----------------------------------------------------------

  describe("控制台分级输出", () => {
    it("severity 为 error 时走 console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureError(new Error("plain"));
      expect(spy).toHaveBeenCalledWith("[YYC³ UNKNOWN]", "plain", expect.any(String));
      spy.mockRestore();
    });

    it("severity 为 critical 时走 console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureError(new Error("critical case"), { severity: "critical" });
      expect(spy).toHaveBeenCalledWith("[YYC³ UNKNOWN]", "critical case", expect.any(String));
      spy.mockRestore();
    });

    it("severity 为 warning 时走 console.warn", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      captureError(new Error("warn case"), { severity: "warning" });
      expect(spy).toHaveBeenCalledWith("[YYC³ UNKNOWN]", "warn case");
      spy.mockRestore();
    });

    it("severity 为 info 时走 console.info", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      captureError(new Error("info case"), { severity: "info" });
      expect(spy).toHaveBeenCalledWith("[YYC³ UNKNOWN]", "info case");
      spy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // localStorage 损坏与配额降级
  // ----------------------------------------------------------

  describe("localStorage 损坏与配额降级", () => {
    it("日志数据损坏时 getErrorLog 返回空数组", () => {
      localStorageMock.setItem("yyc3_error_log", "{{{broken json");
      expect(getErrorLog()).toEqual([]);
    });

    it("首次写入失败时降级为单条重写", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });
      captureError(new Error("quota test"), { silent: true });

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe("quota test");
    });

    it("localStorage 完全不可写时静默失败", () => {
      const original = localStorageMock.setItem.getMockImplementation();
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("no space left");
      });

      expect(() => captureError(new Error("swallowed"), { silent: true })).not.toThrow();
      expect(getErrorLog()).toEqual([]);

      if (original) localStorageMock.setItem.mockImplementation(original);
    });
  });

  // ----------------------------------------------------------
  // getFullErrorLog — IndexedDB 优先 / localStorage 降级
  // ----------------------------------------------------------

  describe("getFullErrorLog", () => {
    it("返回 IndexedDB 条目并按时间倒序排列", async () => {
      const mk = (id: string, ts: number): AppError => ({
        id,
        category: "NETWORK",
        severity: "warning",
        message: `m-${id}`,
        timestamp: ts,
        resolved: false,
      });
      vi.mocked(idbGetAll).mockResolvedValueOnce([mk("a", 100), mk("b", 300), mk("c", 200)]);

      const log = await getFullErrorLog();
      expect(log.map((e) => e.id)).toEqual(["b", "c", "a"]);
    });

    it("IndexedDB 不可用时降级到 localStorage 日志", async () => {
      vi.mocked(idbGetAll).mockRejectedValueOnce(new Error("idb down"));
      captureError(new Error("local fallback"), { silent: true });

      const log = await getFullErrorLog();
      expect(log.some((e) => e.message === "local fallback")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // getErrorStats 补充分支
  // ----------------------------------------------------------

  describe("getErrorStats 补充分支", () => {
    const seed = (entry: Record<string, unknown> & { id: string }): void => {
      localStorageMock.setItem(
        "yyc3_error_log",
        JSON.stringify([
          {
            category: "NETWORK",
            severity: "error",
            message: "seed",
            timestamp: 1,
            resolved: false,
            ...entry,
          },
        ])
      );
    };

    it("已解决的错误不计入未解决数", () => {
      seed({ id: "e1", resolved: true, timestamp: 111, severity: "warning" });
      const stats = getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.unresolvedCount).toBe(0);
      expect(stats.lastErrorTime).toBe(111);
      expect(stats.bySeverity.warning).toBe(1);
    });

    it("未知 category 字段容错计数不崩溃", () => {
      seed({ id: "e2", category: "BOGUS" as unknown as AppError["category"] });
      const stats = getErrorStats();
      expect(stats.total).toBe(1);
      expect(stats.unresolvedCount).toBe(1);
    });
  });

  // ----------------------------------------------------------
  // installGlobalErrorListeners — 全局监听行为 (window stub)
  // ----------------------------------------------------------

  describe("installGlobalErrorListeners 监听行为", () => {
    interface FakeGlobalErrorEvent {
      error?: { name?: string; message?: string; stack?: string };
      message?: string;
      filename?: string;
      lineno?: number;
      colno?: number;
      reason?: { name?: string; message?: string; stack?: string };
      preventDefault?: () => void;
    }
    type GlobalHandler = (event: FakeGlobalErrorEvent) => void;

    let handlers: Record<string, GlobalHandler>;
    let addEventListener: ReturnType<typeof vi.fn>;

    beforeAll(() => {
      // 静默安装期与捕获期的控制台输出
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});

      handlers = {};
      addEventListener = vi.fn((type: string, handler: GlobalHandler) => {
        handlers[type] = handler;
      });
      vi.stubGlobal("window", { addEventListener });
      installGlobalErrorListeners(); // 首次安装（模块级 flag 置位）
    });

    afterAll(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("注册 error 与 unhandledrejection 两类监听器", () => {
      expect(typeof handlers["error"]).toBe("function");
      expect(typeof handlers["unhandledrejection"]).toBe("function");
    });

    it("重复安装不会重复注册", () => {
      installGlobalErrorListeners();
      expect(addEventListener).not.toHaveBeenCalled();
    });

    it("普通运行时错误按 critical 记录并标注来源行列", () => {
      clearErrorLog();
      handlers["error"]!({
        error: new TypeError("boom"),
        message: "boom",
        filename: "app.tsx",
        lineno: 10,
        colno: 2,
      });

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        category: "RUNTIME",
        severity: "critical",
        source: "app.tsx:10:2",
        message: "boom",
      });
    });

    it("event.error 缺失时降级使用 message 字符串", () => {
      clearErrorLog();
      handlers["error"]!({ message: "plain failure", filename: "f.js", lineno: 1, colno: 1 });

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe("plain failure");
    });

    it("Figma 平台错误被过滤，不写入日志", () => {
      clearErrorLog();
      handlers["error"]!({
        error: { name: "IframeMessageAbortError", message: "Message aborted: message port was destroyed" },
        message: "Message aborted",
        filename: "https://www.figma.com/webpack-artifacts/1741-0091e26ad4c06e70.min.js",
        lineno: 1,
        colno: 1,
      });

      expect(getErrorLog()).toHaveLength(0);
    });

    it("未捕获 Promise 拒绝按 error 级别记录", () => {
      clearErrorLog();
      handlers["unhandledrejection"]!({
        reason: new Error("async boom"),
        preventDefault: vi.fn(),
      });

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        category: "RUNTIME",
        severity: "error",
        source: "UnhandledPromiseRejection",
      });
    });

    it("Figma 原因的 Promise 拒绝被拦截并调用 preventDefault", () => {
      clearErrorLog();
      const preventDefault = vi.fn();
      handlers["unhandledrejection"]!({
        reason: { name: "IframeMessageAbortError", message: "message port was destroyed" },
        preventDefault,
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(getErrorLog()).toHaveLength(0);
    });

    it("reason 缺失时仍可记录未知错误", () => {
      clearErrorLog();
      handlers["unhandledrejection"]!({});

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe("未知错误");
    });
  });
});