/**
 * useOfflineMode Hook
 * ===================
 * 离线模式检测 & 数据同步
 *
 * 修复: dashboard_state 原本从未写入 → 现在定期保存仪表盘快照
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LOCALSTORAGE_KEYS } from "../lib/yyc3-storage";

/** 保存仪表盘状态快照到 localStorage (供离线恢复) */
function saveDashboardState(data: Record<string, unknown>) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEYS.dashboardState, JSON.stringify(data));
  } catch {
    // storage full
  }
}

/** 读取仪表盘状态快照 */
function loadDashboardState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const snapshotTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 定期保存 dashboard_state (每 30 秒)
  useEffect(() => {
    const saveSnapshot = () => {
      saveDashboardState({
        savedAt: Date.now(),
        locale: localStorage.getItem(LOCALSTORAGE_KEYS.locale) ?? "zh-CN",
        networkConfig: localStorage.getItem(LOCALSTORAGE_KEYS.networkConfig),
        modelsCount: (() => {
          try {
            const raw = localStorage.getItem(LOCALSTORAGE_KEYS.configuredModels);
            return raw ? JSON.parse(raw).length : 0;
          } catch { return 0; }
        })(),
      });
    };

    // 首次保存
    saveSnapshot();
    snapshotTimer.current = setInterval(saveSnapshot, 30_000);

    return () => {
      if (snapshotTimer.current) clearInterval(snapshotTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      saveOfflineSnapshot();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const saveOfflineSnapshot = useCallback(() => {
    try {
      const state = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState);
      if (state) {
        localStorage.setItem(LOCALSTORAGE_KEYS.offlineSnapshot, state);
        localStorage.setItem(LOCALSTORAGE_KEYS.offlineTime, new Date().toISOString());
      }
    } catch {
      // storage full or unavailable
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    const offlineState = localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot);
    if (!offlineState) {
      setLastSyncTime(new Date());
      return;
    }

    setPendingSync(true);
    try {
      // 在真实环境中，这里会 POST 到 /api/sync
      // 当前 Mock 模式：模拟同步延迟
      await new Promise((r) => setTimeout(r, 500));
      localStorage.removeItem(LOCALSTORAGE_KEYS.offlineSnapshot);
      localStorage.removeItem(LOCALSTORAGE_KEYS.offlineTime);
      setLastSyncTime(new Date());
    } catch {
      // 同步失败，保留离线数据
    } finally {
      setPendingSync(false);
    }
  }, []);

  const getOfflineSnapshotTime = useCallback((): Date | null => {
    const time = localStorage.getItem(LOCALSTORAGE_KEYS.offlineTime);
    return time ? new Date(time) : null;
  }, []);

  return {
    isOnline,
    lastSyncTime,
    pendingSync,
    saveOfflineSnapshot,
    syncOfflineData,
    getOfflineSnapshotTime,
    /** 手动保存仪表盘快照 */
    saveDashboardState,
    /** 读取仪表盘快照 */
    loadDashboardState,
  };
}