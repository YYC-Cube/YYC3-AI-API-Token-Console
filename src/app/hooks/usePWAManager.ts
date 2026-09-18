/**
 * usePWAManager.ts
 * ==================
 * PWA & 缓存管理 Hook
 *
 * 模拟 Service Worker 状态、缓存策略管理
 * 在真实部署中会对接 SW Registration API
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { SWStatus, CacheEntry, PWAState } from "../types";

// ============================================================
// Mock SW / Cache 数据
// ============================================================

const now = Date.now();

const MOCK_CACHE_ENTRIES: CacheEntry[] = [
  { name: "yyc3-static-v1",  size: 2_400_000, count: 48,  lastUpdated: now - 3600000 },
  { name: "yyc3-api-cache",  size: 890_000,   count: 156, lastUpdated: now - 600000 },
  { name: "yyc3-fonts",      size: 340_000,   count: 6,   lastUpdated: now - 86400000 },
  { name: "yyc3-images",     size: 1_200_000, count: 24,  lastUpdated: now - 7200000 },
  { name: "yyc3-runtime",    size: 560_000,   count: 12,  lastUpdated: now - 1800000 },
];

// ============================================================
// Hook
// ============================================================

export function usePWAManager() {
  const [swStatus, setSWStatus] = useState<SWStatus>("active");
  const [swVersion, setSWVersion] = useState("1.4.2");
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>(MOCK_CACHE_ENTRIES);
  const [updateAvailable, setUpdateAvailable] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // 在线状态
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // 缓存总大小
  const totalCacheSize = useMemo(
    () => cacheEntries.reduce((acc, e) => acc + e.size, 0),
    [cacheEntries]
  );

  // 缓存请求总数
  const totalCacheCount = useMemo(
    () => cacheEntries.reduce((acc, e) => acc + e.count, 0),
    [cacheEntries]
  );

  // 离线就绪
  const offlineReady = useMemo(
    () => swStatus === "active" && cacheEntries.length >= 3,
    [swStatus, cacheEntries]
  );

  // 最近缓存更新时间
  const lastCacheUpdate = useMemo(
    () => Math.max(...cacheEntries.map((e) => e.lastUpdated), 0),
    [cacheEntries]
  );

  // PWA 状态概览
  const pwaState = useMemo<PWAState>(
    () => ({
      swStatus,
      swVersion,
      isOnline,
      cacheEntries,
      totalCacheSize,
      offlineReady,
      lastCacheUpdate,
    }),
    [swStatus, swVersion, isOnline, cacheEntries, totalCacheSize, offlineReady, lastCacheUpdate]
  );

  // 更新 Service Worker
  const updateSW = useCallback(async () => {
    if (!updateAvailable) return;
    setIsUpdating(true);
    toast.info("正在更新 Service Worker...");

    await new Promise((r) => setTimeout(r, 2000));

    setSWVersion("1.5.0");
    setUpdateAvailable(false);
    setIsUpdating(false);
    toast.success("Service Worker 已更新到 v1.5.0");
  }, [updateAvailable]);

  // 清空全部缓存
  const clearAllCache = useCallback(async () => {
    setIsClearing(true);
    toast.info("正在清空缓存...");

    await new Promise((r) => setTimeout(r, 1500));

    const freed = totalCacheSize;
    setCacheEntries([]);
    setIsClearing(false);
    toast.success(`缓存已清空 (释放 ${(freed / 1048576).toFixed(1)}MB)`);
  }, [totalCacheSize]);

  // 清理单个缓存
  const clearCache = useCallback(async (cacheName: string) => {
    toast.info(`正在清理 ${cacheName}...`);
    await new Promise((r) => setTimeout(r, 800));

    setCacheEntries((prev) => prev.filter((e) => e.name !== cacheName));
    toast.success(`${cacheName} 已清理`);
  }, []);

  // 刷新缓存
  const refreshCache = useCallback(async () => {
    toast.info("正在刷新缓存...");
    await new Promise((r) => setTimeout(r, 1200));

    setCacheEntries((prev) =>
      prev.map((e) => ({ ...e, lastUpdated: Date.now() }))
    );
    toast.success("缓存已刷新");
  }, []);

  // 格式化大小
  const formatSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  }, []);

  return {
    pwaState,
    swStatus,
    swVersion,
    isOnline,
    cacheEntries,
    totalCacheSize,
    totalCacheCount,
    offlineReady,
    lastCacheUpdate,
    updateAvailable,
    isUpdating,
    isClearing,
    updateSW,
    clearAllCache,
    clearCache,
    refreshCache,
    formatSize,
  };
}