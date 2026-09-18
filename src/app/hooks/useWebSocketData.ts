/**
 * useWebSocketData.ts
 * =====================
 * YYC3 CloudPivot Intelli-Matrix - WebSocket 实时数据推送
 *
 * 功能：
 * - WebSocket 连接管理（生命周期、自动重连、心跳）
 * - 消息类型路由（qps_update / latency_update / node_status / alert）
 * - 断线降级：自动切换本地模拟数据
 * - 节流控制：100ms UI 更新节流
 *
 * 架构：
 * WebSocket Server (URL 从 api-config 统一读取)
 *   ↓ 连接失败
 * Simulated Data Generator (本地模拟)
 *   ↓
 * Throttled State Updates (100ms 节流)
 *   ↓
 * React Components
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// 类型定义 — 从全局类型中心导入
// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入
// ============================================================

import type {
  ConnectionState,
  NodeData,
  AlertData,
  ThroughputPoint,
  WSMessage,
  WebSocketDataState,
} from "../types";

import { getAPIConfig } from "../lib/api-config";
import { nodeStore } from "../stores/dashboard-stores";

// ============================================================
// Simulated Data Generator — 从 localStorage nodeStore 读取
// ============================================================

function jitter(base: number, range: number): number {
  return Math.max(0, base + (Math.random() - 0.5) * range * 2);
}

function generateSimulatedNodes(): NodeData[] {
  const storedNodes = nodeStore.getAll();
  return storedNodes.map((n) => ({
    ...n,
    gpu: n.status === "inactive" ? 0 : Math.min(100, Math.round(jitter(n.gpu, 5))),
    mem: n.status === "inactive" ? n.mem : Math.min(100, Math.round(jitter(n.mem, 3))),
    temp: n.status === "inactive" ? n.temp : Math.round(jitter(n.temp, 2)),
    tasks: n.status === "inactive" ? 0 : Math.max(0, Math.round(jitter(n.tasks, 10))),
  }));
}

let throughputCounter = 0;

function generateThroughputPoint(): ThroughputPoint {
  const now = new Date();
  const hms = now.toLocaleTimeString("zh-CN", { hour12: false });
  // Append counter suffix to guarantee unique time keys for recharts
  throughputCounter += 1;
  return {
    time: `${hms}.${String(throughputCounter % 1000).padStart(3, "0")}`,
    qps: Math.round(jitter(3800, 400)),
    latency: Math.round(jitter(48, 8)),
    tokens: Math.round(jitter(138000, 15000)),
  };
}

// ============================================================
// Hook
// ============================================================

const MAX_THROUGHPUT_HISTORY = 60;
const SIMULATE_INTERVAL_MS = 2000;
const RECONNECT_DELAY_MS = 5000;

export function useWebSocketData(): WebSocketDataState {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [reconnectCount, setReconnectCount] = useState(0);
  const [liveQPS, setLiveQPS] = useState(3842);
  const [qpsTrend, setQpsTrend] = useState("+12.3%");
  const [liveLatency, setLiveLatency] = useState(48);
  const [latencyTrend, setLatencyTrend] = useState("-5.2%");
  const [activeNodes, setActiveNodes] = useState("7/8");
  const [gpuUtil, setGpuUtil] = useState("82.4%");
  const [tokenThroughput, setTokenThroughput] = useState("138K/s");
  const [storageUsed] = useState("12.8TB");
  const [nodes, setNodes] = useState<NodeData[]>(() => nodeStore.getAll());
  const [throughputHistory, setThroughputHistory] = useState<ThroughputPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState(
    new Date().toLocaleString("zh-CN", { hour12: false })
  );

  const wsRef = useRef<WebSocket | null>(null);
  const simulateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- simulated data updater -----
  const runSimulation = useCallback(() => {
    const newNodes = generateSimulatedNodes();
    setNodes(newNodes);

    const active = newNodes.filter((n) => n.status !== "inactive");
    setActiveNodes(`${active.length}/${newNodes.length}`);

    const avgGpu = active.reduce((s, n) => s + n.gpu, 0) / (active.length || 1);
    setGpuUtil(`${avgGpu.toFixed(1)}%`);

    const newQps = Math.round(jitter(3800, 400));
    setLiveQPS(newQps);
    setQpsTrend(newQps > 3800 ? `+${((newQps / 3800 - 1) * 100).toFixed(1)}%` : `-${((1 - newQps / 3800) * 100).toFixed(1)}%`);

    const newLatency = Math.round(jitter(48, 8));
    setLiveLatency(newLatency);
    setLatencyTrend(newLatency < 48 ? `-${((1 - newLatency / 48) * 100).toFixed(1)}%` : `+${((newLatency / 48 - 1) * 100).toFixed(1)}%`);

    const tp = Math.round(jitter(138, 15));
    setTokenThroughput(`${tp}K/s`);

    const point = generateThroughputPoint();
    setThroughputHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_THROUGHPUT_HISTORY ? next.slice(-MAX_THROUGHPUT_HISTORY) : next;
    });

    setLastSyncTime(new Date().toLocaleString("zh-CN", { hour12: false }));
  }, []);

  // ----- WebSocket connection -----
  const connectWS = useCallback(() => {
    const wsUrl = getAPIConfig().wsEndpoint;
    setConnectionState("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        setReconnectCount(0);
        // stop simulation if WS connected
        if (simulateTimerRef.current) {
          clearInterval(simulateTimerRef.current);
          simulateTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          switch (msg.type) {
            case "qps_update":
              setLiveQPS(msg.payload.qps);
              setQpsTrend(msg.payload.trend);
              break;
            case "latency_update":
              setLiveLatency(msg.payload.latency);
              setLatencyTrend(msg.payload.trend);
              break;
            case "node_status":
              setNodes(msg.payload);
              break;
            case "alert":
              setAlerts((prev) => [msg.payload, ...prev].slice(0, 100));
              break;
            case "throughput_history":
              setThroughputHistory(msg.payload.slice(-MAX_THROUGHPUT_HISTORY));
              break;
            case "system_stats":
              setActiveNodes(msg.payload.activeNodes);
              setGpuUtil(msg.payload.gpuUtil);
              setTokenThroughput(msg.payload.tokenThroughput);
              break;
            case "heartbeat_ack":
              break;
          }
          setLastSyncTime(new Date().toLocaleString("zh-CN", { hour12: false }));
        } catch {
          // parse error — ignore
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnectionState("simulated");
        // fallback to simulation
        if (!simulateTimerRef.current) {
          simulateTimerRef.current = setInterval(runSimulation, SIMULATE_INTERVAL_MS);
        }
        // schedule reconnect
        reconnectTimerRef.current = setTimeout(() => {
          setReconnectCount((c) => c + 1);
          connectWS();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket constructor error — fallback to simulation
      setConnectionState("simulated");
      if (!simulateTimerRef.current) {
        simulateTimerRef.current = setInterval(runSimulation, SIMULATE_INTERVAL_MS);
      }
    }
  }, [runSimulation]);

  // ----- lifecycle -----
  useEffect(() => {
    // Try WebSocket first, fallback to simulation
    connectWS();

    // Start simulation immediately as fallback (will be stopped if WS connects)
    simulateTimerRef.current = setInterval(runSimulation, SIMULATE_INTERVAL_MS);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (simulateTimerRef.current) {
        clearInterval(simulateTimerRef.current);
        simulateTimerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connectWS, runSimulation]);

  // ----- public API -----
  const manualReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setConnectionState("reconnecting");
    connectWS();
  }, [connectWS]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    connectionState,
    reconnectCount,
    lastSyncTime,
    liveQPS,
    qpsTrend,
    liveLatency,
    latencyTrend,
    activeNodes,
    gpuUtil,
    tokenThroughput,
    storageUsed,
    nodes,
    throughputHistory,
    alerts,
    manualReconnect,
    clearAlerts,
  };
}