/**
 * useAIDiagnostics.test.ts
 * =========================
 * useAIDiagnostics hook 单元测试
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIDiagnostics } from "../hooks/useAIDiagnostics";

describe("useAIDiagnostics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with idle status and no session", () => {
    const { result } = renderHook(() => useAIDiagnostics());
    expect(result.current.status).toBe("idle");
    expect(result.current.session).toBeNull();
    expect(result.current.activeView).toBe("patterns");
    expect(result.current.executingAction).toBeNull();
  });

  it("should have initial history items", () => {
    const { result } = renderHook(() => useAIDiagnostics());
    expect(result.current.history.length).toBe(3);
    result.current.history.forEach((h) => {
      expect(h.id).toBeTruthy();
      expect(h.time).toBeGreaterThan(0);
      expect(h.patterns).toBeGreaterThanOrEqual(0);
      expect(h.actions).toBeGreaterThanOrEqual(0);
    });
  });

  it("should set status to analyzing on startDiagnosis", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });

    expect(result.current.status).toBe("analyzing");
    expect(result.current.session).toBeNull();
  });

  it("should complete diagnosis after timeout", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.status).toBe("complete");
    expect(result.current.session).not.toBeNull();
  });

  it("should generate session with patterns, anomalies, actions, forecasts", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const session = result.current.session!;
    expect(session.patterns.length).toBeGreaterThan(0);
    expect(session.anomalies.length).toBeGreaterThan(0);
    expect(session.actions.length).toBeGreaterThan(0);
    expect(session.forecasts.length).toBeGreaterThan(0);
    expect(session.summary).toBeTruthy();
    expect(session.completedAt).not.toBeNull();
  });

  it("should add to history after diagnosis completes", () => {
    const { result } = renderHook(() => useAIDiagnostics());
    const initialHistoryCount = result.current.history.length;

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.history.length).toBe(initialHistoryCount + 1);
    expect(result.current.history[0].id).toContain("diag-");
  });

  it("should switch active view", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.setActiveView("anomalies");
    });
    expect(result.current.activeView).toBe("anomalies");

    act(() => {
      result.current.setActiveView("actions");
    });
    expect(result.current.activeView).toBe("actions");

    act(() => {
      result.current.setActiveView("forecasts");
    });
    expect(result.current.activeView).toBe("forecasts");
  });

  it("should handle executeAction", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const actionId = result.current.session!.actions[0].id;

    act(() => {
      result.current.executeAction(actionId);
    });
    expect(result.current.executingAction).toBe(actionId);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.executingAction).toBeNull();
  });

  it("should accept WebSocket data options", () => {
    const liveNodes = [
      { id: "GPU-A100-01", gpu: 95, mem: 88, temp: 72, status: "warning" },
      { id: "GPU-A100-02", gpu: 45, mem: 55, temp: 50, status: "active" },
    ];

    const { result } = renderHook(() =>
      useAIDiagnostics({
        liveNodes,
        liveQPS: 4200,
        liveLatency: 85,
      })
    );

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const session = result.current.session!;
    expect(session.summary).toContain("WebSocket");
    // Should include live node data
    expect(session.patterns.some((p) => p.title.includes("GPU-A100-01"))).toBe(true);
  });

  it("should work without options (fallback to mock)", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const session = result.current.session!;
    expect(session.patterns.length).toBeGreaterThan(0);
    expect(session.summary).not.toContain("WebSocket");
  });

  it("should cap history at 10 entries", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    for (let i = 0; i < 12; i++) {
      act(() => {
        result.current.startDiagnosis();
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    }

    // 3 initial + up to 10 new = capped
    expect(result.current.history.length).toBeLessThanOrEqual(13);
  });

  it("should clean up timer on unmount", () => {
    const { result, unmount } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });

    unmount();

    // Should not throw after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  });

  it("should validate pattern structure", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const pattern = result.current.session!.patterns[0];
    expect(pattern.id).toBeTruthy();
    expect(["recurring", "gradual", "spike", "correlation", "seasonal"]).toContain(pattern.type);
    expect(pattern.title).toBeTruthy();
    expect(["high", "medium", "low"]).toContain(pattern.confidence);
    expect(pattern.affectedNodes.length).toBeGreaterThan(0);
    expect(pattern.dataPoints.length).toBeGreaterThan(0);
  });

  it("should validate forecast structure", () => {
    const { result } = renderHook(() => useAIDiagnostics());

    act(() => {
      result.current.startDiagnosis();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const forecast = result.current.session!.forecasts[0];
    expect(forecast.metric).toBeTruthy();
    expect(typeof forecast.currentValue).toBe("number");
    expect(typeof forecast.predictedValue).toBe("number");
    expect(["up", "down", "stable"]).toContain(forecast.trend);
    expect(["safe", "warning", "danger"]).toContain(forecast.riskLevel);
  });
});