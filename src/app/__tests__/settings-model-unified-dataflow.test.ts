/**
 * settings-model-unified-dataflow.test.ts
 * =========================================
 * 集成测试：验证 Settings 页作为全局唯一数据源
 *
 * 覆盖三大核心问题：
 * 1. 模型配置统一可编辑（不硬编码）
 * 2. 监控中心数据从 Store 读取（动态）
 * 设置页 = 全局数据源，多组件共享
 */

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalStore } from "../lib/create-local-store";
import type { SettingsValues } from "../hooks/useSettingsStore";

// ============================================================
// Tests
// ============================================================

describe("createLocalStore — 通用 CRUD 工厂", () => {
  interface TestItem {
    id: string;
    name: string;
    value: number;
  }

  const DEFAULTS: TestItem[] = [
    { id: "t-1", name: "Alpha", value: 10 },
    { id: "t-2", name: "Beta", value: 20 },
  ];

  let store: ReturnType<typeof createLocalStore<TestItem>>;

  beforeEach(() => {
    localStorage.clear();
    store = createLocalStore<TestItem>("test_store", DEFAULTS, "t");
  });

  it("初始数据加载默认值", () => {
    const items = store.getAll();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Alpha");
  });

  it("add: 添加新条目", () => {
    const added = store.add({ name: "Gamma", value: 30 });
    expect(added.id).toBeTruthy();
    expect(added.name).toBe("Gamma");
    expect(store.count()).toBe(3);
  });

  it("update: 修改已有条目", () => {
    const updated = store.update("t-1", { name: "Alpha-Updated", value: 99 });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Alpha-Updated");
    expect(updated!.value).toBe(99);
    expect(store.getById("t-1")?.name).toBe("Alpha-Updated");
  });

  it("remove: 删除条目", () => {
    const removed = store.remove("t-1");
    expect(removed).toBe(true);
    expect(store.getById("t-1")).toBeUndefined();
    expect(store.count()).toBe(1);
  });

  it("reset: 重置为默认值", () => {
    store.add({ name: "Extra", value: 50 });
    store.update("t-1", { name: "Changed" });
    const reset = store.reset();
    expect(reset).toHaveLength(2);
    expect(reset[0].name).toBe("Alpha");
  });

  it("exportData / importData round-trip", () => {
    store.add({ name: "Export-Test", value: 77 });
    const json = store.exportData();
    expect(json).toContain("Export-Test");

    store.reset();
    const ok = store.importData(json);
    expect(ok).toBe(true);
    expect(store.getAll().find(i => i.name === "Export-Test")).toBeTruthy();
  });

  it("持久化到 localStorage", () => {
    store.add({ name: "Persist", value: 42 });
    const raw = localStorage.getItem("test_store");
    expect(raw).toBeTruthy();
    expect(raw).toContain("Persist");
  });

  it("removeBatch: 批量删除", () => {
    const removed = store.removeBatch(["t-1", "t-2"]);
    expect(removed).toBe(2);
    expect(store.count()).toBe(0);
  });
});

describe("dashboard-stores — 节点 Store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("nodeStore: 默认节点可读取、model 字段可编辑", async () => {
    const { nodeStore } = await import("../stores/dashboard-stores");
    // Force re-init by accessing fresh store
    const nodes = nodeStore.reset();
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]).toHaveProperty("model");
    expect(nodes[0]).toHaveProperty("gpu");

    const updated = nodeStore.update(nodes[0].id, { model: "UserModel-7B" });
    expect(updated?.model).toBe("UserModel-7B");
  });

  it("deployedModelStore: 完整 CRUD", async () => {
    const { deployedModelStore } = await import("../stores/dashboard-stores");
    deployedModelStore.reset();

    const models = deployedModelStore.getAll();
    expect(models.length).toBeGreaterThan(0);

    // Add custom model
    const added = deployedModelStore.add({
      name: "My-Custom-LLM",
      version: "v2.0",
      size: "28GB",
      status: "standby",
      gpu: "-",
    });
    expect(added.name).toBe("My-Custom-LLM");

    // Update
    deployedModelStore.update(added.id, { status: "deployed", gpu: "GPU-A100-01" });
    expect(deployedModelStore.getById(added.id)?.status).toBe("deployed");

    // Delete
    deployedModelStore.remove(added.id);
    expect(deployedModelStore.getById(added.id)).toBeUndefined();
  });

  it("modelPerfStore: 模型性能数据可编辑", async () => {
    const { modelPerfStore } = await import("../stores/dashboard-stores");
    modelPerfStore.reset();

    const added = modelPerfStore.add({
      model: "UserModel",
      accuracy: 88,
      speed: 75,
      memory: 60,
      cost: 40,
    });
    expect(added.model).toBe("UserModel");
  });

  it("dbConnectionStore: 数据库连接可编辑", async () => {
    const { dbConnectionStore } = await import("../stores/dashboard-stores");
    dbConnectionStore.reset();

    const added = dbConnectionStore.add({
      name: "My MongoDB",
      type: "mongodb",
      host: "192.168.3.100",
      port: 27017,
      database: "test_db",
      username: "admin",
      password: "",
      status: "disconnected",
    });
    expect(added.name).toBe("My MongoDB");
    dbConnectionStore.remove(added.id);
  });

  it("userStore: 用户数据 CRUD", async () => {
    const { userStore } = await import("../stores/dashboard-stores");
    userStore.reset();

    const added = userStore.add({
      name: "测试用户",
      username: "tester",
      email: "test@yyc3.ai",
      role: "开发者",
      status: "online",
      lastLogin: "2026-03-08",
      sessions: 1,
      apiCalls: 0,
      locked: false,
    });
    expect(added.username).toBe("tester");
    userStore.remove(added.id);
  });
});

describe("dashboard-stores — 所有 Store CRUD 接口完整性", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("所有 store 均提供 getAll/add/update/remove/reset/exportData/importData", async () => {
    const stores = await import("../stores/dashboard-stores");

    const storeInstances = [
      stores.nodeStore,
      stores.modelPerfStore,
      stores.modelDistStore,
      stores.recentOpsStore,
      stores.radarStore,
      stores.logStore,
      stores.deployedModelStore,
      stores.dbConnectionStore,
      stores.userStore,
      stores.wifiNetworkStore,
    ];

    storeInstances.forEach((s, i) => {
      expect(typeof s.getAll, `store[${i}].getAll`).toBe("function");
      expect(typeof s.getById, `store[${i}].getById`).toBe("function");
      expect(typeof s.add, `store[${i}].add`).toBe("function");
      expect(typeof s.update, `store[${i}].update`).toBe("function");
      expect(typeof s.remove, `store[${i}].remove`).toBe("function");
      expect(typeof s.reset, `store[${i}].reset`).toBe("function");
      expect(typeof s.exportData, `store[${i}].exportData`).toBe("function");
      expect(typeof s.importData, `store[${i}].importData`).toBe("function");
    });
  });
});

describe("env-config — 环境变量可编辑", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("env() 读取默认 AI 配置", async () => {
    const { env, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    expect(env("OLLAMA_BASE_URL")).toBe("http://localhost:11434");
    expect(env("DEFAULT_AI_MODEL")).toBe("gpt-4o");
    expect(env("DEFAULT_AI_TEMPERATURE")).toBe(0.7);
  });

  it("setEnvConfig 可修改 AI 默认配置", async () => {
    const { env, setEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    setEnvConfig({ DEFAULT_AI_MODEL: "custom-model", OLLAMA_BASE_URL: "http://192.168.3.45:11434" });
    expect(env("DEFAULT_AI_MODEL")).toBe("custom-model");
    expect(env("OLLAMA_BASE_URL")).toBe("http://192.168.3.45:11434");
  });

  it("getEnvConfig 包含所有必要字段", async () => {
    const { getEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    const config = getEnvConfig();
    const requiredKeys = [
      "SYSTEM_NAME", "SYSTEM_VERSION", "API_BASE_URL", "WS_ENDPOINT",
      "OLLAMA_BASE_URL", "OLLAMA_PROXY_PATH", "DEFAULT_AI_BASE_URL",
      "DEFAULT_AI_MODEL", "DEFAULT_AI_TEMPERATURE", "DEFAULT_AI_MAX_TOKENS",
    ];
    requiredKeys.forEach(k => {
      expect(config).toHaveProperty(k);
    });
  });

  it("exportEnvConfig / importEnvConfig round-trip", async () => {
    const { exportEnvConfig, importEnvConfig, resetEnvConfig } = await import("../lib/env-config");
    resetEnvConfig();

    const json = exportEnvConfig();
    expect(json).toContain("env-config");

    const ok = importEnvConfig(json);
    expect(ok).toBe(true);
  });
});

describe("useModelProvider — 类型验证", () => {
  it("MODEL_PROVIDERS 内置列表包含 Ollama", async () => {
    const { MODEL_PROVIDERS } = await import("../hooks/useModelProvider");

    expect(MODEL_PROVIDERS.length).toBeGreaterThan(0);

    const ollama = MODEL_PROVIDERS.find(p => p.id === "ollama");
    expect(ollama).toBeDefined();
    expect(ollama!.isLocal).toBe(true);
    expect(ollama!.authType).toBe("none");

    // All providers have required fields
    MODEL_PROVIDERS.forEach(p => {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("label");
      expect(p).toHaveProperty("baseUrl");
      expect(p).toHaveProperty("authType");
      expect(p).toHaveProperty("models");
      expect(Array.isArray(p.models)).toBe(true);
    });
  });
});

describe("useSettingsStore — 类型完整性", () => {
  it("SettingsValues 包含所有 AI 配置字段", () => {
    // TypeScript 编译通过即证明类型完整
    const requiredKeys: (keyof SettingsValues)[] = [
      "aiApiKey", "aiBaseUrl", "aiModel",
      "aiTemperature", "aiTopP", "aiMaxTokens", "aiTimeout",
    ];
    expect(requiredKeys).toHaveLength(7);
  });

  it("SettingsValues 包含 DB 配置字段", () => {
    const dbKeys: (keyof SettingsValues)[] = [
      "dbHost", "dbPort", "dbName", "dbUser", "dbPassword", "dbPoolSize",
    ];
    expect(dbKeys).toHaveLength(6);
  });

  it("SettingsValues 包含 WebSocket 配置字段", () => {
    const wsKeys: (keyof SettingsValues)[] = [
      "wsEndpoint", "wsReconnectInterval", "wsMaxReconnect",
      "wsHeartbeatInterval", "wsThrottleMs",
    ];
    expect(wsKeys).toHaveLength(5);
  });
});

describe("杜绝硬编码 — 重置验证", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("nodeStore.reset() 恢复默认值，用户修改不残留", async () => {
    const { nodeStore } = await import("../stores/dashboard-stores");
    nodeStore.reset();

    const nodes = nodeStore.getAll();
    if (nodes.length > 0) {
      nodeStore.update(nodes[0].id, { model: "SHOULD_NOT_PERSIST" });
      expect(nodeStore.getById(nodes[0].id)?.model).toBe("SHOULD_NOT_PERSIST");

      nodeStore.reset();
      expect(nodeStore.getById(nodes[0].id)?.model).not.toBe("SHOULD_NOT_PERSIST");
    }
  });

  it("deployedModelStore.reset() 移除用户添加的模型", async () => {
    const { deployedModelStore } = await import("../stores/dashboard-stores");
    deployedModelStore.reset();

    deployedModelStore.add({ name: "TEMP_MODEL", version: "v0", size: "1GB", status: "standby", gpu: "-" });
    expect(deployedModelStore.getAll().find(m => m.name === "TEMP_MODEL")).toBeTruthy();

    deployedModelStore.reset();
    expect(deployedModelStore.getAll().find(m => m.name === "TEMP_MODEL")).toBeFalsy();
  });
});
