/**
 * usePersistedState.test.tsx
 * ==========================
 * IndexedDB 持久化 Hook 直接单测 (S4 维度 8 覆盖缺口补齐)
 *
 * 环境: jsdom 无 indexedDB → yyc3-storage 走降级 (idbGetAll catch → [],
 *       写函数静默容错) — 验证降级形态下 Hook 契约: 初始数据保留 / loaded
 *       翻转 / 增删改状态正确。真实 IDB 读写由 integration 档 (显式开关) 覆盖。
 */
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePersistedList } from "../hooks/usePersistedState";

interface Row {
  id: string;
  label: string;
}

const SEED: Row[] = [
  { id: "r1", label: "首条" },
  { id: "r2", label: "次条" },
];

describe("usePersistedList (降级形态: 无 indexedDB)", () => {
  it("加载完成后应保留初始数据且 loaded 翻转", async () => {
    const { result } = renderHook(() => usePersistedList<Row>("alertRules", SEED));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]?.id).toBe("r1");
  });

  it("upsert 新增与更新应正确作用于状态", async () => {
    const { result } = renderHook(() => usePersistedList<Row>("alertRules", SEED));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.upsert({ id: "r3", label: "新增" });
    });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[2]?.label).toBe("新增");

    await act(async () => {
      await result.current.upsert({ id: "r1", label: "已更新" });
    });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0]?.label).toBe("已更新");
  });

  it("remove 与 setAll 应正确收敛状态", async () => {
    const { result } = renderHook(() => usePersistedList<Row>("alertRules", SEED));
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.remove("r1");
    });
    expect(result.current.items.map((i) => i.id)).toEqual(["r2"]);

    await act(async () => {
      await result.current.setAll([{ id: "n1", label: "重置" }]);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe("n1");
  });

  it("unmount 后加载回调不得写状态 (cancelled 守卫)", async () => {
    const { result, unmount } = renderHook(() => usePersistedList<Row>("alertRules", SEED));
    unmount();
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.items).toHaveLength(2);
  });
});
