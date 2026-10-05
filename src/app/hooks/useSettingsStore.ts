/**
 * useSettingsStore.ts
 * ====================
 * 系统设置统一持久化 Hook
 *
 * 功能:
 * - 所有 SystemSettings 配置项集中管理
 * - localStorage 持久化 (key: yyc3_system_settings)
 * - 开关类 (toggles) 和文本类 (values) 分开管理
 * - 导出/导入/重置
 * - BroadcastChannel 多标签页同步
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getSharedChannel } from "../lib/broadcast-channel";
import { lsGet, lsSetJSON } from "../lib/yyc3-storage";

// ============================================================
// 类型定义
// ============================================================

export interface SettingsToggles {
  autoScale: boolean;
  healthCheck: boolean;
  alertEmail: boolean;
  alertSlack: boolean;
  darkMode: boolean;
  autoBackup: boolean;
  mfa: boolean;
  auditLog: boolean;
  rateLimiting: boolean;
  cacheEnabled: boolean;
  wsAutoReconnect: boolean;
  wsHeartbeat: boolean;
  aiStreamMode: boolean;
  aiContextMemory: boolean;
  debugMode: boolean;
  performanceLog: boolean;
  autoUpdate: boolean;
  dataCompression: boolean;
  corsEnabled: boolean;
}

export interface SettingsValues {
  systemName: string;
  clusterId: string;
  refreshInterval: string;
  language: string;
  timezone: string;
  maxNodes: string;
  loadBalanceStrategy: string;
  healthCheckInterval: string;
  scaleUpThreshold: string;
  scaleDownThreshold: string;
  wsEndpoint: string;
  wsReconnectInterval: string;
  wsMaxReconnect: string;
  wsHeartbeatInterval: string;
  wsThrottleMs: string;
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
  aiTemperature: string;
  aiTopP: string;
  aiMaxTokens: string;
  aiTimeout: string;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbPoolSize: string;
  sessionTimeout: string;
  ipWhitelist: string;
  alertGpuThreshold: string;
  alertTempThreshold: string;
  alertEmailAddr: string;
  webhookUrl: string;
  backupSchedule: string;
  logLevel: string;
  logRetention: string;
  maxConcurrency: string;
  cacheSize: string;
  cacheTTL: string;
}

export interface SettingsState {
  toggles: SettingsToggles;
  values: SettingsValues;
}

// ============================================================
// 默认值
// ============================================================

const DEFAULT_TOGGLES: SettingsToggles = {
  autoScale: true,
  healthCheck: true,
  alertEmail: true,
  alertSlack: false,
  darkMode: true,
  autoBackup: true,
  mfa: true,
  auditLog: true,
  rateLimiting: true,
  cacheEnabled: true,
  wsAutoReconnect: true,
  wsHeartbeat: true,
  aiStreamMode: true,
  aiContextMemory: true,
  debugMode: false,
  performanceLog: true,
  autoUpdate: false,
  dataCompression: true,
  corsEnabled: true,
};

const DEFAULT_VALUES: SettingsValues = {
  systemName: "YYC³ CloudPivot Intelli-Matrix v3.2",
  clusterId: "CN-EAST-PROD-01",
  refreshInterval: "5",
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  maxNodes: "16",
  loadBalanceStrategy: "轮询 (Round Robin)",
  healthCheckInterval: "30",
  scaleUpThreshold: "85",
  scaleDownThreshold: "30",
  wsEndpoint: "ws://localhost:3113/ws",
  wsReconnectInterval: "5000",
  wsMaxReconnect: "10",
  wsHeartbeatInterval: "30000",
  wsThrottleMs: "100",
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "",
  aiTemperature: "0.7",
  aiTopP: "0.9",
  aiMaxTokens: "2048",
  aiTimeout: "30000",
  dbHost: "localhost",
  dbPort: "5433",
  dbName: "cpim_matrix",
  dbUser: "yyc_admin",
  dbPassword: "",
  dbPoolSize: "20",
  sessionTimeout: "30",
  ipWhitelist: "192.168.1.0/24\n10.0.0.0/16\n172.16.0.0/12",
  alertGpuThreshold: "90",
  alertTempThreshold: "80",
  alertEmailAddr: "admin@cloudpivot.ai",
  webhookUrl: "",
  backupSchedule: "0 2 * * *",
  logLevel: "info",
  logRetention: "30",
  maxConcurrency: "100",
  cacheSize: "512",
  cacheTTL: "3600",
};

// ============================================================
// Storage
// ============================================================

const STORAGE_KEY = "yyc3_system_settings";
const CHANNEL_NAME = "yyc3_settings_sync";

function loadState(): SettingsState {
  try {
    const raw = lsGet(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        toggles: { ...DEFAULT_TOGGLES, ...(saved.toggles || {}) },
        values: { ...DEFAULT_VALUES, ...(saved.values || {}) },
      };
    }
  } catch { /* ignore */ }
  return { toggles: { ...DEFAULT_TOGGLES }, values: { ...DEFAULT_VALUES } };
}

function saveState(state: SettingsState) {
  try {
    lsSetJSON(STORAGE_KEY, state);
  } catch { /* ignore */ }
}

// ============================================================
// 模块级单例源 — 编辑即生效核心 (P1 / 2026-10-05)
// ============================================================
// 原实现: 每个 useSettingsStore() 实例独立 useState + BroadcastChannel,
//   但 getSharedChannel 为共享单例不回声 → 同标签页多实例互盲 (断点①)。
// 现实现: 状态上提模块级真值 + listeners 订阅 (复刻 api-config 范本),
//   Hook 经 useSyncExternalStore 订阅 → 多实例同源, 任一实例编辑全树生效。
// 跨标签页仍由每实例 BC 监听驱动 (兼容既有测试 mock 契约)。

let _state: SettingsState = loadState();
const _listeners = new Set<(state: SettingsState) => void>();

function notifyListeners() {
  for (const fn of _listeners) {
    try { fn(_state); } catch { /* listener 异常不阻断传播 */ }
  }
}

/** 提交新状态: 更新真值 → 持久化 → 通知全部订阅者 */
function commitState(next: SettingsState) {
  _state = next;
  saveState(next);
  notifyListeners();
}

/** useSyncExternalStore 订阅入口 (返回稳定引用, 避免无限重渲染) */
export function subscribeSettings(fn: (state: SettingsState) => void): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** useSyncExternalStore 快照入口 (模块级真值引用稳定) */
export function getSettingsSnapshot(): SettingsState {
  return _state;
}

/** 测试专用: 复位模块级单例 (从 localStorage 重读并通知) — 生产代码勿用
 *  单例上提后跨用例状态残留, 测试 beforeEach 须同步存储与单例 */
export function __resetSettingsStoreForTests(): void {
  _state = loadState();
  notifyListeners();
}

// ============================================================
// Hook
// ============================================================

export function useSettingsStore() {
  // 多实例共享模块级真值 — 任一来源变更 (本实例操作/同页其他实例/跨标签页 BC) 即重渲染
  const state = useSyncExternalStore(subscribeSettings, getSettingsSnapshot);

  // 跨标签页同步: 收到广播 → 提交真值 (listeners 驱动本页全部实例)
  useEffect(() => {
    try {
      const channel = getSharedChannel(CHANNEL_NAME);
      if (!channel) return;
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "settings_update" && e.data.state) {
          commitState(e.data.state as SettingsState);
        }
      };
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    } catch { /* BroadcastChannel not available */ }
  }, []);

  const broadcast = useCallback((newState: SettingsState) => {
    try {
      const channel = getSharedChannel(CHANNEL_NAME);
      channel?.postMessage({ type: "settings_update", state: newState });
    } catch { /* ignore */ }
  }, []);

  // Toggle 操作
  const toggleSetting = useCallback((key: keyof SettingsToggles) => {
    const next = {
      ...getSettingsSnapshot(),
      toggles: { ...getSettingsSnapshot().toggles, [key]: !getSettingsSnapshot().toggles[key] },
    };
    commitState(next);
    broadcast(next);
  }, [broadcast]);

  // Value 更新
  const updateValue = useCallback((key: keyof SettingsValues, val: string) => {
    const prev = getSettingsSnapshot();
    const next = { ...prev, values: { ...prev.values, [key]: val } };
    commitState(next);
    broadcast(next);
  }, [broadcast]);

  // 批量更新
  const updateValues = useCallback((updates: Partial<SettingsValues>) => {
    const prev = getSettingsSnapshot();
    const next = { ...prev, values: { ...prev.values, ...updates } };
    commitState(next);
    broadcast(next);
  }, [broadcast]);

  // 重置
  const resetSettings = useCallback(() => {
    const defaultState: SettingsState = {
      toggles: { ...DEFAULT_TOGGLES },
      values: { ...DEFAULT_VALUES },
    };
    commitState(defaultState);
    broadcast(defaultState);
  }, [broadcast]);

  // 导出
  const exportSettings = useCallback(() => {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      ...getSettingsSnapshot(),
    }, null, 2);
  }, []);

  // 导入
  const importSettings = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      const imported: SettingsState = {
        toggles: { ...DEFAULT_TOGGLES, ...(data.toggles || {}) },
        values: { ...DEFAULT_VALUES, ...(data.values || {}) },
      };
      commitState(imported);
      broadcast(imported);
      return true;
    } catch {
      return false;
    }
  }, [broadcast]);

  return {
    settings: state.toggles,
    values: state.values,
    toggleSetting,
    updateValue,
    updateValues,
    resetSettings,
    exportSettings,
    importSettings,
  };
}
