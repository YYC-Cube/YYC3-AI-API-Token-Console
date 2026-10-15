/**
 * gateway-adapter.ts
 * ==================
 * 网关（0379-World）数据适配层 — 双端联通 P0-2 / 硬约束①
 *
 * 职责: 把网关 `/ws/monitor` 的 `{event:"metrics", ...}` 帧翻译为
 * useWebSocketData 既有的 7 种内部 WSMessage, 页面组件零改动（方案 D4）。
 *
 * 指标真实化铁则（方案 §5.1）:
 *   - QPS = total_requests 帧间差分（真实 RPS）, 首帧无差分不产 qps_update;
 *   - 延迟 = 各上游 latency_ms 负载加权平均（真实）;
 *   - token 吞吐不经本层伪造 —— 无源时保持 "—"（差分轮询在 hook 层, 见 useWebSocketData）;
 *   - 熔断状态映射: closed→active / half-open→warning / open→error, 未知→inactive。
 */

import type { NodeData, ThroughputPoint, WSMessage } from "../types";

// ============================================================
// 网关帧契约（0379-World core/api/api/websocket.py /ws/monitor, 5s 推送）
// ============================================================

/** 单个上游节点快照（熔断器状态 + EWMA 指标） */
export interface GatewayUpstreamSnapshot {
  status?: string;
  latency_ms?: number;
  error_rate?: number;
  load?: number;
}

/** /ws/monitor metrics 帧 data 部分 */
export interface GatewayMetricsData {
  timestamp?: number;
  active_requests?: number;
  total_requests?: number;
  cache_hit_rate?: number;
  models?: Record<string, GatewayUpstreamSnapshot>;
}

/** /ws/monitor 完整帧 */
export interface GatewayMonitorFrame {
  event: "metrics";
  data: GatewayMetricsData;
}

// ============================================================
// 帧识别
// ============================================================

/**
 * 识别并收窄网关 monitor 帧; 非 metrics 帧（心跳等）返回 null。
 */
export function parseGatewayFrame(raw: unknown): GatewayMonitorFrame | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as { event?: unknown; data?: unknown };
  if (candidate.event !== "metrics" || typeof candidate.data !== "object" || candidate.data === null) {
    return null;
  }
  return { event: "metrics", data: candidate.data as GatewayMetricsData };
}

// ============================================================
// 上游节点归一化
// ============================================================

/** 熔断状态 → NodeStatusType（未知值保守落 inactive, 不冒充健康） */
export function mapUpstreamStatus(rawStatus: string | undefined): NodeData["status"] {
  switch (rawStatus) {
    case "closed":
    case "healthy":
      return "active";
    case "half-open":
    case "degraded":
      return "warning";
    case "open":
      return "error";
    default:
      return "inactive";
  }
}

/** 单上游快照 → NodeData（gpu/mem/temp 无真实源 → 0, 呈现层按 0/未知处理, 不抖动伪造） */
export function normalizeUpstreamNode(
  name: string,
  snap: GatewayUpstreamSnapshot,
): NodeData {
  return {
    id: name,
    status: mapUpstreamStatus(snap.status),
    gpu: 0,
    mem: 0,
    temp: 0,
    // load 为网关侧 EWMA 负载（0-100 语义）, 作为 tasks 的真实代理指标
    model: "",
    tasks: typeof snap.load === "number" && Number.isFinite(snap.load) ? Math.round(snap.load) : 0,
    kind: "upstream",
  };
}

// ============================================================
// 帧翻译器（带差分状态）
// ============================================================

export interface GatewayFrameTranslator {
  /** 翻译一帧 → 0..n 条内部消息（首帧仅节点/延迟, 差分类消息需两帧） */
  translate(frame: GatewayMonitorFrame): WSMessage[];
  /** 重置差分状态（连接重建时调用） */
  reset(): void;
}

interface DeltaState {
  lastTimestamp: number;
  lastTotalRequests: number;
  lastQps: number | null;
  lastLatency: number | null;
  pointCounter: number;
}

function percentTrend(current: number, prev: number): string {
  if (prev <= 0) return "0%";
  const delta = ((current - prev) / prev) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

function avgLatency(models: Record<string, GatewayUpstreamSnapshot>): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const snap of Object.values(models)) {
    if (typeof snap?.latency_ms === "number" && Number.isFinite(snap.latency_ms)) {
      const w = typeof snap.load === "number" && snap.load > 0 ? snap.load : 1;
      weighted += snap.latency_ms * w;
      weightSum += w;
    }
  }
  return weightSum > 0 ? Math.round(weighted / weightSum) : null;
}

export function createGatewayFrameTranslator(): GatewayFrameTranslator {
  let state: DeltaState | null = null;

  return {
    reset() {
      state = null;
    },

    translate(frame: GatewayMonitorFrame): WSMessage[] {
      const data = frame.data ?? {};
      const models = data.models ?? {};
      const messages: WSMessage[] = [];

      // ① 节点矩阵: 每帧全量归一化（真实上游池清单）
      const nodes = Object.entries(models).map(([name, snap]) => normalizeUpstreamNode(name, snap ?? {}));
      if (nodes.length > 0) {
        messages.push({ type: "node_status", payload: nodes });
        const healthy = nodes.filter((n) => n.status === "active" || n.status === "warning").length;
        messages.push({
          type: "system_stats",
          payload: {
            activeNodes: `${healthy}/${nodes.length}`,
            gpuUtil: "—",
            tokenThroughput: "—",
            storageUsed: "—",
          },
        });
      }

      // ② 延迟: 负载加权平均（首帧即可产出）
      const latency = avgLatency(models);
      if (latency !== null) {
        const prevLatency = state?.lastLatency ?? null;
        messages.push({
          type: "latency_update",
          payload: { latency, trend: prevLatency !== null ? percentTrend(latency, prevLatency) : "—" },
        });
      }

      // ③ QPS: total_requests 帧间差分（≥2 帧才真实）; 计数回退（网关重启清零）
      // 不发 0 值伪数据 —— 直接重建基线, 下一帧恢复差分
      const now = typeof data.timestamp === "number" ? data.timestamp : Date.now();
      const total = typeof data.total_requests === "number" ? data.total_requests : null;
      if (state && total !== null && now > state.lastTimestamp && total >= state.lastTotalRequests) {
        const elapsedSec = (now - state.lastTimestamp) / 1000;
        const qps = Math.max(0, Math.round((total - state.lastTotalRequests) / elapsedSec));
        messages.push({
          type: "qps_update",
          payload: { qps, trend: state.lastQps !== null ? percentTrend(qps, state.lastQps) : "—" },
        });
        // ④ 趋势图点（tokens 真实值由 hook 层注入差分结果, 此处 0 占位不伪造）
        state.pointCounter += 1;
        const point: ThroughputPoint = {
          time: `${new Date(now).toLocaleTimeString("zh-CN", { hour12: false })}.${String(state.pointCounter % 1000).padStart(3, "0")}`,
          qps,
          latency: latency ?? 0,
          tokens: 0,
        };
        messages.push({ type: "throughput_history", payload: [point] });
        state.lastQps = qps;
      }

      state = {
        lastTimestamp: now,
        lastTotalRequests: total ?? (state?.lastTotalRequests ?? 0),
        lastQps: state?.lastQps ?? null,
        lastLatency: latency ?? state?.lastLatency ?? null,
        pointCounter: state?.pointCounter ?? 0,
      };

      return messages;
    },
  };
}
