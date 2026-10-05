/**
 * useInstallPrompt.test.tsx
 * =========================
 * PWA 安装提示管理 Hook 测试
 *
 * 覆盖范围:
 * - beforeinstallprompt 合成事件捕获 (preventDefault + deferredPrompt)
 * - standalone 模式检测 (matchMedia / navigator.standalone 双路径)
 * - matchMedia change 事件更新安装态
 * - dismissed 持久化 (localStorage) 与 canInstall 门控
 * - promptInstall: 无事件 false / accepted true / dismissed false
 *
 * Mock 契约 (零外部依赖):
 * - matchMedia 以最小契约 stub 覆写 (可捕获 change 监听器)
 * - beforeinstallprompt 经 window.dispatchEvent 合成, prompt/userChoice 以
 *   Object.assign 注入到 Event 实例 (对齐 BeforeInstallPromptEvent 结构)
 * - localStorage 使用 jsdom 真实实现 + beforeEach 重建
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { LOCALSTORAGE_KEYS } from "../lib/yyc3-storage";

type ChangeListener = (e: { matches: boolean }) => void;

let mqlListeners: ChangeListener[];
let mqlMatches: boolean;

/** matchMedia 最小契约 stub — 可捕获 change 监听器并动态翻转 matches */
function installMatchMedia(matches: boolean): void {
  mqlListeners = [];
  mqlMatches = matches;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mqlMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, cb: ChangeListener) => {
        mqlListeners.push(cb);
      },
      removeEventListener: (_type: string, cb: ChangeListener) => {
        mqlListeners = mqlListeners.filter((l) => l !== cb);
      },
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

/** 构造带 prompt/userChoice 的合成 beforeinstallprompt 事件 */
function makeInstallEvent(outcome: "accepted" | "dismissed"): Event {
  const e = new Event("beforeinstallprompt");
  const preventDefault = vi.spyOn(e, "preventDefault");
  Object.assign(e, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
    __preventDefault: preventDefault,
  });
  return e;
}

describe("useInstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    installMatchMedia(false);
    delete (window.navigator as { standalone?: boolean }).standalone;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始状态: 未捕获事件时 canInstall 应为 false", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canInstall).toBe(false);
    expect(typeof result.current.promptInstall).toBe("function");
    expect(typeof result.current.dismiss).toBe("function");
  });

  it("beforeinstallprompt 事件应被捕获且 canInstall 变为 true", () => {
    const { result } = renderHook(() => useInstallPrompt());

    const preventDefaultSpy = vi.spyOn(Event.prototype, "preventDefault");
    const e = new Event("beforeinstallprompt");
    Object.assign(e, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(e);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(true);
  });

  it("standalone matchMedia 命中时 isInstalled 应为 true", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it("navigator.standalone=true (iOS) 时 isInstalled 应为 true", () => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it("matchMedia change 事件应更新安装态", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(false);

    act(() => {
      mqlListeners.forEach((cb) => cb({ matches: true }));
    });
    expect(result.current.isInstalled).toBe(true);
  });

  it("已 dismiss 过 (localStorage 有记录) 时 canInstall 应保持 false", () => {
    localStorage.setItem(LOCALSTORAGE_KEYS.pwaInstallDismiss, "true");
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(makeInstallEvent("accepted"));
    });

    expect(result.current.canInstall).toBe(false);
  });

  it("dismiss 应持久化到 localStorage 并关闭 canInstall", () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(makeInstallEvent("accepted"));
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(localStorage.getItem(LOCALSTORAGE_KEYS.pwaInstallDismiss)).toBe("true");
    expect(result.current.canInstall).toBe(false);
  });

  it("无 deferredPrompt 时 promptInstall 应返回 false", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.promptInstall();
    });
    expect(ok).toBe(false);
  });

  it("用户接受安装时 promptInstall 应返回 true 且进入已安装态", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const e = new Event("beforeinstallprompt");
    Object.assign(e, {
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    act(() => {
      window.dispatchEvent(e);
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.promptInstall();
    });

    expect(promptFn).toHaveBeenCalledTimes(1);
    expect(ok).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it("用户拒绝安装时 promptInstall 应返回 false 且保留安装入口", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const e = new Event("beforeinstallprompt");
    Object.assign(e, {
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });

    act(() => {
      window.dispatchEvent(e);
    });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.promptInstall();
    });

    expect(promptFn).toHaveBeenCalledTimes(1);
    expect(ok).toBe(false);
    expect(result.current.canInstall).toBe(true);
  });
});
