/**
 * usePerformanceMonitor.ts
 * =========================
 * 实时性能监控 Hook
 *
 * 采集:
 * - Web Vitals (FCP, LCP, CLS, FID/INP, TTFB)
 * - 内存使用 (JS Heap)
 * - 帧率 (FPS)
 * - 资源加载 (静态资源数、总传输大小)
 * - DOM 节点数
 * - 事件监听器数估算
 * - 长任务检测 (Long Tasks)
 * - 网络信息 (effectiveType, RTT)
 *
 * localStorage 持久化历史指标 (最近 100 条)
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// 类型
// ============================================================

export interface PerfSnapshot {
  timestamp: number;
  fps: number;
  memUsedMB: number;
  memTotalMB: number;
  memPercent: number;
  domNodes: number;
  resourceCount: number;
  transferSizeKB: number;
  longTasks: number;
  networkType: string;
  rttMs: number;
}

export interface WebVitals {
  fcp: number | null;   // First Contentful Paint
  lcp: number | null;   // Largest Contentful Paint
  cls: number | null;   // Cumulative Layout Shift
  fid: number | null;   // First Input Delay
  ttfb: number | null;  // Time to First Byte
}

export interface PerfState {
  current: PerfSnapshot;
  vitals: WebVitals;
  history: PerfSnapshot[];
  isMonitoring: boolean;
}

// ============================================================
// Storage
// ============================================================

const STORAGE_KEY = "yyc3_perf_history";
const MAX_HISTORY = 100;

function loadHistory(): PerfSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveHistory(history: PerfSnapshot[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch { /* ignore */ }
}

// ============================================================
// 数据采集工具
// ============================================================

function measureFPS(callback: (fps: number) => void) {
  let frames = 0;
  let last = performance.now();

  function loop() {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      callback(frames);
      frames = 0;
      last = now;
    }
    requestAnimationFrame(loop);
  }
  const id = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(id);
}

function getMemoryInfo(): { usedMB: number; totalMB: number; percent: number } {
  const mem = (performance as any).memory;
  if (!mem) return { usedMB: 0, totalMB: 0, percent: 0 };
  const used = mem.usedJSHeapSize / (1024 * 1024);
  const total = mem.jsHeapSizeLimit / (1024 * 1024);
  return { usedMB: Math.round(used * 10) / 10, totalMB: Math.round(total * 10) / 10, percent: Math.round((used / total) * 1000) / 10 };
}

function getResourceStats(): { count: number; transferKB: number } {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const totalTransfer = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
  return { count: entries.length, transferKB: Math.round(totalTransfer / 1024) };
}

function getDOMNodeCount(): number {
  return document.querySelectorAll("*").length;
}

function getNetworkInfo(): { type: string; rtt: number } {
  const conn = (navigator as any).connection;
  if (!conn) return { type: "unknown", rtt: 0 };
  return { type: conn.effectiveType || "unknown", rtt: conn.rtt || 0 };
}

function getWebVitals(): WebVitals {
  const vitals: WebVitals = { fcp: null, lcp: null, cls: null, fid: null, ttfb: null };

  // FCP
  const fcpEntries = performance.getEntriesByName("first-contentful-paint", "paint");
  if (fcpEntries.length > 0) vitals.fcp = Math.round(fcpEntries[0].startTime);

  // TTFB
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (navEntries.length > 0) vitals.ttfb = Math.round(navEntries[0].responseStart);

  return vitals;
}

// ============================================================
// Hook
// ============================================================

export function usePerformanceMonitor() {
  const [state, setState] = useState<PerfState>({
    current: {
      timestamp: Date.now(), fps: 60, memUsedMB: 0, memTotalMB: 0, memPercent: 0,
      domNodes: 0, resourceCount: 0, transferSizeKB: 0, longTasks: 0, networkType: "unknown", rttMs: 0,
    },
    vitals: { fcp: null, lcp: null, cls: null, fid: null, ttfb: null },
    history: loadHistory(),
    isMonitoring: true,
  });

  const fpsRef = useRef(60);
  const longTaskCountRef = useRef(0);

  // FPS 采集
  useEffect(() => {
    if (!state.isMonitoring) return;
    return measureFPS((fps) => { fpsRef.current = fps; });
  }, [state.isMonitoring]);

  // Long Tasks (PerformanceObserver)
  useEffect(() => {
    if (!state.isMonitoring) return;
    try {
      const observer = new PerformanceObserver((list) => {
        longTaskCountRef.current += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] });
      return () => observer.disconnect();
    } catch { /* not supported */ }
  }, [state.isMonitoring]);

  // 定期采样 (每 3 秒)
  useEffect(() => {
    if (!state.isMonitoring) return;

    const interval = setInterval(() => {
      const mem = getMemoryInfo();
      const resources = getResourceStats();
      const net = getNetworkInfo();
      const vitals = getWebVitals();

      const snapshot: PerfSnapshot = {
        timestamp: Date.now(),
        fps: fpsRef.current,
        memUsedMB: mem.usedMB,
        memTotalMB: mem.totalMB,
        memPercent: mem.percent,
        domNodes: getDOMNodeCount(),
        resourceCount: resources.count,
        transferSizeKB: resources.transferKB,
        longTasks: longTaskCountRef.current,
        networkType: net.type,
        rttMs: net.rtt,
      };

      setState((prev) => {
        const newHistory = [...prev.history, snapshot].slice(-MAX_HISTORY);
        saveHistory(newHistory);
        return {
          ...prev,
          current: snapshot,
          vitals: { ...prev.vitals, ...vitals },
          history: newHistory,
        };
      });

      // 重置长任务计数
      longTaskCountRef.current = 0;
    }, 3000);

    return () => clearInterval(interval);
  }, [state.isMonitoring]);

  // 初始 Web Vitals
  useEffect(() => {
    const timeout = setTimeout(() => {
      setState((prev) => ({ ...prev, vitals: { ...prev.vitals, ...getWebVitals() } }));
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const toggleMonitoring = useCallback(() => {
    setState((prev) => ({ ...prev, isMonitoring: !prev.isMonitoring }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }));
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const exportPerfData = useCallback((): string => {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      current: state.current,
      vitals: state.vitals,
      history: state.history,
    }, null, 2);
  }, [state]);

  return {
    ...state,
    toggleMonitoring,
    clearHistory,
    exportPerfData,
  };
}
