/**
 * usePWAManager.ts
 * ==================
 * PWA & 缓存管理 Hook — 真实数据 (批10 GAP-006 闭环)
 *
 * 数据源 (浏览器真实 API, 无 Mock):
 *   - Service Worker 状态: navigator.serviceWorker.getRegistration()
 *   - 缓存条目: Cache Storage API (yyc3-* 前缀缓存统计)
 *   - SW 版本: 缓存壳 index.html 内容 FNV-1a 指纹前 8 位 (部署即变)
 *   - 在线状态: navigator.onLine + online/offline 事件
 *
 * 降级语义 (jsdom 单测 / 不支持 SW 的环境):
 *   - 无 serviceWorker API → swStatus "unsupported", 条目空, 操作安全无操作 (no-op)
 *   - 无 Cache Storage API → 条目空
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { SWStatus, CacheEntry, PWAState } from "../types";

const CACHE_PREFIX = "yyc3-";

function hasSW(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function hasCaches(): boolean {
  return typeof caches !== "undefined";
}

/** FNV-1a 32-bit → 8 位十六进制 (SW 版本指纹: 壳内容变化即版本变化) */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 统计 yyc3-* 缓存: 条目数 + 响应体大小 (content-length 优先, 缺失则 blob 估算) */
async function readCacheEntries(): Promise<CacheEntry[]> {
  if (!hasCaches()) return [];
  const names = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX));
  return Promise.all(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      let size = 0;
      for (const r of requests) {
        const res = await cache.match(r);
        if (!res) continue;
        const len = res.headers.get("content-length");
        if (len) {
          size += Number(len);
        } else {
          try {
            size += (await res.clone().blob()).size;
          } catch {
            /* 响应体不可读 — 计 0 */
          }
        }
      }
      return { name, size, count: requests.length, lastUpdated: Date.now() };
    })
  );
}

async function detectSWStatus(): Promise<SWStatus> {
  if (!hasSW()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "idle";
  if (reg.waiting) return "waiting";
  if (reg.installing) return "installing";
  if (reg.active) return "active";
  return "idle";
}

/** SW 版本指纹: 缓存壳 index.html 内容 hash; 无壳返回 "—" */
async function detectSWVersion(): Promise<string> {
  if (!hasCaches()) return "—";
  const cache = await caches.open("yyc3-shell-v1");
  const res = await cache.match(new URL("index.html", self.location.href).href);
  if (!res) return "—";
  try {
    return fnv1a(await res.clone().text()).slice(0, 8);
  } catch {
    return "—";
  }
}

export function usePWAManager() {
  const [swStatus, setSWStatus] = useState<SWStatus>("idle");
  const [swVersion, setSWVersion] = useState("—");
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // 初始探测 + 新版本监听 (updatefound → installing worker 装载完成即提示)
  useEffect(() => {
    let cancelled = false;
    let reg: ServiceWorkerRegistration | undefined;

    const sync = () => {
      if (cancelled) return;
      detectSWStatus().then(setSWStatus);
      detectSWVersion().then(setSWVersion);
      readCacheEntries().then(setCacheEntries);
    };
    sync();

    if (hasSW()) {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => {
          if (cancelled || !r) return undefined;
          reg = r;
          reg.addEventListener("updatefound", sync);
          return undefined;
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      reg?.removeEventListener("updatefound", sync);
    };
  }, []);

  // 在线状态事件监听
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const totalCacheSize = useMemo(
    () => cacheEntries.reduce((acc, e) => acc + e.size, 0),
    [cacheEntries]
  );
  const totalCacheCount = useMemo(
    () => cacheEntries.reduce((acc, e) => acc + e.count, 0),
    [cacheEntries]
  );
  const offlineReady = useMemo(
    () => swStatus === "active" && cacheEntries.some((e) => e.name === "yyc3-shell-v1" && e.count > 0),
    [swStatus, cacheEntries]
  );
  const lastCacheUpdate = useMemo(
    () => Math.max(0, ...cacheEntries.map((e) => e.lastUpdated)),
    [cacheEntries]
  );
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

  // SW 更新检查: registration.update() — SW 文件字节变化时触发新 SW 安装接管
  const updateSW = useCallback(async () => {
    if (!hasSW()) return;
    setIsUpdating(true);
    toast.info("正在检查 Service Worker 更新...");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        toast.info("当前无已注册的 Service Worker");
        return;
      }
      await reg.update();
      const status = await detectSWStatus();
      setSWStatus(status);
      toast.success("更新检查完成 — 若有新版本将在后台接管");
    } catch {
      toast.error("更新检查失败");
    } finally {
      setIsUpdating(false);
      setUpdateAvailable(false);
    }
  }, []);

  // 清空全部 yyc3-* 缓存 (壳将在下次导航经 SW network-first 自动重建)
  const clearAllCache = useCallback(async () => {
    if (!hasCaches()) return;
    setIsClearing(true);
    toast.info("正在清空缓存...");
    try {
      const names = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX));
      await Promise.all(names.map((n) => caches.delete(n)));
      setCacheEntries([]);
      setSWVersion("—");
      toast.success("缓存已清空 (壳将在下次访问自动重建)");
    } catch {
      toast.error("缓存清空失败");
    } finally {
      setIsClearing(false);
    }
  }, []);

  // 清理单个缓存
  const clearCache = useCallback(async (cacheName: string) => {
    if (!hasCaches()) return;
    toast.info(`正在清理 ${cacheName}...`);
    try {
      await caches.delete(cacheName);
      setCacheEntries((prev) => prev.filter((e) => e.name !== cacheName));
      if (cacheName === "yyc3-shell-v1") setSWVersion("—");
      toast.success(`${cacheName} 已清理`);
    } catch {
      toast.error("缓存清理失败");
    }
  }, []);

  // 重新统计 (读真实 Cache Storage)
  const refreshCache = useCallback(async () => {
    toast.info("正在刷新缓存统计...");
    try {
      const entries = await readCacheEntries();
      setCacheEntries(entries);
      setSWVersion(await detectSWVersion());
      toast.success("缓存统计已刷新");
    } catch {
      toast.error("缓存统计刷新失败");
    }
  }, []);

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
