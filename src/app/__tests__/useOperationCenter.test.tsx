/**
 * useOperationCenter.test.tsx
 * ============================
 * useOperationCenter Hook - 操作中心状态管理测试
 *
 * 覆盖范围:
 * - 初始状态
 * - 分类切换 + 筛选
 * - executeAction 操作执行
 * - 模板 CRUD
 * - 日志筛选 + 搜索
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOperationCenter } from "../hooks/useOperationCenter";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useOperationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  describe("初始状态", () => {
    it("activeCategory 默认为 all", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.activeCategory).toBe("all");
    });

    it("应有 5 个分类", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.categories.length).toBe(5);
    });

    it("应有 12 个操作项（全部分类）", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.actions.length).toBe(12);
    });

    it("应有 3 个模板", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.templates.length).toBe(3);
    });

    it("应有初始日志数据", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.logs.length).toBeGreaterThan(0);
    });

    it("isExecuting 初始为 null", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.isExecuting).toBeNull();
    });

    it("logFilter 默认为 all", () => {
      const { result } = renderHook(() => useOperationCenter());
      expect(result.current.logFilter).toBe("all");
    });
  });

  // ----------------------------------------------------------
  // 分类切换
  // ----------------------------------------------------------

  describe("分类切换", () => {
    it("切换到 node 分类应筛选节点操作", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setActiveCategory("node");
      });
      expect(result.current.activeCategory).toBe("node");
      expect(result.current.actions.every((a) => a.category === "node")).toBe(true);
    });

    it("切换到 model 分类应筛选模型操作", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setActiveCategory("model");
      });
      expect(result.current.actions.every((a) => a.category === "model")).toBe(true);
    });

    it("切换回 all 应显示全部", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setActiveCategory("node");
      });
      act(() => {
        result.current.setActiveCategory("all");
      });
      expect(result.current.actions.length).toBe(12);
    });
  });

  // ----------------------------------------------------------
  // 操作执行
  // ----------------------------------------------------------

  describe("executeAction", () => {
    it("执行后应更新操作状态和添加日志", async () => {
      const { result } = renderHook(() => useOperationCenter());
      const logsBefore = result.current.allLogs.length;

      await act(async () => {
        await result.current.executeAction("qa1");
      });

      // 操作完成后日志应增加
      expect(result.current.allLogs.length).toBe(logsBefore + 1);
      expect(result.current.isExecuting).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 模板管理
  // ----------------------------------------------------------

  describe("模板管理", () => {
    it("addTemplate 应增加模板", () => {
      const { result } = renderHook(() => useOperationCenter());
      const before = result.current.templates.length;
      act(() => {
        result.current.addTemplate("测试模板", "测试用", "system", ["步骤1", "步骤2"]);
      });
      expect(result.current.templates.length).toBe(before + 1);
      expect(result.current.templates[result.current.templates.length - 1].name).toBe("测试模板");
    });

    it("deleteTemplate 应移除模板", () => {
      const { result } = renderHook(() => useOperationCenter());
      const before = result.current.templates.length;
      const targetId = result.current.templates[0].id;
      act(() => {
        result.current.deleteTemplate(targetId);
      });
      expect(result.current.templates.length).toBe(before - 1);
      expect(result.current.templates.find((t) => t.id === targetId)).toBeUndefined();
    });

    it("runTemplate 应更新 lastUsed", async () => {
      const { result } = renderHook(() => useOperationCenter());
      const tpl = result.current.templates[0];

      await act(async () => {
        await result.current.runTemplate(tpl.id);
      });

      const updated = result.current.templates.find((t) => t.id === tpl.id)!;
      expect(updated.lastUsed).toBeGreaterThan(tpl.lastUsed ?? 0);
    });
  });

  // ----------------------------------------------------------
  // 日志筛选
  // ----------------------------------------------------------

  describe("日志筛选", () => {
    it("searchQuery 应筛选日志", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setSearchQuery("重启");
      });
      expect(result.current.logs.every((l) => l.action.includes("重启"))).toBe(true);
    });

    it("空 searchQuery 应返回全部日志", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setSearchQuery("重启");
      });
      act(() => {
        result.current.setSearchQuery("");
      });
      expect(result.current.logs.length).toBe(result.current.allLogs.length);
    });

    it("按分类筛选日志（logFilter=byCategory）", () => {
      const { result } = renderHook(() => useOperationCenter());
      act(() => {
        result.current.setActiveCategory("node");
        result.current.setLogFilter("byCategory");
      });
      expect(result.current.logs.every((l) => l.category === "node")).toBe(true);
    });
  });
});
