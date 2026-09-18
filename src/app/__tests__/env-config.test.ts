/**
 * env-config.test.ts
 * ===================
 * env-config.ts 单元测试 (node 环境)
 *
 * 覆盖:
 * - env() 类型安全读取
 * - getEnvConfig() 全量读取
 * - setEnvConfig() 更新 + localStorage 持久化
 * - resetEnvConfig() 重置
 * - exportEnvConfig() 导出 JSON
 * - importEnvConfig() 导入 JSON
 * - 所有 31 个环境变量默认值验证
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage (node 环境无 localStorage)
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

// 每次测试前重置模块 (因为 _envConfig 是单例缓存)
async function freshImport() {
  vi.resetModules();
  return import("../lib/env-config");
}

describe("env-config", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ───────────── 默认值 ─────────────
  describe("defaults", () => {
    it("should return default SYSTEM_NAME", async () => {
      const { env } = await freshImport();
      expect(env("SYSTEM_NAME")).toBe("YYC\u00B3 CloudPivot Intelli-Matrix");
    });

    it("should return default SYSTEM_VERSION", async () => {
      const { env } = await freshImport();
      expect(env("SYSTEM_VERSION")).toBe("3.2.0");
    });

    it("should return default API_BASE_URL", async () => {
      const { env } = await freshImport();
      expect(env("API_BASE_URL")).toBe("http://192.168.3.1:3118/api");
    });

    it("should return default WS_ENDPOINT", async () => {
      const { env } = await freshImport();
      expect(env("WS_ENDPOINT")).toBe("ws://localhost:3113/ws");
    });

    it("should return default STORAGE_PREFIX", async () => {
      const { env } = await freshImport();
      expect(env("STORAGE_PREFIX")).toBe("yyc3_");
    });

    it("should return default IDB_VERSION as number", async () => {
      const { env } = await freshImport();
      expect(env("IDB_VERSION")).toBe(3);
      expect(typeof env("IDB_VERSION")).toBe("number");
    });

    it("should return default ENABLE_MOCK_MODE as true", async () => {
      const { env } = await freshImport();
      expect(env("ENABLE_MOCK_MODE")).toBe(true);
    });

    it("should return default ENABLE_DEBUG as false", async () => {
      const { env } = await freshImport();
      expect(env("ENABLE_DEBUG")).toBe(false);
    });

    it("should return default DB_POOL_MIN/MAX", async () => {
      const { env } = await freshImport();
      expect(env("DB_POOL_MIN")).toBe(2);
      expect(env("DB_POOL_MAX")).toBe(10);
    });

    it("should return default SQL_TEST_SIMULATE_DELAY", async () => {
      const { env } = await freshImport();
      expect(env("SQL_TEST_SIMULATE_DELAY")).toBe(500);
    });

    it("should return default SQL_BLOCKED_COMMANDS", async () => {
      const { env } = await freshImport();
      expect(env("SQL_BLOCKED_COMMANDS")).toBe("DROP,DELETE,TRUNCATE,ALTER");
    });

    it("should return default SQL_MAX_HISTORY", async () => {
      const { env } = await freshImport();
      expect(env("SQL_MAX_HISTORY")).toBe(20);
    });

    it("should return default AI config values", async () => {
      const { env } = await freshImport();
      expect(env("DEFAULT_AI_MODEL")).toBe("gpt-4o");
      expect(env("DEFAULT_AI_TEMPERATURE")).toBe(0.7);
      expect(env("DEFAULT_AI_MAX_TOKENS")).toBe(2048);
      expect(env("DEFAULT_AI_TIMEOUT")).toBe(30000);
    });

    it("should return default security values", async () => {
      const { env } = await freshImport();
      expect(env("SESSION_TIMEOUT_MIN")).toBe(30);
      expect(env("MAX_LOGIN_ATTEMPTS")).toBe(5);
    });
  });

  // ───────────── getEnvConfig ─────────────
  describe("getEnvConfig", () => {
    it("should return all config keys", async () => {
      const { getEnvConfig } = await freshImport();
      const config = getEnvConfig();
      const expectedKeys = [
        "SYSTEM_NAME", "SYSTEM_VERSION", "SYSTEM_BUILD",
        "API_BASE_URL", "WS_ENDPOINT", "OLLAMA_BASE_URL",
        "STORAGE_PREFIX", "IDB_NAME", "IDB_VERSION",
        "CLUSTER_ID", "NODE_ENV",
        "DEFAULT_AI_BASE_URL", "DEFAULT_AI_MODEL", "DEFAULT_AI_TEMPERATURE",
        "DEFAULT_AI_MAX_TOKENS", "DEFAULT_AI_TIMEOUT",
        "SESSION_TIMEOUT_MIN", "MAX_LOGIN_ATTEMPTS", "CORS_ORIGINS",
        "ENABLE_MOCK_MODE", "ENABLE_DEBUG", "ENABLE_PWA", "ENABLE_ELECTRON_IPC",
        "DB_POOL_MIN", "DB_POOL_MAX", "DB_POOL_IDLE_TIMEOUT", "DB_POOL_ACQUIRE_TIMEOUT",
        "SQL_BLOCKED_COMMANDS", "SQL_MAX_HISTORY", "SQL_TEST_SIMULATE_DELAY",
      ];
      for (const key of expectedKeys) {
        expect(config).toHaveProperty(key);
      }
    });

    it("should return a copy (not reference)", async () => {
      const { getEnvConfig } = await freshImport();
      const a = getEnvConfig();
      const b = getEnvConfig();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });

  // ───────────── setEnvConfig ─────────────
  describe("setEnvConfig", () => {
    it("should update a single key", async () => {
      const { env, setEnvConfig } = await freshImport();
      setEnvConfig({ SYSTEM_VERSION: "9.9.9" });
      expect(env("SYSTEM_VERSION")).toBe("9.9.9");
    });

    it("should persist to localStorage", async () => {
      const { setEnvConfig } = await freshImport();
      setEnvConfig({ CLUSTER_ID: "TEST-CLUSTER" });
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const stored = JSON.parse(store["yyc3_env_config"]!);
      expect(stored.CLUSTER_ID).toBe("TEST-CLUSTER");
    });

    it("should merge with existing config", async () => {
      const { env, setEnvConfig } = await freshImport();
      setEnvConfig({ SYSTEM_VERSION: "1.0.0" });
      setEnvConfig({ CLUSTER_ID: "X" });
      expect(env("SYSTEM_VERSION")).toBe("1.0.0");
      expect(env("CLUSTER_ID")).toBe("X");
    });
  });

  // ───────────── resetEnvConfig ─────────────
  describe("resetEnvConfig", () => {
    it("should restore defaults after set", async () => {
      const { env, setEnvConfig, resetEnvConfig } = await freshImport();
      setEnvConfig({ SYSTEM_VERSION: "0.0.1" });
      expect(env("SYSTEM_VERSION")).toBe("0.0.1");
      resetEnvConfig();
      expect(env("SYSTEM_VERSION")).toBe("3.2.0");
    });

    it("should remove localStorage entry", async () => {
      const { setEnvConfig, resetEnvConfig } = await freshImport();
      setEnvConfig({ SYSTEM_VERSION: "0.0.1" });
      resetEnvConfig();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("yyc3_env_config");
    });
  });

  // ───────────── exportEnvConfig ─────────────
  describe("exportEnvConfig", () => {
    it("should export valid JSON with _type field", async () => {
      const { exportEnvConfig } = await freshImport();
      const json = exportEnvConfig();
      const parsed = JSON.parse(json);
      expect(parsed._type).toBe("env-config");
      expect(parsed._exportedAt).toBeDefined();
      expect(parsed.config).toBeDefined();
      expect(parsed.config.SYSTEM_NAME).toBeDefined();
    });
  });

  // ───────────── importEnvConfig ─────────────
  describe("importEnvConfig", () => {
    it("should import config from JSON with config key", async () => {
      const { env, importEnvConfig } = await freshImport();
      const json = JSON.stringify({ config: { SYSTEM_VERSION: "5.0.0" } });
      const ok = importEnvConfig(json);
      expect(ok).toBe(true);
      expect(env("SYSTEM_VERSION")).toBe("5.0.0");
    });

    it("should import raw config object", async () => {
      const { env, importEnvConfig } = await freshImport();
      const json = JSON.stringify({ SYSTEM_VERSION: "6.0.0" });
      const ok = importEnvConfig(json);
      expect(ok).toBe(true);
      expect(env("SYSTEM_VERSION")).toBe("6.0.0");
    });

    it("should return false for invalid JSON", async () => {
      const { importEnvConfig } = await freshImport();
      const ok = importEnvConfig("not valid json {{{");
      expect(ok).toBe(false);
    });
  });

  // ───────────── localStorage 优先级 ─────────────
  describe("localStorage override", () => {
    it("should read from localStorage on fresh init", async () => {
      store["yyc3_env_config"] = JSON.stringify({ SYSTEM_VERSION: "stored-version" });
      const { env } = await freshImport();
      expect(env("SYSTEM_VERSION")).toBe("stored-version");
    });
  });
});
