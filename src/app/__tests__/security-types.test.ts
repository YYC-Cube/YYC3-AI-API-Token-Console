/**
 * security-types.test.ts
 * ========================
 * 安全监控相关类型定义测试
 */

import { describe, it, expect } from "vitest";
import type {
  SecurityTab,
  ScanStatus,
  RiskLevel,
  VitalRating,
  CSPResult,
  CookieResult,
  SensitiveDataResult,
  PerformanceResult,
  MemoryResult,
  WebVital,
  DeviceInfo,
  NetworkInfo,
  BrowserInfo,
  BrowserFeature,
  StorageUsage,
  DataManagementState,
  SecurityMonitorState,
} from "../types";

describe("Security Monitor 类型定义", () => {
  it("SecurityTab 应限定为 4 种值", () => {
    const tabs: SecurityTab[] = ["security", "performance", "diagnostics", "dataManagement"];
    expect(tabs).toHaveLength(4);
  });

  it("ScanStatus 应限定为 3 种值", () => {
    const statuses: ScanStatus[] = ["idle", "scanning", "complete"];
    expect(statuses).toHaveLength(3);
  });

  it("RiskLevel 应限定为 3 种值", () => {
    const levels: RiskLevel[] = ["safe", "warning", "danger"];
    expect(levels).toHaveLength(3);
  });

  it("VitalRating 应限定为 3 种值", () => {
    const ratings: VitalRating[] = ["good", "needs-improvement", "poor"];
    expect(ratings).toHaveLength(3);
  });

  it("CSPResult 结构验证", () => {
    const csp: CSPResult = {
      enabled: true,
      directives: [{ name: "default-src", value: "'self'", status: "pass" }],
      inlineBlocked: true,
      recommendations: ["test"],
      score: 85,
    };
    expect(csp.directives[0].status).toBe("pass");
    expect(csp.score).toBe(85);
  });

  it("CookieResult 结构验证", () => {
    const cookie: CookieResult = {
      count: 3,
      checks: [{ name: "Secure", status: "pass", detail: "ok" }],
      score: 90,
    };
    expect(cookie.checks).toHaveLength(1);
  });

  it("SensitiveDataResult 结构验证", () => {
    const result: SensitiveDataResult = {
      localStorage: [],
      sessionStorage: [],
      consoleRisks: 0,
      totalRisks: 0,
      score: 100,
    };
    expect(result.totalRisks).toBe(0);
  });

  it("WebVital 结构验证", () => {
    const vital: WebVital = {
      name: "FID",
      value: 12,
      unit: "ms",
      rating: "good",
      target: "< 100ms",
    };
    expect(vital.rating).toBe("good");
  });

  it("DeviceInfo 结构验证", () => {
    const device: DeviceInfo = {
      cpuCores: 8,
      memory: 16,
      screen: "1920x1080",
      pixelRatio: 2,
      touchSupport: false,
      gpu: "Test GPU",
      platform: "MacIntel",
      userAgent: "test-ua",
    };
    expect(device.cpuCores).toBe(8);
  });

  it("NetworkInfo 结构验证", () => {
    const network: NetworkInfo = {
      type: "wifi",
      downlink: 100,
      rtt: 10,
      effectiveType: "4g",
      isStable: true,
      saveData: false,
    };
    expect(network.isStable).toBe(true);
  });

  it("BrowserFeature 结构验证", () => {
    const feature: BrowserFeature = {
      name: "WebSocket",
      supported: true,
      polyfillNeeded: false,
    };
    expect(feature.supported).toBe(true);
  });

  it("BrowserInfo 结构验证", () => {
    const browser: BrowserInfo = {
      name: "Chrome",
      version: "120",
      features: [],
      upgradeNeeded: false,
    };
    expect(browser.upgradeNeeded).toBe(false);
  });

  it("StorageUsage 结构验证", () => {
    const storage: StorageUsage = {
      localStorage: 1024,
      sessionStorage: 512,
      indexedDB: 1048576,
      cacheAPI: 524288,
      total: 1574400,
    };
    expect(storage.total).toBe(1574400);
  });

  it("DataManagementState 结构验证", () => {
    const dm: DataManagementState = {
      storage: {
        localStorage: 0,
        sessionStorage: 0,
        indexedDB: 0,
        cacheAPI: 0,
        total: 0,
      },
      lastBackup: null,
      syncEnabled: false,
      expiredItems: 0,
      cacheSize: 0,
    };
    expect(dm.syncEnabled).toBe(false);
  });

  it("SecurityMonitorState 结构验证", () => {
    const state: SecurityMonitorState = {
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
    };
    expect(state.scanStatus).toBe("idle");
    expect(state.vitals).toEqual([]);
  });
});