/**
 * integration.test.ts
 * ====================
 * YYC³ 集成测试
 *
 * 覆盖范围:
 * - 认证 → 查询的完整流程
 * - 网络配置 → WebSocket URL 联动
 * - 错误处理 → 日志记录联动
 * - 后台同步 → 队列 → 处理联动
 * - 离线/在线状态切换
 *
 * 运行命令: npx vitest run src/app/__tests__/integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// RF-002: Mock IndexedDB 操作（error-handler 现在导入 yyc3-storage）
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

// ----------------------------------------------------------
// Import modules after mock setup
// ----------------------------------------------------------

import { supabase } from "../lib/supabaseClient";
import { getActiveModels, getNodesStatus, getRecentLogs } from "../lib/db-queries";
import {
  loadNetworkConfig,
  saveNetworkConfig,
  resetNetworkConfig,
  generateWsUrl,
  DEFAULT_NETWORK_CONFIG,
} from "../lib/network-utils";
import {
  captureError,
  getErrorLog,
  clearErrorLog,
  trySafe,
} from "../lib/error-handler";
import {
  addToSyncQueue,
  getSyncQueue,
  processSyncQueue,
  clearSyncQueue,
} from "../lib/backgroundSync";

describe("Integration Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 认证 → 数据查询 完整流程
  // ----------------------------------------------------------

  describe("认证 → 数据查询流程", () => {
    it("登录后应能查询模型列表", async () => {
      // Step 1: 登录
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: "admin@cloudpivot.local",
          password: "admin123",
        });
      expect(authError).toBeNull();
      expect(authData).not.toBeNull();

      // Step 2: 验证会话
      const { data: sessionData } = await supabase.auth.getSession();
      expect(sessionData.session).not.toBeNull();

      // Step 3: 查询数据
      const { data: models } = await getActiveModels();
      expect(models.length).toBeGreaterThan(0);

      const { data: nodes } = await getNodesStatus();
      expect(nodes.length).toBeGreaterThan(0);
    });

    it("登出后应清除会话", async () => {
      // 登录
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      // 登出
      await supabase.auth.signOut();

      // 验证会话已清除
      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 网络配置 → WebSocket URL 联动
  // ----------------------------------------------------------

  describe("网络配置 → WebSocket 联动", () => {
    it("修改服务器地址后 WebSocket URL 应自动更新", () => {
      const config = loadNetworkConfig();
      expect(config.wsUrl).toBe("ws://192.168.3.45:3113/ws");

      // 修改地址
      const newConfig = {
        ...config,
        serverAddress: "10.0.0.100",
        port: "8080",
        wsUrl: generateWsUrl("10.0.0.100", "8080"),
      };
      saveNetworkConfig(newConfig);

      // 重新加载验证
      const loaded = loadNetworkConfig();
      expect(loaded.wsUrl).toBe("ws://10.0.0.100:8080/ws");
      expect(loaded.serverAddress).toBe("10.0.0.100");
    });

    it("重置配置后应恢复默认值", () => {
      // 修改配置
      saveNetworkConfig({
        ...DEFAULT_NETWORK_CONFIG,
        serverAddress: "custom",
      });

      // 重置
      const reset = resetNetworkConfig();
      expect(reset).toEqual(DEFAULT_NETWORK_CONFIG);

      // 验证持久化已清除
      const loaded = loadNetworkConfig();
      expect(loaded).toEqual(DEFAULT_NETWORK_CONFIG);
    });
  });

  // ----------------------------------------------------------
  // 错误处理 → 日志记录联动
  // ----------------------------------------------------------

  describe("错误处理 → 日志联动", () => {
    it("捕获的错误应持久化到日志", () => {
      clearErrorLog();

      captureError(new Error("test error 1"), { silent: true });
      captureError(new Error("test error 2"), { silent: true });

      const log = getErrorLog();
      expect(log.length).toBe(2);
      expect(log[0].message).toBe("test error 2");
    });

    it("trySafe 失败应自动记录到日志", async () => {
      clearErrorLog();

      const [data, error] = await trySafe(async () => {
        throw new Error("async failure");
      }, "IntegrationTest");

      expect(data).toBeNull();
      expect(error).not.toBeNull();

      const log = getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].source).toBe("IntegrationTest");
    });

    it("trySafe 成功不应记录日志", async () => {
      clearErrorLog();

      const [data] = await trySafe(async () => 42);
      expect(data).toBe(42);

      const log = getErrorLog();
      expect(log.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 后台同步 → 队列处理联动
  // ----------------------------------------------------------

  describe("后台同步 → 队列处理联动", () => {
    it("完整的添加 → 处理 → 清空流程", async () => {
      // 添加同步项
      addToSyncQueue({ type: "config_update", payload: { key: "theme" } });
      addToSyncQueue({ type: "audit_log", payload: { action: "login" } });
      addToSyncQueue({ type: "user_action", payload: { click: "button" } });

      expect(getSyncQueue().length).toBe(3);

      // 处理队列
      const result = await processSyncQueue();
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);

      // 处理后队列应为空
      expect(getSyncQueue().length).toBe(0);
    });

    it("clearSyncQueue 应清除所有待同步项", () => {
      addToSyncQueue({ type: "config_update", payload: {} });
      addToSyncQueue({ type: "config_update", payload: {} });

      clearSyncQueue();
      expect(getSyncQueue().length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 数据查询 → 错误处理联动
  // ----------------------------------------------------------

  describe("数据查询 → 错误处理联动", () => {
    it("trySafe 包装数据查询应安全返回结果", async () => {
      const [result, error] = await trySafe(async () => {
        const { data } = await getActiveModels();
        return data;
      }, "ModelQuery");

      expect(error).toBeNull();
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });

    it("trySafe 包装推理日志查询应安全返回", async () => {
      const [result, error] = await trySafe(async () => {
        const { data } = await getRecentLogs(5);
        return data;
      }, "LogQuery");

      expect(error).toBeNull();
      expect(result!.length).toBe(5);
    });
  });

  // ----------------------------------------------------------
  // 跨模块状态一致性
  // ----------------------------------------------------------

  describe("跨模块状态一致性", () => {
    it("同时操作多个 localStorage 键不应冲突", async () => {
      // 同时操作认证、网络配置、同步队列
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      saveNetworkConfig({
        ...DEFAULT_NETWORK_CONFIG,
        port: "9999",
      });

      addToSyncQueue({ type: "config_update", payload: {} });

      captureError(new Error("test"), { silent: true });

      // 验证各模块数据独立
      const { data: session } = await supabase.auth.getSession();
      expect(session.session).not.toBeNull();

      const config = loadNetworkConfig();
      expect(config.port).toBe("9999");

      expect(getSyncQueue().length).toBe(1);
      expect(getErrorLog().length).toBe(1);
    });
  });
});