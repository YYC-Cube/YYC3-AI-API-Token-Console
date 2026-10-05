/**
 * settings-sections.test.tsx
 * ===========================
 * settings/ 分区组件测试 (§6.6 Facade+Siblings)
 *
 * 覆盖范围:
 * - shared.tsx: settingsSections 清单 / Toggle / EditableField (编辑/密码/描述)
 * - sections-core.tsx: General / Network / Cluster / Storage
 * - sections-connect.tsx: WebSocket / AI / PWA / Env
 * - sections-admin.tsx: Security / Notification / Advanced
 */

import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../components/NetworkConfig", () => ({
  NetworkConfig: ({ open }: any) => <div data-testid="network-config" data-open={String(open)} />,
}));

vi.mock("../components/YYC3Logo", () => ({
  YYC3Logo: () => <div data-testid="yyc3-logo" />,
}));

vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    availableModels: [
      { id: "gpt-4", name: "GPT-4", isLocal: false },
      { id: "llama3", name: "LLaMA-3", isLocal: true },
    ],
  }),
}));

vi.mock("../components/settings/APIEndpointConfig", () => ({
  APIEndpointConfig: () => <div data-testid="api-endpoint-config" />,
}));

import {
  EditableField,
  Toggle,
  settingsSections,
} from "../components/settings/shared";
import {
  GeneralSection,
  NetworkSection,
  ClusterSection,
  StorageSection,
} from "../components/settings/sections-core";
import {
  WebSocketSection,
  AISection,
  PWASection,
  EnvSection,
} from "../components/settings/sections-connect";
import {
  SecuritySection,
  NotificationSection,
  AdvancedSection,
} from "../components/settings/sections-admin";
import type { SettingsToggles, SettingsValues } from "../hooks/useSettingsStore";

// ============================================================
// Fixtures
// ============================================================

function makeToggles(): SettingsToggles {
  return {
    autoScale: true, healthCheck: true, alertEmail: false, alertSlack: true,
    darkMode: true, autoBackup: true, mfa: true, auditLog: false,
    rateLimiting: true, cacheEnabled: false, wsAutoReconnect: true,
    wsHeartbeat: false, aiStreamMode: true, aiContextMemory: false,
    debugMode: true, performanceLog: false, autoUpdate: true,
    dataCompression: false, corsEnabled: true,
  };
}

function makeValues(): SettingsValues {
  return {
    systemName: "YYC³ CloudPivot", clusterId: "cpim-001", refreshInterval: "5",
    language: "zh-CN", timezone: "Asia/Shanghai", maxNodes: "16",
    loadBalanceStrategy: "轮询 (Round Robin)", healthCheckInterval: "30",
    scaleUpThreshold: "85", scaleDownThreshold: "20",
    wsEndpoint: "ws://localhost:3113/ws", wsReconnectInterval: "3000",
    wsMaxReconnect: "10", wsHeartbeatInterval: "15000", wsThrottleMs: "200",
    aiApiKey: "sk-secret", aiBaseUrl: "https://api.openai.com/v1",
    aiModel: "gpt-4", aiTemperature: "0.7", aiTopP: "0.9",
    aiMaxTokens: "4096", aiTimeout: "30000", dbHost: "localhost",
    dbPort: "5433", dbName: "yyc3_matrix", dbUser: "admin", dbPassword: "pwd",
    dbPoolSize: "10", sessionTimeout: "60", ipWhitelist: "192.168.3.0/24",
    alertGpuThreshold: "90", alertTempThreshold: "80",
    alertEmailAddr: "admin@yyc3.vip", webhookUrl: "", backupSchedule: "0 2 * * *",
    logLevel: "info", logRetention: "30", maxConcurrency: "100",
    cacheSize: "1024", cacheTTL: "3600",
  };
}

function makeProps() {
  return {
    settings: makeToggles(),
    values: makeValues(),
    updateValue: vi.fn(),
    toggleSetting: vi.fn(),
  };
}

/** 通过标签定位其所在设置行容器 */
function rowOf(label: string | RegExp): HTMLElement {
  return screen.getByText(label).closest("div")!.parentElement as HTMLElement;
}

beforeAll(() => {
  // GeneralSection 导出配置依赖 Blob URL (jsdom 未实现)
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

// ============================================================
// shared.tsx
// ============================================================

describe("settings/shared", () => {
  describe("settingsSections 清单", () => {
    it("应包含 12 个分区且 id/labelKey 有序", () => {
      expect(settingsSections.map((s) => s.id)).toEqual([
        "general", "network", "cluster", "model", "storage", "websocket",
        "ai", "pwa", "security", "notification", "env", "advanced",
      ]);
      expect(settingsSections[0].labelKey).toBe("settings.general");
      expect(settingsSections[11].labelKey).toBe("settings.advanced");
    });

    it("每个分区都有图标组件", () => {
      settingsSections.forEach((s) => {
        // lucide 图标为 ForwardRefExoticComponent (object), 以可渲染性为准
        expect(s.icon).toBeDefined();
      });
    });
  });

  describe("Toggle", () => {
    it("点击启用的开关应回调 false", () => {
      const onChange = vi.fn();
      render(<Toggle enabled={true} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("点击关闭的开关应回调 true", () => {
      const onChange = vi.fn();
      render(<Toggle enabled={false} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe("EditableField", () => {
    it("默认展示值与描述", () => {
      render(
        <EditableField label="系统名称" value="YYC³" description="系统显示标题" onChange={vi.fn()} />,
      );
      expect(screen.getByText("系统名称")).toBeInTheDocument();
      expect(screen.getByText("YYC³")).toBeInTheDocument();
      expect(screen.getByText("系统显示标题")).toBeInTheDocument();
    });

    it("空值时显示占位符 -", () => {
      render(<EditableField label="Webhook" value="" onChange={vi.fn()} />);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("进入编辑模式修改后应回调新值", () => {
      const onChange = vi.fn();
      render(<EditableField label="集群 ID" value="cpim-001" onChange={onChange} />);
      fireEvent.click(rowOf("集群 ID").querySelector("button")!);
      const input = screen.getByDisplayValue("cpim-001");
      fireEvent.change(input, { target: { value: "cpim-002" } });
      expect(onChange).toHaveBeenCalledWith("cpim-002");
    });

    it("密码字段查看态显示掩码, 编辑态支持明文切换", () => {
      const onChange = vi.fn();
      const { container } = render(
        <EditableField label="数据库密码" value="s3cret" type="password" onChange={onChange} />,
      );
      expect(screen.getByText("••••••••")).toBeInTheDocument();
      // 进入编辑
      const row = rowOf("数据库密码");
      fireEvent.click(row.querySelector("button")!);
      const input = screen.getByDisplayValue("s3cret");
      expect(input).toHaveAttribute("type", "password");
      // 点击可见性切换按钮 (行内第二个按钮)
      const eyeBtn = container.querySelectorAll("button")[1];
      fireEvent.click(eyeBtn);
      expect(screen.getByDisplayValue("s3cret")).toHaveAttribute("type", "text");
    });

    it("编辑态展示 placeholder", () => {
      render(
        <EditableField label="通知邮箱" value="" placeholder="a@b.c" type="email" onChange={vi.fn()} />,
      );
      fireEvent.click(rowOf("通知邮箱").querySelector("button")!);
      expect(screen.getByPlaceholderText("a@b.c")).toBeInTheDocument();
    });
  });
});

// ============================================================
// sections-core.tsx
// ============================================================

describe("sections-core", () => {
  describe("GeneralSection", () => {
    it("应渲染系统信息 / 运行时间 / 许可证", () => {
      render(<GeneralSection {...makeProps()} />);
      expect(screen.getByText("系统信息")).toBeInTheDocument();
      expect(screen.getByText("运行时间")).toBeInTheDocument();
      expect(screen.getByText("Enterprise Pro")).toBeInTheDocument();
      expect(screen.getByTestId("yyc3-logo")).toBeInTheDocument();
    });

    it("切换深色模式应触发 toggleSetting(darkMode)", () => {
      const p = makeProps();
      render(<GeneralSection {...p} />);
      fireEvent.click(rowOf("深色模式").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("darkMode");
    });

    it("切换数据刷新间隔应触发 updateValue", () => {
      const p = makeProps();
      render(<GeneralSection {...p} />);
      // select 的 displayValue 匹配选中 option 的文本
      fireEvent.change(screen.getByDisplayValue("5 秒"), { target: { value: "30" } });
      expect(p.updateValue).toHaveBeenCalledWith("refreshInterval", "30");
    });

    it("切换语言应触发 updateValue(language)", () => {
      const p = makeProps();
      render(<GeneralSection {...p} />);
      fireEvent.change(screen.getByDisplayValue("简体中文"), { target: { value: "en" } });
      expect(p.updateValue).toHaveBeenCalledWith("language", "en");
    });

    it("编辑时区应回调新值", () => {
      const p = makeProps();
      render(<GeneralSection {...p} />);
      fireEvent.click(rowOf("时区").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("Asia/Shanghai"), {
        target: { value: "UTC" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("timezone", "UTC");
    });

    it("点击导出配置应触发 toast 成功", async () => {
      const { toast } = await import("sonner");
      render(<GeneralSection {...makeProps()} />);
      fireEvent.click(screen.getByText("导出配置"));
      expect(toast.success).toHaveBeenCalledWith("settings.exported");
      expect(screen.getByText("导入配置")).toBeInTheDocument();
    });
  });

  describe("NetworkSection", () => {
    it("应渲染网络配置入口 / 当前连接 / 节点拓扑", () => {
      render(<NetworkSection {...makeProps()} />);
      expect(screen.getByText("网络连接配置")).toBeInTheDocument();
      expect(screen.getByText("打开网络配置面板")).toBeInTheDocument();
      expect(screen.getByText("WebSocket 端点")).toBeInTheDocument();
      expect(screen.getByText("ws://localhost:3113/ws")).toBeInTheDocument();
      expect(screen.getByText("M4 Max 主节点")).toBeInTheDocument();
      expect(screen.getByText("NAS 数据中心")).toBeInTheDocument();
    });

    it("点击快捷入口应打开 NetworkConfig 弹窗", () => {
      render(<NetworkSection {...makeProps()} />);
      expect(screen.getByTestId("network-config")).toHaveAttribute("data-open", "false");
      fireEvent.click(screen.getByText("打开网络配置面板"));
      expect(screen.getByTestId("network-config")).toHaveAttribute("data-open", "true");
    });
  });

  describe("ClusterSection", () => {
    it("应渲染集群配置区块", () => {
      render(<ClusterSection {...makeProps()} />);
      expect(screen.getByText("集群配置")).toBeInTheDocument();
      expect(screen.getByText("自动弹性伸缩")).toBeInTheDocument();
      expect(screen.getByText("负载均衡策略")).toBeInTheDocument();
      expect(screen.getByText("扩容阈值 (%)")).toBeInTheDocument();
    });

    it("切换自动弹性伸缩与健康检查开关", () => {
      const p = makeProps();
      render(<ClusterSection {...p} />);
      fireEvent.click(rowOf("自动弹性伸缩").querySelector("button")!);
      fireEvent.click(rowOf("健康检查").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("autoScale");
      expect(p.toggleSetting).toHaveBeenCalledWith("healthCheck");
    });

    it("切换负载均衡策略应触发 updateValue", () => {
      const p = makeProps();
      render(<ClusterSection {...p} />);
      fireEvent.change(screen.getByDisplayValue("轮询 (Round Robin)"), {
        target: { value: "加权轮询 (Weighted RR)" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("loadBalanceStrategy", "加权轮询 (Weighted RR)");
    });

    it("编辑最大节点数量应回调新值", () => {
      const p = makeProps();
      render(<ClusterSection {...p} />);
      fireEvent.click(rowOf("最大节点数量").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("16"), { target: { value: "32" } });
      expect(p.updateValue).toHaveBeenCalledWith("maxNodes", "32");
    });
  });

  describe("StorageSection", () => {
    it("应渲染存储概览卡片", () => {
      render(<StorageSection {...makeProps()} />);
      expect(screen.getByText("存储配置")).toBeInTheDocument();
      expect(screen.getByText("总存储")).toBeInTheDocument();
      expect(screen.getByText("向量数据库")).toBeInTheDocument();
      expect(screen.getByText("模型仓库")).toBeInTheDocument();
      expect(screen.getByText("日志存储")).toBeInTheDocument();
    });

    it("切换自动备份与数据压缩开关", () => {
      const p = makeProps();
      render(<StorageSection {...p} />);
      fireEvent.click(rowOf("自动备份").querySelector("button")!);
      fireEvent.click(rowOf("数据压缩").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("autoBackup");
      expect(p.toggleSetting).toHaveBeenCalledWith("dataCompression");
    });

    it("编辑备份调度应回调新值", () => {
      const p = makeProps();
      render(<StorageSection {...p} />);
      fireEvent.click(rowOf("备份调度 (Cron)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("0 2 * * *"), {
        target: { value: "0 3 * * *" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("backupSchedule", "0 3 * * *");
    });
  });
});

// ============================================================
// sections-connect.tsx
// ============================================================

describe("sections-connect", () => {
  describe("WebSocketSection", () => {
    it("应渲染 WebSocket 配置区块与字段", () => {
      render(<WebSocketSection {...makeProps()} />);
      expect(screen.getByText("WebSocket 连接配置")).toBeInTheDocument();
      expect(screen.getByText("自动重连")).toBeInTheDocument();
      expect(screen.getByText("心跳检测")).toBeInTheDocument();
      expect(screen.getByText("UI 更新节流 (ms)")).toBeInTheDocument();
    });

    it("切换自动重连/心跳开关", () => {
      const p = makeProps();
      render(<WebSocketSection {...p} />);
      fireEvent.click(rowOf("自动重连").querySelector("button")!);
      fireEvent.click(rowOf("心跳检测").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("wsAutoReconnect");
      expect(p.toggleSetting).toHaveBeenCalledWith("wsHeartbeat");
    });

    it("编辑 WebSocket 端点应回调新值", () => {
      const p = makeProps();
      render(<WebSocketSection {...p} />);
      fireEvent.click(rowOf("WebSocket 端点").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("ws://localhost:3113/ws"), {
        target: { value: "ws://192.168.3.45:3113/ws" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("wsEndpoint", "ws://192.168.3.45:3113/ws");
    });
  });

  describe("AISection", () => {
    it("应渲染 AI 配置区块与实时同步提示", () => {
      render(<AISection {...makeProps()} />);
      expect(screen.getByText("AI / 大模型配置")).toBeInTheDocument();
      expect(screen.getByText(/实时双向同步/)).toBeInTheDocument();
      expect(screen.getByText("OpenAI API Key")).toBeInTheDocument();
      expect(screen.getByText("流式输出 (Stream)")).toBeInTheDocument();
    });

    it("应渲染可用模型下拉并支持切换", () => {
      const p = makeProps();
      render(<AISection {...p} />);
      const select = screen.getByDisplayValue("GPT-4");
      fireEvent.change(select, { target: { value: "llama3" } });
      expect(p.updateValue).toHaveBeenCalledWith("aiModel", "llama3");
    });

    it("切换流式输出与上下文记忆开关", () => {
      const p = makeProps();
      render(<AISection {...p} />);
      fireEvent.click(rowOf("流式输出 (Stream)").querySelector("button")!);
      fireEvent.click(rowOf("上下文记忆").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("aiStreamMode");
      expect(p.toggleSetting).toHaveBeenCalledWith("aiContextMemory");
    });

    it("API Key 密码字段查看态显示掩码", () => {
      render(<AISection {...makeProps()} />);
      expect(screen.getAllByText("••••••••").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PWASection", () => {
    it("应渲染 PWA 配置区块", () => {
      render(<PWASection {...makeProps()} />);
      expect(screen.getByText("PWA / 离线配置")).toBeInTheDocument();
      expect(screen.getByText("启用 PWA")).toBeInTheDocument();
      expect(screen.getByText("缓存大小 (MB)")).toBeInTheDocument();
    });

    it("切换缓存大小/TTL 应触发 updateValue", () => {
      const p = makeProps();
      render(<PWASection {...p} />);
      fireEvent.change(screen.getByDisplayValue("1 GB"), { target: { value: "2048" } });
      fireEvent.change(screen.getByDisplayValue("1 小时"), { target: { value: "86400" } });
      expect(p.updateValue).toHaveBeenCalledWith("cacheSize", "2048");
      expect(p.updateValue).toHaveBeenCalledWith("cacheTTL", "86400");
    });

    it("切换启用 PWA 开关", () => {
      const p = makeProps();
      render(<PWASection {...p} />);
      fireEvent.click(rowOf("启用 PWA").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("cacheEnabled");
    });
  });

  describe("EnvSection", () => {
    it("应渲染数据库配置区块与警示条", () => {
      render(<EnvSection {...makeProps()} />);
      expect(screen.getByText("环境变量 & 数据库")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL 数据库")).toBeInTheDocument();
      expect(screen.getByText("数据库主机")).toBeInTheDocument();
      expect(screen.getByText("注意")).toBeInTheDocument();
    });

    it("编辑数据库主机应回调新值", () => {
      const p = makeProps();
      render(<EnvSection {...p} />);
      fireEvent.click(rowOf("数据库主机").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("localhost"), {
        target: { value: "192.168.3.45" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("dbHost", "192.168.3.45");
    });

    it("编辑连接池大小应回调新值", () => {
      const p = makeProps();
      render(<EnvSection {...p} />);
      fireEvent.click(rowOf("连接池大小").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("10"), { target: { value: "20" } });
      expect(p.updateValue).toHaveBeenCalledWith("dbPoolSize", "20");
    });
  });
});

// ============================================================
// sections-admin.tsx
// ============================================================

describe("sections-admin", () => {
  describe("SecuritySection", () => {
    it("应渲染安全设置区块", () => {
      render(<SecuritySection {...makeProps()} />);
      expect(screen.getByText("安全设置")).toBeInTheDocument();
      expect(screen.getByText("多因素认证 (MFA)")).toBeInTheDocument();
      expect(screen.getByText("审计日志")).toBeInTheDocument();
      expect(screen.getByText("IP 白名单")).toBeInTheDocument();
    });

    it("切换 MFA / 审计日志 / 速率限制 / CORS 开关", () => {
      const p = makeProps();
      render(<SecuritySection {...p} />);
      fireEvent.click(rowOf("多因素认证 (MFA)").querySelector("button")!);
      fireEvent.click(rowOf("审计日志").querySelector("button")!);
      fireEvent.click(rowOf("API 速率限制").querySelector("button")!);
      fireEvent.click(rowOf("CORS 跨域").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("mfa");
      expect(p.toggleSetting).toHaveBeenCalledWith("auditLog");
      expect(p.toggleSetting).toHaveBeenCalledWith("rateLimiting");
      expect(p.toggleSetting).toHaveBeenCalledWith("corsEnabled");
    });

    it("切换会话超时应触发 updateValue", () => {
      const p = makeProps();
      render(<SecuritySection {...p} />);
      fireEvent.change(screen.getByDisplayValue("1 小时"), { target: { value: "240" } });
      expect(p.updateValue).toHaveBeenCalledWith("sessionTimeout", "240");
    });

    it("编辑 IP 白名单文本域应回调新值", () => {
      const p = makeProps();
      render(<SecuritySection {...p} />);
      fireEvent.change(screen.getByDisplayValue("192.168.3.0/24"), {
        target: { value: "10.0.0.0/8" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("ipWhitelist", "10.0.0.0/8");
    });
  });

  describe("NotificationSection", () => {
    it("应渲染通知配置区块", () => {
      render(<NotificationSection {...makeProps()} />);
      expect(screen.getByText("通知配置")).toBeInTheDocument();
      expect(screen.getByText("邮件通知")).toBeInTheDocument();
      expect(screen.getByText("Slack 通知")).toBeInTheDocument();
      expect(screen.getByText("GPU 使用率告警阈值")).toBeInTheDocument();
      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.getByText("80°C")).toBeInTheDocument();
    });

    it("切换邮件/Slack 通知开关", () => {
      const p = makeProps();
      render(<NotificationSection {...p} />);
      fireEvent.click(rowOf("邮件通知").querySelector("button")!);
      fireEvent.click(rowOf("Slack 通知").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("alertEmail");
      expect(p.toggleSetting).toHaveBeenCalledWith("alertSlack");
    });

    it("拖动阈值滑块应触发 updateValue", () => {
      const p = makeProps();
      render(<NotificationSection {...p} />);
      const sliders = screen.getAllByRole("slider");
      fireEvent.change(sliders[0], { target: { value: "95" } });
      fireEvent.change(sliders[1], { target: { value: "75" } });
      expect(p.updateValue).toHaveBeenCalledWith("alertGpuThreshold", "95");
      expect(p.updateValue).toHaveBeenCalledWith("alertTempThreshold", "75");
    });

    it("编辑通知邮箱与 Webhook 应回调新值", () => {
      const p = makeProps();
      render(<NotificationSection {...p} />);
      fireEvent.click(rowOf("通知邮箱").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("admin@yyc3.vip"), {
        target: { value: "ops@yyc3.vip" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("alertEmailAddr", "ops@yyc3.vip");

      fireEvent.click(rowOf("Webhook URL").querySelector("button")!);
      fireEvent.change(screen.getByPlaceholderText("https://hooks.slack.com/..."), {
        target: { value: "https://hooks.slack.com/x" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("webhookUrl", "https://hooks.slack.com/x");
    });
  });

  describe("AdvancedSection", () => {
    it("应渲染高级设置区块与 API 端点配置", () => {
      render(<AdvancedSection {...makeProps()} />);
      expect(screen.getByText("高级设置")).toBeInTheDocument();
      expect(screen.getByTestId("api-endpoint-config")).toBeInTheDocument();
      expect(screen.getByText("调试模式")).toBeInTheDocument();
      expect(screen.getByText("危险操作")).toBeInTheDocument();
    });

    it("切换调试模式/性能日志/自动更新开关", () => {
      const p = makeProps();
      render(<AdvancedSection {...p} />);
      fireEvent.click(rowOf("调试模式").querySelector("button")!);
      fireEvent.click(rowOf("性能日志").querySelector("button")!);
      fireEvent.click(rowOf("自动更新").querySelector("button")!);
      expect(p.toggleSetting).toHaveBeenCalledWith("debugMode");
      expect(p.toggleSetting).toHaveBeenCalledWith("performanceLog");
      expect(p.toggleSetting).toHaveBeenCalledWith("autoUpdate");
    });

    it("切换日志级别应触发 updateValue", () => {
      const p = makeProps();
      render(<AdvancedSection {...p} />);
      fireEvent.change(screen.getByDisplayValue("Info"), { target: { value: "debug" } });
      expect(p.updateValue).toHaveBeenCalledWith("logLevel", "debug");
    });

    it("编辑日志保留天数/最大并发数应回调新值", () => {
      const p = makeProps();
      render(<AdvancedSection {...p} />);
      fireEvent.click(rowOf("日志保留天数").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("30"), { target: { value: "90" } });
      expect(p.updateValue).toHaveBeenCalledWith("logRetention", "90");

      fireEvent.click(rowOf("最大并发数").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("100"), { target: { value: "200" } });
      expect(p.updateValue).toHaveBeenCalledWith("maxConcurrency", "200");
    });

    it("应渲染危险操作双按钮", () => {
      render(<AdvancedSection {...makeProps()} />);
      expect(screen.getByText("重置所有设置为默认值")).toBeInTheDocument();
      expect(screen.getByText("清除所有缓存数据")).toBeInTheDocument();
    });

    it("编辑高级区缓存大小/缓存 TTL 应回调新值", () => {
      const p = makeProps();
      render(<AdvancedSection {...p} />);
      fireEvent.click(rowOf("缓存大小 (MB)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("1024"), { target: { value: "4096" } });
      expect(p.updateValue).toHaveBeenCalledWith("cacheSize", "4096");

      fireEvent.click(rowOf("缓存 TTL (秒)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("3600"), { target: { value: "7200" } });
      expect(p.updateValue).toHaveBeenCalledWith("cacheTTL", "7200");
    });
  });
});

// ============================================================
// 扩展覆盖 (覆盖率补测 A 域)
// ============================================================

describe("settings 扩展覆盖", () => {
  describe("shared/EditableField 分支", () => {
    it("再次点击编辑按钮应退出编辑态恢复展示", () => {
      render(<EditableField label="系统名称" value="YYC³" onChange={vi.fn()} />);
      const row = rowOf("系统名称");
      fireEvent.click(row.querySelector("button")!);
      expect(screen.getByDisplayValue("YYC³")).toBeInTheDocument();
      fireEvent.click(row.querySelector("button")!);
      expect(screen.queryByDisplayValue("YYC³")).not.toBeInTheDocument();
      expect(screen.getByText("YYC³")).toBeInTheDocument();
    });

    it("密码字段明文切换后可再次隐藏 (EyeOff 分支)", () => {
      const { container } = render(
        <EditableField label="数据库密码" value="s3cret" type="password" onChange={vi.fn()} />,
      );
      const row = rowOf("数据库密码");
      fireEvent.click(row.querySelector("button")!);
      const eyeBtn = container.querySelectorAll("button")[1];
      fireEvent.click(eyeBtn); // 显示明文
      expect(screen.getByDisplayValue("s3cret")).toHaveAttribute("type", "text");
      fireEvent.click(eyeBtn); // 再次隐藏
      expect(screen.getByDisplayValue("s3cret")).toHaveAttribute("type", "password");
    });
  });

  describe("sections-core 字段编辑", () => {
    it("GeneralSection 编辑系统名称/集群 ID 应回调", () => {
      const p = makeProps();
      render(<GeneralSection {...p} />);
      fireEvent.click(rowOf("系统名称").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("YYC³ CloudPivot"), { target: { value: "YYC³ X" } });
      expect(p.updateValue).toHaveBeenCalledWith("systemName", "YYC³ X");

      fireEvent.click(rowOf("集群 ID").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("cpim-001"), { target: { value: "cpim-9" } });
      expect(p.updateValue).toHaveBeenCalledWith("clusterId", "cpim-9");
    });

    it("NetworkSection 应渲染数据库地址与网络状态", () => {
      render(<NetworkSection {...makeProps()} />);
      expect(screen.getByText("数据库地址")).toBeInTheDocument();
      expect(screen.getByText("localhost:5433")).toBeInTheDocument();
      expect(screen.getByText("网络状态")).toBeInTheDocument();
      expect(screen.getByText("已连接")).toBeInTheDocument();
    });

    it("ClusterSection 编辑健康检查间隔/扩容/缩容阈值应回调", () => {
      const p = makeProps();
      render(<ClusterSection {...p} />);
      fireEvent.click(rowOf("健康检查间隔 (秒)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("30"), { target: { value: "60" } });
      expect(p.updateValue).toHaveBeenCalledWith("healthCheckInterval", "60");

      fireEvent.click(rowOf("扩容阈值 (%)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("85"), { target: { value: "90" } });
      expect(p.updateValue).toHaveBeenCalledWith("scaleUpThreshold", "90");

      fireEvent.click(rowOf("缩容阈值 (%)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "15" } });
      expect(p.updateValue).toHaveBeenCalledWith("scaleDownThreshold", "15");
    });
  });

  describe("sections-connect 字段编辑", () => {
    it("WebSocketSection 编辑重连间隔/最大重连/心跳间隔应回调", () => {
      const p = makeProps();
      render(<WebSocketSection {...p} />);
      fireEvent.click(rowOf("重连间隔 (ms)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("3000"), { target: { value: "5000" } });
      expect(p.updateValue).toHaveBeenCalledWith("wsReconnectInterval", "5000");

      fireEvent.click(rowOf("最大重连次数").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("10"), { target: { value: "20" } });
      expect(p.updateValue).toHaveBeenCalledWith("wsMaxReconnect", "20");

      fireEvent.click(rowOf("心跳间隔 (ms)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("15000"), { target: { value: "20000" } });
      expect(p.updateValue).toHaveBeenCalledWith("wsHeartbeatInterval", "20000");
    });

    it("AISection 编辑 Base URL/温度/Top-P/最大 Token/超时应回调", () => {
      const p = makeProps();
      render(<AISection {...p} />);
      fireEvent.click(rowOf("API Base URL").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("https://api.openai.com/v1"), {
        target: { value: "https://api.example.com/v1" },
      });
      expect(p.updateValue).toHaveBeenCalledWith("aiBaseUrl", "https://api.example.com/v1");

      fireEvent.click(rowOf("温度 (Temperature)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("0.7"), { target: { value: "0.3" } });
      expect(p.updateValue).toHaveBeenCalledWith("aiTemperature", "0.3");

      fireEvent.click(rowOf("Top-P (核采样)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("0.9"), { target: { value: "0.8" } });
      expect(p.updateValue).toHaveBeenCalledWith("aiTopP", "0.8");

      fireEvent.click(rowOf("最大 Token").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("4096"), { target: { value: "8192" } });
      expect(p.updateValue).toHaveBeenCalledWith("aiMaxTokens", "8192");

      fireEvent.click(rowOf("API 超时 (ms)").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("30000"), { target: { value: "60000" } });
      expect(p.updateValue).toHaveBeenCalledWith("aiTimeout", "60000");
    });

    it("AISection 可用模型含本地标记前缀", () => {
      render(<AISection {...makeProps()} />);
      expect(screen.getByText("🟢 LLaMA-3")).toBeInTheDocument();
    });

    it("EnvSection 编辑端口/名称/用户名/密码应回调", () => {
      const p = makeProps();
      render(<EnvSection {...p} />);
      fireEvent.click(rowOf("数据库端口").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("5433"), { target: { value: "5432" } });
      expect(p.updateValue).toHaveBeenCalledWith("dbPort", "5432");

      fireEvent.click(rowOf("数据库名称").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("yyc3_matrix"), { target: { value: "yyc3" } });
      expect(p.updateValue).toHaveBeenCalledWith("dbName", "yyc3");

      fireEvent.click(rowOf("数据库用户名").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("admin"), { target: { value: "root" } });
      expect(p.updateValue).toHaveBeenCalledWith("dbUser", "root");

      fireEvent.click(rowOf("数据库密码").querySelector("button")!);
      fireEvent.change(screen.getByDisplayValue("pwd"), { target: { value: "new-pwd" } });
      expect(p.updateValue).toHaveBeenCalledWith("dbPassword", "new-pwd");
    });
  });
});
