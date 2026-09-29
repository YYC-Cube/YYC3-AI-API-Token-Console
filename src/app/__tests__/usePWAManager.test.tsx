/**
 * usePWAManager.test.tsx
 * ========================
 * usePWAManager Hook — 真数据流测试 (批10: Mock → 真实 Cache/SW API)
 *
 * 覆盖范围:
 * - jsdom 降级语义 (无 serviceWorker / 无 caches → unsupported + 空统计 + no-op)
 * - stub 真数据流 (caches + navigator.serviceWorker → 统计聚合/更新检查/清空/单删/刷新)
 * - 在线状态事件 (online/offline)
 * - formatSize
 * - pwaState 概览
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePWAManager } from "../hooks/usePWAManager";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

/* ── mock 构造器 ── */

/** 最小 Response 替身 (hook 仅消费 headers.get / clone / text) */
function makeRes(len: number, body = "x") {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "content-length" ? String(len) : null) },
    clone: () => makeRes(len, body),
    text: async () => body,
  };
}

type CacheSpec = Array<{ url: string; len: number; body?: string }>;

function makeMockCache(entries: CacheSpec) {
  return {
    keys: vi.fn(async () => entries.map((e) => ({ url: e.url }))),
    match: vi.fn(async (req: { url: string } | string) => {
      const url = typeof req === "string" ? req : req.url;
      const hit = entries.find((e) => e.url === url);
      return hit ? makeRes(hit.len, hit.body ?? "x") : undefined;
    }),
  };
}

/** stub caches + navigator.serviceWorker; 返回 mocks 供断言 */
function stubBrowser(opts: {
  reg?: { active?: object; waiting?: object; installing?: object };
  cacheNames?: string[];
  entries?: Record<string, CacheSpec>;
}) {
  const cacheNames = opts.cacheNames ?? [];
  const cacheByKey = new Map(cacheNames.map((n) => [n, makeMockCache(opts.entries?.[n] ?? [])]));
  const caches = {
    keys: vi.fn(async () => [...cacheByKey.keys()]),
    open: vi.fn(async (name: string) => cacheByKey.get(name) ?? makeMockCache([])),
    delete: vi.fn(async (name: string) => cacheByKey.delete(name)),
  };
  vi.stubGlobal("caches", caches);
  const reg = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    update: vi.fn(async () => undefined),
    active: opts.reg?.active ?? null,
    waiting: opts.reg?.waiting ?? null,
    installing: opts.reg?.installing ?? null,
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn(async () => (opts.reg ? reg : undefined)) },
  });
  return { caches, reg };
}

/** 与 usePWAManager.ts 内联实现一致的 FNV-1a (测试期望值计算) */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const shellUrl = () => new URL("index.html", window.location.href).href;

describe("usePWAManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.unstubAllGlobals();
  });

  describe("jsdom 降级语义 (无 SW / 无 Cache Storage)", () => {
    it("swStatus 应为 unsupported", async () => {
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swStatus).toBe("unsupported"));
    });

    it("swVersion 应为 — / cacheEntries 空 / 统计为 0", async () => {
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swStatus).toBe("unsupported"));
      expect(result.current.swVersion).toBe("—");
      expect(result.current.cacheEntries).toEqual([]);
      expect(result.current.totalCacheSize).toBe(0);
      expect(result.current.totalCacheCount).toBe(0);
    });

    it("offlineReady / updateAvailable 应为 false, isOnline true", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.offlineReady).toBe(false);
      expect(result.current.updateAvailable).toBe(false);
      expect(result.current.isOnline).toBe(true);
    });

    it("updateSW 在无 SW 环境为安全 no-op", async () => {
      const { result } = renderHook(() => usePWAManager());
      await act(async () => {
        await result.current.updateSW();
      });
      expect(toast.info).not.toHaveBeenCalled();
      expect(result.current.isUpdating).toBe(false);
    });

    it("clearAllCache 在无 Cache Storage 环境为安全 no-op", async () => {
      const { result } = renderHook(() => usePWAManager());
      await act(async () => {
        await result.current.clearAllCache();
      });
      expect(toast.info).not.toHaveBeenCalled();
      expect(result.current.isClearing).toBe(false);
    });

    it("pwaState 应返回完整降级状态对象", async () => {
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swStatus).toBe("unsupported"));
      expect(result.current.pwaState).toMatchObject({
        swStatus: "unsupported",
        swVersion: "—",
        isOnline: true,
        totalCacheSize: 0,
        offlineReady: false,
      });
    });

    it("offline/online 事件应驱动 isOnline", () => {
      const { result } = renderHook(() => usePWAManager());
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      expect(result.current.isOnline).toBe(false);
      act(() => {
        window.dispatchEvent(new Event("online"));
      });
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("真数据流 (stub caches + serviceWorker)", () => {
    const SHELL = "yyc3-shell-v1";
    const ASSETS = "yyc3-assets-v1";

    function stubProdBrowser() {
      return stubBrowser({
        reg: { active: { scriptURL: "/sw.js" } },
        cacheNames: [SHELL, ASSETS, "vendor-cache-v1"],
        entries: {
          [SHELL]: [{ url: shellUrl(), len: 2048, body: "<html>shell-v2</html>" }],
          [ASSETS]: [
            { url: "https://localhost:3000/assets/a.js", len: 1024 },
            { url: "https://localhost:3000/assets/b.css", len: 512 },
          ],
        },
      });
    }

    it("状态探测: SW active + 仅 yyc3-* 缓存聚合 (非前缀被过滤)", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swStatus).toBe("active"));
      expect(result.current.cacheEntries.map((e) => e.name)).toEqual([SHELL, ASSETS]);
      expect(result.current.totalCacheSize).toBe(2048 + 1024 + 512);
      expect(result.current.totalCacheCount).toBe(3);
    });

    it("offlineReady: active + 壳缓存非空", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.offlineReady).toBe(true));
    });

    it("swVersion: 壳内容 FNV-1a 指纹前 8 位", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swVersion).toBe(fnv1a("<html>shell-v2</html>")));
    });

    it("updateSW: 调 registration.update 并成功提示", async () => {
      const { reg } = stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swStatus).toBe("active"));
      await act(async () => {
        await result.current.updateSW();
      });
      expect(reg.update).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("更新检查完成 — 若有新版本将在后台接管");
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.updateAvailable).toBe(false);
    });

    it("clearAllCache: 仅删 yyc3-* 缓存并清空统计", async () => {
      const { caches } = stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.cacheEntries.length).toBe(2));
      await act(async () => {
        await result.current.clearAllCache();
      });
      expect(caches.delete).toHaveBeenCalledTimes(2);
      expect(result.current.cacheEntries).toEqual([]);
      expect(result.current.swVersion).toBe("—");
    });

    it("clearCache (单个): 指定删除 + 其余保留 + 非 shell 版本保留", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.cacheEntries.length).toBe(2));
      await act(async () => {
        await result.current.clearCache(ASSETS);
      });
      expect(result.current.cacheEntries.map((e) => e.name)).toEqual([SHELL]);
      expect(result.current.swVersion).not.toBe("—");
    });

    it("clearCache (壳): 删除后版本指纹复位为 —", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.swVersion).not.toBe("—"));
      await act(async () => {
        await result.current.clearCache(SHELL);
      });
      expect(result.current.swVersion).toBe("—");
    });

    it("refreshCache: 重新统计真实 Cache Storage", async () => {
      stubProdBrowser();
      const { result } = renderHook(() => usePWAManager());
      await waitFor(() => expect(result.current.cacheEntries.length).toBe(2));
      await act(async () => {
        await result.current.refreshCache();
      });
      expect(toast.success).toHaveBeenCalledWith("缓存统计已刷新");
      expect(result.current.totalCacheSize).toBe(2048 + 1024 + 512);
    });
  });

  describe("formatSize", () => {
    it("格式化字节", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(500)).toBe("500B");
    });

    it("格式化 KB", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(3072)).toBe("3.0KB");
    });

    it("格式化 MB", () => {
      const { result } = renderHook(() => usePWAManager());
      expect(result.current.formatSize(2400000)).toBe("2.3MB");
    });
  });
});
