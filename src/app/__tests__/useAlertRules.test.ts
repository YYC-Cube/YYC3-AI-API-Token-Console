/**
 * useAlertRules.test.ts
 * ======================
 * useAlertRules hook 单元测试
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAlertRules } from "../hooks/useAlertRules";

describe("useAlertRules", () => {
  it("should initialize with mock rules and events", () => {
    const { result } = renderHook(() => useAlertRules());
    expect(result.current.rules.length).toBeGreaterThan(0);
    expect(result.current.events.length).toBeGreaterThan(0);
    expect(result.current.selectedRule).toBeNull();
    expect(result.current.isCreating).toBe(false);
    expect(result.current.filterSeverity).toBe("all");
  });

  it("should compute stats correctly", () => {
    const { result } = renderHook(() => useAlertRules());
    const { stats } = result.current;
    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.activeRules).toBeLessThanOrEqual(stats.totalRules);
    expect(stats.unresolvedEvents).toBeGreaterThanOrEqual(0);
    expect(stats.criticalEvents).toBeGreaterThanOrEqual(0);
  });

  it("should toggle a rule enabled/disabled", () => {
    const { result } = renderHook(() => useAlertRules());
    const ruleId = result.current.rules[0].id;
    const wasBefore = result.current.rules[0].enabled;

    act(() => {
      result.current.toggleRule(ruleId);
    });

    const toggled = result.current.rules.find((r) => r.id === ruleId);
    expect(toggled?.enabled).toBe(!wasBefore);
  });

  it("should delete a rule", () => {
    const { result } = renderHook(() => useAlertRules());
    const initialCount = result.current.rules.length;
    const ruleId = result.current.rules[0].id;

    act(() => {
      result.current.deleteRule(ruleId);
    });

    expect(result.current.rules.length).toBe(initialCount - 1);
    expect(result.current.rules.find((r) => r.id === ruleId)).toBeUndefined();
  });

  it("should clear selectedRule when deleting the selected rule", () => {
    const { result } = renderHook(() => useAlertRules());
    const rule = result.current.rules[0];

    act(() => {
      result.current.setSelectedRule(rule);
    });
    expect(result.current.selectedRule?.id).toBe(rule.id);

    act(() => {
      result.current.deleteRule(rule.id);
    });
    expect(result.current.selectedRule).toBeNull();
  });

  it("should acknowledge an event", () => {
    const { result } = renderHook(() => useAlertRules());
    const unackedEvent = result.current.events.find((e) => !e.acknowledged);
    if (!unackedEvent) return;

    act(() => {
      result.current.acknowledgeEvent(unackedEvent.id);
    });

    const updated = result.current.events.find((e) => e.id === unackedEvent.id);
    expect(updated?.acknowledged).toBe(true);
  });

  it("should resolve an event", () => {
    const { result } = renderHook(() => useAlertRules());
    const unresolvedEvent = result.current.events.find((e) => !e.resolved);
    if (!unresolvedEvent) return;

    act(() => {
      result.current.resolveEvent(unresolvedEvent.id);
    });

    const updated = result.current.events.find((e) => e.id === unresolvedEvent.id);
    expect(updated?.resolved).toBe(true);
    expect(updated?.acknowledged).toBe(true);
  });

  it("should create a new rule", () => {
    const { result } = renderHook(() => useAlertRules());
    const initialCount = result.current.rules.length;

    act(() => {
      result.current.createRule({
        name: "Test Rule",
        enabled: true,
        severity: "warning",
        thresholds: [{ metric: "cpu", condition: "gt", value: 80, unit: "%", duration: 60 }],
        aggregation: { enabled: false, windowMinutes: 0, maxGroupSize: 0 },
        deduplication: { enabled: true, cooldownMinutes: 10 },
        escalation: [{ level: 1, delayMinutes: 0, notifyChannels: ["dashboard"] }],
        targets: ["GPU-A100-01"],
      });
    });

    // 测试重建 id 的 Date.now() 可能与 createRule 内部时间跨毫秒不一致 → 按 name 查找更稳健
    const created = result.current.rules.find((r) => r.name === "Test Rule");
    expect(created).toBeDefined();
    expect(result.current.rules.length).toBe(initialCount + 1);
    expect(created?.triggerCount).toBe(0);
    expect(created?.lastTriggered).toBeNull();
    // isCreating should be reset
    expect(result.current.isCreating).toBe(false);
  });

  it("should filter rules by severity", () => {
    const { result } = renderHook(() => useAlertRules());

    act(() => {
      result.current.setFilterSeverity("critical");
    });

    result.current.rules.forEach((r) => {
      expect(r.severity).toBe("critical");
    });

    act(() => {
      result.current.setFilterSeverity("all");
    });

    // All rules should be back
    expect(result.current.rules.length).toBeGreaterThan(0);
  });

  it("should set and clear selectedRule", () => {
    const { result } = renderHook(() => useAlertRules());
    const rule = result.current.rules[0];

    act(() => {
      result.current.setSelectedRule(rule);
    });
    expect(result.current.selectedRule).toEqual(rule);

    act(() => {
      result.current.setSelectedRule(null);
    });
    expect(result.current.selectedRule).toBeNull();
  });

  it("should set isCreating", () => {
    const { result } = renderHook(() => useAlertRules());

    act(() => {
      result.current.setIsCreating(true);
    });
    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.setIsCreating(false);
    });
    expect(result.current.isCreating).toBe(false);
  });

  it("should have editingRule state", () => {
    const { result } = renderHook(() => useAlertRules());

    expect(result.current.editingRule).toBeNull();

    const rule = result.current.rules[0];
    act(() => {
      result.current.setEditingRule(rule);
    });
    expect(result.current.editingRule?.id).toBe(rule.id);

    act(() => {
      result.current.setEditingRule(null);
    });
    expect(result.current.editingRule).toBeNull();
  });

  it("should update an existing rule", () => {
    const { result } = renderHook(() => useAlertRules());
    const ruleId = result.current.rules[0].id;
    const originalName = result.current.rules[0].name;

    act(() => {
      result.current.updateRule(ruleId, { name: "Updated Name", severity: "info" });
    });

    const updated = result.current.rules.find((r) => r.id === ruleId);
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.severity).toBe("info");
    // editingRule should be cleared
    expect(result.current.editingRule).toBeNull();
  });
});