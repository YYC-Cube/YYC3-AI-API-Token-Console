/**
 * NetworkConfig.test.tsx
 * =======================
 * NetworkConfig 组件测试
 *
 * 覆盖范围:
 * - open=false 时不渲染
 * - Modal 基础渲染 (标题/关闭按钮)
 * - 3 Tab 渲染与切换 (自动检测/WiFi/手动)
 * - 自动检测: IP/接口列表/网络状态
 * - WiFi: 网络信息
 * - 手动配置: 服务器地址/端口/NAS/WebSocket URL
 * - 测试连接按钮
 * - 保存/重置按钮
 * - StatusBadge 不同状态
 * - 关闭按钮和遮罩点击
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { toast } from "sonner";
import {
  getWifiAutoReconnectConfig,
  wifiAutoReconnectStore,
  wifiNetworkStore,
  type WifiNetwork,
} from "../stores/dashboard-stores";

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockUpdateConfig = vi.fn();
const mockSave = vi.fn();
const mockReset = vi.fn();
const mockDetectNetwork = vi.fn();
const mockTestConnection = vi.fn().mockResolvedValue({ success: true, latency: 42 });

let mockHookState: any;

vi.mock("../hooks/useNetworkConfig", () => ({
  useNetworkConfig: () => mockHookState,
}));

import { NetworkConfig } from "../components/NetworkConfig";

function defaultHookState() {
  return {
    config: {
      mode: "auto",
      serverAddress: "192.168.3.45",
      port: "3113",
      nasAddress: "192.168.3.45:9898",
      wsUrl: "ws://192.168.3.45:3113/ws",
    },
    interfaces: [
      { name: "en0", type: "WiFi", ip: "192.168.3.100", status: "active" },
      { name: "en1", type: "Ethernet", ip: "10.0.0.5", status: "inactive" },
    ],
    localIP: "192.168.3.100",
    testStatus: "idle" as const,
    testLatency: 0,
    testError: "",
    detecting: false,
    updateConfig: mockUpdateConfig,
    save: mockSave,
    reset: mockReset,
    detectNetwork: mockDetectNetwork,
    testConnection: mockTestConnection,
  };
}

const defaultProps = { open: true, onClose: vi.fn() };

function addWifiNetwork(overrides: Partial<WifiNetwork> & { ssid: string }) {
  return wifiNetworkStore.add({
    ssid: overrides.ssid,
    signal: overrides.signal ?? 80,
    security: overrides.security ?? "WPA2",
    connected: overrides.connected ?? false,
    password: overrides.password,
    lastConnectedAt: overrides.lastConnectedAt,
  });
}

describe("NetworkConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = defaultHookState();
    // 测试数据自包含: 每个用例前重建 WiFi 存储 (内存缓存 + localStorage 同步重置)
    wifiNetworkStore.reset();
    wifiAutoReconnectStore.reset();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => true });
    vi.useRealTimers();
  });

  describe("显示/隐藏", () => {
    it("open=false 时不渲染任何内容", () => {
      const { container } = render(<NetworkConfig open={false} onClose={vi.fn()} />);
      expect(container.innerHTML).toBe("");
    });

    it("open=true 时应渲染 Modal", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("网络连接配置")).toBeInTheDocument();
    });
  });

  describe("基础渲染", () => {
    it("应渲染标题", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("网络连接配置")).toBeInTheDocument();
    });

    it("应渲染 3 个 Tab", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("自动检测")).toBeInTheDocument();
      expect(screen.getByText("WiFi 配置")).toBeInTheDocument();
      expect(screen.getByText("手动配置")).toBeInTheDocument();
      expect(screen.getByText("连接历史")).toBeInTheDocument();
    });

    it("应渲染测试连接按钮", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("测试连接")).toBeInTheDocument();
    });

    it("应渲染保存配置按钮", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("保存配置")).toBeInTheDocument();
    });

    it("应渲染重置默认按钮", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("重置默认")).toBeInTheDocument();
    });
  });

  describe("自动检测 Tab", () => {
    it("默认显示自动检测内容", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("自动检测 (WebRTC)")).toBeInTheDocument();
    });

    it("应显示本机 IP", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("本机 IP")).toBeInTheDocument();
      // localIP 和 interfaces[0].ip 相同，使用 getAllByText
      expect(screen.getAllByText("192.168.3.100").length).toBeGreaterThan(0);
    });

    it("应显示网络接口列表", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText(/en0/)).toBeInTheDocument();
      expect(screen.getByText(/en1/)).toBeInTheDocument();
    });

    it("应渲染刷新检测按钮", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("刷新检测")).toBeInTheDocument();
    });

    it("点击刷新检测应调用 detectNetwork", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("刷新检测"));
      expect(mockDetectNetwork).toHaveBeenCalled();
    });

    it("检测中时刷新按钮应禁用", () => {
      mockHookState.detecting = true;
      render(<NetworkConfig {...defaultProps} />);
      const btn = screen.getByText("刷新检测").closest("button")!;
      expect(btn).toBeDisabled();
    });
  });

  describe("WiFi Tab", () => {
    it("切换到 WiFi Tab 应显示 WiFi 内容", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(screen.getByText("WiFi 网络信息")).toBeInTheDocument();
    });

    it("WiFi Tab 应显示网络状态信息", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(screen.getByText("网络状态")).toBeInTheDocument();
      expect(screen.getByText("连接类型")).toBeInTheDocument();
    });

    it("切换 Tab 应调用 updateConfig", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(mockUpdateConfig).toHaveBeenCalledWith({ mode: "wifi" });
    });
  });

  describe("手动配置 Tab", () => {
    it("切换到手动配置 Tab 应显示输入框", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("手动配置"));
      expect(screen.getByText("服务器地址")).toBeInTheDocument();
      expect(screen.getByText("端口")).toBeInTheDocument();
      expect(screen.getByText("NAS 地址")).toBeInTheDocument();
      expect(screen.getByText("WebSocket URL")).toBeInTheDocument();
    });

    it("应渲染服务器地址输入框并可编辑", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("手动配置"));
      const serverInput = screen.getByDisplayValue("192.168.3.45");
      fireEvent.change(serverInput, { target: { value: "10.0.0.1" } });
      expect(mockUpdateConfig).toHaveBeenCalledWith({ serverAddress: "10.0.0.1" });
    });

    it("应渲染端口输入框", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("手动配置"));
      expect(screen.getByDisplayValue("3113")).toBeInTheDocument();
    });

    it("应渲染 WebSocket URL", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("手动配置"));
      expect(screen.getByDisplayValue("ws://192.168.3.45:3113/ws")).toBeInTheDocument();
    });

    it("切换手动配置 Tab 应调用 updateConfig", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("手动配置"));
      expect(mockUpdateConfig).toHaveBeenCalledWith({ mode: "manual" });
    });
  });

  describe("测试连接", () => {
    it("点击测试连接应调用 testConnection", async () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("测试连接"));
      await waitFor(() => expect(mockTestConnection).toHaveBeenCalled());
    });

    it("测试中时按钮应禁用", () => {
      mockHookState.testStatus = "testing";
      render(<NetworkConfig {...defaultProps} />);
      const btn = screen.getByText("测试连接").closest("button")!;
      expect(btn).toBeDisabled();
    });

    it("测试成功应显示连接成功状态", () => {
      mockHookState.testStatus = "success";
      mockHookState.testLatency = 42;
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("连接成功")).toBeInTheDocument();
      expect(screen.getByText("延迟: 42ms")).toBeInTheDocument();
    });

    it("测试失败应显示连接失败状态", () => {
      mockHookState.testStatus = "failed";
      mockHookState.testError = "Connection refused";
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("连接失败")).toBeInTheDocument();
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });

    it("idle 状态不显示状态徽标", () => {
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.queryByText("连接成功")).not.toBeInTheDocument();
      expect(screen.queryByText("连接失败")).not.toBeInTheDocument();
      expect(screen.queryByText("测试中...")).not.toBeInTheDocument();
    });
  });

  describe("保存和重置", () => {
    it("点击保存应调用 save", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("保存配置"));
      expect(mockSave).toHaveBeenCalled();
    });

    it("点击重置应调用 reset", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("重置默认"));
      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe("关闭", () => {
    it("点击关闭按钮应调用 onClose", () => {
      render(<NetworkConfig {...defaultProps} />);
      // Close button is in the header bar, sibling of the title wrapper
      const headerBar = screen.getByText("网络连接配置").closest(".flex.items-center.justify-between")!;
      const closeBtn = headerBar.querySelector("button");
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });

    it("点击遮罩应调用 onClose", () => {
      render(<NetworkConfig {...defaultProps} />);
      // Backdrop div
      const backdrop = screen.getByText("网络连接配置").closest(".fixed")?.querySelector(".absolute");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });
  });

  describe("连接历史 Tab", () => {
    it("切换到连接历史 Tab 应显示内容", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      expect(screen.getByText("自动重连设置")).toBeInTheDocument();
      expect(screen.getByText("连接历史记录")).toBeInTheDocument();
    });

    it("应显示自动重连设置项", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      expect(screen.getByText("自动重连")).toBeInTheDocument();
      expect(screen.getByText("优先网络")).toBeInTheDocument();
      expect(screen.getByText("重连间隔")).toBeInTheDocument();
      expect(screen.getByText("最大重试次数")).toBeInTheDocument();
    });

    it("无历史记录时应显示提示", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      expect(screen.getByText("暂无连接历史记录")).toBeInTheDocument();
    });
  });

  describe("WiFi 扫描与连接", () => {
    it("WiFi 列表为空时应显示扫描引导提示", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(screen.getByText(/请点击"扫描网络"发现可用 WiFi/)).toBeInTheDocument();
    });

    it("点击扫描网络应填充 6 个模拟网络", async () => {
      vi.useFakeTimers();
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      fireEvent.click(screen.getByText("扫描网络"));
      // 扫描中按钮禁用
      expect(screen.getByText("扫描网络").closest("button")).toBeDisabled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(screen.getByText("YYC3-Matrix-5G")).toBeInTheDocument();
      expect(screen.getByText("MacStudio-Hotspot")).toBeInTheDocument();
      expect(screen.getByText("EdgeNode-WiFi")).toBeInTheDocument();
      expect(wifiNetworkStore.getAll()).toHaveLength(6);
      expect(toast.success).toHaveBeenCalledWith("扫描完成，发现 6 个网络", expect.anything());
    });

    it("重新扫描应保留已连接状态与密码", async () => {
      vi.useFakeTimers();
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      fireEvent.click(screen.getByText("扫描网络"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      // 连接 YYC3-Matrix-5G 并输入密码
      const matrixRow = screen.getByText("YYC3-Matrix-5G").closest("div.flex.items-center.justify-between") as HTMLElement;
      fireEvent.click(within(matrixRow).getByText("连接"));
      const panel = screen.getByPlaceholderText("WiFi 密码").parentElement!;
      fireEvent.change(screen.getByPlaceholderText("WiFi 密码"), { target: { value: "pw-123" } });
      fireEvent.click(within(panel).getByText("连接"));
      const connected = wifiNetworkStore.getAll().find((n) => n.ssid === "YYC3-Matrix-5G")!;
      expect(connected.connected).toBe(true);
      // 再次扫描, 已连接状态与密码应被合并保留
      fireEvent.click(screen.getByText("扫描网络"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      const preserved = wifiNetworkStore.getAll().find((n) => n.ssid === "YYC3-Matrix-5G")!;
      expect(preserved.connected).toBe(true);
      expect(preserved.password).toBe("pw-123");
    });

    it("连接 WiFi: 输入密码后应持久化连接状态", () => {
      addWifiNetwork({ ssid: "Home-WiFi", signal: 90 });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(screen.getByText("Home-WiFi")).toBeInTheDocument();
      fireEvent.click(screen.getByText("连接"));
      expect(screen.getByText("输入密码")).toBeInTheDocument();
      const panel = screen.getByPlaceholderText("WiFi 密码").parentElement!;
      fireEvent.change(screen.getByPlaceholderText("WiFi 密码"), { target: { value: "pw-123" } });
      fireEvent.click(within(panel).getByText("连接"));
      const stored = wifiNetworkStore.getAll().find((n) => n.ssid === "Home-WiFi")!;
      expect(stored.connected).toBe(true);
      expect(stored.password).toBe("pw-123");
      expect(stored.lastConnectedAt).toBeGreaterThan(0);
      expect(screen.getByText("断开")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("已连接到 Home-WiFi", expect.anything());
    });

    it("未输入密码时应保留已有密码连接", () => {
      addWifiNetwork({ ssid: "Home-WiFi", password: "old-pw" });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      fireEvent.click(screen.getByText("连接"));
      const panel = screen.getByPlaceholderText("WiFi 密码").parentElement!;
      fireEvent.click(within(panel).getByText("连接"));
      const stored = wifiNetworkStore.getAll().find((n) => n.ssid === "Home-WiFi")!;
      expect(stored.connected).toBe(true);
      expect(stored.password).toBe("old-pw");
    });

    it("连接新网络应断开其他已连接网络", () => {
      addWifiNetwork({ ssid: "Net-A", connected: true });
      addWifiNetwork({ ssid: "Net-B" });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      fireEvent.click(screen.getByText("连接"));
      const panel = screen.getByPlaceholderText("WiFi 密码").parentElement!;
      fireEvent.click(within(panel).getByText("连接"));
      const a = wifiNetworkStore.getAll().find((n) => n.ssid === "Net-A")!;
      const b = wifiNetworkStore.getAll().find((n) => n.ssid === "Net-B")!;
      expect(a.connected).toBe(false);
      expect(b.connected).toBe(true);
    });

    it("断开 WiFi 应更新状态并提示", () => {
      addWifiNetwork({ ssid: "Home-WiFi", connected: true, password: "pw" });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("WiFi 配置"));
      fireEvent.click(screen.getByText("断开"));
      expect(wifiNetworkStore.getAll()[0].connected).toBe(false);
      expect(toast.info).toHaveBeenCalledWith("已断开 Home-WiFi");
    });
  });

  describe("连接历史 Tab 交互", () => {
    it("应显示当前连接卡片与历史记录统计", () => {
      addWifiNetwork({ ssid: "Live", connected: true, signal: 88, security: "WPA3", lastConnectedAt: Date.now() - 1000 });
      addWifiNetwork({ ssid: "Old", lastConnectedAt: 1000 });
      addWifiNetwork({ ssid: "Never-Seen" }); // 无 lastConnectedAt 且未连接 → 不出现在历史
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      expect(screen.getByText("当前连接")).toBeInTheDocument();
      expect(screen.getByText("2 条记录")).toBeInTheDocument();
      // Live 同时出现在"当前连接"卡片与历史列表
      expect(screen.getAllByText("Live")).toHaveLength(2);
      expect(screen.getByText("Old")).toBeInTheDocument();
      expect(screen.queryByText("Never-Seen")).not.toBeInTheDocument();
    });

    it("点击重连应重新连接历史网络", () => {
      addWifiNetwork({ ssid: "Old", lastConnectedAt: 1000 });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      fireEvent.click(screen.getByText("重连"));
      expect(wifiNetworkStore.getAll()[0].connected).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("已连接到 Old", expect.anything());
    });

    it("已连接的历史条目按钮应禁用", () => {
      addWifiNetwork({ ssid: "Live", connected: true, lastConnectedAt: 1000 });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      expect(screen.getByText("已连接").closest("button")).toBeDisabled();
    });

    it("自动重连开关应持久化并翻转提示标题", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      fireEvent.click(screen.getByTitle("已启用 - 点击关闭"));
      expect(getWifiAutoReconnectConfig().enabled).toBe(false);
      expect(screen.getByTitle("已关闭 - 点击启用")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("自动重连设置已保存", expect.anything());
    });

    it("优先信号最强开关应持久化", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      fireEvent.click(screen.getByTitle("已启用"));
      expect(getWifiAutoReconnectConfig().preferStrongestSignal).toBe(false);
    });

    it("优先网络 SSID 输入应持久化", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      fireEvent.change(screen.getByPlaceholderText("自动"), { target: { value: "YYC3-Matrix-5G" } });
      expect(getWifiAutoReconnectConfig().preferredSsid).toBe("YYC3-Matrix-5G");
    });

    it("重连间隔 +/- 按钮应更新并持久化", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      const intervalRow = screen.getByText("重连间隔").closest("div")!;
      fireEvent.click(within(intervalRow).getByText("-"));
      expect(screen.getByText("4s")).toBeInTheDocument();
      expect(getWifiAutoReconnectConfig().intervalSeconds).toBe(4);
      fireEvent.click(within(intervalRow).getByText("+"));
      expect(screen.getByText("5s")).toBeInTheDocument();
    });

    it("最大重试次数 +/- 按钮应更新并持久化", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("连接历史"));
      const retryRow = screen.getByText("最大重试次数").closest("div")!;
      fireEvent.click(within(retryRow).getByText("-"));
      expect(screen.getByText("9")).toBeInTheDocument();
      expect(getWifiAutoReconnectConfig().maxRetries).toBe(9);
      fireEvent.click(within(retryRow).getByText("+"));
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  describe("Toast 反馈", () => {
    it("测试连接成功应 toast.success 并带延迟", async () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("测试连接"));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("连接成功 (42ms)", expect.anything())
      );
    });

    it("测试连接失败应 toast.error", async () => {
      mockTestConnection.mockResolvedValueOnce({ success: false, error: "握手超时" });
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("测试连接"));
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("连接失败: 握手超时", expect.anything())
      );
    });

    it("保存配置应 toast.success", () => {
      render(<NetworkConfig {...defaultProps} />);
      fireEvent.click(screen.getByText("保存配置"));
      expect(mockSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("网络配置已保存", expect.anything());
    });
  });

  describe("离线状态", () => {
    it("navigator 离线时应显示未连接状态", () => {
      Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
      render(<NetworkConfig {...defaultProps} />);
      expect(screen.getByText("网络未连接")).toBeInTheDocument();
      fireEvent.click(screen.getByText("WiFi 配置"));
      expect(screen.getByText("未连接")).toBeInTheDocument();
    });
  });
});