/**
 * types/core.ts — 核心领域: 用户认证 / 节点集群 / 模型 Agent / WebSocket 通信
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */

/** 系统角色 */
export type UserRole = "admin" | "developer";

/** 认证用户 */
export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/** 认证会话 */
export interface AppSession {
  user: AppUser;
  token: string;
  expiresAt: number;
}

/** 认证上下文数据 */
export interface AuthContextValue {
  logout: () => void;
  userEmail: string;
  userRole: UserRole | "";
  isGhost?: boolean;
}


/**
 * ============================================================
 *  2. 节点与集群
 * ============================================================
 */

/** 节点运行状态 */
export type NodeStatusType = "active" | "warning" | "inactive" | "error";

/**
 * 实时节点数据（WebSocket 推送 / 前端展示）
 * 字段使用 camelCase 短名，适合高频 UI 渲染
 */
export interface NodeData {
  id: string;
  status: NodeStatusType;
  gpu: number;       // GPU 利用率 0-100
  mem: number;       // 内存利用率 0-100
  temp: number;      // 温度 °C
  model: string;     // 当前部署模型
  tasks: number;     // 活跃任务数
  uptime?: string;   // 运行时长（如 "48h"）
}

/**
 * 数据库节点状态（PostgreSQL Schema: infra.nodes）
 * 字段使用 snake_case，与 DB 列名一致
 */
export interface NodeStatusRecord {
  id: string;
  hostname: string;
  gpu_util: number;
  mem_util: number;
  temp_celsius: number;
  model_deployed: string;
  active_tasks: number;
  status: NodeStatusType;
}

/** NodeStatusRecord → NodeData 转换 */
export function toNodeData(record: NodeStatusRecord): NodeData {
  return {
    id: record.hostname,
    status: record.status,
    gpu: record.gpu_util,
    mem: record.mem_util,
    temp: record.temp_celsius,
    model: record.model_deployed,
    tasks: record.active_tasks,
  };
}


/**
 * ============================================================
 *  3. 模型与 Agent
 * ============================================================
 */

/** 模型层级 */
export type ModelTier = "primary" | "secondary" | "standby";

/** 模型配置（DB Schema: core.models） */
export interface Model {
  id: string;
  name: string;
  provider: string;
  tier: ModelTier;
  avg_latency_ms: number;
  throughput: number;
  created_at: string;
}

/** Agent 配置（DB Schema: core.agents） */
export interface Agent {
  id: string;
  name: string;
  name_cn: string;
  role: string;
  description: string;
  is_active: boolean;
}

/** 推理日志状态 */
export type InferenceStatus = "success" | "error" | "timeout";

/** 推理日志（DB Schema: telemetry.inference_logs） */
export interface InferenceLog {
  id: string;
  model_id: string;
  agent_id: string;
  latency_ms: number;
  tokens_in: number;
  tokens_out: number;
  status: InferenceStatus;
  created_at: string;
}

/** 模型性能统计（聚合查询结果） */
export interface ModelStats {
  avgLatency: number;
  totalRequests: number;
  totalTokens: number;
  successRate: number;
}


/**
 * ============================================================
 *  4. WebSocket 通信
 * ============================================================
 */

/** WebSocket 连接状态 */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "simulated";

/**
 * RF-005: 统一基础严重级别类型
 * 所有模块的 severity 类型应基于此定义，确保跨模块类型兼容
 * 注意: PatternSeverity (low/medium/high/critical) 语义不同，保持独立
 */
export type BaseSeverity = "info" | "warning" | "error" | "critical";

/** 告警严重级别 — RF-005: BaseSeverity 别名 */
export type AlertLevel = BaseSeverity;

/** 告警通知数据 */
export interface AlertData {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  timestamp: number;
}

/** 吞吐量历史数据点 */
export interface ThroughputPoint {
  time: string;
  qps: number;
  latency: number;
  tokens: number;
}

/** 系统总览指标 */
export interface SystemStats {
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;
}

/** WebSocket 消息类型联合 */
export type WSMessage =
  | { type: "qps_update"; payload: { qps: number; trend: string } }
  | { type: "latency_update"; payload: { latency: number; trend: string } }
  | { type: "node_status"; payload: NodeData[] }
  | { type: "alert"; payload: AlertData }
  | { type: "throughput_history"; payload: ThroughputPoint[] }
  | { type: "system_stats"; payload: SystemStats }
  | { type: "heartbeat_ack" };

/** useWebSocketData Hook 返回的完整数据状态 */
export interface WebSocketDataState {
  // 连接状态
  connectionState: ConnectionState;
  reconnectCount: number;
  lastSyncTime: string;

  // 实时指标
  liveQPS: number;
  qpsTrend: string;
  liveLatency: number;
  latencyTrend: string;

  // 系统指标
  activeNodes: string;
  gpuUtil: string;
  tokenThroughput: string;
  storageUsed: string;

  // 节点数据
  nodes: NodeData[];

  // 吞吐量历史
  throughputHistory: ThroughputPoint[];

  // 告警列表
  alerts: AlertData[];

  // 操作方法
  manualReconnect: () => void;
  clearAlerts: () => void;
}
