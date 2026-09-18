/**
 * api-config.test.ts
 * ====================
 * API 端点配置服务测试
 *
 * 覆盖范围:
 *  - 默认配置值
 *  - getAPIConfig / setAPIConfig / resetAPIConfig
 *  - localStorage 持久化
 *  - onAPIConfigChange 监听器
 *  - enableBackend 开关逻辑
 *  - ENDPOINT_META 完整性
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 动态 import 以确保每次重新加载模块
async function loadModule() {
  // 清除模块缓存以获得干净状态
  vi.resetModules();
  return import("../lib/api-config");
}

describe("api-config", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getAPIConfig", () => {
    it("返回默认配置", async () => {
      const { getAPIConfig } = await loadModule();
      const config = getAPIConfig();
      expect(config.enableBackend).toBe(false);
      expect(config.timeout).toBe(15000);
      expect(config.maxRetries).toBe(2);
      expect(config.dbBase).toBe("/api/db");
      expect(config.fsBase).toBe("/api/fs");
      expect(config.wsEndpoint).toBe("ws://localhost:3113/ws");
      expect(config.aiBase).toBe("https://api.openai.com/v1");
      expect(config.clusterBase).toBe("/api/cluster");
    });
  });

  describe("setAPIConfig", () => {
    it("更新配置并返回新值", async () => {
      const { getAPIConfig, setAPIConfig } = await loadModule();
      const updated = setAPIConfig({ enableBackend: true, timeout: 5000 });
      expect(updated.enableBackend).toBe(true);
      expect(updated.timeout).toBe(5000);

      const current = getAPIConfig();
      expect(current.enableBackend).toBe(true);
      expect(current.timeout).toBe(5000);
    });

    it("持久化到 localStorage", async () => {
      const { setAPIConfig } = await loadModule();
      setAPIConfig({ enableBackend: true, dbBase: "/custom/db" });

      const stored = JSON.parse(localStorage.getItem("yyc3_api_endpoints") || "{}");
      expect(stored.enableBackend).toBe(true);
      expect(stored.dbBase).toBe("/custom/db");
    });

    it("部分更新不影响其他字段", async () => {
      const { getAPIConfig, setAPIConfig } = await loadModule();
      setAPIConfig({ timeout: 3000 });
      const config = getAPIConfig();
      expect(config.timeout).toBe(3000);
      expect(config.dbBase).toBe("/api/db"); // 未修改
      expect(config.enableBackend).toBe(false); // 未修改
    });
  });

  describe("resetAPIConfig", () => {
    it("重置到默认配置", async () => {
      const { getAPIConfig, setAPIConfig, resetAPIConfig } = await loadModule();
      setAPIConfig({ enableBackend: true, timeout: 1, maxRetries: 5 });
      resetAPIConfig();
      const config = getAPIConfig();
      expect(config.enableBackend).toBe(false);
      expect(config.timeout).toBe(15000);
      expect(config.maxRetries).toBe(2);
    });

    it("清除 localStorage", async () => {
      const { setAPIConfig, resetAPIConfig } = await loadModule();
      setAPIConfig({ enableBackend: true });
      resetAPIConfig();
      expect(localStorage.getItem("yyc3_api_endpoints")).toBeNull();
    });
  });

  describe("onAPIConfigChange", () => {
    it("配置变更时触发监听器", async () => {
      const { setAPIConfig, onAPIConfigChange } = await loadModule();
      const listener = vi.fn();
      const unsubscribe = onAPIConfigChange(listener);

      setAPIConfig({ timeout: 999 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].timeout).toBe(999);

      unsubscribe();
    });

    it("unsubscribe 后不再触发", async () => {
      const { setAPIConfig, onAPIConfigChange } = await loadModule();
      const listener = vi.fn();
      const unsubscribe = onAPIConfigChange(listener);
      unsubscribe();

      setAPIConfig({ timeout: 123 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("enableBackend 开关", () => {
    it("默认 enableBackend 为 false", async () => {
      const { getAPIConfig } = await loadModule();
      expect(getAPIConfig().enableBackend).toBe(false);
    });

    it("可以切换为 true", async () => {
      const { getAPIConfig, setAPIConfig } = await loadModule();
      setAPIConfig({ enableBackend: true });
      expect(getAPIConfig().enableBackend).toBe(true);
    });
  });

  describe("ENDPOINT_META", () => {
    it("包含所有端点元数据", async () => {
      const { ENDPOINT_META } = await loadModule();
      expect(ENDPOINT_META.length).toBeGreaterThanOrEqual(8);

      const keys = ENDPOINT_META.map(m => m.key);
      expect(keys).toContain("enableBackend");
      expect(keys).toContain("timeout");
      expect(keys).toContain("maxRetries");
      expect(keys).toContain("fsBase");
      expect(keys).toContain("dbBase");
      expect(keys).toContain("wsEndpoint");
      expect(keys).toContain("aiBase");
      expect(keys).toContain("clusterBase");
    });

    it("每个元数据都有 label 和 labelCn", async () => {
      const { ENDPOINT_META } = await loadModule();
      for (const meta of ENDPOINT_META) {
        expect(meta.label).toBeTruthy();
        expect(meta.labelCn).toBeTruthy();
        expect(meta.type).toBeTruthy();
        expect(meta.group).toBeTruthy();
      }
    });
  });

  describe("localStorage 加载", () => {
    it("从 localStorage 恢复已保存的配置", async () => {
      localStorage.setItem("yyc3_api_endpoints", JSON.stringify({
        enableBackend: true,
        timeout: 8000,
        dbBase: "/my-api/db",
      }));

      const { getAPIConfig } = await loadModule();
      const config = getAPIConfig();
      expect(config.enableBackend).toBe(true);
      expect(config.timeout).toBe(8000);
      expect(config.dbBase).toBe("/my-api/db");
      // 未保存的字段使用默认值
      expect(config.fsBase).toBe("/api/fs");
    });

    it("localStorage 数据损坏时使用默认值", async () => {
      localStorage.setItem("yyc3_api_endpoints", "invalid json {{");
      const { getAPIConfig } = await loadModule();
      const config = getAPIConfig();
      expect(config.enableBackend).toBe(false);
      expect(config.timeout).toBe(15000);
    });
  });
});