/**
 * useNetworkConfig.test.tsx
 * =========================
 * 网络连接配置管理 Hook 测试
 *
 * 覆盖范围:
 * - 初始状态 (loadNetworkConfig 注入配置 / 默认 localIP / idle)
 * - 挂载自动检测 (getLocalIP + getNetworkInterfaces → localIP/interfaces)
 * - 检测失败静默降级 (detecting 复位)
 * - updateConfig: serverAddress / port 变更自动重生成 wsUrl; 其他字段不重生成
 * - save / reset 持久化与恢复默认
 * - testConnection: success / failed 双路径状态机
 *
 * Mock 契约 (零外部依赖): ../lib/network-utils 整体 mock — WebRTC/WS 全部隔离
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNetworkConfig } from "../hooks/useNetworkConfig";
import {
  saveNetworkConfig,
  resetNetworkConfig,
  getLocalIP,
  getNetworkInterfaces,
  testWebSocketConnection,
} from "../lib/network-utils";

vi.mock("../lib/network-utils", () => ({
  generateWsUrl: (address: string, port: string) => `ws://${address}:${port}/ws`,
  loadNetworkConfig: () => ({
    serverAddress: "10.0.0.2",
    port: "9",
    nasAddress: "10.0.0.2:9898",
    wsUrl: "ws://10.0.0.2:9/ws",
    mode: "auto",
  }),
  saveNetworkConfig: vi.fn(),
  resetNetworkConfig: vi.fn(() => ({
    serverAddress: "192.168.3.45",
    port: "3113",
    nasAddress: "192.168.3.45:9898",
    wsUrl: "ws://192.168.3.45:3113/ws",
    mode: "auto",
  })),
  getLocalIP: vi.fn(),
  getNetworkInterfaces: vi.fn(),
  testWebSocketConnection: vi.fn(),
}));

describe("useNetworkConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocalIP).mockResolvedValue("192.168.3.10");
    vi.mocked(getNetworkInterfaces).mockResolvedValue([
      { name: "en0", address: "192.168.3.10", type: "wifi" },
    ] as never);
  });

  it("初始状态应来自 loadNetworkConfig 且检测前为默认 IP", () => {
    const { result } = renderHook(() => useNetworkConfig());
    expect(result.current.config.serverAddress).toBe("10.0.0.2");
    expect(result.current.config.wsUrl).toBe("ws://10.0.0.2:9/ws");
    expect(result.current.localIP).toBe("127.0.0.1");
    expect(result.current.interfaces).toEqual([]);
    expect(result.current.testStatus).toBe("idle");
    expect(typeof result.current.updateConfig).toBe("function");
    expect(typeof result.current.save).toBe("function");
    expect(typeof result.current.reset).toBe("function");
    expect(typeof result.current.detectNetwork).toBe("function");
    expect(typeof result.current.testConnection).toBe("function");
  });

  it("挂载后应自动检测网络并填充 localIP 与 interfaces", async () => {
    const { result } = renderHook(() => useNetworkConfig());

    await waitFor(() => {
      expect(result.current.detecting).toBe(false);
    });

    expect(getLocalIP).toHaveBeenCalledTimes(1);
    expect(getNetworkInterfaces).toHaveBeenCalledTimes(1);
    expect(result.current.localIP).toBe("192.168.3.10");
    expect(result.current.interfaces).toEqual([
      { name: "en0", address: "192.168.3.10", type: "wifi" },
    ]);
  });

  it("检测失败时应静默复位 detecting", async () => {
    vi.mocked(getLocalIP).mockRejectedValue(new Error("webrtc unavailable"));
    const { result } = renderHook(() => useNetworkConfig());

    await waitFor(() => {
      expect(result.current.detecting).toBe(false);
    });

    expect(result.current.localIP).toBe("127.0.0.1");
    expect(result.current.interfaces).toEqual([]);
  });

  it("updateConfig serverAddress 应自动重生成 wsUrl", () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => {
      result.current.updateConfig({ serverAddress: "10.1.1.1" });
    });

    expect(result.current.config.serverAddress).toBe("10.1.1.1");
    expect(result.current.config.wsUrl).toBe("ws://10.1.1.1:9/ws");
    expect(result.current.testStatus).toBe("idle");
  });

  it("updateConfig port 应自动重生成 wsUrl", () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => {
      result.current.updateConfig({ port: "7777" });
    });

    expect(result.current.config.port).toBe("7777");
    expect(result.current.config.wsUrl).toBe("ws://10.0.0.2:7777/ws");
  });

  it("updateConfig 其他字段不应改动 wsUrl", () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => {
      result.current.updateConfig({ nasAddress: "10.9.9.9:9898" });
    });

    expect(result.current.config.nasAddress).toBe("10.9.9.9:9898");
    expect(result.current.config.wsUrl).toBe("ws://10.0.0.2:9/ws");
  });

  it("save 应以当前配置调用 saveNetworkConfig", () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => {
      result.current.updateConfig({ serverAddress: "10.2.2.2" });
    });
    act(() => {
      result.current.save();
    });

    expect(saveNetworkConfig).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveNetworkConfig).mock.calls[0][0]).toMatchObject({
      serverAddress: "10.2.2.2",
      wsUrl: "ws://10.2.2.2:9/ws",
    });
  });

  it("reset 应恢复默认配置并清空测试态", () => {
    const { result } = renderHook(() => useNetworkConfig());

    act(() => {
      result.current.updateConfig({ serverAddress: "10.2.2.2" });
    });
    act(() => {
      result.current.reset();
    });

    expect(resetNetworkConfig).toHaveBeenCalledTimes(1);
    expect(result.current.config.serverAddress).toBe("192.168.3.45");
    expect(result.current.config.wsUrl).toBe("ws://192.168.3.45:3113/ws");
    expect(result.current.testStatus).toBe("idle");
    expect(result.current.testError).toBe("");
  });

  it("testConnection 成功路径: testing → success 且返回结果", async () => {
    vi.mocked(testWebSocketConnection).mockResolvedValue({
      success: true,
      latency: 12,
      error: "",
    } as never);
    const { result } = renderHook(() => useNetworkConfig());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.testConnection();
    });

    expect(testWebSocketConnection).toHaveBeenCalledWith("ws://10.0.0.2:9/ws");
    expect(result.current.testStatus).toBe("success");
    expect(result.current.testLatency).toBe(12);
    expect(result.current.testError).toBe("");
    expect(returned).toMatchObject({ success: true, latency: 12 });
  });

  it("testConnection 失败路径: 状态 failed 且写入 testError", async () => {
    vi.mocked(testWebSocketConnection).mockResolvedValue({
      success: false,
      latency: 0,
      error: "connection refused",
    } as never);
    const { result } = renderHook(() => useNetworkConfig());

    await act(async () => {
      await result.current.testConnection();
    });

    expect(result.current.testStatus).toBe("failed");
    expect(result.current.testLatency).toBe(0);
    expect(result.current.testError).toBe("connection refused");
  });
});
