/**
 * useSecurityMonitor.test.tsx
 * =============================
 * Hook 测试: useSecurityMonitor
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSecurityMonitor } from "../hooks/useSecurityMonitor";

describe("useSecurityMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useSecurityMonitor());
    expect(result.current.scanStatus).toBe("idle");
    expect(result.current.activeTab).toBe("security");
    expect(result.current.lastScanTime).toBeNull();
    expect(result.current.csp).toBeNull();
    expect(result.current.cookie).toBeNull();
    expect(result.current.sensitive).toBeNull();
    expect(result.current.performance).toBeNull();
    expect(result.current.memory).toBeNull();
    expect(result.current.vitals).toEqual([]);
    expect(result.current.device).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.browser).toBeNull();
    expect(result.current.dataManagement).toBeNull();
  });

  it("switches active tab", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.setActiveTab("performance");
    });
    expect(result.current.activeTab).toBe("performance");

    act(() => {
      result.current.setActiveTab("diagnostics");
    });
    expect(result.current.activeTab).toBe("diagnostics");

    act(() => {
      result.current.setActiveTab("dataManagement");
    });
    expect(result.current.activeTab).toBe("dataManagement");
  });

  it("starts scan and transitions to scanning state", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    expect(result.current.scanStatus).toBe("scanning");
  });

  it("completes scan after timeout", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    expect(result.current.scanStatus).toBe("scanning");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.scanStatus).toBe("complete");
    expect(result.current.lastScanTime).not.toBeNull();
  });

  it("populates all result fields after scan", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.csp).not.toBeNull();
    expect(result.current.csp!.directives.length).toBeGreaterThan(0);
    expect(result.current.cookie).not.toBeNull();
    expect(result.current.cookie!.checks.length).toBeGreaterThan(0);
    expect(result.current.sensitive).not.toBeNull();
    expect(result.current.performance).not.toBeNull();
    expect(result.current.performance!.resources.length).toBeGreaterThan(0);
    expect(result.current.memory).not.toBeNull();
    expect(result.current.memory!.usedJSHeap).toBeGreaterThan(0);
    expect(result.current.vitals.length).toBeGreaterThan(0);
    expect(result.current.device).not.toBeNull();
    expect(result.current.network).not.toBeNull();
    expect(result.current.browser).not.toBeNull();
    expect(result.current.browser!.features.length).toBeGreaterThan(0);
    expect(result.current.dataManagement).not.toBeNull();
  });

  it("calculates overall score and risk level", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.overallScore).toBeGreaterThan(0);
    expect(result.current.overallScore).toBeLessThanOrEqual(100);
    expect(["safe", "warning", "danger"]).toContain(result.current.overallRisk);
  });

  it("cleanupData reduces expired items count", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    // First scan to populate data
    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const beforeCount = result.current.dataManagement!.expiredItems;
    expect(beforeCount).toBeGreaterThan(0);

    act(() => {
      result.current.cleanupData("expired");
    });
    expect(result.current.dataManagement!.expiredItems).toBe(0);
  });

  it("cleanupData clears cache", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.cleanupData("cache");
    });
    expect(result.current.dataManagement!.cacheSize).toBe(0);
    expect(result.current.dataManagement!.storage.cacheAPI).toBe(0);
  });

  it("cleanupData handles privacy cleanup", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.cleanupData("privacy");
    });
    expect(result.current.dataManagement!.storage.sessionStorage).toBe(0);
  });

  it("CSP mock has valid structure", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const csp = result.current.csp!;
    expect(typeof csp.enabled).toBe("boolean");
    expect(csp.score).toBeGreaterThanOrEqual(0);
    expect(csp.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(csp.directives)).toBe(true);
    expect(Array.isArray(csp.recommendations)).toBe(true);
    csp.directives.forEach((d) => {
      expect(["pass", "warn", "fail"]).toContain(d.status);
    });
  });

  it("Web Vitals have valid ratings", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    result.current.vitals.forEach((v) => {
      expect(["good", "needs-improvement", "poor"]).toContain(v.rating);
      expect(v.value).toBeGreaterThanOrEqual(0);
      expect(v.name).toBeTruthy();
      expect(v.target).toBeTruthy();
    });
  });

  it("device info provides expected fields", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const device = result.current.device!;
    expect(device.cpuCores).toBeGreaterThan(0);
    expect(typeof device.touchSupport).toBe("boolean");
    expect(device.screen).toMatch(/\d+x\d+/);
    expect(device.pixelRatio).toBeGreaterThan(0);
  });

  it("browser features have valid structure", () => {
    const { result } = renderHook(() => useSecurityMonitor());

    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const browser = result.current.browser!;
    expect(browser.name).toBeTruthy();
    expect(browser.version).toBeTruthy();
    browser.features.forEach((f) => {
      expect(typeof f.supported).toBe("boolean");
      expect(typeof f.polyfillNeeded).toBe("boolean");
      expect(f.name).toBeTruthy();
    });
  });
});
