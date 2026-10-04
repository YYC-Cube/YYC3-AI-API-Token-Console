/**
 * network-utils.test.ts
 * ======================
 * YYC³ 网络工具函数 - 单元测试
 *
 * 测试框架: Vitest
 * 运行命令: npx vitest run src/app/__tests__/network-utils.test.ts
 *
 * 覆盖范围:
 * - 网络配置 CRUD（localStorage 读写）
 * - WebSocket URL 自动生成
 * - 默认值常量校验
 * - 连接测试超时逻辑
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NETWORK_CONFIG,
  generateWsUrl,
  getLocalIP,
  getNetworkInterfaces,
  loadNetworkConfig,
  resetNetworkConfig,
  saveNetworkConfig,
  testHTTPConnection,
  testWebSocketConnection
} from "../lib/network-utils";
import type { NetworkConfig } from "../types";

// ============================================================
// Mock localStorage
// ============================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// ============================================================
// Tests
// ============================================================

describe("network-utils", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // DEFAULT_NETWORK_CONFIG
  // ----------------------------------------------------------

  describe("DEFAULT_NETWORK_CONFIG", () => {
    it("应包含正确的默认服务器地址", () => {
      expect(DEFAULT_NETWORK_CONFIG.serverAddress).toBe("192.168.3.45");
    });

    it("应包含正确的默认端口", () => {
      expect(DEFAULT_NETWORK_CONFIG.port).toBe("3113");
    });

    it("应包含正确的默认 NAS 地址", () => {
      expect(DEFAULT_NETWORK_CONFIG.nasAddress).toBe("192.168.3.45:9898");
    });

    it("应包含正确的默认 WebSocket URL", () => {
      expect(DEFAULT_NETWORK_CONFIG.wsUrl).toBe("ws://192.168.3.45:3113/ws");
    });

    it("默认模式应为 auto", () => {
      expect(DEFAULT_NETWORK_CONFIG.mode).toBe("auto");
    });
  });

  // ----------------------------------------------------------
  // loadNetworkConfig
  // ----------------------------------------------------------

  describe("loadNetworkConfig", () => {
    it("localStorage 为空时应返回默认配置", () => {
      const config = loadNetworkConfig();
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });

    it("应正确读取已保存的配置", () => {
      const custom: NetworkConfig = {
        serverAddress: "10.0.0.1",
        port: "8080",
        nasAddress: "10.0.0.2:9898",
        wsUrl: "ws://10.0.0.1:8080/ws",
        mode: "manual",
      };
      localStorageMock.setItem("network_config", JSON.stringify(custom));

      const config = loadNetworkConfig();
      expect(config.serverAddress).toBe("10.0.0.1");
      expect(config.port).toBe("8080");
      expect(config.mode).toBe("manual");
    });

    it("localStorage 数据损坏时应返回默认配置", () => {
      localStorageMock.setItem("network_config", "invalid-json{{{");
      const config = loadNetworkConfig();
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });

    it("部分配置缺失时应合并默认值", () => {
      localStorageMock.setItem("network_config", JSON.stringify({ port: "9999" }));
      const config = loadNetworkConfig();
      expect(config.port).toBe("9999");
      expect(config.serverAddress).toBe(DEFAULT_NETWORK_CONFIG.serverAddress);
    });

    it("localStorage 读取异常时应返回默认配置", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("access denied");
      });
      const config = loadNetworkConfig();
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });
  });

  // ----------------------------------------------------------
  // saveNetworkConfig
  // ----------------------------------------------------------

  describe("saveNetworkConfig", () => {
    it("应将配置保存到 localStorage", () => {
      const config: NetworkConfig = {
        ...DEFAULT_NETWORK_CONFIG,
        serverAddress: "172.16.0.100",
      };
      saveNetworkConfig(config);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "network_config",
        expect.any(String)
      );

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.serverAddress).toBe("172.16.0.100");
    });
  });

  // ----------------------------------------------------------
  // resetNetworkConfig
  // ----------------------------------------------------------

  describe("resetNetworkConfig", () => {
    it("应清除 localStorage 中的配置", () => {
      saveNetworkConfig({ ...DEFAULT_NETWORK_CONFIG, port: "1234" });
      const config = resetNetworkConfig();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("network_config");
      expect(config).toEqual(DEFAULT_NETWORK_CONFIG);
    });
  });

  // ----------------------------------------------------------
  // generateWsUrl
  // ----------------------------------------------------------

  describe("generateWsUrl", () => {
    it("应根据地址和端口生成正确的 WebSocket URL", () => {
      expect(generateWsUrl("192.168.1.1", "3113")).toBe("ws://192.168.1.1:3113/ws");
    });

    it("应处理 localhost", () => {
      expect(generateWsUrl("localhost", "8080")).toBe("ws://localhost:8080/ws");
    });

    it("应处理 IP v4 地址", () => {
      expect(generateWsUrl("10.0.0.1", "443")).toBe("ws://10.0.0.1:443/ws");
    });
  });

  // ----------------------------------------------------------
  // testWebSocketConnection
  // ----------------------------------------------------------

  describe("testWebSocketConnection", () => {
    it("连接不可达时应返回失败结果", async () => {
      // Mock WebSocket 构造函数
      const MockWS = vi.fn().mockImplementation(() => {
        const ws = {
          onopen: null as any,
          onerror: null as any,
          onclose: null as any,
          close: vi.fn(),
        };
        // 模拟连接错误
        setTimeout(() => ws.onerror?.(), 10);
        return ws;
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://invalid:9999/ws", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      vi.unstubAllGlobals();
    });

    it("超时时应返回超时错误", async () => {
      // 必须用 function 形式 — 箭头函数不可 new, 构造调用落入 catch 返回构造错误
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://slow:9999/ws", 50);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接超时");

      vi.unstubAllGlobals();
    });

    it("连接成功时应返回成功结果和延迟", async () => {
      // 必须用 function 形式 — 箭头函数不可 new, 构造调用落入 catch 返回构造错误
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => this.onopen?.(), 5);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://localhost:3113/ws", 1000);
      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);

      vi.unstubAllGlobals();
    });
  });

  // ----------------------------------------------------------
  // testWebSocketConnection 补充分支
  // ----------------------------------------------------------

  describe("testWebSocketConnection 补充分支", () => {
    it("WebSocket 全局不可用时返回构造错误", async () => {
      vi.stubGlobal("WebSocket", undefined);
      const result = await testWebSocketConnection("ws://x:1/ws", 500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("WebSocket 不可用");
      vi.unstubAllGlobals();
    });

    it("构造函数抛出非 Error 时返回网络不可达", async () => {
      const MockWS = vi.fn(function () {
        throw "boom";
      });
      vi.stubGlobal("WebSocket", MockWS);
      const result = await testWebSocketConnection("ws://x:2/ws", 500);
      expect(result.success).toBe(false);
      expect(result.error).toBe("网络不可达");
      vi.unstubAllGlobals();
    });

    it("onclose 携带 reason 时透传原因", async () => {
      // 必须用 function 形式 — 箭头函数不可 new, 构造调用落入 catch 返回构造错误
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => this.onclose?.({ reason: "server restarted" }), 5);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://x:3/ws", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("server restarted");

      vi.unstubAllGlobals();
    });

    it("onerror 触发时返回连接被拒绝", async () => {
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => this.onerror?.(), 5);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://x:6/ws", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接被拒绝");

      vi.unstubAllGlobals();
    });

    it("onclose 无 reason 时返回默认关闭文案", async () => {
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => this.onclose?.({}), 5);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://x:4/ws", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接已关闭");

      vi.unstubAllGlobals();
    });

    it("超时后迟到的回调不再改变结果", async () => {
      const MockWS = vi.fn(function (this: any) {
        this.onopen = null;
        this.onerror = null;
        this.onclose = null;
        this.close = vi.fn();
        setTimeout(() => {
          this.onopen?.();
          this.onerror?.();
          this.onclose?.({ reason: "late" });
        }, 60);
      });
      vi.stubGlobal("WebSocket", MockWS);

      const result = await testWebSocketConnection("ws://x:5/ws", 20);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接超时");
      // 等待迟到事件全部触发（覆盖 resolved 守卫的 false 分支）
      await new Promise((resolve) => setTimeout(resolve, 80));

      vi.unstubAllGlobals();
    });
  });

  // ----------------------------------------------------------
  // getLocalIP — WebRTC 本机 IP 检测
  // ----------------------------------------------------------

  describe("getLocalIP", () => {
    it("WebRTC 不可用时回退 127.0.0.1", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      await expect(getLocalIP()).resolves.toBe("127.0.0.1");
      vi.unstubAllGlobals();
    });

    it("SDP 含本机 IP 时返回解析结果", async () => {
      class FakePC {
        createDataChannel = vi.fn();
        createOffer = vi.fn().mockResolvedValue({ sdp: "v=0\r\nc=IN IP4 192.168.31.7\r\n" });
        setLocalDescription = vi.fn().mockResolvedValue(undefined);
        close = vi.fn();
      }
      vi.stubGlobal("RTCPeerConnection", FakePC);
      await expect(getLocalIP()).resolves.toBe("192.168.31.7");
      vi.unstubAllGlobals();
    });

    it("SDP 为 0.0.0.0 时回退 127.0.0.1", async () => {
      class FakePC {
        createDataChannel = vi.fn();
        createOffer = vi.fn().mockResolvedValue({ sdp: "c=IN IP4 0.0.0.0" });
        setLocalDescription = vi.fn().mockResolvedValue(undefined);
        close = vi.fn();
      }
      vi.stubGlobal("RTCPeerConnection", FakePC);
      await expect(getLocalIP()).resolves.toBe("127.0.0.1");
      vi.unstubAllGlobals();
    });

    it("SDP 缺失时回退 127.0.0.1", async () => {
      class FakePC {
        createDataChannel = vi.fn();
        createOffer = vi.fn().mockResolvedValue({ sdp: null });
        setLocalDescription = vi.fn().mockResolvedValue(undefined);
        close = vi.fn();
      }
      vi.stubGlobal("RTCPeerConnection", FakePC);
      await expect(getLocalIP()).resolves.toBe("127.0.0.1");
      vi.unstubAllGlobals();
    });

    it("createOffer 失败时回退 127.0.0.1", async () => {
      class FakePC {
        createDataChannel = vi.fn();
        createOffer = vi.fn().mockRejectedValue(new Error("webrtc down"));
        setLocalDescription = vi.fn().mockResolvedValue(undefined);
        close = vi.fn();
      }
      vi.stubGlobal("RTCPeerConnection", FakePC);
      await expect(getLocalIP()).resolves.toBe("127.0.0.1");
      vi.unstubAllGlobals();
    });
  });

  // ----------------------------------------------------------
  // getNetworkInterfaces — 网络接口信息
  // ----------------------------------------------------------

  describe("getNetworkInterfaces", () => {
    it("无 Network Information API 时返回有线以太网接口", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      vi.stubGlobal("navigator", { onLine: true });
      const list = await getNetworkInterfaces();
      expect(list).toEqual([
        { name: "en0", type: "有线以太网", ip: "127.0.0.1", status: "active" },
      ]);
      vi.unstubAllGlobals();
    });

    it("浏览器离线时接口状态为 inactive", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      vi.stubGlobal("navigator", { onLine: false });
      const list = await getNetworkInterfaces();
      expect(list[0].status).toBe("inactive");
      vi.unstubAllGlobals();
    });

    it("effectiveType 为 4g 时识别为 WiFi 并追加回环接口", async () => {
      class FakePC {
        createDataChannel = vi.fn();
        createOffer = vi.fn().mockResolvedValue({ sdp: "c=IN IP4 192.168.31.7" });
        setLocalDescription = vi.fn().mockResolvedValue(undefined);
        close = vi.fn();
      }
      vi.stubGlobal("RTCPeerConnection", FakePC);
      vi.stubGlobal("navigator", { onLine: true, connection: { effectiveType: "4g" } });

      const list = await getNetworkInterfaces();
      expect(list).toHaveLength(2);
      expect(list[0]).toEqual({ name: "wlan0", type: "WiFi", ip: "192.168.31.7", status: "active" });
      expect(list[1]).toEqual({ name: "lo0", type: "Loopback", ip: "127.0.0.1", status: "active" });

      vi.unstubAllGlobals();
    });

    it("connection.type 为 wifi 时识别为 WiFi", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      vi.stubGlobal("navigator", { onLine: true, connection: { type: "wifi" } });
      const list = await getNetworkInterfaces();
      expect(list[0].name).toBe("wlan0");
      expect(list[0].type).toBe("WiFi");
      vi.unstubAllGlobals();
    });

    it("蜂窝网络时识别为有线以太网", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      vi.stubGlobal("navigator", {
        onLine: true,
        connection: { effectiveType: "3g", type: "cellular" },
      });
      const list = await getNetworkInterfaces();
      expect(list[0].name).toBe("en0");
      expect(list[0].type).toBe("有线以太网");
      vi.unstubAllGlobals();
    });
  });

  // ----------------------------------------------------------
  // testHTTPConnection — HTTP 端点可达性
  // ----------------------------------------------------------

  describe("testHTTPConnection", () => {
    it("fetch 成功时返回成功结果", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const result = await testHTTPConnection("http://10.0.0.5:3113/health", 1000);
      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://10.0.0.5:3113/health",
        expect.objectContaining({ method: "HEAD", mode: "no-cors" })
      );

      vi.unstubAllGlobals();
    });

    it("超时中止时返回连接超时", async () => {
      const fetchMock = vi.fn((_url: unknown, init: { signal?: AbortSignal | null }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        })
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await testHTTPConnection("http://slow:1", 30);
      expect(result.success).toBe(false);
      expect(result.error).toBe("连接超时");

      vi.unstubAllGlobals();
    });

    it("普通网络错误时返回网络不可达", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const result = await testHTTPConnection("http://unreachable:1", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("网络不可达");

      vi.unstubAllGlobals();
    });

    it("非 Error 拒绝值同样返回网络不可达", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue("boom"));

      const result = await testHTTPConnection("http://unreachable:2", 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe("网络不可达");

      vi.unstubAllGlobals();
    });
  });
});
