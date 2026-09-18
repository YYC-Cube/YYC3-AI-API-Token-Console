/**
 * useFollowUp.test.tsx
 * =====================
 * useFollowUp Hook - 状态管理测试 (jsdom 环境)
 *
 * 覆盖范围:
 * - 初始化状态（mock 数据加载）
 * - 筛选（severity + status）
 * - 抽屉开关
 * - quickFix 状态变更
 * - markResolved 状态变更
 * - 统计数据计算
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFollowUp } from "../hooks/useFollowUp";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useFollowUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("应加载 mock 告警数据", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.allItems.length).toBe(5);
    });

    it("默认筛选应为 all", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.filterSeverity).toBe("all");
      expect(result.current.filterStatus).toBe("all");
    });

    it("默认抽屉应关闭", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.drawerOpen).toBe(false);
      expect(result.current.drawerItem).toBeNull();
    });

    it("items 应等于 allItems（无筛选时）", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.items.length).toBe(result.current.allItems.length);
    });
  });

  // ----------------------------------------------------------
  // 统计数据
  // ----------------------------------------------------------

  describe("统计数据", () => {
    it("should correctly count total", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.stats.total).toBe(5);
    });

    it("should correctly count critical", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.stats.critical).toBe(1);
    });

    it("should correctly count error", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.stats.error).toBe(1);
    });

    it("should correctly count warning", () => {
      const { result } = renderHook(() => useFollowUp());
      expect(result.current.stats.warning).toBe(2);
    });
  });

  // ----------------------------------------------------------
  // 筛选
  // ----------------------------------------------------------

  describe("筛选", () => {
    it("按 severity=critical 筛选应只返回 1 项", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.setFilterSeverity("critical");
      });
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].severity).toBe("critical");
    });

    it("按 severity=warning 筛选应返回 2 项", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.setFilterSeverity("warning");
      });
      expect(result.current.items.length).toBe(2);
    });

    it("按 status=resolved 筛选应返回已解决项", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.setFilterStatus("resolved");
      });
      expect(result.current.items.every((i) => i.status === "resolved")).toBe(true);
    });

    it("组合筛选: severity=warning + status=active", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.setFilterSeverity("warning");
        result.current.setFilterStatus("active");
      });
      expect(
        result.current.items.every(
          (i) => i.severity === "warning" && i.status === "active"
        )
      ).toBe(true);
    });

    it("无匹配结果时返回空数组", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.setFilterSeverity("info");
        result.current.setFilterStatus("active");
      });
      expect(result.current.items.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 抽屉操作
  // ----------------------------------------------------------

  describe("抽屉操作", () => {
    it("openDrawer 应打开抽屉并设置 item", () => {
      const { result } = renderHook(() => useFollowUp());
      const item = result.current.allItems[0];
      act(() => {
        result.current.openDrawer(item);
      });
      expect(result.current.drawerOpen).toBe(true);
      expect(result.current.drawerItem).toEqual(item);
    });

    it("closeDrawer 应关闭抽屉", () => {
      const { result } = renderHook(() => useFollowUp());
      act(() => {
        result.current.openDrawer(result.current.allItems[0]);
      });
      act(() => {
        result.current.closeDrawer();
      });
      expect(result.current.drawerOpen).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 快速操作
  // ----------------------------------------------------------

  describe("quickFix", () => {
    it("应将告警状态改为 investigating", () => {
      const { result } = renderHook(() => useFollowUp());
      const target = result.current.allItems.find((i) => i.status === "active")!;
      act(() => {
        result.current.quickFix(target);
      });
      const updated = result.current.allItems.find((i) => i.id === target.id)!;
      expect(updated.status).toBe("investigating");
    });
  });

  describe("markResolved", () => {
    it("应将告警状态改为 resolved", () => {
      const { result } = renderHook(() => useFollowUp());
      const target = result.current.allItems.find((i) => i.status === "active")!;
      act(() => {
        result.current.markResolved(target);
      });
      const updated = result.current.allItems.find((i) => i.id === target.id)!;
      expect(updated.status).toBe("resolved");
    });
  });
});
