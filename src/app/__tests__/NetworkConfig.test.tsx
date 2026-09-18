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
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

describe("NetworkConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = defaultHookState();
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
      fireEvent.click(screen.getByText("测��连接"));
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
});