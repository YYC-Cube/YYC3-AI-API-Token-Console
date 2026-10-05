/**
 * useOfflineMode.test.tsx
 * =======================
 * 离线模式检测 & 数据同步 Hook 测试
 *
 * 覆盖范围:
 * - 初始状态 (isOnline 反映 navigator.onLine / lastSyncTime / pendingSync)
 * - 挂载即写 dashboard_state 快照 + 30s 定期刷新 + 卸载清理
 * - online/offline 事件切换与徽标状态
 * - offline 快照持久化 + getOfflineSnapshotTime
 * - online 恢复同步: 有快照延迟清理 / 无快照直接更新时间
 * - saveDashboardState / loadDashboardState 辅助函数
 *
 * Mock 契约 (零外部依赖):
 * - navigator.onLine 经 Object.defineProperty 最小契约 stub
 * - online/offline 事件经 window.dispatchEvent 合成
 * - localStorage 使用 jsdom 真实实现 + beforeEach 重建
 * - 定时器使用 fake timers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOfflineMode } from "../hooks/useOfflineMode";
import { LOCALSTORAGE_KEYS } from "../lib/yyc3-storage";

/** navigator.onLine 只读属性覆写 (最小契约 stub) */
function setOnlineStatus(online: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

describe("useOfflineMode", () => {
  beforeEach(() => {
    localStorage.clear();
    setOnlineStatus(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    setOnlineStatus(true);
  });

  // ----------------------------------------------------------
  // 初始状态
  // ----------------------------------------------------------

  it("初始状态应反映 navigator.onLine 且无同步记录", () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastSyncTime).toBeNull();
    expect(result.current.pendingSync).toBe(false);
    expect(typeof result.current.saveOfflineSnapshot).toBe("function");
    expect(typeof result.current.syncOfflineData).toBe("function");
  });

  it("navigator.onLine=false 时初始 isOnline 应为 false", () => {
    setOnlineStatus(false);
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.isOnline).toBe(false);
  });

  // ----------------------------------------------------------
  // dashboard_state 快照
  // ----------------------------------------------------------

  it("挂载时应立即写入 dashboard_state 快照", () => {
    renderHook(() => useOfflineMode());
    const raw = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState);
    expect(raw).not.toBeNull();
    const state = JSON.parse(raw!) as Record<string, unknown>;
    expect(typeof state.savedAt).toBe("number");
    expect(state.locale).toBe("zh-CN");
    expect(state.modelsCount).toBe(0);
  });

  it("快照应透传 locale 与 networkConfig", () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.locale, "en-US");
    localStorage.setItem(LOCALSTORAGE_KEYS.networkConfig, JSON.stringify({ mode: "auto" }));
    renderHook(() => useOfflineMode());
    const state = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)!);
    expect(state.locale).toBe("en-US");
    expect(state.networkConfig).toBe(JSON.stringify({ mode: "auto" }));
  });

  it("configuredModels 合法时 modelsCount 应统计长度", () => {
    localStorage.setItem(
      LOCALSTORAGE_KEYS.configuredModels,
      JSON.stringify([{ id: "1" }, { id: "2" }, { id: "3" }])
    );
    renderHook(() => useOfflineMode());
    const state = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)!);
    expect(state.modelsCount).toBe(3);
  });

  it("configuredModels 为非法 JSON 时 modelsCount 应回退 0", () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.configuredModels, "{broken-json");
    renderHook(() => useOfflineMode());
    const state = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)!);
    expect(state.modelsCount).toBe(0);
  });

  it("每 30 秒应刷新快照且卸载后停止", () => {
    const { unmount } = renderHook(() => useOfflineMode());
    const first = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)!);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    const second = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)!);
    expect(second.savedAt).toBeGreaterThanOrEqual(first.savedAt);

    unmount();
    const before = localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState);
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.dashboardState)).toBe(before);
  });

  // ----------------------------------------------------------
  // offline 事件 → 徽标切换 + 快照持久化
  // ----------------------------------------------------------

  it("offline 事件应切换徽标并保存离线快照", () => {
    const { result } = renderHook(() => useOfflineMode());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot)).not.toBeNull();
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineTime)).not.toBeNull();
    expect(result.current.getOfflineSnapshotTime()).toBeInstanceOf(Date);
  });

  it("无 dashboard_state 时 offline 事件不应写离线快照", () => {
    renderHook(() => useOfflineMode());
    localStorage.removeItem(LOCALSTORAGE_KEYS.dashboardState);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot)).toBeNull();
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineTime)).toBeNull();
  });

  // ----------------------------------------------------------
  // online 事件 → 同步恢复
  // ----------------------------------------------------------

  it("online 事件且存在离线快照时应延迟同步并清理", async () => {
    const { result } = renderHook(() => useOfflineMode());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot)).not.toBeNull();

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.pendingSync).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.pendingSync).toBe(false);
    expect(result.current.lastSyncTime).not.toBeNull();
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot)).toBeNull();
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineTime)).toBeNull();
  });

  it("无离线快照时 online 事件应直接更新同步时间", () => {
    const { result } = renderHook(() => useOfflineMode());

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.pendingSync).toBe(false);
    expect(result.current.lastSyncTime).not.toBeNull();
    expect(result.current.isOnline).toBe(true);
  });

  // ----------------------------------------------------------
  // 辅助函数
  // ----------------------------------------------------------

  it("getOfflineSnapshotTime 无快照时应返回 null", () => {
    const { result } = renderHook(() => useOfflineMode());
    expect(result.current.getOfflineSnapshotTime()).toBeNull();
  });

  it("saveDashboardState / loadDashboardState 应写入并读回", () => {
    const { result } = renderHook(() => useOfflineMode());

    act(() => {
      result.current.saveDashboardState({ foo: "bar", n: 1 });
    });

    expect(result.current.loadDashboardState()).toEqual({ foo: "bar", n: 1 });
  });

  it("loadDashboardState 对损坏 JSON 应回退 null", () => {
    const { result } = renderHook(() => useOfflineMode());
    localStorage.setItem(LOCALSTORAGE_KEYS.dashboardState, "{broken");
    expect(result.current.loadDashboardState()).toBeNull();
  });

  it("手动 saveOfflineSnapshot 应基于当前 dashboard_state 落盘", () => {
    const { result } = renderHook(() => useOfflineMode());
    act(() => {
      result.current.saveDashboardState({ manual: true });
    });

    act(() => {
      result.current.saveOfflineSnapshot();
    });

    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineSnapshot)).toBe(
      JSON.stringify({ manual: true })
    );
    expect(localStorage.getItem(LOCALSTORAGE_KEYS.offlineTime)).not.toBeNull();
  });
});
