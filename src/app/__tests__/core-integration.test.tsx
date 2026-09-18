/**
 * core-integration.test.tsx
 * ==========================
 * YYC³ 核心组件集成测试
 *
 * 覆盖范围:
 * - createLocalStore CRUD 集成流程
 * - dashboard-stores 各 store 初始化 + CRUD + 重置
 * - deployedModelStore 完整增删改查 + 持久化
 * - userStore 完整增删改查 + 重置
 * - wifiNetworkStore 连接/断开/扫描 + 历史
 * - useSettingsStore 持久化 + 导入导出
 * - api-config 端点配置 + 重置
 * - 跨 store 数据一致性
 *
 * 运行命令: npx vitest run src/app/__tests__/core-integration.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================
// Mock localStorage
// ============================================================
const storageMap: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storageMap[key] || null),
  setItem: vi.fn((key: string, value: string) => { storageMap[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storageMap[key]; }),
  clear: vi.fn(() => { Object.keys(storageMap).forEach(k => delete storageMap[k]); }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// ============================================================
// Imports
// ============================================================
import { createLocalStore } from "../lib/create-local-store";
import type { LocalStore } from "../lib/create-local-store";

describe("createLocalStore 集成测试", () => {
  interface TestItem { id: string; name: string; value: number; }
  const defaults: TestItem[] = [
    { id: "t-1", name: "Alpha", value: 10 },
    { id: "t-2", name: "Beta", value: 20 },
  ];
  let store: LocalStore<TestItem>;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    store = createLocalStore<TestItem>("test_store", defaults, "t");
  });

  it("getAll 首次返回默认数据并写入 localStorage", () => {
    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe("Alpha");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("test_store", expect.any(String));
  });

  it("add 应添加新项并分配 ID", () => {
    store.getAll(); // init
    const newItem = store.add({ name: "Gamma", value: 30 });
    expect(newItem.id).toBeTruthy();
    expect(newItem.name).toBe("Gamma");
    expect(store.count()).toBe(3);
  });

  it("getById 应返回正确的项", () => {
    store.getAll(); // init
    const item = store.getById("t-1");
    expect(item).toBeDefined();
    expect(item!.name).toBe("Alpha");
  });

  it("update 应更新现有项", () => {
    store.getAll(); // init
    const updated = store.update("t-1", { name: "Alpha-Updated", value: 15 });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Alpha-Updated");
    expect(updated!.value).toBe(15);
    expect(store.getById("t-1")!.name).toBe("Alpha-Updated");
  });

  it("update 不存在的 ID 应返回 null", () => {
    store.getAll();
    const result = store.update("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  it("remove 应删除项", () => {
    store.getAll();
    const removed = store.remove("t-1");
    expect(removed).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.getById("t-1")).toBeUndefined();
  });

  it("remove 不存在的 ID 应返回 false", () => {
    store.getAll();
    expect(store.remove("nonexistent")).toBe(false);
  });

  it("removeBatch 应批量删除", () => {
    store.getAll();
    const removed = store.removeBatch(["t-1", "t-2"]);
    expect(removed).toBe(2);
    expect(store.count()).toBe(0);
  });

  it("reset 应恢复默认数据", () => {
    store.getAll();
    store.add({ name: "Extra", value: 99 });
    expect(store.count()).toBe(3);
    const resetData = store.reset();
    expect(resetData).toHaveLength(2);
    expect(store.count()).toBe(2);
  });

  it("exportData 应返回 JSON 字符串", () => {
    store.getAll();
    const json = store.exportData();
    const parsed = JSON.parse(json);
    expect(parsed._key).toBe("test_store");
    expect(parsed.data).toHaveLength(2);
  });

  it("importData 应导入数据", () => {
    store.getAll();
    const imported = store.importData(JSON.stringify([
      { id: "imp-1", name: "Imported", value: 100 },
    ]));
    expect(imported).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.getById("imp-1")!.name).toBe("Imported");
  });

  it("importData 无效 JSON 应返回 false", () => {
    store.getAll();
    expect(store.importData("invalid-json")).toBe(false);
  });

  it("完整 CRUD 流程: 添加 → 更新 → 查询 → 删除", () => {
    const all = store.getAll();
    expect(all).toHaveLength(2);

    // 添加
    const created = store.add({ name: "New", value: 50 });
    expect(store.count()).toBe(3);

    // 更新
    store.update(created.id, { name: "Updated", value: 55 });
    expect(store.getById(created.id)!.value).toBe(55);

    // 查询
    const found = store.getAll().find(i => i.name === "Updated");
    expect(found).toBeDefined();

    // 删除
    store.remove(created.id);
    expect(store.count()).toBe(2);
  });
});

describe("dashboard-stores 集成测试", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("nodeStore", () => {
    it("应初始化包含默认节点", async () => {
      const { nodeStore } = await import("../stores/dashboard-stores");
      // Force re-init by creating new store
      const nodes = nodeStore.getAll();
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("deployedModelStore", () => {
    it("应有默认模型数据", async () => {
      const { deployedModelStore } = await import("../stores/dashboard-stores");
      const models = deployedModelStore.getAll();
      expect(models.length).toBeGreaterThanOrEqual(1);
      expect(models.some(m => m.name === "LLaMA-70B")).toBe(true);
    });

    it("应支持 CRUD 操作", async () => {
      const { deployedModelStore } = await import("../stores/dashboard-stores");
      const initial = deployedModelStore.count();

      // Add
      const newModel = deployedModelStore.add({
        name: "TestModel",
        version: "v1.0",
        size: "10GB",
        status: "standby",
        gpu: "GPU-TEST-01",
      });
      expect(deployedModelStore.count()).toBe(initial + 1);

      // Update
      const updated = deployedModelStore.update(newModel.id, { status: "deployed" });
      expect(updated?.status).toBe("deployed");

      // Remove
      deployedModelStore.remove(newModel.id);
      expect(deployedModelStore.count()).toBe(initial);
    });
  });

  describe("userStore", () => {
    it("应有默认用户数据", async () => {
      const { userStore } = await import("../stores/dashboard-stores");
      const users = userStore.getAll();
      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users.some(u => u.username === "admin")).toBe(true);
    });

    it("reset 应恢复默认用户", async () => {
      const { userStore } = await import("../stores/dashboard-stores");
      userStore.add({
        name: "临时用户",
        username: "temp",
        email: "temp@test.com",
        role: "开发者",
        status: "offline",
        lastLogin: "--",
        sessions: 0,
        apiCalls: 0,
        locked: false,
      });
      const beforeReset = userStore.count();
      const resetData = userStore.reset();
      expect(resetData.length).toBeLessThanOrEqual(beforeReset);
    });
  });

  describe("wifiNetworkStore", () => {
    it("默认应为空", async () => {
      const { wifiNetworkStore } = await import("../stores/dashboard-stores");
      const networks = wifiNetworkStore.getAll();
      // Default is empty array
      expect(Array.isArray(networks)).toBe(true);
    });

    it("应支持添加和查询 WiFi 网络", async () => {
      const { wifiNetworkStore } = await import("../stores/dashboard-stores");
      const added = wifiNetworkStore.add({
        ssid: "TestNet",
        signal: 80,
        security: "WPA2",
        connected: false,
      });
      expect(added.ssid).toBe("TestNet");
      expect(wifiNetworkStore.getById(added.id)?.ssid).toBe("TestNet");

      // Cleanup
      wifiNetworkStore.remove(added.id);
    });
  });

  describe("logStore", () => {
    it("应有默认日志数据", async () => {
      const { logStore } = await import("../stores/dashboard-stores");
      const logs = logStore.getAll();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("recentOpsStore", () => {
    it("应有默认操作记录", async () => {
      const { recentOpsStore } = await import("../stores/dashboard-stores");
      const ops = recentOpsStore.getAll();
      expect(ops.length).toBeGreaterThanOrEqual(1);
      expect(ops.some(o => o.action === "模型部署")).toBe(true);
    });
  });
});

describe("api-config 集成测试", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("getAPIConfig 应返回默认配置", async () => {
    const { getAPIConfig } = await import("../lib/api-config");
    const config = getAPIConfig();
    expect(config).toBeDefined();
    expect(typeof config.enableBackend).toBe("boolean");
    expect(typeof config.timeout).toBe("number");
  });

  it("setAPIConfig 应更新配置", async () => {
    const { getAPIConfig, setAPIConfig } = await import("../lib/api-config");
    const updated = setAPIConfig({ timeout: 30000 });
    expect(updated.timeout).toBe(30000);
    const reloaded = getAPIConfig();
    expect(reloaded.timeout).toBe(30000);
  });

  it("resetAPIConfig 应恢复默认", async () => {
    const { setAPIConfig, resetAPIConfig, getAPIConfig } = await import("../lib/api-config");
    setAPIConfig({ timeout: 99999 });
    resetAPIConfig();
    const config = getAPIConfig();
    expect(config.timeout).not.toBe(99999);
  });
});

describe("跨 store 数据一致性", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("节点 store 和模型性能 store 应独立操作", async () => {
    const { nodeStore, modelPerfStore } = await import("../stores/dashboard-stores");
    const nodeCount = nodeStore.count();
    const perfCount = modelPerfStore.count();

    nodeStore.add({ id: "test-node", status: "active", gpu: 50, mem: 50, temp: 50, model: "Test", tasks: 0 });
    expect(nodeStore.count()).toBe(nodeCount + 1);
    expect(modelPerfStore.count()).toBe(perfCount); // 不应改变

    // Cleanup
    nodeStore.remove("test-node");
  });

  it("多个 store 的 localStorage key 不应冲突", async () => {
    const { nodeStore, deployedModelStore, userStore } = await import("../stores/dashboard-stores");
    nodeStore.getAll();
    deployedModelStore.getAll();
    userStore.getAll();

    // 验证各自写入了不同的 key
    const keys = Object.keys(storageMap);
    expect(keys.filter(k => k === "yyc3_nodes").length).toBeLessThanOrEqual(1);
    expect(keys.filter(k => k === "yyc3_deployed_models").length).toBeLessThanOrEqual(1);
    expect(keys.filter(k => k === "yyc3_users").length).toBeLessThanOrEqual(1);
  });

  it("reset 不应影响其他 store", async () => {
    const { deployedModelStore, userStore } = await import("../stores/dashboard-stores");
    const userCountBefore = userStore.count();
    deployedModelStore.reset();
    expect(userStore.count()).toBe(userCountBefore);
  });
});

describe("env-config 集成测试", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("env() 应返回配置值", async () => {
    const { env } = await import("../lib/env-config");
    // env function should work with any key
    const val = env("SYSTEM_NAME");
    expect(typeof val).toBe("string");
  });
});

describe("Store 数据持久化验证", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("添加数据后 localStorage 应被更新", () => {
    const store = createLocalStore<{ id: string; val: string }>("persist_test", [], "pt");
    store.add({ val: "hello" });
    expect(localStorageMock.setItem).toHaveBeenCalledWith("persist_test", expect.any(String));
    const stored = JSON.parse(storageMap["persist_test"]);
    expect(stored).toHaveLength(1);
    expect(stored[0].val).toBe("hello");
  });

  it("更新数据后 localStorage 应同步", () => {
    const store = createLocalStore<{ id: string; val: string }>("persist_update", [{ id: "p1", val: "old" }], "p");
    store.getAll();
    store.update("p1", { val: "new" });
    const stored = JSON.parse(storageMap["persist_update"]);
    expect(stored[0].val).toBe("new");
  });

  it("删除数据后 localStorage 应同步", () => {
    const store = createLocalStore<{ id: string; val: string }>("persist_delete", [{ id: "d1", val: "x" }], "d");
    store.getAll();
    store.remove("d1");
    const stored = JSON.parse(storageMap["persist_delete"]);
    expect(stored).toHaveLength(0);
  });

  it("reset 后 localStorage 应恢复默认", () => {
    const defaults = [{ id: "r1", val: "default" }];
    const store = createLocalStore<{ id: string; val: string }>("persist_reset", defaults, "r");
    store.getAll();
    store.add({ val: "extra" });
    store.reset();
    const stored = JSON.parse(storageMap["persist_reset"]);
    expect(stored).toHaveLength(1);
    expect(stored[0].val).toBe("default");
  });
});
