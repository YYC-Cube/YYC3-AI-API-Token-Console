/**
 * ConnectionStatus 组件
 * =====================
 * WebSocket 连接状态指示器
 * 显示当前连接模式：在线 / 重连中 / 模拟模式 / 离线
 */

import React from "react";
import { Wifi, WifiOff, RefreshCw, Radio, Zap } from "lucide-react";
import type { ConnectionState } from "../types";

interface ConnectionStatusProps {
  state: ConnectionState;
  reconnectCount: number;
  lastSyncTime: string;
  onReconnect: () => void;
  compact?: boolean;
}

const stateConfig: Record<ConnectionState, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Wifi;
  pulse: boolean;
}> = {
  connected: {
    label: "实时连接",
    color: "#00ff88",
    bgColor: "rgba(0,255,136,0.08)",
    borderColor: "rgba(0,255,136,0.2)",
    icon: Wifi,
    pulse: false,
  },
  connecting: {
    label: "连接中...",
    color: "#ffdd00",
    bgColor: "rgba(255,221,0,0.08)",
    borderColor: "rgba(255,221,0,0.2)",
    icon: Radio,
    pulse: true,
  },
  reconnecting: {
    label: "重连中",
    color: "#ff6600",
    bgColor: "rgba(255,102,0,0.08)",
    borderColor: "rgba(255,102,0,0.2)",
    icon: RefreshCw,
    pulse: true,
  },
  disconnected: {
    label: "已断开",
    color: "#ff3366",
    bgColor: "rgba(255,51,102,0.08)",
    borderColor: "rgba(255,51,102,0.2)",
    icon: WifiOff,
    pulse: false,
  },
  simulated: {
    label: "模拟模式",
    color: "#00d4ff",
    bgColor: "rgba(0,212,255,0.08)",
    borderColor: "rgba(0,212,255,0.2)",
    icon: Zap,
    pulse: false,
  },
};

export function ConnectionStatus({
  state,
  reconnectCount,
  lastSyncTime,
  onReconnect,
  compact = false,
}: ConnectionStatusProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  if (compact) {
    return (
      <button
        onClick={onReconnect}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
        style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}` }}
        title={`${config.label} | 上次同步: ${lastSyncTime}`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${config.pulse ? "animate-pulse" : ""} ${state === "reconnecting" ? "animate-spin" : ""}`}
          style={{ color: config.color }}
        />
        <span style={{ color: config.color, fontSize: "0.72rem" }}>{config.label}</span>
        {state === "reconnecting" && (
          <span style={{ color: config.color, fontSize: "0.6rem" }}>({reconnectCount}/10)</span>
        )}
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
      style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}` }}
    >
      <Icon
        className={`w-3.5 h-3.5 ${config.pulse ? "animate-pulse" : ""} ${state === "reconnecting" ? "animate-spin" : ""}`}
        style={{ color: config.color }}
      />
      <div className="flex flex-col">
        <span style={{ color: config.color, fontSize: "0.75rem" }}>{config.label}</span>
        <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
          {lastSyncTime}
        </span>
      </div>
      {(state === "disconnected" || state === "simulated") && (
        <button
          onClick={onReconnect}
          className="ml-1 p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all"
          title="手动重连"
        >
          <RefreshCw className="w-3 h-3 text-[rgba(0,212,255,0.5)]" />
        </button>
      )}
    </div>
  );
}