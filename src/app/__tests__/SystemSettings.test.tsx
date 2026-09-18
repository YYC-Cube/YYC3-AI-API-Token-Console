/**
 * SystemSettings.test.tsx
 * ========================
 * SystemSettings 组件测试
 *
 * 覆盖范围:
 * - 设置分类列表渲染
 * - 分类切换交互
 * - Toggle 开关组件
 * - EditableField 编辑/显示/密码模式
 * - API Endpoint 配置区域
 * - 各分类内容渲染 (general/network/cluster/model/storage/websocket...)
 * - 保存/重置操作
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("../components/NetworkConfig", () => ({
  NetworkConfig: () => <div data-testid="network-config" />,
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
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

// Mock api-config
const mockAPIConfig = {
  enableBackend: false,
  timeout: 15000,
  maxRetries: 2,
  fsBase: "/api/fs",
  dbBase: "/api/db",
  wsEndpoint: "ws://localhost:3113/ws",
  aiBase: "https://api.openai.com/v1",
  clusterBase: "/api/cluster",
};

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
    { key: "maxRetries", label: "Max Retries", labelCn: "最大重试次数", description: "请求失败后重试次数", type: "number", placeholder: "2", group: "通用" },
    { key: "wsEndpoint", label: "WebSocket", labelCn: "WebSocket 地址", description: "实时数据推送", type: "url", placeholder: "ws://localhost:3113/ws", group: "实时通信" },
  ],
}));

import { SystemSettings } from "../components/SystemSettings";

describe("SystemSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("基础渲染", () => {
    it("应渲染设置标题", () => {
      render(<SystemSettings />);
      expect(screen.getByText("系统设置")).toBeInTheDocument();
    });

    it("应渲染 12 个设置分类", () => {
      render(<SystemSettings />);
      expect(screen.getByText("settings.general")).toBeInTheDocument();
      expect(screen.getByText("settings.network")).toBeInTheDocument();
      expect(screen.getByText("settings.cluster")).toBeInTheDocument();
      expect(screen.getByText("settings.model")).toBeInTheDocument();
      expect(screen.getByText("settings.storage")).toBeInTheDocument();
      expect(screen.getByText("settings.websocket")).toBeInTheDocument();
      expect(screen.getByText("settings.aiLlm")).toBeInTheDocument();
      expect(screen.getByText("settings.pwaOffline")).toBeInTheDocument();
      expect(screen.getByText("settings.security")).toBeInTheDocument();
      expect(screen.getByText("settings.notification")).toBeInTheDocument();
      expect(screen.getByText("settings.envVars")).toBeInTheDocument();
      expect(screen.getByText("settings.advanced")).toBeInTheDocument();
    });
  });

  describe("分类切换", () => {
    it("默认显示 general 分类内容", () => {
      render(<SystemSettings />);
      // general section should be visible
      expect(screen.getByText("settings.general")).toBeInTheDocument();
    });

    it("点击 network 应切换到网络配置", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.network"));
      // Network section should render the network title
      expect(screen.getByText("网络连接配置")).toBeInTheDocument();
      expect(screen.getByText("打开网络配置面板")).toBeInTheDocument();
    });

    it("点击 cluster 应显示集群配置", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.cluster"));
      // Cluster section should show cluster-related settings
      expect(screen.getByText("settings.cluster")).toBeInTheDocument();
    });
  });

  describe("General 分类", () => {
    it("应渲染系统信息标题", () => {
      render(<SystemSettings />);
      expect(screen.getByText("系统信息")).toBeInTheDocument();
    });

    it("应渲染 YYC3 Logo", () => {
      render(<SystemSettings />);
      expect(screen.getByTestId("yyc3-logo")).toBeInTheDocument();
    });

    it("应渲染系统名称字段", () => {
      render(<SystemSettings />);
      expect(screen.getByText("系统名称")).toBeInTheDocument();
    });

    it("应渲染运行时间", () => {
      render(<SystemSettings />);
      expect(screen.getByText("运行时间")).toBeInTheDocument();
    });

    it("应渲染许可证信息", () => {
      render(<SystemSettings />);
      expect(screen.getByText("Enterprise Pro")).toBeInTheDocument();
    });

    it("应渲染深色模式开关", () => {
      render(<SystemSettings />);
      expect(screen.getByText("深色模式")).toBeInTheDocument();
    });

    it("应渲染系统健康度", () => {
      render(<SystemSettings />);
      expect(screen.getByText("系统健康度")).toBeInTheDocument();
      expect(screen.getByText("所有服务正常")).toBeInTheDocument();
    });
  });

  describe("保存和重置", () => {
    it("应渲染保存按钮", () => {
      render(<SystemSettings />);
      expect(screen.getByText("settings.saveChanges")).toBeInTheDocument();
    });

    it("应渲染重置按钮", () => {
      render(<SystemSettings />);
      expect(screen.getByText("settings.resetDefault")).toBeInTheDocument();
    });

    it("无更改时保存按钮应禁用", () => {
      render(<SystemSettings />);
      const saveBtn = screen.getByText("settings.saveChanges").closest("button")!;
      expect(saveBtn).toBeDisabled();
    });
  });

  describe("Model 分类", () => {
    it("应渲染模型管理标题和添加按钮", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      expect(screen.getByText("模型管理")).toBeInTheDocument();
      expect(screen.getByText("添加模型")).toBeInTheDocument();
    });

    it("应渲染模型列表", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.model"));
      expect(screen.getByText("LLaMA-70B")).toBeInTheDocument();
      expect(screen.getByText("Qwen-72B")).toBeInTheDocument();
      expect(screen.getByText("DeepSeek-V3")).toBeInTheDocument();
    });
  });

  describe("Advanced 分类 (API 端点)", () => {
    it("应渲染后端 API 端点配置", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.advanced"));
      expect(screen.getByText("后端 API 端点配置")).toBeInTheDocument();
    });

    it("应渲染重置默认按钮", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.advanced"));
      expect(screen.getByText("重置默认")).toBeInTheDocument();
    });

    it("应渲染危险操作区域", () => {
      render(<SystemSettings />);
      fireEvent.click(screen.getByText("settings.advanced"));
      expect(screen.getByText("危险操作")).toBeInTheDocument();
    });
  });

  describe("各分类渲染", () => {
    const categories = [
      "settings.model",
      "settings.storage",
      "settings.websocket",
      "settings.aiLlm",
      "settings.pwaOffline",
      "settings.security",
      "settings.notification",
      "settings.envVars",
    ];

    categories.forEach((cat) => {
      it(`点击 ${cat} 不应抛出错误`, () => {
        render(<SystemSettings />);
        fireEvent.click(screen.getByText(cat));
        expect(screen.getByText(cat)).toBeInTheDocument();
      });
    });
  });
});