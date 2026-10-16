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
      const report = result.current.history[0]!;
      act(() => {
        result.current.viewReport(report);
      });
      expect(result.current.selectedReport).toEqual(report);
    });

    it("closeReport 应清除 selectedReport", () => {
      const { result } = renderHook(() => usePatrol());
      act(() => {
        result.current.viewReport(result.current.history[0]!);
      });
      act(() => {
        result.current.closeReport();
      });
      expect(result.current.selectedReport).toBeNull();
    });
  });
});

// ============================================================
// P1 巡查真实化 (2026-10-05): metrics 实况探测 + 告警投递
// ============================================================

describe("usePatrol 巡查真实化", () => {
  const LIVE = {
    ts: 1,
    activeCount: "1/2",
    nodes: [
      { id: "n1", status: "active", latencyMs: 30, models: ["llama3:8b"] },
      { id: "n2", status: "inactive", latencyMs: -1, models: [] },
    ],
  };

  it("metrics 可达 → 实况检查项 + dataSource=live + critical 投递告警", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(LIVE), { status: 200 })));
    const onCritical = vi.fn();
    const { result } = renderHook(() => usePatrol({ onCritical }));
    await act(async () => { await result.current.runPatrol("manual"); });
    const r = result.current.currentResult;
    expect(r?.dataSource).toBe("live");
    expect(r?.checks.some((c) => c.label.includes("实况"))).toBe(true);
    expect(r?.checks.some((c) => c.label === "节点在线率")).toBe(false); // 模板同类被剔除
    // 1/2 在线 = 50% → critical → 告警投递
    expect(onCritical).toHaveBeenCalledTimes(1);
    expect(onCritical.mock.calls[0]![0]).toMatchObject({ level: "critical", source: "patrol" });
    vi.unstubAllGlobals();
  });

  it("metrics 不可达 → 纯模板降级 dataSource=template 且不投递告警", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const onCritical = vi.fn();
    const { result } = renderHook(() => usePatrol({ onCritical }));
    await act(async () => { await result.current.runPatrol("manual"); });
    expect(result.current.currentResult?.dataSource).toBe("template");
    expect(onCritical).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

// ============================================================
//  S5 分支补盲 — 实况探测矩阵 / 禁用态 nextRun / 自动巡查定时器
//  注: generateChecks 五处阈值 ternary 的 "critical" 尾分支运行时不可达
//  (各 genValue 随机值域不覆盖 critical 区间: 在线率≥90/延迟≤89/GPU≤94/
//  温度≤84/证书≥10 天), 属防御性代码, 无法经公共入口构造。
// ============================================================

describe("usePatrol 分支补盲 (S5)", () => {
  /** 以给定 metrics 响应跑一次手动巡查 */
  async function patrolWith(payload: unknown, status: number) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(payload), { status }))
    );
    const onCritical = vi.fn();
    const { result } = renderHook(() => usePatrol({ onCritical }));
    await act(async () => { await result.current.runPatrol("manual"); });
    vi.unstubAllGlobals();
    return { result, onCritical };
  }

  function checkOf(result: { current: ReturnType<typeof usePatrol> }, id: string) {
    const c = result.current.currentResult?.checks.find((item) => item.id === id);
    expect(c, id).toBeDefined();
    return c!;
  }

  it("全在线 + 高延迟: 在线率 pass / 延迟 critical / 模型负载 pass / 无离线明细", async () => {
    const { result, onCritical } = await patrolWith(
      {
        nodes: [
          { id: "n1", status: "active", latencyMs: 150, models: ["llama3:8b"] },
          { id: "n2", status: "active", latencyMs: 200 }, // 无 models 字段 → ?? 兜底
        ],
      },
      200
    );

    expect(result.current.currentResult?.dataSource).toBe("live");
    const online = checkOf(result, "chk-real-001");
    expect(online.status).toBe("pass"); // 100% ≥ 95
    expect(online.value).toBe("100%");
    expect(online.detail).toBe("2/2 节点在线"); // 无离线节点 → 不拼离线明细
    const latency = checkOf(result, "chk-real-002");
    expect(latency.status).toBe("critical"); // avg 175 ≥ 100
    expect(latency.value).toBe("175ms");
    const models = checkOf(result, "chk-real-003");
    expect(models.status).toBe("pass"); // loadedModels = 1
    expect(models.detail).toContain("n2: 0"); // models 缺省按 0 计
    expect(onCritical).toHaveBeenCalledTimes(1); // 延迟 critical → 告警投递
  });

  it("4/5 在线 + 中等延迟: 在线率 warning / 延迟 warning", async () => {
    const { result } = await patrolWith(
      {
        nodes: [
          { id: "n1", status: "active", latencyMs: 50, models: ["m1"] },
          { id: "n2", status: "active", latencyMs: 60 },
          { id: "n3", status: "active", latencyMs: 80 },
          { id: "n4", status: "active", latencyMs: 110 },
          { id: "n5", status: "down", latencyMs: -1 },
        ],
      },
      200
    );

    const online = checkOf(result, "chk-real-001");
    expect(online.status).toBe("warning"); // 80% ∈ [80, 95)
    expect(online.detail).toBe("4/5 节点在线 · 离线: n5");
    const latency = checkOf(result, "chk-real-002");
    expect(latency.status).toBe("warning"); // avg 75 ∈ [50, 100)
    expect(latency.value).toBe("75ms");
  });

  it("全部离线: 在线率 critical / 延迟 N/A warning / 模型负载 warning + 无负载明细", async () => {
    const { result, onCritical } = await patrolWith(
      {
        nodes: [
          { id: "n1", status: "down", latencyMs: 10 },
          { id: "n2", status: "down", latencyMs: 20 },
        ],
      },
      200
    );

    const online = checkOf(result, "chk-real-001");
    expect(online.status).toBe("critical"); // 0% < 80
    expect(online.value).toBe("0%");
    const latency = checkOf(result, "chk-real-002");
    expect(latency.status).toBe("warning"); // avgLatency = -1
    expect(latency.value).toBe("N/A");
    const models = checkOf(result, "chk-real-003");
    expect(models.status).toBe("warning"); // loadedModels = 0
    expect(models.detail).toBe("无负载"); // active 为空 → join 空串兜底
    expect(onCritical).toHaveBeenCalledTimes(1);
  });

  it("metrics 返回 5xx → 回退模板评估且不投递告警", async () => {
    const { result, onCritical } = await patrolWith({ nodes: [] }, 500);

    expect(result.current.currentResult?.dataSource).toBe("template");
    // 模板随机值域不产生 critical → 无告警
    expect(onCritical).not.toHaveBeenCalled();
  });

  it("metrics nodes 非数组 → 回退模板评估", async () => {
    const { result } = await patrolWith({ nodes: "not-an-array" }, 200);

    expect(result.current.currentResult?.dataSource).toBe("template");
    expect(result.current.currentResult?.checks.some((c) => c.label === "节点在线率")).toBe(true);
  });

  it("自动巡查关闭时 runPatrol 不推进 nextRun", async () => {
    const { result } = renderHook(() => usePatrol());
    act(() => {
      result.current.toggleAutoPatrol(false);
    });
    expect(result.current.schedule.nextRun).toBeNull();

    await act(async () => {
      await result.current.runPatrol("manual");
    });

    expect(result.current.schedule.enabled).toBe(false);
    expect(result.current.schedule.lastRun).not.toBeNull();
    expect(result.current.schedule.nextRun).toBeNull(); // enabled=false → nextRun 保持
  });

  it("自动巡查关闭时更新间隔不重算 nextRun", () => {
    const { result } = renderHook(() => usePatrol());
    act(() => {
      result.current.toggleAutoPatrol(false);
    });
    act(() => {
      result.current.updateInterval(30);
    });
    expect(result.current.schedule.interval).toBe(30);
    expect(result.current.schedule.nextRun).toBeNull();
  });

  it("自动巡查定时器到点触发 auto 巡查", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    try {
      const { result } = renderHook(() => usePatrol());
      // 默认间隔 15min; +5s 冲刷 runPatrol 内部 80ms×5 进度定时器
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 5000);
      });

      expect(result.current.patrolStatus).toBe("completed");
      expect(result.current.currentResult?.triggeredBy).toBe("auto");
      expect(result.current.currentResult?.dataSource).toBe("template");
      expect(result.current.history.length).toBe(6); // 初始 5 + auto 巡查 1
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
