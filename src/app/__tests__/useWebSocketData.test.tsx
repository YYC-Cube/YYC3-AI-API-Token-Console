/**
 * useWebSocketData.test.tsx
 * ===========================
 * useWebSocketData Hook - WebSocket 实时数据链路测试
 *
 * 覆盖范围:
 * - 初始状态快照 (默认指标 / nodeStore 节点)
 * - onopen / onmessage 各消息类型路由 (qps/latency/node_status/alert/throughput/system_stats/heartbeat)
 * - onclose 断线降级: 切换模拟数据 + 5s 重连调度
 * - onerror → close、构造失败 → 模拟降级、WebSocket 不可用降级
 * - 模拟数据生成器 (节点抖动 / 节流历史 60 条上限)
 * - manualReconnect / clearAlerts / 卸载清理
 *
 * Mock 契约: WebSocket 经 globalThis 解析 (vi.stubGlobal), 对齐 network-utils.test.ts 既有模式
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocketData } from "../hooks/useWebSocketData";
import { __resetSettingsStoreForTests } from "../hooks/useSettingsStore";
import type { NodeData, AlertData, ThroughputPoint } from "../types";

// ============================================================
// WebSocket Mock — 构造函数形式 (可 new), 事件句柄可从测试侧注入
// ============================================================

interface MockWSInstance {
  url: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
}

const instances: MockWSInstance[] = [];

const MockWebSocket = vi.fn(function (this: MockWSInstance, url: string) {
  this.url = url;
  this.onopen = null;
  this.onmessage = null;
  this.onclose = null;
  this.onerror = null;
  this.close = vi.fn();
  instances.push(this);
});

function sendRaw(instance: MockWSInstance, data: string): void {
  instance.onmessage?.({ data });
}

function sendMessage(instance: MockWSInstance, msg: unknown): void {
  sendRaw(instance, JSON.stringify(msg));
}

describe("useWebSocketData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    // T2 模拟节奏消费设置: 预置刷新间隔 2s, 保持既有 2000ms 断言节奏
    localStorage.setItem("yyc3_system_settings", JSON.stringify({ values: { refreshInterval: "2" } }));
    __resetSettingsStoreForTests();
    instances.length = 0;
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("默认指标快照应正确", () => {
      const { result } = renderHook(() => useWebSocketData());
      expect(result.current.connectionState).toBe("connecting");
      expect(result.current.reconnectCount).toBe(0);
      expect(result.current.liveQPS).toBe(3842);
      expect(result.current.qpsTrend).toBe("+12.3%");
      expect(result.current.liveLatency).toBe(48);
      expect(result.current.latencyTrend).toBe("-5.2%");
      expect(result.current.activeNodes).toBe("7/8");
      expect(result.current.gpuUtil).toBe("82.4%");
      expect(result.current.tokenThroughput).toBe("138K/s");
      expect(result.current.storageUsed).toBe("12.8TB");
      expect(result.current.throughputHistory).toEqual([]);
      expect(result.current.alerts).toEqual([]);
      expect(result.current.lastSyncTime).toBeTruthy();
      expect(typeof result.current.manualReconnect).toBe("function");
      expect(typeof result.current.clearAlerts).toBe("function");
    });

    it("nodes 应来自 nodeStore 默认 9 节点", () => {
      const { result } = renderHook(() => useWebSocketData());
      expect(result.current.nodes.length).toBe(9);
      expect(result.current.nodes[0].id).toBe("GPU-A100-01");
    });

    it("应以 api-config 的 wsEndpoint 建立连接", () => {
      renderHook(() => useWebSocketData());
      expect(instances.length).toBe(1);
      expect(instances[0].url).toBe("ws://localhost:3113/ws");
    });
  });

  // ----------------------------------------------------------
  // onopen / 连接成功
  // ----------------------------------------------------------

  describe("连接成功", () => {
    it("onopen 后 connectionState 应为 connected 并停止模拟", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        instances[0].onopen?.();
      });
      expect(result.current.connectionState).toBe("connected");
      expect(result.current.reconnectCount).toBe(0);

      // 模拟定时器被清除 — 推进 2s 不产生数据点
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.throughputHistory).toEqual([]);
      expect(result.current.activeNodes).toBe("7/8");
    });
  });

  // ----------------------------------------------------------
  // onmessage 消息路由
  // ----------------------------------------------------------

  describe("onmessage 消息路由", () => {
    it("qps_update 应更新 QPS 与趋势", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        sendMessage(instances[0], { type: "qps_update", payload: { qps: 5200, trend: "+9.9%" } });
      });
      expect(result.current.liveQPS).toBe(5200);
      expect(result.current.qpsTrend).toBe("+9.9%");
    });

    it("latency_update 应更新延迟与趋势", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        sendMessage(instances[0], { type: "latency_update", payload: { latency: 33, trend: "-8.1%" } });
      });
      expect(result.current.liveLatency).toBe(33);
      expect(result.current.latencyTrend).toBe("-8.1%");
    });

    it("node_status 应整体替换节点列表", () => {
      const { result } = renderHook(() => useWebSocketData());
      const payload: NodeData[] = [
        { id: "GPU-X-01", status: "active", gpu: 50, mem: 40, temp: 60, model: "M1", tasks: 3 },
      ];
      act(() => {
        sendMessage(instances[0], { type: "node_status", payload });
      });
      expect(result.current.nodes).toEqual(payload);
    });

    it("alert 应前插告警并保留最近 100 条语义", () => {
      const { result } = renderHook(() => useWebSocketData());
      const a1: AlertData = { id: "a1", level: "warning", message: "m1", source: "s1", timestamp: 1 };
      const a2: AlertData = { id: "a2", level: "critical", message: "m2", source: "s2", timestamp: 2 };
      act(() => {
        sendMessage(instances[0], { type: "alert", payload: a1 });
        sendMessage(instances[0], { type: "alert", payload: a2 });
      });
      expect(result.current.alerts.length).toBe(2);
      expect(result.current.alerts[0].id).toBe("a2");
      expect(result.current.alerts[1].id).toBe("a1");
    });

    it("throughput_history 应截断至 60 条", () => {
      const { result } = renderHook(() => useWebSocketData());
      const payload: ThroughputPoint[] = Array.from({ length: 80 }, (_, i) => ({
        time: `t${i}`, qps: i, latency: i, tokens: i,
      }));
      act(() => {
        sendMessage(instances[0], { type: "throughput_history", payload });
      });
      expect(result.current.throughputHistory.length).toBe(60);
      expect(result.current.throughputHistory[0].time).toBe("t20");
      expect(result.current.throughputHistory[59].time).toBe("t79");
    });

    it("system_stats 应更新聚合指标", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        sendMessage(instances[0], {
          type: "system_stats",
          payload: { activeNodes: "6/9", gpuUtil: "77.7%", tokenThroughput: "99K/s", storageUsed: "9.9TB" },
        });
      });
      expect(result.current.activeNodes).toBe("6/9");
      expect(result.current.gpuUtil).toBe("77.7%");
      expect(result.current.tokenThroughput).toBe("99K/s");
    });

    it("heartbeat_ack 与未知类型不应崩溃且刷新同步时间", () => {
      const { result } = renderHook(() => useWebSocketData());
      const before = result.current.lastSyncTime;
      act(() => {
        sendMessage(instances[0], { type: "heartbeat_ack" });
        sendMessage(instances[0], { type: "unknown_type" });
      });
      expect(result.current.liveQPS).toBe(3842);
      expect(result.current.lastSyncTime).toBeTruthy();
      expect(typeof before).toBe("string");
    });

    it("非法 JSON 消息应被静默忽略", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        sendRaw(instances[0], "{not-json");
      });
      expect(result.current.liveQPS).toBe(3842);
      expect(result.current.connectionState).toBe("connecting");
    });
  });

  // ----------------------------------------------------------
  // onclose / 断线降级与重连
  // ----------------------------------------------------------

  describe("断线降级与重连", () => {
    it("onclose 后应切换 simulated 并在 5s 后重连", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        instances[0].onclose?.();
      });
      expect(result.current.connectionState).toBe("simulated");
      expect(result.current.reconnectCount).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.reconnectCount).toBe(1);
      expect(instances.length).toBe(2);
      expect(result.current.connectionState).toBe("connecting");
    });

    it("onerror 应触发 close", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        instances[0].onerror?.();
      });
      expect(instances[0].close).toHaveBeenCalledTimes(1);
      expect(result.current.connectionState).toBe("connecting");
    });

    it("WebSocket 全局不可用时应降级为模拟数据", () => {
      vi.stubGlobal("WebSocket", undefined);
      const { result } = renderHook(() => useWebSocketData());
      expect(result.current.connectionState).toBe("simulated");

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.throughputHistory.length).toBeGreaterThanOrEqual(1);
    });

    it("构造函数抛出异常时应降级为模拟数据", () => {
      const ThrowingWS = vi.fn(function () {
        throw new Error("boom");
      });
      vi.stubGlobal("WebSocket", ThrowingWS);
      const { result } = renderHook(() => useWebSocketData());
      expect(result.current.connectionState).toBe("simulated");

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.throughputHistory.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------------
  // 模拟数据生成器
  // ----------------------------------------------------------

  describe("模拟数据生成器", () => {
    it("每次心跳应刷新节点 / 聚合指标 / 吞吐历史", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // nodeStore 默认 9 节点, 1 个 inactive → 8/9
      expect(result.current.activeNodes).toBe("8/9");
      expect(result.current.gpuUtil).toMatch(/^\d+\.\d%$/);
      expect(result.current.tokenThroughput).toMatch(/^\d+K\/s$/);
      expect(result.current.qpsTrend).toMatch(/^[+-]\d+\.\d%$/);
      expect(result.current.latencyTrend).toMatch(/^[+-]\d+\.\d%$/);
      expect(result.current.throughputHistory.length).toBe(1);
      expect(result.current.throughputHistory[0].qps).toBeGreaterThanOrEqual(0);
    });

    it("inactive 节点指标应保持零值", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      const inactive = result.current.nodes.find((n) => n.status === "inactive");
      expect(inactive).toBeDefined();
      expect(inactive!.gpu).toBe(0);
      expect(inactive!.tasks).toBe(0);
    });

    it("吞吐历史应裁剪至 60 条上限", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        vi.advanceTimersByTime(61 * 2000);
      });
      expect(result.current.throughputHistory.length).toBe(60);
    });
  });

  // ----------------------------------------------------------
  // 手动重连 / 清空告警 / 卸载
  // ----------------------------------------------------------

  describe("manualReconnect / clearAlerts / 卸载清理", () => {
    it("manualReconnect 应关闭旧连接并重建", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        instances[0].onopen?.();
      });
      act(() => {
        result.current.manualReconnect();
      });
      expect(instances[0].close).toHaveBeenCalledTimes(1);
      expect(instances.length).toBe(2);
      // connectWS 在 manualReconnect 内同步执行, "reconnecting" 会被 "connecting" 覆盖
      expect(result.current.connectionState).toBe("connecting");
    });

    it("manualReconnect 在无活动连接时也应直接重连", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        instances[0].onclose?.();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const countBefore = instances.length;
      act(() => {
        result.current.manualReconnect();
      });
      expect(instances.length).toBe(countBefore + 1);
    });

    it("clearAlerts 应清空告警列表", () => {
      const { result } = renderHook(() => useWebSocketData());
      act(() => {
        sendMessage(instances[0], {
          type: "alert",
          payload: { id: "a1", level: "warning", message: "m", source: "s", timestamp: 1 },
        });
      });
      expect(result.current.alerts.length).toBe(1);
      act(() => {
        result.current.clearAlerts();
      });
      expect(result.current.alerts).toEqual([]);
    });

    it("卸载时应关闭 WebSocket 并清理定时器", () => {
      const { result, unmount } = renderHook(() => useWebSocketData());
      unmount();
      expect(instances[0].close).toHaveBeenCalledTimes(1);

      // 卸载后推进时钟不应产生状态更新或异常
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(result.current.throughputHistory).toEqual([]);
    });
  });
});

// ============================================================
// P2 编辑即生效: wsEndpoint 热重建 (2026-10-05)
// 治断点③ — 设置页改端点 → api-config listeners → 旧连接关闭/新连接建立
// ============================================================

describe("P2 端点热重建", () => {
  // 独立顶层 describe — 外层 beforeEach 不适用, 需自备环境 (stub WS + fake timers)
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    // T2 模拟节奏消费设置: 预置刷新间隔 2s, 保持既有 2000ms 断言节奏
    localStorage.setItem("yyc3_system_settings", JSON.stringify({ values: { refreshInterval: "2" } }));
    __resetSettingsStoreForTests();
    instances.length = 0;
    vi.stubGlobal("WebSocket", MockWebSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("setAPIConfig 变更 wsEndpoint → 旧 WS 关闭 + 新 WS 以新端点建立", async () => {
    const { setAPIConfig, resetAPIConfig } = await import("../lib/api-config");
    resetAPIConfig();

    const { result } = renderHook(() => useWebSocketData());
    // 初始连接: 默认端点
    expect(instances.length).toBeGreaterThanOrEqual(1);
    const oldWs = instances[0];
    expect(oldWs.url).toBe("ws://localhost:3113/ws");

    // 模拟设置页编辑端点 (双写 api-config)
    act(() => {
      setAPIConfig({ wsEndpoint: "ws://hot-rebuild:3114/ws" });
    });

    // 新连接以新端点建立
    const newWs = instances[instances.length - 1];
    expect(newWs).not.toBe(oldWs);
    expect(newWs.url).toBe("ws://hot-rebuild:3114/ws");
    // 旧连接被生命周期 cleanup 关闭
    expect(oldWs.close).toHaveBeenCalled();
    expect(result.current.connectionState).toBe("connecting");

    resetAPIConfig();
  });
});
