/**
 * useSecurityMonitor.ts
 * ======================
 * Hook for Security & Performance Monitor
 * Provides mock data for CSP, Cookie, Sensitive Data, Performance, Memory, Web Vitals,
 * Device Capabilities, Network Quality, Browser Compatibility, and Data Management.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  SecurityTab,
  ScanStatus,
  RiskLevel,
  VitalRating,
  CSPResult,
  CookieResult,
  SensitiveDataResult,
  ResourceEntry,
  PerformanceResult,
  MemoryResult,
  WebVital,
  DeviceInfo,
  NetworkInfo,
  BrowserFeature,
  BrowserInfo,
  StorageUsage,
  DataManagementState,
  SecurityMonitorState,
} from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

// ============================================================
// Mock Data Generators
// ============================================================

function mockCSP(): CSPResult {
  return {
    enabled: true,
    directives: [
      { name: "default-src", value: "'self'", status: "pass" },
      { name: "script-src", value: "'self' 'unsafe-inline'", status: "warn" },
      { name: "style-src", value: "'self' 'unsafe-inline'", status: "warn" },
      { name: "img-src", value: "'self' data: https:", status: "pass" },
      { name: "connect-src", value: "'self' wss://192.168.3.*", status: "pass" },
      { name: "frame-ancestors", value: "'none'", status: "pass" },
      { name: "base-uri", value: "'self'", status: "pass" },
      { name: "form-action", value: "'self'", status: "pass" },
    ],
    inlineBlocked: false,
    recommendations: [
      "移除 script-src 中的 'unsafe-inline'，改用 nonce 或 hash",
      "添加 upgrade-insecure-requests 指令",
      "配置 report-uri 收集 CSP 违规报告",
    ],
    score: 78,
  };
}

function mockCookie(): CookieResult {
  return {
    count: 4,
    checks: [
      { name: "Secure", status: "pass", detail: "所有 Cookie 已设置 Secure 标志" },
      { name: "HttpOnly", status: "warn", detail: "2/4 Cookie 缺少 HttpOnly 标志" },
      { name: "SameSite", status: "pass", detail: "所有 Cookie 已设置 SameSite=Strict" },
      { name: "过期时间", status: "pass", detail: "所有 Cookie 有合理的过期时间" },
    ],
    score: 82,
  };
}

function mockSensitive(): SensitiveDataResult {
  return {
    localStorage: [
      { key: "yyc3_locale", risk: "safe", detail: "语言设置，无风险" },
      { key: "yyc3_theme", risk: "safe", detail: "主题配置，无风险" },
      { key: "debug_token", risk: "warning", detail: "疑似调试 Token，建议清理" },
    ],
    sessionStorage: [
      { key: "session_cache", risk: "safe", detail: "会话缓存，安全" },
    ],
    consoleRisks: 0,
    totalRisks: 1,
    score: 90,
  };
}

function mockPerformance(): PerformanceResult {
  return {
    resources: [
      { name: "main.js", type: "script", size: 245760, loadTime: 120, cached: true },
      { name: "vendor.js", type: "script", size: 512000, loadTime: 85, cached: true },
      { name: "styles.css", type: "stylesheet", size: 32768, loadTime: 25, cached: true },
      { name: "index.html", type: "document", size: 4096, loadTime: 15, cached: false },
      { name: "logo.svg", type: "image", size: 2048, loadTime: 8, cached: true },
      { name: "fonts.woff2", type: "font", size: 65536, loadTime: 45, cached: true },
    ],
    totalResources: 24,
    totalSize: 1.8 * 1024 * 1024,
    pageLoadTime: 1250,
    imgOptimizations: [
      "3 张图片可转换为 WebP 格式，预计节省 40%",
      "2 张图片可启用懒加载",
      "1 张图片建议使用 srcset 适配多分辨率",
    ],
    jsBundles: [
      { name: "main.js", size: 245760, gzipped: 78643 },
      { name: "vendor.js", size: 512000, gzipped: 163840 },
      { name: "recharts.js", size: 180224, gzipped: 57672 },
    ],
    lazyLoadSavings: 35,
  };
}

function mockMemory(): MemoryResult {
  return {
    usedJSHeap: 45 * 1024 * 1024,
    totalJSHeap: 68 * 1024 * 1024,
    jsHeapLimit: 2048 * 1024 * 1024,
    listeners: 127,
    timers: 8,
    domNodes: 1843,
    leakRisk: "safe",
    trend: [38, 40, 42, 41, 43, 44, 45, 44, 45, 45],
  };
}

function mockVitals(): WebVital[] {
  return [
    { name: "FID", value: 12, unit: "ms", rating: "good", target: "< 100ms" },
    { name: "INP", value: 85, unit: "ms", rating: "good", target: "< 200ms" },
    { name: "CLS", value: 0.03, unit: "", rating: "good", target: "< 0.1" },
    { name: "TTFB", value: 180, unit: "ms", rating: "good", target: "< 800ms" },
    { name: "LCP", value: 1.8, unit: "s", rating: "good", target: "< 2.5s" },
  ];
}

function mockDevice(): DeviceInfo {
  return {
    cpuCores: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8,
    memory: typeof navigator !== "undefined" ? (navigator as any).deviceMemory || null : null,
    screen: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "1920x1080",
    pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2,
    touchSupport: typeof window !== "undefined" ? "ontouchstart" in window : false,
    gpu: "Apple M4 Max GPU (Simulated)",
    platform: typeof navigator !== "undefined" ? navigator.platform || "MacIntel" : "MacIntel",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Mock UA",
  };
}

function mockNetwork(): NetworkInfo {
  const conn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
  return {
    type: conn?.type || "wifi",
    downlink: conn?.downlink || 100,
    rtt: conn?.rtt || 12,
    effectiveType: conn?.effectiveType || "4g",
    isStable: true,
    saveData: conn?.saveData || false,
  };
}

function mockBrowser(): BrowserInfo {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let name = "Chrome";
  let version = "120";
  if (ua.includes("Firefox")) { name = "Firefox"; version = "121"; }
  else if (ua.includes("Safari") && !ua.includes("Chrome")) { name = "Safari"; version = "17"; }

  return {
    name,
    version,
    features: [
      { name: "WebSocket", supported: true, polyfillNeeded: false },
      { name: "Service Worker", supported: true, polyfillNeeded: false },
      { name: "IndexedDB", supported: true, polyfillNeeded: false },
      { name: "Web Crypto API", supported: true, polyfillNeeded: false },
      { name: "ResizeObserver", supported: true, polyfillNeeded: false },
      { name: "IntersectionObserver", supported: true, polyfillNeeded: false },
      { name: "File System Access API", supported: true, polyfillNeeded: false },
      { name: "WebGL 2.0", supported: true, polyfillNeeded: false },
      { name: "CSS Container Queries", supported: true, polyfillNeeded: false },
      { name: "View Transitions API", supported: true, polyfillNeeded: false },
      { name: "Web Bluetooth", supported: false, polyfillNeeded: false },
      { name: "WebXR", supported: false, polyfillNeeded: false },
    ],
    upgradeNeeded: false,
  };
}

function mockDataManagement(): DataManagementState {
  return {
    storage: {
      localStorage: 2048,
      sessionStorage: 512,
      indexedDB: 15 * 1024 * 1024,
      cacheAPI: 8 * 1024 * 1024,
      total: 23 * 1024 * 1024 + 2560,
    },
    lastBackup: Date.now() - 86400000,
    syncEnabled: true,
    expiredItems: 12,
    cacheSize: 8 * 1024 * 1024,
  };
}

// ============================================================
// Hook
// ============================================================

export function useSecurityMonitor() {
  const [state, setState] = useState<SecurityMonitorState>({
    activeTab: "security",
    scanStatus: "idle",
    lastScanTime: null,
    overallScore: 0,
    overallRisk: "safe",
    csp: null,
    cookie: null,
    sensitive: null,
    performance: null,
    memory: null,
    vitals: [],
    device: null,
    network: null,
    browser: null,
    dataManagement: null,
  });

  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveTab = useCallback((tab: SecurityTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const startScan = useCallback(() => {
    setState((prev) => ({ ...prev, scanStatus: "scanning" }));

    // Simulate scanning delay
    scanTimer.current = setTimeout(() => {
      const csp = mockCSP();
      const cookie = mockCookie();
      const sensitive = mockSensitive();
      const perf = mockPerformance();
      const mem = mockMemory();
      const vitals = mockVitals();
      const device = mockDevice();
      const network = mockNetwork();
      const browser = mockBrowser();
      const dataMgmt = mockDataManagement();

      const scores = [csp.score, cookie.score, sensitive.score];
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const risk: RiskLevel = avgScore >= 80 ? "safe" : avgScore >= 60 ? "warning" : "danger";

      setState((prev) => ({
        ...prev,
        scanStatus: "complete",
        lastScanTime: Date.now(),
        overallScore: avgScore,
        overallRisk: risk,
        csp,
        cookie,
        sensitive,
        performance: perf,
        memory: mem,
        vitals,
        device,
        network,
        browser,
        dataManagement: dataMgmt,
      }));
    }, 1800);
  }, []);

  const cleanupData = useCallback((type: "expired" | "cache" | "privacy") => {
    setState((prev) => {
      if (!prev.dataManagement) return prev;
      const dm = { ...prev.dataManagement };
      if (type === "expired") dm.expiredItems = 0;
      if (type === "cache") { dm.cacheSize = 0; dm.storage = { ...dm.storage, cacheAPI: 0 }; }
      if (type === "privacy") {
        dm.storage = { ...dm.storage, sessionStorage: 0 };
      }
      dm.storage.total = dm.storage.localStorage + dm.storage.sessionStorage + dm.storage.indexedDB + dm.storage.cacheAPI;
      return { ...prev, dataManagement: dm };
    });
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-security-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
  }, []);

  return {
    ...state,
    setActiveTab,
    startScan,
    cleanupData,
    exportData,
  };
}