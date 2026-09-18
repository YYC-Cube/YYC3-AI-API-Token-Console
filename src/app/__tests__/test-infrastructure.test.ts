/**
 * test-infrastructure.test.ts
 * ============================
 * 测试基础设施自检
 *
 * 验证 Vitest 测试环境本身的正确性:
 * - localStorage mock 正常工作
 * - 模块热重载 (vi.resetModules) 正常
 * - 异步 import 正常
 * - 类型导入正常
 * - JSON 序列化/反序列化正常
 * - 时间 mock 正常
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── localStorage Mock ───
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
(globalThis as any).localStorage = localStorageMock;

describe("测试基础设施自检", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ─── localStorage Mock ───
  describe("localStorage Mock", () => {
    it("setItem/getItem 正常", () => {
      localStorageMock.setItem("test_key", "test_value");
      expect(localStorageMock.getItem("test_key")).toBe("test_value");
    });

    it("removeItem 正常", () => {
      localStorageMock.setItem("key", "value");
      localStorageMock.removeItem("key");
      expect(localStorageMock.getItem("key")).toBeNull();
    });

    it("clear 正常", () => {
      localStorageMock.setItem("a", "1");
      localStorageMock.setItem("b", "2");
      localStorageMock.clear();
      expect(localStorageMock.length).toBe(0);
    });

    it("JSON 序列化往返", () => {
      const data = { id: "test", items: [1, 2, 3], nested: { a: true } };
      localStorageMock.setItem("json_test", JSON.stringify(data));
      const parsed = JSON.parse(localStorageMock.getItem("json_test")!);
      expect(parsed).toEqual(data);
    });
  });

  // ─── 模块重载 ───
  describe("模块热重载", () => {
    it("vi.resetModules 清除模块缓存", async () => {
      vi.resetModules();
      const mod1 = await import("../lib/create-local-store");
      expect(mod1.createLocalStore).toBeDefined();
    });
  });

  // ─── 时间 Mock ───
  describe("时间相关", () => {
    it("Date.now() 返回数字", () => {
      expect(typeof Date.now()).toBe("number");
      expect(Date.now()).toBeGreaterThan(0);
    });

    it("vi.fn() mock 正常追踪调用", () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      fn(1, 2);
      fn(3, 4);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith(1, 2);
      expect(fn).toHaveReturnedWith(3);
    });
  });

  // ─── 异步支持 ───
  describe("异步支持", () => {
    it("async/await 正常", async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });

    it("动态 import 正常", async () => {
      const types = await import("../types");
      expect(types).toBeDefined();
      expect(types.toNodeData).toBeDefined();
    });
  });

  // ─── 环境检测 ───
  describe("环境检测", () => {
    it("运行在 Node 环境 (.test.ts)", () => {
      // 此文件是 .test.ts，应由 vitest 配置分配到 node 环境
      expect(typeof process).toBe("object");
    });

    it("globalThis 可用", () => {
      expect(globalThis).toBeDefined();
    });
  });
});
