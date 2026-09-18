/**
 * usePatrol.test.tsx
 * ==================
 * usePatrol Hook - 巡查模式状态管理测试 (jsdom 环境)
 *
 * 覆盖范围:
 * - 初始化状态
 * - runPatrol 扫描流程（进度 + 结果）
 * - toggleAutoPatrol 开关
 * - updateInterval 间隔更新
 * - viewReport / closeReport 报告查看
 * - 历史记录追加
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePatrol } from "../hooks/usePatrol";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("usePatrol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("patrolStatus 应为 idle", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.patrolStatus).toBe("idle");
    });

    it("currentResult 应为 null", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.currentResult).toBeNull();
    });

    it("history 应有初始数据", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.history.length).toBeGreaterThan(0);
    });

    it("schedule 应默认启用，间隔 15 分钟", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.schedule.enabled).toBe(true);
      expect(result.current.schedule.interval).toBe(15);
    });

    it("progress 应为 0", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.progress).toBe(0);
    });

    it("selectedReport 应为 null", () => {
      const { result } = renderHook(() => usePatrol());
      expect(result.current.selectedReport).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // runPatrol
  // ----------------------------------------------------------

  describe("runPatrol", () => {
    it("运行巡查后应产生结果", async () => {
      const { result } = renderHook(() => usePatrol());
      const historyBefore = result.current.history.length;

      await act(async () => {
        await result.current.runPatrol("manual");
      });

      expect(result.current.patrolStatus).toBe("completed");
      expect(result.current.currentResult).not.toBeNull();
      expect(result.current.currentResult!.healthScore).toBeGreaterThan(0);
      expect(result.current.currentResult!.checks.length).toBeGreaterThan(0);
      expect(result.current.currentResult!.triggeredBy).toBe("manual");
      expect(result.current.history.length).toBe(historyBefore + 1);
      expect(result.current.progress).toBe(100);
    });

    it("巡查结果应包含检查项", async () => {
      const { result } = renderHook(() => usePatrol());

      await act(async () => {
        await result.current.runPatrol("manual");
      });

      const checks = result.current.currentResult!.checks;
      expect(checks.length).toBeGreaterThan(0);
      expect(checks[0]).toHaveProperty("id");
      expect(checks[0]).toHaveProperty("category");
      expect(checks[0]).toHaveProperty("label");
      expect(checks[0]).toHaveProperty("status");
      expect(checks[0]).toHaveProperty("value");
    });

    it("巡查结果应正确统计各状态数", async () => {
      const { result } = renderHook(() => usePatrol());

      await act(async () => {
        await result.current.runPatrol("manual");
      });

      const r = result.current.currentResult!;
      expect(r.passCount + r.warningCount + r.criticalCount + r.skippedCount).toBe(
        r.totalChecks
      );
    });

    it("auto 触发类型应正确记录", async () => {
      const { result } = renderHook(() => usePatrol());

      await act(async () => {
        await result.current.runPatrol("auto");
      });

      expect(result.current.currentResult!.triggeredBy).toBe("auto");
    });
  });

  // ----------------------------------------------------------
  // toggleAutoPatrol
  // ----------------------------------------------------------

  describe("toggleAutoPatrol", () => {
    it("关闭自动巡查", () => {
      const { result } = renderHook(() => usePatrol());
      act(() => {
        result.current.toggleAutoPatrol(false);
      });
      expect(result.current.schedule.enabled).toBe(false);
      expect(result.current.schedule.nextRun).toBeNull();
    });

    it("开启自动巡查", () => {
      const { result } = renderHook(() => usePatrol());
      act(() => {
        result.current.toggleAutoPatrol(false);
      });
      act(() => {
        result.current.toggleAutoPatrol(true);
      });
      expect(result.current.schedule.enabled).toBe(true);
      expect(result.current.schedule.nextRun).not.toBeNull();
    });
  });

  // ----------------------------------------------------------
  // updateInterval
  // ----------------------------------------------------------

  describe("updateInterval", () => {
    it("应更新巡查间隔", () => {
      const { result } = renderHook(() => usePatrol());
      act(() => {
        result.current.updateInterval(30);
      });
      expect(result.current.schedule.interval).toBe(30);
    });

    it("更新间隔应重新计算 nextRun", () => {
      const { result } = renderHook(() => usePatrol());
      const before = result.current.schedule.nextRun;
      act(() => {
        result.current.updateInterval(60);
      });
      expect(result.current.schedule.nextRun).not.toBe(before);
    });
  });

  // ----------------------------------------------------------
  // viewReport / closeReport
  // ----------------------------------------------------------

  describe("报告查看", () => {
    it("viewReport 应设置 selectedReport", () => {
      const { result } = renderHook(() => usePatrol());
      const report = result.current.history[0];
      act(() => {
        result.current.viewReport(report);
      });
      expect(result.current.selectedReport).toEqual(report);
    });

    it("closeReport 应清除 selectedReport", () => {
      const { result } = renderHook(() => usePatrol());
      act(() => {
        result.current.viewReport(result.current.history[0]);
      });
      act(() => {
        result.current.closeReport();
      });
      expect(result.current.selectedReport).toBeNull();
    });
  });
});
