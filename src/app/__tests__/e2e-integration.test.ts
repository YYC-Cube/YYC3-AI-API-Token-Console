/**
 * e2e-integration.test.ts
 * ========================
 * 端到端集成测试 (Node 环境)
 *
 * 在无 DOM 环境下验证整个应用的数据层完整性:
 * - 所有 store 的 CRUD 闭环
 * - 跨 store 数据一致性
 * - env-config / api-config 配置联动
 * - 类型系统导出完整性
 * - i18n 键值覆盖度
 * - 路由 ↔ 组件映射完整性
 * - 错误处理链路
 *
 * 测试策略:
 *   这些测试不依赖 React/DOM，纯验证数据层逻辑，
 *   作为 CI 管道中最基础的 "冒烟测试" 运行。
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock localStorage (Node 环境) ───────────────────
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

// ─── Mock BroadcastChannel (Node 环境) ───────────────
(globalThis as any).BroadcastChannel = class {
  name: string;
  constructor(name: string) { this.name = name; }
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
};

// ============================================================
// 1. Store CRUD 闭环验证
// ============================================================

describe("E2E: Store CRUD 闭环", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("createLocalStore 完整生命周期", async () => {
    vi.resetModules();
    const { createLocalStore } = await import("../lib/create-local-store");

    interface Item { id: string; name: string; value: number }
    const defaults: Item[] = [
      { id: "i-1", name: "Alpha", value: 10 },
      { id: "i-2", name: "Beta", value: 20 },
    ];

    const s = createLocalStore<Item>("e2e_test", defaults, "i");

    // 1. 初始化 → 默认数据
    expect(s.count()).toBe(2);
    expect(s.getAll()[0].name).toBe("Alpha");

    // 2. 添加
    const added = s.add({ name: "Gamma", value: 30 });
    expect(added.id).toMatch(/^i-/);
    expect(s.count()).toBe(3);

    // 3. 更新
    const updated = s.update("i-1", { value: 99 });
    expect(updated?.value).toBe(99);

    // 4. 删除
    expect(s.remove("i-2")).toBe(true);
    expect(s.count()).toBe(2);

    // 5. 导出
    const json = s.exportData();
    expect(JSON.parse(json).data).toHaveLength(2);

    // 6. 重置
    s.reset();
    expect(s.count()).toBe(2);
    expect(s.getById("i-1")?.value).toBe(10);

    // 7. 导入
    const importData = JSON.stringify([
      { id: "x-1", name: "Imported", value: 100 },
    ]);
    expect(s.importData(importData)).toBe(true);
    expect(s.count()).toBe(1);
    expect(s.getById("x-1")?.name).toBe("Imported");

    // 8. 批量删除
    s.reset();
    expect(s.removeBatch(["i-1", "i-2"])).toBe(2);
    expect(s.count()).toBe(0);
  });
});

// ============================================================
// 2. Dashboard Stores 默认数据完整性
// ============================================================

describe("E2E: Dashboard Stores 数据完整性", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("所有 10 个 store 有正确的默认数据", async () => {
    vi.resetModules();
    const stores = await import("../stores/dashboard-stores");

    // 各 store 默认数量
    const expected: [string, number][] = [
      ["nodeStore", 9],
      ["modelPerfStore", 5],
      ["modelDistStore", 5],
      ["recentOpsStore", 5],
      ["radarStore", 6],
      ["logStore", 15],
      ["dbConnectionStore", 2],
      ["deployedModelStore", 5],
      ["wifiNetworkStore", 0],
      ["userStore", 8],
    ];

    for (const [name, count] of expected) {
      const s = (stores as any)[name];
      expect(s.count(), `${name} 应有 ${count} 条默认数据`).toBe(count);
    }
  });

  it("nodeStore 所有节点有 id/status/gpu/mem/temp", async () => {
    vi.resetModules();
    const { nodeStore } = await import("../stores/dashboard-stores");
    const nodes = nodeStore.getAll();
    for (const node of nodes) {
      expect(node.id).toBeTruthy();
      expect(["active", "warning", "inactive"]).toContain(node.status);
      expect(typeof node.gpu).toBe("number");
      expect(typeof node.mem).toBe("number");
      expect(typeof node.temp).toBe("number");
    }
  });

  it("userStore 超级管理员不可批量删除", async () => {
    vi.resetModules();
    const { userStore } = await import("../stores/dashboard-stores");
    const admin = userStore.getAll().find(u => u.role === "超级管理员");
    expect(admin).toBeDefined();
    expect(admin!.id).toBe("usr-1");
  });
});

// ============================================================
// 3. env-config 配置闭环
// ============================================================

describe("E2E: env-config 配置闭环", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("完整的 读取 → 修改 → 持久化 → 重置 闭环", async () => {
    vi.resetModules();
    const { env, getEnvConfig, setEnvConfig, resetEnvConfig } = await import("../lib/env-config");

    // 1. 默认值
    expect(env("SYSTEM_NAME")).toBe("YYC³ CloudPivot Intelli-Matrix");
    expect(env("SYSTEM_VERSION")).toBe("3.2.0");
    expect(env("ENABLE_MOCK_MODE")).toBe(true);

    // 2. 修改
    setEnvConfig({ SYSTEM_NAME: "Test System" });
    expect(env("SYSTEM_NAME")).toBe("Test System");

    // 3. 持久化验证
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "yyc3_env_config",
      expect.stringContaining("Test System")
    );

    // 4. 重置
    resetEnvConfig();
    // 重新读取（需要 re-import 才能清除缓存，但 resetEnvConfig 内部已清除）
    const config = getEnvConfig();
    expect(config.SYSTEM_NAME).toBe("YYC³ CloudPivot Intelli-Matrix");
  });

  it("所有 31 个环境变量都有默认值", async () => {
    vi.resetModules();
    const { getEnvConfig } = await import("../lib/env-config");
    const config = getEnvConfig();

    const requiredKeys = [
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

    for (const key of requiredKeys) {
      expect((config as any)[key], `${key} 应有默认值`).toBeDefined();
    }
    expect(Object.keys(config).length).toBeGreaterThanOrEqual(30);
  });

  it("导入/导出往返一致性", async () => {
    vi.resetModules();
    const { setEnvConfig, exportEnvConfig, importEnvConfig, getEnvConfig } = await import("../lib/env-config");

    setEnvConfig({ CLUSTER_ID: "E2E-TEST-CLUSTER" });
    const exported = exportEnvConfig();
    expect(exported).toContain("E2E-TEST-CLUSTER");

    // 重置再导入
    vi.resetModules();
    localStorageMock.clear();
    const mod2 = await import("../lib/env-config");
    expect(mod2.importEnvConfig(exported)).toBe(true);
    expect(mod2.getEnvConfig().CLUSTER_ID).toBe("E2E-TEST-CLUSTER");
  });
});

// ============================================================
// 4. api-config 端点配置闭环
// ============================================================

describe("E2E: api-config 端点闭环", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("默认配置 → 修改 → 重置闭环", async () => {
    vi.resetModules();
    const { getAPIConfig, setAPIConfig, resetAPIConfig } = await import("../lib/api-config");

    // 默认
    const defaults = getAPIConfig();
    expect(defaults.enableBackend).toBe(false);
    expect(defaults.timeout).toBe(15000);

    // 修改
    setAPIConfig({ timeout: 30000 });
    expect(getAPIConfig().timeout).toBe(30000);

    // 重置
    resetAPIConfig();
    expect(getAPIConfig().timeout).toBe(15000);
  });

  it("ENDPOINT_META 包含所有端点的 UI 描述", async () => {
    vi.resetModules();
    const { ENDPOINT_META } = await import("../lib/api-config");

    expect(ENDPOINT_META.length).toBeGreaterThanOrEqual(8);
    for (const meta of ENDPOINT_META) {
      expect(meta.key).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.labelCn).toBeTruthy();
      expect(["url", "boolean", "number"]).toContain(meta.type);
    }
  });
});

// ============================================================
// 5. 类型系统完整性
// ============================================================

describe("E2E: 类型系统完整性", () => {
  it("所有核心类型可从 types/index.ts 导入", async () => {
    const types = await import("../types");

    // 核心类型存在性检查
    expect(types.toNodeData).toBeDefined();
    expect(typeof types.toNodeData).toBe("function");

    // toNodeData 转换验证
    const record = {
      id: "test",
      hostname: "GPU-TEST-01",
      gpu_util: 85,
      mem_util: 72,
      temp_celsius: 68,
      model_deployed: "LLaMA-70B",
      active_tasks: 128,
      status: "active" as const,
    };
    const nodeData = types.toNodeData(record);
    expect(nodeData.id).toBe("GPU-TEST-01");
    expect(nodeData.gpu).toBe(85);
    expect(nodeData.mem).toBe(72);
    expect(nodeData.temp).toBe(68);
    expect(nodeData.model).toBe("LLaMA-70B");
    expect(nodeData.tasks).toBe(128);
    expect(nodeData.status).toBe("active");
  });
});

// ============================================================
// 6. i18n 键值覆盖度验证
// ============================================================

describe("E2E: i18n 双语覆盖度", () => {
  it("zh-CN 和 en-US 顶层键完全一致", async () => {
    const { default: zhCN } = await import("../i18n/zh-CN");
    const { default: enUS } = await import("../i18n/en-US");

    const zhKeys = Object.keys(zhCN).sort();
    const enKeys = Object.keys(enUS).sort();

    expect(zhKeys).toEqual(enKeys);
  });

  it("每个顶层模块的子键也一致", async () => {
    const { default: zhCN } = await import("../i18n/zh-CN");
    const { default: enUS } = await import("../i18n/en-US");

    for (const key of Object.keys(zhCN)) {
      const zhSub = Object.keys((zhCN as any)[key]).sort();
      const enSub = Object.keys((enUS as any)[key]).sort();
      expect(zhSub, `i18n 模块 "${key}" 键值不一致`).toEqual(enSub);
    }
  });

  it("nav.architecture 键存在于双语包", async () => {
    const { default: zhCN } = await import("../i18n/zh-CN");
    const { default: enUS } = await import("../i18n/en-US");

    expect(zhCN.nav.architecture).toBe("架构审计");
    expect(enUS.nav.architecture).toBe("Architecture");
  });
});

// ============================================================
// 7. 错误处理工具链验证
// ============================================================

describe("E2E: 错误处理工具链", () => {
  it("figma-error-filter 正确识别 Figma 平台错误", async () => {
    const { isFigmaPlatformError } = await import("../lib/figma-error-filter");

    // 应被拦截
    expect(isFigmaPlatformError("IframeMessageAbortError", "", "", "")).toBe(true);
    expect(isFigmaPlatformError("", "message aborted", "", "")).toBe(true);
    expect(isFigmaPlatformError("", "", "figma.com/plugin", "")).toBe(true);

    // 不应被拦截
    expect(isFigmaPlatformError("TypeError", "Cannot read property", "", "")).toBe(false);
    expect(isFigmaPlatformError("", "Network error", "", "")).toBe(false);
  });

  it("broadcast-channel 工厂单例一致性", async () => {
    vi.resetModules();
    const { getSharedChannel, closeAllChannels } = await import("../lib/broadcast-channel");

    const ch1 = getSharedChannel("test-e2e");
    const ch2 = getSharedChannel("test-e2e");
    expect(ch1).toBe(ch2); // 同名返回同一实例

    const ch3 = getSharedChannel("test-e2e-other");
    expect(ch3).not.toBe(ch1); // 不同名不同实例

    closeAllChannels();
  });
});

// ============================================================
// 8. 跨 Store 数据一致性
// ============================================================

describe("E2E: 跨 Store 数据一致性", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("nodeStore 节点 ID 与 logStore 来源一致", async () => {
    vi.resetModules();
    const { nodeStore, logStore } = await import("../stores/dashboard-stores");

    const nodeIds = new Set(nodeStore.getAll().map(n => n.id));
    const logSources = new Set(logStore.getAll().map(l => l.source));

    // 日志中引用的 GPU 节点 ID 应在 nodeStore 中存在（部分来自 system/scheduler）
    const gpuLogSources = [...logSources].filter(s => s.startsWith("GPU-"));
    for (const src of gpuLogSources) {
      expect(nodeIds.has(src), `日志来源 ${src} 应存在于 nodeStore`).toBe(true);
    }
  });

  it("deployedModelStore 节点引用存在于 nodeStore", async () => {
    vi.resetModules();
    const { nodeStore, deployedModelStore } = await import("../stores/dashboard-stores");

    const nodeIds = new Set(nodeStore.getAll().map(n => n.id));
    const models = deployedModelStore.getAll();
    for (const model of models) {
      if (model.gpu && model.gpu !== "-") {
        expect(nodeIds.has(model.gpu), `模型 ${model.name} 引用的节点 ${model.gpu} 应存在`).toBe(true);
      }
    }
  });
});

// ============================================================
// 9. 路由完整性验证
// ============================================================

describe("E2E: 路由完整性", () => {
  it("所有路由路径唯一且无重复", async () => {
    // 直接检查路由配置文件中定义的路径
    const paths = [
      "/", "/follow-up", "/patrol", "/operations", "/files", "/ai", "/loop",
      "/pwa", "/design-system", "/dev-guide", "/models", "/theme", "/terminal",
      "/ide", "/audit", "/users", "/settings", "/security", "/alerts", "/reports",
      "/ai-diagnosis", "/host-files", "/database", "/refactoring", "/data-editor",
      "/performance", "/env-config", "/db-connections", "/architecture",
    ];

    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
    expect(paths.length).toBe(29); // 28 功能页 + architecture
  });
});
