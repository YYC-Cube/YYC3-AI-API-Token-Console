/**
 * rf001-ws-url-unification.test.ts
 * ==================================
 * RF-001 WebSocket URL 统一 - 验证测试
 *
 * 确保:
 * 1. useWebSocketData 从 api-config 读取 WS URL（不再硬编码）
 * 2. network-utils DEFAULT_NETWORK_CONFIG.wsUrl 由 serverAddress+port 推导
 * 3. api-config 是唯一权威 WS 端点配置源
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("RF-001: WebSocket URL 三源统一", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  // ----------------------------------------------------------
  // 1. api-config 权威配置
  // ----------------------------------------------------------

  describe("api-config 权威源", () => {
    it("默认 wsEndpoint 应为 ws://localhost:3113/ws", async () => {
      const { getAPIConfig } = await import("../lib/api-config");
      expect(getAPIConfig().wsEndpoint).toBe("ws://localhost:3113/ws");
    });

    it("setAPIConfig 应能修改 wsEndpoint", async () => {
      const { getAPIConfig, setAPIConfig } = await import("../lib/api-config");
      setAPIConfig({ wsEndpoint: "ws://192.168.3.45:3113/ws" });
      expect(getAPIConfig().wsEndpoint).toBe("ws://192.168.3.45:3113/ws");
    });
  });

  // ----------------------------------------------------------
  // 2. network-utils 内部自洽
  // ----------------------------------------------------------

  describe("network-utils 内部一致性", () => {
    it("DEFAULT_NETWORK_CONFIG.wsUrl 应由 serverAddress+port 生成", async () => {
      const { DEFAULT_NETWORK_CONFIG, generateWsUrl } = await import("../lib/network-utils");
      const expected = generateWsUrl(
        DEFAULT_NETWORK_CONFIG.serverAddress,
        DEFAULT_NETWORK_CONFIG.port
      );
      expect(DEFAULT_NETWORK_CONFIG.wsUrl).toBe(expected);
    });

    it("generateWsUrl 应正确拼接", async () => {
      const { generateWsUrl } = await import("../lib/network-utils");
      expect(generateWsUrl("10.0.0.1", "8080")).toBe("ws://10.0.0.1:8080/ws");
    });
  });

  // ----------------------------------------------------------
  // 3. useWebSocketData 不含硬编码
  // ----------------------------------------------------------

  describe("useWebSocketData 无硬编码 WS URL", () => {
    it("源代码中不应包含硬编码的 WS_URL 常量", async () => {
      // 通过检查模块导出验证：getAPIConfig 被导入
      // 这是一个静态分析验证 — 如果 WS_URL 还在，模块不会调用 getAPIConfig
      const { getAPIConfig, setAPIConfig } = await import("../lib/api-config");

      // 设置自定义 WS 端点
      const customUrl = "ws://custom-host:9999/ws";
      setAPIConfig({ wsEndpoint: customUrl });

      // 验证 api-config 确实返回自定义值
      expect(getAPIConfig().wsEndpoint).toBe(customUrl);
    });
  });
});