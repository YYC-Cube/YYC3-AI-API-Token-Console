/**
 * device-inventory.ts
 * ===================
 * 多端设备清单（方案 §5.4 / 硬约束①）— 四源真实设备归一化与合流
 *
 * 设备源（全部真实, 无 mock）:
 *   upstream — 网关上游推理池（/v1/router/stats → upstream_pool）
 *   ollama   — Ollama 节点（/console/metrics.nodes ← console-server 聚合 /api/ps）
 *   gateway  — NAS 网关本体（/health → services 探测 + system 资源）
 *   agent    — A2A Agent 容器（/v1/admin/a2a/agents → 心跳 ≤90s 在线）
 *
 * 指标真实化铁则: 无真实来源的字段为 0/「—」, 禁止伪造; 熔断/健康状态保守映射。
 */

import type { NodeData } from "../types";
import { normalizeUpstreamNode } from "./gateway-adapter";

// ============================================================
// 网关 /health 契约（0379-World core/api/main.py health_check）
// ============================================================

export interface GatewayHealth {
  status?: string;
  version?: string;
  uptime_seconds?: number;
  services?: {
    ollama?: { status?: string; discovered?: number; endpoints?: Record<string, { status?: string; latency_ms?: number }> };
    redis?: { status?: string };
    postgresql?: { status?: string };
    [key: string]: unknown;
  };
  system?: {
    cpu_percent?: number;
    memory_percent?: number;
    disk_percent?: number;
  };
  metrics?: {
    active_requests?: number;
    total_requests?: number;
    cache_hit_rate?: number;
  };
}

/** 网关 /v1/router/stats.upstream_pool 元素（名称/模型/熔断态） */
export interface UpstreamPoolItem {
  name?: string;
  base_url?: string;
  models?: string[];
  status?: string;
  breaker_state?: string;
  [key: string]: unknown;
}

/** A2A /v1/admin/a2a/agents.agents 元素 */
export interface A2AAgentCard {
  agent_id?: string;
  agent_name?: string;
  status?: string;
  capabilities?: string[];
  [key: string]: unknown;
}

// ============================================================
// 归一化
// ============================================================

/** 上游池快照 → NodeData[]（REST 直读路径; WS 路径由 gateway-adapter 负责） */
export function upstreamNodesFromRouterStats(router: unknown): NodeData[] {
  if (typeof router !== "object" || router === null) return [];
  const pool = (router as { upstream_pool?: unknown }).upstream_pool;
  if (!Array.isArray(pool)) return [];
  return pool
    .filter((u): u is UpstreamPoolItem => typeof u === "object" && u !== null)
    .map((u) =>
      normalizeUpstreamNode(String(u.name ?? "?"), {
        // WS 帧=status, REST 快照=breaker_state — 双字段兼容
        status: typeof u.status === "string" ? u.status : u.breaker_state,
        load: typeof u.load === "number" ? u.load : undefined,
        latency_ms: typeof u.latency_ms === "number" ? u.latency_ms : undefined,
        error_rate: typeof u.error_rate === "number" ? u.error_rate : undefined,
      }),
    );
}

/** /console/metrics.nodes（Ollama 聚合）→ NodeData[] */
export function ollamaNodesFromMetrics(
  data: { nodes?: Array<{ id?: string; status?: string; latencyMs?: number; models?: string[] }> } | null | undefined,
): NodeData[] {
  if (!data || !Array.isArray(data.nodes)) return [];
  return data.nodes.map((n) => ({
    id: String(n.id ?? "?"),
    status: n.status === "active" ? "active" : "inactive",
    gpu: 0, mem: 0, temp: 0, // /api/ps 无硬件指标 — 状态/运行模型语义化呈现
    model: n.models?.[0] ?? "",
    tasks: n.models?.length ?? 0,
    kind: "ollama" as const,
  }));
}

/** 网关 /health → 网关本体节点（服务探测聚合状态 + 真实资源占用） */
export function gatewaySelfNode(health: unknown): NodeData | null {
  if (typeof health !== "object" || health === null) return null;
  const h = health as GatewayHealth;
  const services = h.services ?? {};
  // 依赖服务任一不可达 → warning; 整体 status 非 healthy → error; 保守不冒充
  const depStatuses = [services.ollama?.status, services.redis?.status, services.postgresql?.status];
  let status: NodeData["status"];
  if (h.status !== "healthy") status = "error";
  else if (depStatuses.some((s) => s && s !== "healthy" && s !== "configured")) status = "warning";
  else status = "active";
  return {
    id: "nas-gateway",
    status,
    gpu: 0,
    mem: Math.round(h.system?.memory_percent ?? 0), // 真实内存占用率
    temp: 0,
    model: `YYC³ 网关 v${h.version ?? "?"}`,
    tasks: h.metrics?.active_requests ?? 0, // 真实在途请求
    uptime: h.uptime_seconds !== undefined ? `${Math.floor(h.uptime_seconds / 3600)}h` : undefined,
    kind: "gateway" as const,
  };
}

/** A2A agents → NodeData[]（管理面列表含离线; 心跳 ≤90s 在线由网关判定） */
export function agentNodesFromA2A(resp: { agents?: A2AAgentCard[] } | null | undefined): NodeData[] {
  if (!resp || !Array.isArray(resp.agents)) return [];
  return resp.agents.map((a) => ({
    id: String(a.agent_id ?? "?"),
    status: a.status === "online" ? "active" : "inactive",
    gpu: 0, mem: 0, temp: 0,
    model: String(a.agent_name ?? a.agent_id ?? "?"),
    tasks: Array.isArray(a.capabilities) ? a.capabilities.length : 0,
    kind: "agent" as const,
  }));
}

// ============================================================
// 合流与 KPI
// ============================================================

export interface DeviceParts {
  upstream?: NodeData[] | null;
  ollama?: NodeData[] | null;
  gateway?: NodeData | null;
  agents?: NodeData[] | null;
}

/** 四源合流（固定呈现顺序: 推理池 → Ollama → 网关 → Agent 容器）; 空集过滤 */
export function mergeDeviceNodes(parts: DeviceParts): NodeData[] {
  return [
    ...(parts.upstream ?? []),
    ...(parts.ollama ?? []),
    ...(parts.gateway ? [parts.gateway] : []),
    ...(parts.agents ?? []),
  ];
}

/** 合流清单 KPI: 活跃/总数 */
export function activeNodesKpi(nodes: NodeData[]): string {
  const active = nodes.filter((n) => n.status === "active" || n.status === "warning").length;
  return `${active}/${nodes.length}`;
}

/** 网关 /health → 真实 KPI（磁盘占用率; 无源返回 null 显「—」不伪造） */
export function storageUsedFromHealth(health: unknown): string | null {
  if (typeof health !== "object" || health === null) return null;
  const disk = (health as GatewayHealth).system?.disk_percent;
  return typeof disk === "number" && Number.isFinite(disk) ? `${disk.toFixed(1)}%` : null;
}
