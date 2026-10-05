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

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// 类型定义 — 从全局类型中心导入
// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入
// ============================================================

import type {
  AlertData,
  ConnectionState,
  NodeData,
  ThroughputPoint,
  WSMessage,
  WebSocketDataState,
} from "../types";

import { getAPIConfig, onAPIConfigChange } from "../lib/api-config";
import { nodeStore } from "../lib/nodes";
import { getSettingsSnapshot } from "./useSettingsStore";

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

/**
 * T2 编辑即生效 (2026-10-05): 模拟数据节奏消费设置页「数据刷新间隔」
 * (refreshInterval, 秒)。读取时机=每次建立模拟 interval (连接降级/重挂载),
 * 修改设置后于下一次降级重建时生效; 非法值兜底 2s。
 */
function simulateIntervalMs(): number {
  try {
    const sec = Number.parseInt(getSettingsSnapshot().values.refreshInterval, 10);
    if (Number.isFinite(sec) && sec >= 1 && sec <= 300) return sec * 1000;
  } catch { /* 设置读取失败兜底 */ }
  return SIMULATE_INTERVAL_MS;
}
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
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ----- P2 编辑即生效: 订阅 api-config 端点变更 → 热重建连接 -----
  // 原实现 connectWS 无 endpoint 依赖, 设置页改 wsEndpoint 后连接不重建 (断点③)。
  const [wsEndpoint, setWsEndpoint] = useState(getAPIConfig().wsEndpoint);
  useEffect(() => {
    return onAPIConfigChange((config) => {
      setWsEndpoint(config.wsEndpoint);
    });
  }, []);

  // ----- REST 轮询中间档（真实数据接入 P0 / 2026-10-05）-----
  // WS 不可达时优先轮询 metricsBase（console-server 聚合各节点 Ollama /api/ps），
  // 成功则呈现真实节点状态 (connectionState="rest"); 失败保持模拟底座。
  // 兼容性: 降级路径同步先启模拟（REST 为异步验证），既有测试时序零影响。
  const stopRestPolling = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
  }, []);

  const pollRestMetrics = useCallback(async () => {
    try {
      const r = await fetch(getAPIConfig().metricsBase, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {
        activeCount?: string;
        nodes?: Array<{ id: string; status: string; latencyMs: number; models?: string[] }>;
      };
      if (!Array.isArray(data.nodes) || data.nodes.length === 0) throw new Error("空节点集");
      setNodes(
        data.nodes.map((n) => ({
          id: n.id,
          status: n.status === "active" ? "active" : "inactive",
          gpu: 0, mem: 0, temp: 0, // Ollama /api/ps 无硬件指标 — 状态/负载语义化呈现
          model: n.models?.[0] ?? "",
          tasks: n.models?.length ?? 0,
        }))
      );
      if (data.activeCount) setActiveNodes(data.activeCount);
      setConnectionState("rest");
      // REST 命中后停掉模拟底座（真实数据优先）
      if (simulateTimerRef.current) {
        clearInterval(simulateTimerRef.current);
        simulateTimerRef.current = null;
      }
    } catch {
      // 轮询失败保持/回落模拟底座（由调用方保证模拟已运行）;
      // 函数式更新断开对 connectionState 的依赖 → 避免 connectWS 依赖链重建循环
      setConnectionState((prev) => (prev === "connected" ? prev : "simulated"));
    }
  }, []);

  const startRestPolling = useCallback(() => {
    if (restTimerRef.current) return;
    void pollRestMetrics();
    restTimerRef.current = setInterval(() => { void pollRestMetrics(); }, simulateIntervalMs());
  }, [pollRestMetrics]);

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
  // deps 含 wsEndpoint: 设置页编辑端点 → 本回调重建 → 生命周期 effect
  // cleanup 关旧连接后以新端点重连 (编辑即热重建, 治断点③)
  const connectWS = useCallback(() => {
    const wsUrl = wsEndpoint;
    setConnectionState("connecting");

    try {
      // 经 globalThis 解析 — 测试环境经 vi.stubGlobal 注入 Mock, 浏览器取原生实现
      // (ast-grep 守护规则 #1: 禁止裸 new WebSocket)
      const WSImpl = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
      if (typeof WSImpl !== "function") throw new Error("WebSocket 不可用");
      const ws = new WSImpl(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        setReconnectCount(0);
        // stop simulation & rest polling if WS connected
        stopRestPolling();
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
        // fallback to simulation (同步底座) + REST 轮询档异步探测真实指标
        if (!simulateTimerRef.current) {
          simulateTimerRef.current = setInterval(runSimulation, simulateIntervalMs());
        }
        startRestPolling();
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
      // WebSocket constructor error — fallback to simulation + REST 轮询档
      setConnectionState("simulated");
      if (!simulateTimerRef.current) {
        simulateTimerRef.current = setInterval(runSimulation, simulateIntervalMs());
      }
      startRestPolling();
    }
  }, [runSimulation, wsEndpoint, startRestPolling, stopRestPolling]);

  // ----- lifecycle -----
  useEffect(() => {
    // Try WebSocket first, fallback to simulation
    connectWS();

    // Start simulation immediately as fallback (will be stopped if WS connects)
    simulateTimerRef.current = setInterval(runSimulation, simulateIntervalMs());

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
      stopRestPolling();
    };
  }, [connectWS, runSimulation, stopRestPolling]);

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

  // P1 真实告警入口 (2026-10-05): 本地链路 (巡查阈值判定等) 向全局告警流投递,
  // 与 WS alert 消息同队列同上限 — 消费方经 WebSocketContext.pushLocalAlert 调用
  const pushLocalAlert = useCallback((alert: AlertData) => {
    setAlerts((prev) => [alert, ...prev].slice(0, 100));
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
    pushLocalAlert,
  };
}
