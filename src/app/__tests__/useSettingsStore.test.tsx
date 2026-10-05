/**
 * useSettingsStore.test.tsx
 * ===========================
 * useSettingsStore Hook - 系统设置统一持久化测试
 *
 * 覆盖范围:
 * - 初始默认值 / localStorage 部分合并加载 / 损坏 JSON 兜底
 * - toggleSetting / updateValue / updateValues / resetSettings
 * - exportSettings / importSettings (含非法 JSON)
 * - BroadcastChannel 多标签页同步 (getSharedChannel mock)
 *
 * Mock 契约: jsdom 无 BroadcastChannel → vi.mock("../lib/broadcast-channel") 注入可控 channel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettingsStore, __resetSettingsStoreForTests, subscribeSettings as subscribeSettingsForTest } from "../hooks/useSettingsStore";
import type { SettingsState } from "../hooks/useSettingsStore";

// ============================================================
// BroadcastChannel 工厂 mock — 捕获 postMessage / message handler
// ============================================================

type MessageHandler = (event: { data: unknown }) => void;

const mockChannel = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockGetSharedChannel = vi.fn<() => BroadcastChannel | null>(
  () => mockChannel as unknown as BroadcastChannel,
);

vi.mock("../lib/broadcast-channel", () => ({
  getSharedChannel: () => mockGetSharedChannel(),
}));

const STORAGE_KEY = "yyc3_system_settings";

function readPersisted(): SettingsState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SettingsState) : null;
}

describe("useSettingsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // P1 单例上提: 存储清理后必须同步复位模块级真值, 防跨用例状态残留
    __resetSettingsStoreForTests();
    mockGetSharedChannel.mockImplementation(() => mockChannel as unknown as BroadcastChannel);
  });

  // ----------------------------------------------------------
  // 初始状态与加载
  // ----------------------------------------------------------

  describe("初始状态与加载", () => {
    it("无持久化数据时应返回默认值", () => {
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.settings.darkMode).toBe(true);
      expect(result.current.settings.alertSlack).toBe(false);
      expect(result.current.values.systemName).toBe("YYC³ CloudPivot Intelli-Matrix v3.2");
      expect(result.current.values.wsEndpoint).toBe("ws://localhost:3113/ws");
    });

    it("持久化的部分字段应与默认值合并", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ toggles: { darkMode: false }, values: { refreshInterval: "10" } }),
      );
      // 单例架构: 磁盘预置数据在「模块加载/显式复位」边界合并 — 模拟冷启动重读
      __resetSettingsStoreForTests();
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.settings.darkMode).toBe(false);
      expect(result.current.settings.autoScale).toBe(true); // 默认值兜底
      expect(result.current.values.refreshInterval).toBe("10");
      expect(result.current.values.clusterId).toBe("CN-EAST-PROD-01"); // 默认值兜底
    });

    it("损坏的持久化 JSON 应回退默认值", () => {
      localStorage.setItem(STORAGE_KEY, "{invalid-json");
      const { result } = renderHook(() => useSettingsStore());
      expect(result.current.settings.darkMode).toBe(true);
      expect(result.current.values.maxNodes).toBe("16");
    });
  });

  // ----------------------------------------------------------
  // 更新操作
  // ----------------------------------------------------------

  describe("更新操作", () => {
    it("toggleSetting 应翻转开关并持久化 + 广播", () => {
      const { result } = renderHook(() => useSettingsStore());
      act(() => {
        result.current.toggleSetting("darkMode");
      });
      expect(result.current.settings.darkMode).toBe(false);

      const persisted = readPersisted();
      expect(persisted?.toggles.darkMode).toBe(false);

      expect(mockChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "settings_update" }),
      );
    });

    it("updateValue 应更新文本值并持久化", () => {
      const { result } = renderHook(() => useSettingsStore());
      act(() => {
        result.current.updateValue("wsEndpoint", "ws://10.0.0.8:3113/ws");
      });
      expect(result.current.values.wsEndpoint).toBe("ws://10.0.0.8:3113/ws");
      expect(readPersisted()?.values.wsEndpoint).toBe("ws://10.0.0.8:3113/ws");
    });

    it("updateValues 应批量更新多个字段", () => {
      const { result } = renderHook(() => useSettingsStore());
      act(() => {
        result.current.updateValues({ aiModel: "glm-4.6", aiTemperature: "0.2" });
      });
      expect(result.current.values.aiModel).toBe("glm-4.6");
      expect(result.current.values.aiTemperature).toBe("0.2");
      expect(readPersisted()?.values.aiModel).toBe("glm-4.6");
    });

    it("resetSettings 应恢复默认值并持久化 + 广播", () => {
      const { result } = renderHook(() => useSettingsStore());
      act(() => {
        result.current.toggleSetting("debugMode");
        result.current.updateValue("logLevel", "debug");
      });
      act(() => {
        result.current.resetSettings();
      });
      expect(result.current.settings.debugMode).toBe(false);
      expect(result.current.values.logLevel).toBe("info");
      expect(readPersisted()?.values.logLevel).toBe("info");
      expect(mockChannel.postMessage).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // 导出 / 导入
  // ----------------------------------------------------------

  describe("导出 / 导入", () => {
    it("exportSettings 应输出含版本元信息的 JSON", () => {
      const { result } = renderHook(() => useSettingsStore());
      const exported = JSON.parse(result.current.exportSettings());
      expect(exported.version).toBe(1);
      expect(typeof exported.exportedAt).toBe("number");
      expect(exported.toggles.darkMode).toBe(true);
      expect(exported.values.timezone).toBe("Asia/Shanghai");
    });

    it("importSettings 合法 JSON 应返回 true 并生效", () => {
      const { result } = renderHook(() => useSettingsStore());
      const json = JSON.stringify({
        version: 1,
        toggles: { mfa: false },
        values: { language: "en-US" },
      });
      let ok = false;
      act(() => {
        ok = result.current.importSettings(json);
      });
      expect(ok).toBe(true);
      expect(result.current.settings.mfa).toBe(false);
      expect(result.current.values.language).toBe("en-US");
      expect(readPersisted()?.values.language).toBe("en-US");
    });

    it("importSettings 非法 JSON 应返回 false 且状态不变", () => {
      const { result } = renderHook(() => useSettingsStore());
      let ok = true;
      act(() => {
        ok = result.current.importSettings("not-json");
      });
      expect(ok).toBe(false);
      expect(result.current.values.language).toBe("zh-CN");
    });
  });

  // ----------------------------------------------------------
  // BroadcastChannel 多标签页同步
  // ----------------------------------------------------------

  describe("BroadcastChannel 同步", () => {
    it("挂载时应注册 message 监听并在卸载时移除", () => {
      const { unmount } = renderHook(() => useSettingsStore());
      expect(mockChannel.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
      unmount();
      expect(mockChannel.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
    });

    it("收到 settings_update 消息应同步状态", () => {
      const { result } = renderHook(() => useSettingsStore());
      const handler = mockChannel.addEventListener.mock.calls[0][1] as MessageHandler;
      const incoming: SettingsState = {
        toggles: { ...result.current.settings, auditLog: false },
        values: { ...result.current.values, cacheSize: "1024" },
      };
      act(() => {
        handler({ data: { type: "settings_update", state: incoming } });
      });
      expect(result.current.settings.auditLog).toBe(false);
      expect(result.current.values.cacheSize).toBe("1024");
    });

    it("非 settings_update 消息应被忽略", () => {
      const { result } = renderHook(() => useSettingsStore());
      const handler = mockChannel.addEventListener.mock.calls[0][1] as MessageHandler;
      act(() => {
        handler({ data: { type: "other_event", state: null } });
      });
      expect(result.current.settings.auditLog).toBe(true);
    });

    it("channel 不可用时应静默跳过监听注册", () => {
      mockGetSharedChannel.mockReturnValueOnce(null);
      const { result } = renderHook(() => useSettingsStore());
      expect(mockChannel.addEventListener).not.toHaveBeenCalled();

      // broadcast 路径 channel 为 null → 可选链静默, 不抛错
      act(() => {
        result.current.toggleSetting("debugMode");
      });
      expect(result.current.settings.debugMode).toBe(true);
    });
  });
});

// ============================================================
// P1 编辑即生效: 同标签页多实例同步 (2026-10-05)
// 治断点① — 原多实例 Hook 经共享 channel 单例不回声, 实例互盲
// ============================================================

describe("useSettingsStore 同页多实例同步", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetSettingsStoreForTests();
    mockGetSharedChannel.mockImplementation(() => mockChannel as unknown as BroadcastChannel);
  });

  it("实例 A 编辑 → 实例 B 即时感知 (useSyncExternalStore 同源)", () => {
    const a = renderHook(() => useSettingsStore());
    const b = renderHook(() => useSettingsStore());
    expect(a.result.current.settings.darkMode).toBe(true);
    expect(b.result.current.settings.darkMode).toBe(true);

    act(() => {
      a.result.current.toggleSetting("darkMode");
    });
    expect(a.result.current.settings.darkMode).toBe(false);
    expect(b.result.current.settings.darkMode).toBe(false); // B 无需任何操作即同步
  });

  it("实例 B updateValue → 实例 A 即时感知", () => {
    const a = renderHook(() => useSettingsStore());
    const b = renderHook(() => useSettingsStore());

    act(() => {
      b.result.current.updateValue("systemName", "Synced-Name");
    });
    expect(a.result.current.values.systemName).toBe("Synced-Name");
  });

  it("subscribeSettings 直订 (非 React 消费方同样生效)", () => {
    const seen: boolean[] = [];
    const unsub = subscribeSettingsForTest((s) => seen.push(s.toggles.debugMode));
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.toggleSetting("debugMode");
    });
    expect(seen).toEqual([true]);
    unsub();
  });
});
