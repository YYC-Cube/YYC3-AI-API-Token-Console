/**
 * OfflineIndicator.tsx
 * ====================
 * 网络状态指示器组件
 * - 固定在顶部显示当前在线/离线状态
 * - 离线时显示上次同步时间
 * - 恢复在线时自动淡出
 */

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { useOfflineMode } from "../hooks/useOfflineMode";

export function OfflineIndicator() {
  const { isOnline, lastSyncTime, pendingSync } = useOfflineMode();
  const [show, setShow] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setJustReconnected(false);
    } else if (show) {
      // 刚恢复在线，短暂显示"已恢复连接"
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setShow(false);
        setJustReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[180] pointer-events-none flex justify-center pt-2">
      <div
        className={`pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-xl backdrop-blur-xl border shadow-[0_4px_30px_rgba(0,0,0,0.3)] transition-all duration-500 ${
          justReconnected
            ? "bg-[rgba(0,255,136,0.1)] border-[rgba(0,255,136,0.3)]"
            : "bg-[rgba(255,51,102,0.1)] border-[rgba(255,51,102,0.3)]"
        }`}
      >
        {justReconnected ? (
          <>
            <Wifi className="w-4 h-4 text-[#00ff88]" />
            <span className="text-[#00ff88]" style={{ fontSize: "0.78rem" }}>
              网络已恢复
            </span>
            {pendingSync && (
              <span className="flex items-center gap-1 text-[rgba(0,255,136,0.6)]" style={{ fontSize: "0.7rem" }}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                同步中...
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-[#ff3366]" />
            <span className="text-[#ff3366]" style={{ fontSize: "0.78rem" }}>
              离线模式
            </span>
            <CloudOff className="w-3.5 h-3.5 text-[rgba(255,51,102,0.5)]" />
            {lastSyncTime && (
              <span
                className="text-[rgba(255,51,102,0.5)]"
                style={{ fontSize: "0.68rem" }}
              >
                上次同步: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
