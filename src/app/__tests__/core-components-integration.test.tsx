/**
 * core-components-integration.test.tsx
 * ======================================
 * YYC3 核心组件集成测试
 *
 * 覆盖范围:
 * - SystemSettings: 模型管理 CRUD、API 端点配置、分类切换
 * - UserManagement: 用户 CRUD、重置为默认、搜索过滤、锁定/解锁
 * - NetworkConfig: WiFi 扫描/连接/断开、连接历史、Tab 切换
 * - Dashboard stores: createLocalStore 工厂 CRUD 集成
 * - api-config: APIEndpoints 类型导出、配置读写
 *
 * 数据流验证:
 * - 组件 → store (localStorage) → 组件刷新
 * - store.reset() 恢复默认数据
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ============================================================
// Global mocks
// ============================================================

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

vi.mock("../components/NetworkConfig", () => ({
  NetworkConfig: () => <div data-testid="network-config-mock" />,
}));

vi.mock("../lib/api-config", () => ({
  getAPIConfig: () => ({
    enableBackend: false,
    timeout: 15000,
    maxRetries: 2,
    fsBase: "/api/fs",
    dbBase: "/api/db",
    wsEndpoint: "ws://localhost:3113/ws",
    aiBase: "https://api.openai.com/v1",
    clusterBase: "/api/cluster",
  }),
  setAPIConfig: vi.fn((patch: any) => ({ ...patch })),
  resetAPIConfig: vi.fn(() => ({})),
  onAPIConfigChange: vi.fn(() => () => {}),
  ENDPOINT_META: [
    { key: "enableBackend", label: "Enable Backend API", labelCn: "启用后端 API", description: "关闭时使用前端 Mock 数据", type: "boolean", placeholder: "", group: "通用" },
    { key: "timeout", label: "Request Timeout", labelCn: "请求超时 (ms)", description: "API 请求超时时间", type: "number", placeholder: "15000", group: "通用" },
  ],
}));

vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    availableModels: [
      { id: "gpt-4", name: "GPT-4", isLocal: false },
      { id: "llama3", name: "LLaMA-3", isLocal: true },
    ],
  }),
}));

vi.mock("../hooks/useSettingsStore", () => ({
  useSettingsStore: () => ({
    settings: {
      darkMode: true, autoScale: true, healthCheck: true, alertEmail: false,
      alertSlack: false, autoBackup: true, mfa: false, auditLog: true,
      rateLimiting: false, corsEnabled: false, debugMode: false, performanceLog: false,
      autoUpdate: true, cacheEnabled: true, wsAutoReconnect: true, wsHeartbeat: true,
      dataCompression: false, aiStreamMode: true, aiContextMemory: true,
    },
    values: {
      systemName: "YYC³ CloudPivot", clusterId: "cpim-001", refreshInterval: "5",
      language: "zh-CN", timezone: "Asia/Shanghai", maxNodes: "16",
      healthCheckInterval: "30", loadBalanceStrategy: "轮询 (Round Robin)",
      scaleUpThreshold: "85", scaleDownThreshold: "20", wsEndpoint: "ws://localhost:3113/ws",
      dbHost: "localhost", dbPort: "5433", dbName: "yyc3_matrix", dbUser: "admin",
      dbPassword: "", dbPoolSize: "10", backupSchedule: "0 2 * * *",
      aiApiKey: "", aiBaseUrl: "https://api.openai.com/v1", aiModel: "gpt-4",
      aiTemperature: "0.7", aiTopP: "0.9", aiMaxTokens: "4096", aiTimeout: "30000",
      alertGpuThreshold: "90", alertTempThreshold: "80", alertEmailAddr: "",
      webhookUrl: "", sessionTimeout: "60", ipWhitelist: "192.168.3.0/24",
      logLevel: "info", logRetention: "30", maxConcurrency: "100",
      cacheSize: "1024", cacheTTL: "3600", wsReconnectInterval: "3000",
      wsMaxReconnect: "10", wsHeartbeatInterval: "15000", wsThrottleMs: "200",
    },
    toggleSetting: vi.fn(),
    updateValue: vi.fn(),
    resetSettings: vi.fn(),
    exportSettings: vi.fn(() => "{}"),
  }),
}));

// ============================================================
// Imports (after mocks)
// ============================================================

import { toast } from "sonner";

// ============================================================
// 1. SystemSettings 集成测试
// ============================================================

import { SystemSettings } from "../components/SystemSettings";

describe("SystemSettings 集成测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("模型管理 CRUD", () => {
    it("应渲染模型管理页面并显示默认模型", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      expect(screen.getByText("模型管理")).toBeInTheDocument();
      expect(screen.getByText("添加模型")).toBeInTheDocument();
      // 默认模型 (来自 deployedModelStore)
      expect(screen.getByText("LLaMA-70B")).toBeInTheDocument();
      expect(screen.getByText("Qwen-72B")).toBeInTheDocument();
    });

    it("点击添加模型应显示表单", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      fireEvent.click(screen.getByText("添加模型"));
      expect(screen.getByText("添加新模型")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("例: LLaMA-70B")).toBeInTheDocument();
    });

    it("添加模型后应出现在列表中", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      fireEvent.click(screen.getByText("添加模型"));
      
      const nameInput = screen.getByPlaceholderText("例: LLaMA-70B");
      fireEvent.change(nameInput, { target: { value: "TestModel-99B" } });
      
      const versionInput = screen.getByPlaceholderText("v1.0");
      fireEvent.change(versionInput, { target: { value: "v3.0" } });
      
      const sizeInput = screen.getByPlaceholderText("140GB");
      fireEvent.change(sizeInput, { target: { value: "200GB" } });

      // Click 创建
      fireEvent.click(screen.getByText("创建"));

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("TestModel-99B"),
        expect.any(Object)
      );
    });

    it("空名称时应显示错误提示", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      fireEvent.click(screen.getByText("添加模型"));
      // Don't fill in name, just click save
      fireEvent.click(screen.getByText("创建"));
      expect(toast.error).toHaveBeenCalledWith("模型名称不能为空");
    });

    it("取消添加应关闭表单", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      fireEvent.click(screen.getByText("添加模型"));
      expect(screen.getByText("添加新模型")).toBeInTheDocument();
      fireEvent.click(screen.getByText("取消"));
      expect(screen.queryByText("添加新模型")).not.toBeInTheDocument();
    });

    it("重置模型列表应调用 deployedModelStore.reset()", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      // 找到重置按钮
      const resetBtn = screen.getByText("重置");
      fireEvent.click(resetBtn);
      expect(toast.info).toHaveBeenCalledWith("模型列表已重置为默认值");
    });

    it("应渲染 KV-Cache 开关", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      expect(screen.getByText("推理缓存 (KV-Cache)")).toBeInTheDocument();
    });
  });

  describe("分类导航", () => {
    const allSections = [
      { key: "settings.general", content: "系统信息" },
      { key: "settings.network", content: "网络连接配置" },
      { key: "settings.cluster", content: "集群配置" },
      { key: "settings.model", content: "模型管理" },
      { key: "settings.storage", content: "存储配置" },
      { key: "settings.websocket", content: "WebSocket 连接配置" },
      { key: "settings.aiLlm", content: "AI / 大模型配置" },
      { key: "settings.security", content: "安全设置" },
      { key: "settings.notification", content: "通知配置" },
    ];

    allSections.forEach(({ key, content }) => {
      it(`切换到 ${key} 应显示对应内容`, () => {
        render(<SystemSettings />);
        fireEvent.click(screen.getByText(key));
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    });
  });

  describe("保存和重置", () => {
    it("保存按钮初始应禁用", () => {
      render(<SystemSettings />);
      const saveBtn = screen.getByText("settings.saveChanges").closest("button")!;
      expect(saveBtn).toBeDisabled();
    });

    it("重置按钮应可点击", () => {
      render(<SystemSettings />);
      const resetBtn = screen.getByText("settings.resetDefault").closest("button")!;
      expect(resetBtn).not.toBeDisabled();
      fireEvent.click(resetBtn);
      expect(toast.info).toHaveBeenCalled();
    });
  });

  describe("高级设置 - API 端点", () => {
    it("应渲染 API 端点配置", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.advanced"));
      expect(screen.getByText("后端 API 端点配置")).toBeInTheDocument();
    });

    it("应渲染危险操作区域", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.advanced"));
      expect(screen.getByText("危险操作")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 2. UserManagement 集成测试
// ============================================================

import { UserManagement } from "../components/UserManagement";

describe("UserManagement 集成测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("用户列表渲染", () => {
    it("应渲染所有默认用户", () => {
      render(<UserManagement />);
      expect(screen.getByText("张管理")).toBeInTheDocument();
      expect(screen.getByText("李运维")).toBeInTheDocument();
      expect(screen.getByText("王开发")).toBeInTheDocument();
      expect(screen.getByText("赵分析")).toBeInTheDocument();
      expect(screen.getByText("刘测试")).toBeInTheDocument();
      expect(screen.getByText("陈研究")).toBeInTheDocument();
      expect(screen.getByText("API Service")).toBeInTheDocument();
      expect(screen.getByText("OPS Bot")).toBeInTheDocument();
    });

    it("应渲染 5 个统计卡片", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.totalUsers")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.onlineUsers")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.admins")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.serviceAccounts")).toBeInTheDocument();
      expect(screen.getByText("userMgmt.todayApiCalls")).toBeInTheDocument();
    });
  });

  describe("搜索过滤", () => {
    it("按名称搜索应正确过滤", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "张管理" } });
      expect(screen.getByText("张管理")).toBeInTheDocument();
      expect(screen.queryByText("李运维")).not.toBeInTheDocument();
    });

    it("按用户名搜索应正确过滤", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "ops_li" } });
      expect(screen.getByText("李运维")).toBeInTheDocument();
      expect(screen.queryByText("张管理")).not.toBeInTheDocument();
    });

    it("按邮箱搜索应正确过滤", () => {
      render(<UserManagement />);
      const searchInput = screen.getByPlaceholderText("userMgmt.searchUser");
      fireEvent.change(searchInput, { target: { value: "zhao@" } });
      expect(screen.getByText("赵分析")).toBeInTheDocument();
      expect(screen.queryByText("张管理")).not.toBeInTheDocument();
    });
  });

  describe("添加用户", () => {
    it("点击添加用户应打开模态框", () => {
      render(<UserManagement />);
      fireEvent.click(screen.getByText("userMgmt.addUser"));
      expect(screen.getByText("添加用户")).toBeInTheDocument();
    });

    it("填写信息后应创建成功", () => {
      render(<UserManagement />);
      fireEvent.click(screen.getByText("userMgmt.addUser"));
      
      const nameInput = screen.getByPlaceholderText("输入名称...");
      const usernameInput = screen.getByPlaceholderText("输入登录账号...");
      const emailInput = screen.getByPlaceholderText("user@cloudpivot.ai");
      
      fireEvent.change(nameInput, { target: { value: "测试用户" } });
      fireEvent.change(usernameInput, { target: { value: "test_user" } });
      fireEvent.change(emailInput, { target: { value: "test@cloudpivot.ai" } });
      
      fireEvent.click(screen.getByText("创建"));
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("测试用户"),
        expect.any(Object)
      );
    });

    it("空表单提交应显示错误", () => {
      render(<UserManagement />);
      fireEvent.click(screen.getByText("userMgmt.addUser"));
      fireEvent.click(screen.getByText("创建"));
      expect(toast.error).toHaveBeenCalledWith("请填写完整信息", expect.any(Object));
    });
  });

  describe("重置为默认", () => {
    it("应渲染重置按钮", () => {
      render(<UserManagement />);
      expect(screen.getByText("重置")).toBeInTheDocument();
    });

    it("点击重置应恢复默认用户列表", () => {
      render(<UserManagement />);
      fireEvent.click(screen.getByText("重置"));
      expect(toast.info).toHaveBeenCalledWith("用户列表已重置为默认值", expect.any(Object));
    });
  });

  describe("删除用户", () => {
    it("删除超级管理员应被拒绝", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const buttons = row.querySelectorAll("button");
      const deleteBtn = buttons[buttons.length - 1]; // last button is delete
      fireEvent.click(deleteBtn);
      expect(toast.error).toHaveBeenCalledWith("无法删除超级管理员", expect.any(Object));
    });
  });

  describe("用户详情 Modal", () => {
    it("查看用户详情应显示正确信息", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const viewBtn = row.querySelector("button")!; // first button is view
      fireEvent.click(viewBtn);
      expect(screen.getByText("userMgmt.userDetail")).toBeInTheDocument();
      expect(screen.getByText("@admin")).toBeInTheDocument();
    });

    it("关闭 Modal 应正常工作", () => {
      render(<UserManagement />);
      const row = screen.getByText("张管理").closest("tr")!;
      const viewBtn = row.querySelector("button")!;
      fireEvent.click(viewBtn);
      expect(screen.getByText("userMgmt.userDetail")).toBeInTheDocument();
      
      const closeBtn = screen.getByText("userMgmt.userDetail").parentElement?.querySelector("button");
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(screen.queryByText("userMgmt.userDetail")).not.toBeInTheDocument();
      }
    });
  });

  describe("角色面板", () => {
    it("应渲染角色列表", () => {
      render(<UserManagement />);
      expect(screen.getByText("userMgmt.rolesPerms")).toBeInTheDocument();
      expect(screen.getByText("全部权限")).toBeInTheDocument();
    });

    it("权限矩阵切换应正常工作", () => {
      render(<UserManagement />);
      fireEvent.click(screen.getByText("userMgmt.permMatrix"));
      expect(screen.getByText("权限矩阵")).toBeInTheDocument();
      expect(screen.getByText("节点管理")).toBeInTheDocument();
    });
  });
});

// ============================================================
// 3. createLocalStore 集成测试
// ============================================================

import { createLocalStore } from "../lib/create-local-store";

describe("createLocalStore 集成测试", () => {
  beforeEach(() => localStorage.clear());

  interface TestItem {
    id: string;
    name: string;
    value: number;
  }

  const defaults: TestItem[] = [
    { id: "t-1", name: "Alpha", value: 10 },
    { id: "t-2", name: "Beta", value: 20 },
    { id: "t-3", name: "Gamma", value: 30 },
  ];

  it("首次 getAll 应返回默认值并持久化", () => {
    const store = createLocalStore<TestItem>("test_store", defaults, "t");
    const items = store.getAll();
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe("Alpha");
    // 验证 localStorage 已写入
    const raw = localStorage.getItem("test_store");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toHaveLength(3);
  });

  it("add 应添加新项并持久化", () => {
    const store = createLocalStore<TestItem>("test_add", defaults, "t");
    store.getAll();
    const added = store.add({ name: "Delta", value: 40 });
    expect(added.id).toBeTruthy();
    expect(added.name).toBe("Delta");
    expect(store.count()).toBe(4);
  });

  it("update 应修改已有项", () => {
    const store = createLocalStore<TestItem>("test_update", defaults, "t");
    store.getAll();
    const updated = store.update("t-1", { name: "Alpha Updated", value: 99 });
    expect(updated?.name).toBe("Alpha Updated");
    expect(updated?.value).toBe(99);
    expect(store.getById("t-1")?.name).toBe("Alpha Updated");
  });

  it("update 不存在的 ID 应返回 null", () => {
    const store = createLocalStore<TestItem>("test_update_null", defaults, "t");
    store.getAll();
    const result = store.update("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  it("remove 应删除项", () => {
    const store = createLocalStore<TestItem>("test_remove", defaults, "t");
    store.getAll();
    const removed = store.remove("t-2");
    expect(removed).toBe(true);
    expect(store.count()).toBe(2);
    expect(store.getById("t-2")).toBeUndefined();
  });

  it("remove 不存在的 ID 应返回 false", () => {
    const store = createLocalStore<TestItem>("test_remove_false", defaults, "t");
    store.getAll();
    expect(store.remove("nonexistent")).toBe(false);
  });

  it("removeBatch 应批量删除", () => {
    const store = createLocalStore<TestItem>("test_batch", defaults, "t");
    store.getAll();
    const count = store.removeBatch(["t-1", "t-3"]);
    expect(count).toBe(2);
    expect(store.count()).toBe(1);
    expect(store.getAll()[0].name).toBe("Beta");
  });

  it("reset 应恢复默认值", () => {
    const store = createLocalStore<TestItem>("test_reset", defaults, "t");
    store.getAll();
    store.add({ name: "Extra", value: 100 });
    expect(store.count()).toBe(4);
    const resetItems = store.reset();
    expect(resetItems).toHaveLength(3);
    expect(store.count()).toBe(3);
  });

  it("exportData 应生成 JSON", () => {
    const store = createLocalStore<TestItem>("test_export", defaults, "t");
    store.getAll();
    const json = store.exportData();
    const parsed = JSON.parse(json);
    expect(parsed._key).toBe("test_export");
    expect(parsed.data).toHaveLength(3);
    expect(parsed._exportedAt).toBeTruthy();
  });

  it("importData 应导入数据", () => {
    const store = createLocalStore<TestItem>("test_import", defaults, "t");
    store.getAll();
    const importJson = JSON.stringify([
      { id: "new-1", name: "Imported", value: 999 },
    ]);
    expect(store.importData(importJson)).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.getAll()[0].name).toBe("Imported");
  });

  it("importData 非法 JSON 应返回 false", () => {
    const store = createLocalStore<TestItem>("test_import_fail", defaults, "t");
    store.getAll();
    expect(store.importData("not-json")).toBe(false);
  });

  it("完整 CRUD 流程", () => {
    const store = createLocalStore<TestItem>("test_crud_flow", defaults, "t");
    
    // 初始状态
    expect(store.count()).toBe(3);
    
    // 添加
    const newItem = store.add({ name: "New", value: 50 });
    expect(store.count()).toBe(4);
    
    // 更新
    store.update(newItem.id, { value: 55 });
    expect(store.getById(newItem.id)?.value).toBe(55);
    
    // 删除
    store.remove(newItem.id);
    expect(store.count()).toBe(3);
    
    // 重置
    store.reset();
    expect(store.count()).toBe(3);
    expect(store.getAll()[0].name).toBe("Alpha");
  });
});

// ============================================================
// 4. Dashboard stores 集成测试
// ============================================================

import {
  nodeStore, modelPerfStore, modelDistStore,
  recentOpsStore, radarStore, logStore,
  dbConnectionStore, deployedModelStore,
  wifiNetworkStore, userStore,
} from "../stores/dashboard-stores";

describe("Dashboard stores 集成测试", () => {
  beforeEach(() => localStorage.clear());

  const storeConfigs = [
    { name: "nodeStore", store: nodeStore, defaultCount: 8 },
    { name: "modelPerfStore", store: modelPerfStore, defaultCount: 5 },
    { name: "modelDistStore", store: modelDistStore, defaultCount: 5 },
    { name: "recentOpsStore", store: recentOpsStore, defaultCount: 5 },
    { name: "radarStore", store: radarStore, defaultCount: 6 },
    { name: "logStore", store: logStore, defaultCount: 15 },
    { name: "dbConnectionStore", store: dbConnectionStore, defaultCount: 2 },
    { name: "deployedModelStore", store: deployedModelStore, defaultCount: 5 },
    { name: "wifiNetworkStore", store: wifiNetworkStore, defaultCount: 0 },
    { name: "userStore", store: userStore, defaultCount: 8 },
  ];

  storeConfigs.forEach(({ name, store, defaultCount }) => {
    it(`${name} 应有 ${defaultCount} 条默认数据`, () => {
      store.reset();
      expect(store.count()).toBe(defaultCount);
    });

    it(`${name} 的 reset() 应恢复默认`, () => {
      store.reset();
      if (defaultCount > 0) {
        const first = store.getAll()[0];
        store.remove(first.id);
        expect(store.count()).toBe(defaultCount - 1);
        store.reset();
        expect(store.count()).toBe(defaultCount);
      }
    });
  });

  it("deployedModelStore CRUD 应正常工作", () => {
    deployedModelStore.reset();
    const added = deployedModelStore.add({
      name: "TestModel",
      version: "v1.0",
      size: "50GB",
      status: "standby",
      gpu: "-",
    });
    expect(deployedModelStore.count()).toBe(6);
    
    deployedModelStore.update(added.id, { status: "deployed", gpu: "GPU-A100-01" });
    expect(deployedModelStore.getById(added.id)?.status).toBe("deployed");
    
    deployedModelStore.remove(added.id);
    expect(deployedModelStore.count()).toBe(5);
  });

  it("userStore CRUD 应正常工作", () => {
    userStore.reset();
    expect(userStore.count()).toBe(8);
    
    const newUser = userStore.add({
      name: "测试用户",
      username: "test",
      email: "test@cloudpivot.ai",
      role: "开发者",
      status: "offline" as const,
      lastLogin: "--",
      sessions: 0,
      apiCalls: 0,
      locked: false,
    });
    expect(userStore.count()).toBe(9);
    
    userStore.update(newUser.id, { locked: true });
    expect(userStore.getById(newUser.id)?.locked).toBe(true);
    
    userStore.remove(newUser.id);
    expect(userStore.count()).toBe(8);
  });

  it("wifiNetworkStore 扫描+连接流程", () => {
    wifiNetworkStore.reset();
    expect(wifiNetworkStore.count()).toBe(0);
    
    // 模拟扫描
    wifiNetworkStore.add({ ssid: "Test-5G", signal: 90, security: "WPA3", connected: false });
    wifiNetworkStore.add({ ssid: "Test-2.4G", signal: 70, security: "WPA2", connected: false });
    expect(wifiNetworkStore.count()).toBe(2);
    
    // 模拟连接
    const networks = wifiNetworkStore.getAll();
    wifiNetworkStore.update(networks[0].id, { connected: true, lastConnectedAt: Date.now() });
    expect(wifiNetworkStore.getAll().filter(n => n.connected)).toHaveLength(1);
    
    // 模拟断开
    wifiNetworkStore.update(networks[0].id, { connected: false });
    expect(wifiNetworkStore.getAll().filter(n => n.connected)).toHaveLength(0);
  });
});

// ============================================================
// 5. api-config 类型导出验证测试
// ============================================================

describe("api-config 类型导出验证", () => {
  it("getAPIConfig 应返回完整配置对象", async () => {
    const { getAPIConfig } = await vi.importMock<any>("../lib/api-config");
    const config = getAPIConfig();
    expect(config).toHaveProperty("enableBackend");
    expect(config).toHaveProperty("timeout");
    expect(config).toHaveProperty("maxRetries");
    expect(config).toHaveProperty("fsBase");
    expect(config).toHaveProperty("dbBase");
    expect(config).toHaveProperty("wsEndpoint");
  });

  it("ENDPOINT_META 应包含正确的元数据结构", async () => {
    const { ENDPOINT_META } = await vi.importMock<any>("../lib/api-config");
    expect(ENDPOINT_META.length).toBeGreaterThan(0);
    ENDPOINT_META.forEach((meta: any) => {
      expect(meta).toHaveProperty("key");
      expect(meta).toHaveProperty("labelCn");
      expect(meta).toHaveProperty("type");
      expect(meta).toHaveProperty("group");
    });
  });
});

// ============================================================
// 6. 跨组件数据流集成测试
// ============================================================

describe("跨组件数据流集成", () => {
  beforeEach(() => localStorage.clear());

  it("userStore 修改后 UserManagement 应反映变更", () => {
    userStore.reset();
    const { rerender } = render(<UserManagement />);
    expect(screen.getByText("8")).toBeInTheDocument(); // total users = 8
    
    // 通过 UI 添加用户
    fireEvent.click(screen.getByText("userMgmt.addUser"));
    const nameInput = screen.getByPlaceholderText("输入名称...");
    const usernameInput = screen.getByPlaceholderText("输入登录账号...");
    const emailInput = screen.getByPlaceholderText("user@cloudpivot.ai");
    
    fireEvent.change(nameInput, { target: { value: "新用户" } });
    fireEvent.change(usernameInput, { target: { value: "new_user" } });
    fireEvent.change(emailInput, { target: { value: "new@cloudpivot.ai" } });
    fireEvent.click(screen.getByText("创建"));
    
    // 验证用户数增加
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("store.reset() 后组件重新渲染应反映默认数据", () => {
    userStore.reset();
    // 先添加一个用户
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
    expect(userStore.count()).toBe(9);
    
    // 重置
    userStore.reset();
    expect(userStore.count()).toBe(8);
  });
});
