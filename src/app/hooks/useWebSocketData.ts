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

import { getAPIConfig, getGatewayConfig, onAPIConfigChange } from "../lib/api-config";
import {
  activeNodesKpi,
  agentNodesFromA2A,
  gatewaySelfNode,
  mergeDeviceNodes,
  ollamaNodesFromMetrics,
  storageUsedFromHealth,
  upstreamNodesFromRouterStats,
} from "../lib/device-inventory";
import type { DeviceParts } from "../lib/device-inventory";
import { createGatewayFrameTranslator, parseGatewayFrame } from "../lib/gateway-adapter";
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
  // 指标真实化铁则（双端联通 §5.1 / 2026-10-15）: 无真实来源的 KPI 显「无数据」,
  // 禁止以模拟数值冒充 — token 吞吐由网关 /models/stats 差分轮询供给;
  // storageUsed 由 /console/metrics.gateway.health.system.disk_percent 真实供给（P0-3）
  const [tokenThroughput, setTokenThroughput] = useState("—");
  const [storageUsed, setStorageUsed] = useState("—");
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

  // ----- 网关适配层（双端联通 P0-2 / 2026-10-15）-----
  // 网关 {event:"metrics"} 帧 → 内部 7 消息的翻译器; 连接重建时 reset 差分状态
  const translatorRef = useRef(createGatewayFrameTranslator());
  // token 吞吐真实差分: 轮询网关 /models/stats total_tokens 求和 → 与上次差分
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTokensRef = useRef<{ total: number; at: number } | null>(null);
  const tokensPerSecRef = useRef<number | null>(null);
  // 当前 tokenThroughput 是否由 stats 轮询供给（失败回退「—」只覆盖自己写入的值, 不覆盖消息源的值）
  const statsOwnedRef = useRef(false);

  // ----- 四源设备清单合流（双端联通 P0-3 / 硬约束① / 2026-10-15）-----
  // 各源独立更新自己分片 → rebuild 合流呈现; 空清单跳过（保住模拟底座/既有节点）
  const devicesRef = useRef<DeviceParts>({ upstream: null, ollama: null, gateway: null, agents: null });

  const rebuildDevices = useCallback(() => {
    const merged = mergeDeviceNodes(devicesRef.current);
    if (merged.length === 0) return;
    setNodes(merged);
    setActiveNodes(activeNodesKpi(merged));
  }, []);

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
        gateway?: { health?: unknown; router?: unknown; models?: unknown } | null;
      };
      // 双源准入（P0-3）: Ollama 节点集或网关快照任一非空即实况（设备清空后仍可用网关源）
      const hasOllama = Array.isArray(data.nodes) && data.nodes.length > 0;
      const gw = data.gateway && typeof data.gateway === "object" ? data.gateway : null;
      if (!hasOllama && !gw) throw new Error("无可用数据源");
      devicesRef.current.ollama = ollamaNodesFromMetrics(data);
      if (gw) {
        // 网关快照: 上游池 + 网关本体 + 真实磁盘占用率（REST 档仅在 WS 未活时承担 upstream 分片;
        // WS 连接后由 gateway-adapter 帧每 5s 覆盖同分片, 语义一致）
        devicesRef.current.upstream = upstreamNodesFromRouterStats(gw.router);
        devicesRef.current.gateway = gatewaySelfNode(gw.health);
        const su = storageUsedFromHealth(gw.health);
        if (su !== null) setStorageUsed(su);
      }
      rebuildDevices();
      if (devicesRef.current.ollama && devicesRef.current.ollama.length === 0 && data.activeCount) {
        setActiveNodes(data.activeCount); // 网关单源形态回退 Ollama 计数
      }
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
  }, [rebuildDevices]);

  // ----- 网关 token 吞吐真实差分轮询（双端联通 P0-2 / 2026-10-15）-----
  // 数据源: 网关 GET /v1/models/stats（经 /console/gw 代理, 服务端注入密钥）, 30s 一档;
  // total_tokens 求和 → 差分 → tokens/s。失败显示「无数据」（真实化铁则, 不伪造）。
  const GW_STATS_INTERVAL_MS = 30_000;

  function formatTokensPerSec(perSec: number): string {
    return perSec >= 1000 ? `${Math.round(perSec / 1000)}K/s` : `${perSec}/s`;
  }

  const stopGatewayStatsPoll = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    lastTokensRef.current = null;
    tokensPerSecRef.current = null;
  }, []);

  const pollGatewayTokenStats = useCallback(async () => {
    if (typeof fetch !== "function") return;
    try {
      const base = getGatewayConfig().gatewayBase;
      const r = await fetch(`${base}/models/stats`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: unknown = await r.json();
      let total = 0;
      if (Array.isArray(data)) {
        for (const it of data) {
          const t = (it as { total_tokens?: unknown } | null)?.total_tokens;
          if (typeof t === "number" && Number.isFinite(t)) total += t;
        }
      } else if (typeof data === "object" && data !== null) {
        for (const it of Object.values(data as Record<string, unknown>)) {
          const t = (it as { total_tokens?: unknown } | null)?.total_tokens;
          if (typeof t === "number" && Number.isFinite(t)) total += t;
        }
      }
      const now = Date.now();
      const last = lastTokensRef.current;
      if (last && now > last.at && total >= last.total) {
        const perSec = Math.max(0, Math.round((total - last.total) / ((now - last.at) / 1000)));
        tokensPerSecRef.current = perSec;
        statsOwnedRef.current = true;
        setTokenThroughput(formatTokensPerSec(perSec));
      }
      lastTokensRef.current = { total, at: now };
    } catch {
      // 无数据态只覆盖 stats 轮询自己写入的值; 消息源（system_stats/模拟）写入的值保持
      if (statsOwnedRef.current) {
        statsOwnedRef.current = false;
        setTokenThroughput("—");
      }
      tokensPerSecRef.current = null;
    }
  }, []);

  /** 设备源轮询（P0-3/P0-8 / 30s 与 stats 同周期）: A2A Agent 容器 + WS 连接态补 metrics 源
   *  （rest 档已由 pollRestMetrics 高频覆盖 ollama/gateway 分片, 连接态在此低速补充） */
  const pollGatewayDeviceSources = useCallback(async () => {
    if (typeof fetch !== "function") return;
    try {
      const base = getGatewayConfig().gatewayBase.replace(/\/v1\/?$/, "");
      const r = await fetch(`${base}/v1/admin/a2a/agents`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) devicesRef.current.agents = agentNodesFromA2A(await r.json());
    } catch { /* 设备源降级不影响主链路 */ }
    const ws = wsRef.current;
    if (ws && (ws as { readyState?: number }).readyState === 1) {
      try {
        const r = await fetch(getAPIConfig().metricsBase, { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const d = (await r.json()) as {
            nodes?: Array<{ id?: string; status?: string; latencyMs?: number; models?: string[] }>;
            gateway?: { health?: unknown } | null;
          };
          devicesRef.current.ollama = ollamaNodesFromMetrics(d);
          const gw = d.gateway && typeof d.gateway === "object" ? d.gateway : null;
          if (gw) devicesRef.current.gateway = gatewaySelfNode(gw.health);
        }
      } catch { /* 设备源降级 */ }
    }
    rebuildDevices();
  }, [rebuildDevices]);

  const startGatewayStatsPoll = useCallback(() => {
    if (statsTimerRef.current) return;
    void pollGatewayTokenStats();
    void pollGatewayDeviceSources();
    statsTimerRef.current = setInterval(() => {
      void pollGatewayTokenStats();
      void pollGatewayDeviceSources();
    }, GW_STATS_INTERVAL_MS);
  }, [pollGatewayTokenStats, pollGatewayDeviceSources]);

  const startRestPolling = useCallback(() => {
    if (restTimerRef.current) return;
    void pollRestMetrics();
    restTimerRef.current = setInterval(() => { void pollRestMetrics(); }, simulateIntervalMs());
    startGatewayStatsPoll();
  }, [pollRestMetrics, startGatewayStatsPoll]);

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

  // ----- 内部消息路由（双端联通 P0-2 / 2026-10-15 抽出）-----
  // 双入口复用: ① 旧 WS 协议消息直通 ② 网关 {event:"metrics"} 帧经 gateway-adapter 翻译后注入
  const handleInternalMessage = useCallback((msg: WSMessage) => {
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
        // P0-3: 上游分片入设备合流（其余三源由轮询分片提供; 单源场景退化为整体替换, 兼容旧断言）
        devicesRef.current.upstream = msg.payload;
        rebuildDevices();
        break;
      case "alert":
        setAlerts((prev) => [msg.payload, ...prev].slice(0, 100));
        break;
      case "throughput_history": {
        // 语义双轨: 多点=服务端全量历史（整体替换, 旧协议）; 单点=网关帧增量（追加）
        const injectTokens = (p: ThroughputPoint): ThroughputPoint =>
          tokensPerSecRef.current !== null ? { ...p, tokens: tokensPerSecRef.current } : p;
        if (msg.payload.length === 1) {
          setThroughputHistory((prev) => {
            const next = [...prev, injectTokens(msg.payload[0])];
            return next.length > MAX_THROUGHPUT_HISTORY ? next.slice(-MAX_THROUGHPUT_HISTORY) : next;
          });
        } else {
          setThroughputHistory(msg.payload.map(injectTokens).slice(-MAX_THROUGHPUT_HISTORY));
        }
        break;
      }
      case "system_stats":
        setActiveNodes(msg.payload.activeNodes);
        setGpuUtil(msg.payload.gpuUtil);
        setTokenThroughput(msg.payload.tokenThroughput);
        statsOwnedRef.current = false; // 消息源接管 token 吞吐值, stats 轮询失败不再覆盖
        break;
      case "heartbeat_ack":
        break;
    }
    setLastSyncTime(new Date().toLocaleString("zh-CN", { hour12: false }));
  }, [rebuildDevices]);

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
        // 网关帧差分状态随新连接重置; 启动 token 吞吐真实差分轮询（双端联通 P0-2）
        translatorRef.current.reset();
        startGatewayStatsPoll();
        // stop simulation & rest polling if WS connected
        stopRestPolling();
        if (simulateTimerRef.current) {
          clearInterval(simulateTimerRef.current);
          simulateTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed: unknown = JSON.parse(event.data);
          // 双协议分发（双端联通 P0-2）: 网关 /ws/monitor 中继帧 → gateway-adapter 翻译;
          // 其余按旧 WS 协议消息直通（既有消息契约零破坏）
          const gatewayFrame = parseGatewayFrame(parsed);
          if (gatewayFrame) {
            for (const internal of translatorRef.current.translate(gatewayFrame)) {
              handleInternalMessage(internal);
            }
          } else {
            handleInternalMessage(parsed as WSMessage);
          }
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
  }, [runSimulation, wsEndpoint, startRestPolling, stopRestPolling, handleInternalMessage, startGatewayStatsPoll]);

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
      stopGatewayStatsPoll();
    };
  }, [connectWS, runSimulation, stopRestPolling, stopGatewayStatsPoll]);

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
