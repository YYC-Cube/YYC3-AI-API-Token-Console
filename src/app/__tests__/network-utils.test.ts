/**
 * network-utils.test.ts
 * ======================
 * YYC³ 网络工具函数 - 单元测试
 *
 * 测试框架: Vitest
 * 运行命令: npx vitest run src/app/__tests__/network-utils.test.ts
 *
 * 覆盖范围:
 * - 网络配置 CRUD（localStorage 读写）
 * - WebSocket URL 自动生成
 * - 默认值常量校验
 * - 连接测试超时逻辑
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NETWORK_CONFIG,
  generateWsUrl,
  loadNetworkConfig,
  resetNetworkConfig,
  saveNetworkConfig,
  testWebSocketConnection
} from "../lib/network-utils";
import type { NetworkConfig } from "../types";

// ============================================================
// Mock localStorage
// ============================================================

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

// ============================================================
// Tests
// ============================================================

describe("network-utils", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // DEFAULT_NETWORK_CONFIG
  // ----------------------------------------------------------

  describe("DEFAULT_NETWORK_CONFIG", () => {
    it("应包含正确的默认服务器地址", () => {
      expect(DEFAULT_NETWORK_CONFIG.serverAddress).toBe("192.168.3.45");
    });

    it("应包含正确的默认端口", () => {
      expect(DEFAULT_NETWORK_CONFIG.port).toBe("3113");
    });

    it("应包含正确的默认 NAS 地址", () => {
      expect(DEFAULT_NETWORK_CONFIG.nasAddress).toBe("192.168.3.45:9898");
    });

    it("应包含正确的默认 WebSocket URL", () => {
      expect(DEFAULT_NETWORK_CONFIG.wsUrl).toBe("ws://192.168.3.45:3113/ws");
    });

    it("默认模式应为 auto", () => {
      expect(DEFAULT_NETWORK_CONFIG.mode).toBe("auto");
    });
  });

  // ----------------------------------------------------------
  // loadNetworkConfig
  // ----------------------------------------------------------

  describe("loadNetworkConfig", () => {
    it("localStorage 为空时应返回默认配置", () => {
      const config = loadNetworkConfig();
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });

    it("应正确读取已保存的配置", () => {
      const custom: NetworkConfig = {
        serverAddress: "10.0.0.1",
        port: "8080",
        nasAddress: "10.0.0.2:9898",
        wsUrl: "ws://10.0.0.1:8080/ws",
        mode: "manual",
      };
      localStorageMock.setItem("network_config", JSON.stringify(custom));

      const config = loadNetworkConfig();
      expect(config.serverAddress).toBe("10.0.0.1");
      expect(config.port).toBe("8080");
      expect(config.mode).toBe("manual");
    });

    it("localStorage 数据损坏时应返回默认配置", () => {
      localStorageMock.setItem("network_config", "invalid-json{{{");
      const config = loadNetworkConfig();
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });

    it("部分配置缺失时应合并默认值", () => {
      localStorageMock.setItem("network_config", JSON.stringify({ port: "9999" }));
      const config = loadNetworkConfig();
      expect(config.port).toBe("9999");
      expect(config.serverAddress).toBe(DEFAULT_NETWORK_CONFIG.serverAddress);
    });
  });

  // ----------------------------------------------------------
  // saveNetworkConfig
  // ----------------------------------------------------------

  describe("saveNetworkConfig", () => {
    it("应将配置保存到 localStorage", () => {
      const config: NetworkConfig = {
        ...DEFAULT_NETWORK_CONFIG,
        serverAddress: "172.16.0.100",
      };
      saveNetworkConfig(config);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "network_config",
        expect.any(String)
      );

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.serverAddress).toBe("172.16.0.100");
    });
  });

  // ----------------------------------------------------------
  // resetNetworkConfig
  // ----------------------------------------------------------

  describe("resetNetworkConfig", () => {
    it("应清除 localStorage 中的配置", () => {
      saveNetworkConfig({ ...DEFAULT_NETWORK_CONFIG, port: "1234" });
      const config = resetNetworkConfig();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("network_config");
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });
  });

  // ----------------------------------------------------------
  // generateWsUrl
  // ----------------------------------------------------------

  describe("generateWsUrl", () => {
    it("应根据地址和端口生成正确的 WebSocket URL", () => {
      expect(generateWsUrl("192.168.1.1", "3113")).toBe("ws://192.168.1.1:3113/ws");
    });

    it("应处理 localhost", () => {
      expect(generateWsUrl("localhost", "8080")).toBe("ws://localhost:8080/ws");
    });

    it("应处理 IP v4 地址", () => {
      expect(generateWsUrl("10.0.0.1", "443")).toBe("ws://10.0.0.1:443/ws");
    });
  });

  // ----------------------------------------------------------
  // testWebSocketConnection
  // ----------------------------------------------------------

  describe("testWebSocketConnection", () => {
    it("连接不可达时应返回失败结果", async () => {
      // Mock WebSocket 构造函数
      const MockWS = vi.fn().mockImplementation(() => {
        const ws = {
          onopen: null as any,
          onerror: null as any,
          onclose: null as any,
          close: vi.fn(),
        };
        // 模拟连接错误
        setTimeout(() => ws.onerror?.(), 10);
        return ws;
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://invalid:9999/ws", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      vi.unstubAllGlobals();
    });

    it("超时时应返回超时错误", async () => {
      // 必须用 function 形式 — 箭头函数不可 new, 构造调用落入 catch 返回构造错误
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://slow:9999/ws", 50);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接超时");

      vi.unstubAllGlobals();
    });

    it("连接成功时应返回成功结果和延迟", async () => {
      // 必须用 function 形式 — 箭头函数不可 new, 构造调用落入 catch 返回构造错误
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => this.onopen?.(), 5);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://localhost:3113/ws", 1000);
      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);

      vi.unstubAllGlobals();
    });
  });
});
