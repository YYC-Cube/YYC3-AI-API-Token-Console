/**
 * types/network-sync.ts — 网络与可靠性: 网络配置 / 后台同步 / 错误处理
 * Facade+Siblings 拆分产物 (§6.6, 2026-09-20): 自 types/index.ts 迁入,
 * 经 index.ts Facade 重导出, 消费方 import 路径不变。
 */
import type { BaseSeverity } from "./core";

/**
 * ============================================================
 *  5. 网络配置
 * ============================================================
 */

/** 网络接口信息 */
export interface NetworkInterface {
  name: string;
  type: string;
  ip: string;
  status: "active" | "inactive" | "unknown";
}

/** 网络配置模式 */
export type NetworkMode = "auto" | "wifi" | "manual";

/** 网络配置项 */
export interface NetworkConfig {
  serverAddress: string;
  port: string;
  nasAddress: string;
  wsUrl: string;
  mode: NetworkMode;
}

/** 连接测试状态 */
export type TestStatus = "idle" | "testing" | "success" | "failed";

/** 连接测试结果 */
export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  error?: string;
}

/** useNetworkConfig Hook 状态 */
export interface NetworkConfigState {
  config: NetworkConfig;
  interfaces: NetworkInterface[];
  localIP: string;
  testStatus: TestStatus;
  testLatency: number;
  testError: string;
  detecting: boolean;
}


/**
 * ============================================================
 *  6. 后台同步
 * ============================================================
 */

/** 同步项类型 */
export type SyncItemType = "config_update" | "audit_log" | "user_action";

/** 同步队列项 */
export interface SyncItem {
  id: string;
  type: SyncItemType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

/** 同步队列统计 */
export interface SyncQueueStats {
  total: number;
  pending: number;
  retrying: number;
  oldestTimestamp: number | null;
}

/** 同步处理结果 */
export interface SyncProcessResult {
  success: number;
  failed: number;
}


/**
 * ============================================================
 *  7. 错误处理
 * ============================================================
 */

/** 错误分类 */
export type ErrorCategory =
  | "NETWORK"
  | "PARSE"
  | "AUTH"
  | "RUNTIME"
  | "VALIDATION"
  | "STORAGE"
  | "UNKNOWN";

/** 错误严重级别 — RF-005: BaseSeverity 别名 */
export type ErrorSeverity = BaseSeverity;

/** 应用级错误 */
export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  detail?: string;
  source?: string;
  stack?: string;
  timestamp: number;
  resolved: boolean;
  userAction?: string;
}

/** 错误统计 */
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  unresolvedCount: number;
  lastErrorTime: number | null;
}
