/**
 * yyc3-storage.test.ts
 * =====================
 * IndexedDB 存储层测试
 *
 * 覆盖范围:
 *  - StoreName 类型完整性 (所有 14 个 store 均已注册)
 *  - CRUD 操作 (idbPut/idbGet/idbGetAll/idbDelete/idbClear/idbCount)
 *  - 批量写入 (idbPutMany)
 *  - exportAllData / importAllData
 *  - getStorageStats
 *  - localStorage Key 注册表
 *  - clearAllLocalStorage / clearAllStorage
 *  - BroadcastChannel 同步 (onStorageChange)
 */

// @vitest-environment jsdom
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// IndexedDB 在 jsdom 中不完全可用，测试静态结构和降级行为
import {
  ALL_STORES,
  LOCALSTORAGE_KEYS,
  clearAllLocalStorage,
  clearAllStorage,
  exportAllData,
  getStorageStats,
  idbClear,
  idbCount,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  idbPutMany,
  importAllData,
  lsGet,
  lsGetJSON,
  lsKeys,
  lsRemove,
  lsSet,
  lsSetJSON,
  onStorageChange,
} from "../lib/yyc3-storage";
import type { StoreName, StorageChangeEvent } from "../types";

describe("yyc3-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ──────────────────────────────────────
  //  StoreName 完整性
  // ──────────────────────────────────────

  describe("StoreName 注册完整性", () => {
    it("所有 14 个 store 名称类型可用", () => {
      // RF-004: 现在直接引用 ALL_STORES 常量，不再重复声明
      expect(ALL_STORES.length).toBe(14);
    });

    it("新增的 6 个 Hook 依赖 store 均已注册", () => {
      // useAlertRules → alertRules
      // usePatrol → patrolHistory
      // useServiceLoop → loopHistory
      // useOperationCenter → operationTemplates + operationLogs
      // useAIDiagnostics → diagnosisHistory
      // useReportExporter → reports
      const hookStores: StoreName[] = [
        "alertRules",
        "patrolHistory",
        "loopHistory",
        "operationTemplates",
        "operationLogs",
        "diagnosisHistory",
        "reports",
      ];
      // 编译通过即验证注册成功
      expect(hookStores.length).toBe(7);
    });

    it("数据库管理 & Undo 相关 store 均已注册", () => {
      const dbStores: StoreName[] = [
        "dbConnections",
        "queryHistory",
        "committedChanges",
      ];
      expect(dbStores.length).toBe(3);
    });
  });

  // ──────────────────────────────────────
  //  CRUD 降级行为 (IndexedDB 不可用时)
  // ──────────────────────────────────────

  describe("CRUD 降级行为", () => {
    it("idbGetAll 在 IndexedDB 不可用时返回空数组", async () => {
      const result = await idbGetAll("alertRules");
      // jsdom 环境下 IndexedDB 可能可用也可能不可用
      // 但 API 不应抛出错误
      expect(Array.isArray(result)).toBe(true);
    });

    it("idbGet 在 IndexedDB 不可用时返回 undefined", async () => {
      const result = await idbGet("alertRules", "non-existent");
      expect(result === undefined || result === null || typeof result === "object").toBe(true);
    });

    it("idbPut 不应抛出错误", async () => {
      await expect(
        idbPut("alertRules", { id: "test-1", name: "test" })
      ).resolves.not.toThrow();
    });

    it("idbPutMany 不应抛出错误", async () => {
      await expect(
        idbPutMany("alertRules", [
          { id: "test-1", name: "a" },
          { id: "test-2", name: "b" },
        ])
      ).resolves.not.toThrow();
    });

    it("idbDelete 不应抛出错误", async () => {
      await expect(idbDelete("alertRules", "test-1")).resolves.not.toThrow();
    });

    it("idbClear 不应抛出错误", async () => {
      await expect(idbClear("alertRules")).resolves.not.toThrow();
    });

    it("idbCount 返回数字", async () => {
      const count = await idbCount("alertRules");
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────
  //  数据导入导出
  // ──────────────────────────────────────

  describe("数据导入导出", () => {
    it("exportAllData 返回所有 store 数据", async () => {
      const data = await exportAllData();
      expect(typeof data).toBe("object");
      // 应包含所有 14 个 store
      const keys = Object.keys(data);
      expect(keys).toContain("alertRules");
      expect(keys).toContain("patrolHistory");
      expect(keys).toContain("loopHistory");
      expect(keys).toContain("operationTemplates");
      expect(keys).toContain("operationLogs");
      expect(keys).toContain("diagnosisHistory");
      expect(keys).toContain("reports");
      expect(keys).toContain("dbConnections");
      expect(keys).toContain("queryHistory");
      expect(keys).toContain("committedChanges");
      expect(keys.length).toBe(14);
    });

    it("importAllData 接受空数据", async () => {
      const result = await importAllData({});
      expect(result.imported).toBe(0);
      expect(result.stores).toEqual([]);
    });

    it("importAllData 接受有效数据", async () => {
      const result = await importAllData({
        alertRules: [
          { id: "r1", name: "Rule 1" },
          { id: "r2", name: "Rule 2" },
        ],
      });
      expect(result.imported).toBe(2);
      expect(result.stores).toContain("alertRules");
    });
  });

  // ──────────────────────────────────────
  //  存储统计
  // ──────────────────────────────────────

  describe("getStorageStats", () => {
    it("返回所有 store 的统计信息", async () => {
      const stats = await getStorageStats();
      expect(stats.stores.length).toBe(14);
      expect(typeof stats.totalRecords).toBe("number");

      // 每个 store 都有 name 和 count
      for (const s of stats.stores) {
        expect(s.name).toBeTruthy();
        expect(typeof s.count).toBe("number");
      }
    });
  });

  // ──────────────────────────────────────
  //  localStorage Key 注册表
  // ──────────────────────────────────────

  describe("LOCALSTORAGE_KEYS", () => {
    it("包含所有预期的 key", () => {
      expect(LOCALSTORAGE_KEYS.session).toBe("yyc3_session");
      expect(LOCALSTORAGE_KEYS.ghost).toBe("yyc3_ghost");
      expect(LOCALSTORAGE_KEYS.locale).toBe("yyc3_locale");
      expect(LOCALSTORAGE_KEYS.configuredModels).toBe("yyc3_configured_models");
      expect(LOCALSTORAGE_KEYS.sdkSessions).toBe("yyc3_chat_sessions");
      expect(LOCALSTORAGE_KEYS.sdkStats).toBe("yyc3_sdk_usage_stats");
      expect(LOCALSTORAGE_KEYS.syncQueue).toBe("yyc3_sync_queue");
      expect(LOCALSTORAGE_KEYS.errorLog).toBe("yyc3_error_log");
      expect(LOCALSTORAGE_KEYS.networkConfig).toBe("network_config");
      expect(LOCALSTORAGE_KEYS.offlineSnapshot).toBe("offline_snapshot");
      expect(LOCALSTORAGE_KEYS.offlineTime).toBe("offline_snapshot_time");
      expect(LOCALSTORAGE_KEYS.pwaInstallDismiss).toBe("pwa_install_dismissed");
      expect(LOCALSTORAGE_KEYS.dashboardState).toBe("dashboard_state");
    });

    it("所有 key 值都是字符串", () => {
      for (const val of Object.values(LOCALSTORAGE_KEYS)) {
        expect(typeof val).toBe("string");
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });

  describe("clearAllLocalStorage", () => {
    it("清除所有 YYC³ localStorage 数据", () => {
      // 设置一些值
      for (const key of Object.values(LOCALSTORAGE_KEYS)) {
        localStorage.setItem(key, "test-value");
      }
      // 额外设置一个非 YYC³ 的 key
      localStorage.setItem("other_key", "should_remain");

      clearAllLocalStorage();

      // YYC³ 数据应被清除
      for (const key of Object.values(LOCALSTORAGE_KEYS)) {
        expect(localStorage.getItem(key)).toBeNull();
      }
      // 非 YYC³ 数据应保留
      expect(localStorage.getItem("other_key")).toBe("should_remain");
    });
  });

  describe("clearAllStorage", () => {
    it("清除 localStorage + IndexedDB 不应抛出错误", async () => {
      localStorage.setItem(LOCALSTORAGE_KEYS.session, "test");
      await expect(clearAllStorage()).resolves.not.toThrow();
      expect(localStorage.getItem(LOCALSTORAGE_KEYS.session)).toBeNull();
    });
  });

  // ──────────────────────────────────────
  //  BroadcastChannel
  // ──────────────────────────────────────

  describe("onStorageChange", () => {
    it("返回 unsubscribe 函数", () => {
      const listener = vi.fn();
      const unsubscribe = onStorageChange(listener);
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
    });

    it("unsubscribe 后不应抛出错误", () => {
      const listener = vi.fn();
      const unsubscribe = onStorageChange(listener);
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  // ──────────────────────────────────────
  //  localStorage 安全读写封装 (lsGet/lsSet/...)
  // ──────────────────────────────────────

  describe("localStorage 安全读写封装", () => {
    it("lsGet/lsSet/lsRemove 基础读写删", () => {
      lsSet("k1", "v1");
      expect(lsGet("k1")).toBe("v1");
      expect(lsGet("missing-key")).toBeNull();
      lsRemove("k1");
      expect(lsGet("k1")).toBeNull();
    });

    it("lsGetJSON 解析正常值与 fallback", () => {
      lsSetJSON("kj", { a: 1 });
      expect(lsGetJSON("kj", null)).toEqual({ a: 1 });
      expect(lsGetJSON("missing-json", { fallback: true })).toEqual({ fallback: true });
      localStorage.setItem("kj-bad", "{oops");
      expect(lsGetJSON("kj-bad", "fb")).toBe("fb");
    });

    it("lsKeys 枚举全部 key", () => {
      localStorage.clear();
      lsSet("ka", "1");
      lsSet("kb", "2");
      expect(lsKeys().sort()).toEqual(["ka", "kb"]);
    });

    it("localStorage 异常时各封装静默降级", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
        throw new Error("denied");
      });
      expect(lsGet("any")).toBeNull();
      getItem.mockRestore();

      const getItemJson = vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
        throw new Error("denied");
      });
      expect(lsGetJSON("any", "fb")).toBe("fb");
      getItemJson.mockRestore();

      const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new Error("quota");
      });
      expect(() => lsSet("any", "v")).not.toThrow();
      setItem.mockRestore();

      const setItemJson = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
        throw new Error("quota");
      });
      expect(() => lsSetJSON("any", { v: 1 })).not.toThrow();
      setItemJson.mockRestore();

      const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => {
        throw new Error("denied");
      });
      expect(() => lsRemove("any")).not.toThrow();
      removeItem.mockRestore();

      localStorage.setItem("kk", "1"); // 保证 length ≥ 1, 使 key(i) 被调用
      const keySpy = vi.spyOn(Storage.prototype, "key").mockImplementationOnce(() => {
        throw new Error("denied");
      });
      expect(lsKeys()).toEqual([]);
      keySpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  IndexedDB 真实路径 (globalThis.indexedDB 最小 stub 注入)
  //  说明: 仓库红线禁止引入 fake-indexeddb 依赖, 此处以
  //  vi.stubGlobal 注入满足 yyc3-storage 调用面的最小实现
  // ──────────────────────────────────────

  describe("IndexedDB 真实路径 (stub 注入)", () => {
    /** 各开关: 控制失败/阻塞场景 */
    const state = {
      failOpen: false,
      fireBlocked: false,
      txError: false,
      failTransaction: false,
      getError: false,
      getAllError: false,
      countError: false,
    };

    class FakeRequest {
      onsuccess: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: unknown = undefined;
      error: Error | null = null;
    }

    class FakeObjectStore {
      records = new Map<string, { id: string }>();
      put(item: { id: string }): void {
        this.records.set(item.id, item);
      }
      get(id: string): FakeRequest {
        const req = new FakeRequest();
        if (state.getError) {
          setTimeout(() => {
            req.error = new Error("get failed");
            req.onerror?.();
          }, 0);
        } else {
          req.result = this.records.get(id);
          setTimeout(() => req.onsuccess?.(), 0);
        }
        return req;
      }
      getAll(): FakeRequest {
        const req = new FakeRequest();
        if (state.getAllError) {
          setTimeout(() => {
            req.error = new Error("getAll failed");
            req.onerror?.();
          }, 0);
        } else {
          req.result = [...this.records.values()];
          setTimeout(() => req.onsuccess?.(), 0);
        }
        return req;
      }
      delete(id: string): void {
        this.records.delete(id);
      }
      clear(): void {
        this.records.clear();
      }
      count(): FakeRequest {
        const req = new FakeRequest();
        if (state.countError) {
          setTimeout(() => {
            req.error = new Error("count failed");
            req.onerror?.();
          }, 0);
        } else {
          req.result = this.records.size;
          setTimeout(() => req.onsuccess?.(), 0);
        }
        return req;
      }
    }

    class FakeTransaction {
      oncomplete: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error: Error | null = null;
      constructor(private readonly store: FakeObjectStore) {}
      objectStore(_name: string): FakeObjectStore {
        return this.store;
      }
    }

    class FakeDB {
      stores = new Map<string, FakeObjectStore>();
      closed = false;
      onversionchange: (() => void) | null = null;

      get objectStoreNames(): { contains(name: string): boolean } {
        if (this.closed) throw new Error("InvalidStateError: connection closed");
        return { contains: (name: string) => this.stores.has(name) };
      }

      createObjectStore(name: string): FakeObjectStore {
        const s = new FakeObjectStore();
        this.stores.set(name, s);
        return s;
      }

      close(): void {
        this.closed = true;
      }

      transaction(name: string, _mode: string): FakeTransaction {
        if (this.closed) throw new Error("InvalidStateError");
        if (state.failTransaction) throw new Error("NotFoundError");
        const os = this.stores.get(name);
        if (!os) throw new Error(`NotFoundError: ${name}`);
        const tx = new FakeTransaction(os);
        setTimeout(() => {
          if (state.txError) {
            tx.error = new Error("tx failed");
            tx.onerror?.();
          } else {
            tx.oncomplete?.();
          }
        }, 0);
        return tx;
      }
    }

    type FakeOpenRequest = {
      onupgradeneeded: ((event: { target: { result: FakeDB } }) => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      onblocked: (() => void) | null;
      result: unknown;
      error: Error | null;
    };

    let lastDb: FakeDB;

    const fakeIndexedDB = {
      open(_name: string, _version: number): FakeOpenRequest {
        const req: FakeOpenRequest = {
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
          result: undefined,
          error: null,
        };
        const db = new FakeDB();
        lastDb = db;
        setTimeout(() => {
          if (state.failOpen) {
            req.error = new Error("open failed");
            req.onerror?.();
            return;
          }
          if (state.fireBlocked) req.onblocked?.();
          req.onupgradeneeded?.({ target: { result: db } });
          req.result = db;
          req.onsuccess?.();
        }, 0);
        return req;
      },
    };

    /** 可控 BroadcastChannel stub — 验证跨标签页同步 */
    class MockBroadcastChannel {
      static byName = new Map<string, MockBroadcastChannel>();
      name: string;
      onmessage: ((event: { data: unknown }) => void) | null = null;
      posted: unknown[] = [];
      postShouldThrow = false;
      closed = false;
      constructor(name: string) {
        this.name = name;
        MockBroadcastChannel.byName.set(name, this);
      }
      postMessage(data: unknown): void {
        if (this.postShouldThrow) throw new Error("postMessage failed");
        this.posted.push(data);
      }
      close(): void {
        this.closed = true;
      }
    }

    /** 重置模块后按需导入的全新实例 (独立 dbPromise/缓存/监听器) */
    let storage: typeof import("../lib/yyc3-storage");

    beforeAll(async () => {
      vi.resetModules();
      vi.stubGlobal("indexedDB", fakeIndexedDB);
      vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
      // 静默 openDB/重连分支的 console 输出
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      storage = await import("../lib/yyc3-storage");
    });

    afterAll(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      vi.resetModules();
    });

    beforeEach(() => {
      state.failOpen = false;
      state.fireBlocked = false;
      state.txError = false;
      state.failTransaction = false;
      state.getError = false;
      state.getAllError = false;
      state.countError = false;
    });

    const channel = (): MockBroadcastChannel => {
      const ch = MockBroadcastChannel.byName.get("yyc3_storage_sync");
      if (!ch) throw new Error("storage channel 未创建");
      return ch;
    };

    it("idbPut/get 全链路: 写入后可读取", async () => {
      await storage.idbPut("alertRules", { id: "cr-1", name: "rule-1" });
      const item = await storage.idbGet<{ id: string; name: string }>("alertRules", "cr-1");
      expect(item).toEqual({ id: "cr-1", name: "rule-1" });
      // onupgradeneeded 建表
      expect(lastDb.stores.has("alertRules")).toBe(true);
    });

    it("onupgradeneeded 为全部 14 个 store 建表", async () => {
      await storage.idbCount("alertRules");
      expect(lastDb.stores.size).toBe(ALL_STORES.length);
    });

    it("idbPutMany/getAll 批量写入与读取", async () => {
      await storage.idbPutMany("alertEvents", [
        { id: "ev-1", level: "high" },
        { id: "ev-2", level: "low" },
      ]);
      const all = await storage.idbGetAll<{ id: string }>("alertEvents");
      expect(all.map((x) => x.id).sort()).toEqual(["ev-1", "ev-2"]);
    });

    it("idbPut 完成后广播 put 事件", async () => {
      await storage.idbPut("patrolHistory", { id: "ph-1" });
      const posted = channel().posted as StorageChangeEvent[];
      expect(posted[posted.length - 1]).toMatchObject({
        store: "patrolHistory",
        action: "put",
        key: "ph-1",
      });
    });

    it("idbDelete 删除记录并广播 delete 事件", async () => {
      await storage.idbPut("loopHistory", { id: "lh-1" });
      await storage.idbDelete("loopHistory", "lh-1");
      expect(await storage.idbGet("loopHistory", "lh-1")).toBeUndefined();
      const posted = channel().posted as StorageChangeEvent[];
      expect(posted[posted.length - 1]).toMatchObject({
        store: "loopHistory",
        action: "delete",
        key: "lh-1",
      });
    });

    it("idbClear 清空 store 并广播 clear 事件", async () => {
      await storage.idbPut("reports", { id: "rp-1" });
      await storage.idbClear("reports");
      expect(await storage.idbGetAll("reports")).toEqual([]);
      const posted = channel().posted as StorageChangeEvent[];
      expect(posted[posted.length - 1]).toMatchObject({
        store: "reports",
        action: "clear",
        key: "reports",
      });
    });

    it("idbCount 统计记录数", async () => {
      await storage.idbPut("operationLogs", { id: "ol-1" });
      await storage.idbPut("operationLogs", { id: "ol-2" });
      expect(await storage.idbCount("operationLogs")).toBe(2);
    });

    it("事务失败时写操作拒绝并透传错误", async () => {
      state.txError = true;
      await expect(storage.idbPut("diagnosisHistory", { id: "tx-1" })).rejects.toThrow("tx failed");
      await expect(storage.idbPutMany("diagnosisHistory", [{ id: "tx-2" }])).rejects.toThrow("tx failed");
      await expect(storage.idbDelete("diagnosisHistory", "tx-1")).rejects.toThrow("tx failed");
      await expect(storage.idbClear("diagnosisHistory")).rejects.toThrow("tx failed");
    });

    it("读请求失败时拒绝并透传错误", async () => {
      state.getError = true;
      await expect(storage.idbGet("alertRules", "any")).rejects.toThrow("get failed");
      state.getError = false;

      state.getAllError = true;
      await expect(storage.idbGetAll("alertRules")).rejects.toThrow("getAll failed");
      state.getAllError = false;

      state.countError = true;
      await expect(storage.idbCount("alertRules")).rejects.toThrow("count failed");
      state.countError = false;
    });

    it("事务创建失败时 CRUD 拒绝并透传错误", async () => {
      state.failTransaction = true;
      await expect(storage.idbPut("alertRules", { id: "ft-1" })).rejects.toThrow("NotFoundError");
      await expect(storage.idbPutMany("alertRules", [{ id: "ft-2" }])).rejects.toThrow("NotFoundError");
      await expect(storage.idbGet("alertRules", "ft-1")).rejects.toThrow("NotFoundError");
      await expect(storage.idbGetAll("alertRules")).rejects.toThrow("NotFoundError");
      await expect(storage.idbDelete("alertRules", "ft-1")).rejects.toThrow("NotFoundError");
      await expect(storage.idbClear("alertRules")).rejects.toThrow("NotFoundError");
      await expect(storage.idbCount("alertRules")).rejects.toThrow("NotFoundError");
    });

    it("数据库打开失败时静默降级不抛错", async () => {
      lastDb.onversionchange?.(); // 失效当前连接, 置空模块内 dbPromise 缓存
      state.failOpen = true;
      await expect(storage.idbPut("alertRules", { id: "fail-1" })).resolves.toBeUndefined();
      await expect(storage.idbGet("alertRules", "fail-1")).resolves.toBeUndefined();
      await expect(storage.idbGetAll("alertRules")).resolves.toEqual([]);
      await expect(storage.idbCount("alertRules")).resolves.toBe(0);
      state.failOpen = false;
    });

    it("数据库版本升级被阻塞时输出告警", async () => {
      lastDb.onversionchange?.();
      state.fireBlocked = true;
      await storage.idbCount("alertRules");
      expect(console.warn).toHaveBeenCalled();
      state.fireBlocked = false;
    });

    it("versionchange 后关闭旧连接并自动重连", async () => {
      const stale = lastDb;
      stale.onversionchange?.();
      expect(stale.closed).toBe(true);

      await storage.idbPut("alertRules", { id: "vc-1" });
      expect(lastDb).not.toBe(stale);
      expect(await storage.idbGet("alertRules", "vc-1")).toEqual({ id: "vc-1" });
      expect(console.info).toHaveBeenCalled();
    });

    it("连接失效 (objectStoreNames 抛错) 时自动重连", async () => {
      const stale = lastDb;
      stale.close(); // 直接关闭 — 模块内 dbPromise 仍持有旧连接

      await storage.idbPut("alertRules", { id: "rc-1" });
      expect(lastDb).not.toBe(stale);
      expect(await storage.idbGet("alertRules", "rc-1")).toEqual({ id: "rc-1" });
    });

    it("onStorageChange 监听器接收跨标签页事件", () => {
      const received: StorageChangeEvent[] = [];
      const unsubscribe = storage.onStorageChange((e) => received.push(e));

      const event: StorageChangeEvent = { store: "alertRules", action: "put", key: "x-1", timestamp: 5 };
      channel().onmessage?.({ data: event });
      expect(received).toEqual([event]);

      unsubscribe();
    });

    it("监听器抛错时不影响其他监听器", () => {
      const ok: StorageChangeEvent[] = [];
      const unsubscribe1 = storage.onStorageChange(() => {
        throw new Error("listener boom");
      });
      const unsubscribe2 = storage.onStorageChange((e) => ok.push(e));

      channel().onmessage?.({ data: { store: "reports", action: "clear", key: "reports", timestamp: 6 } });
      expect(ok).toHaveLength(1);

      unsubscribe1();
      unsubscribe2();
    });

    it("重复 unsubscribe 安全无副作用", () => {
      const fn = vi.fn();
      const unsubscribe = storage.onStorageChange(fn);
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });

    it("postMessage 抛错时广播静默降级", async () => {
      const ch = channel();
      ch.postShouldThrow = true;
      await expect(storage.idbPut("queryHistory", { id: "qh-0" })).resolves.toBeUndefined();
      ch.postShouldThrow = false;
    });

    it("exportAllData 导出真实记录", async () => {
      await storage.idbPut("queryHistory", { id: "qh-1" });
      const data = await storage.exportAllData();
      expect(Object.keys(data)).toHaveLength(ALL_STORES.length);
      expect((data.queryHistory as { id: string }[]).map((x) => x.id)).toContain("qh-1");
    });

    it("importAllData 真实写入并返回统计", async () => {
      const result = await storage.importAllData({
        dbConnections: [{ id: "dbc-1", host: "h" }],
      });
      expect(result.imported).toBe(1);
      expect(result.stores).toEqual(["dbConnections"]);
      expect(await storage.idbGet("dbConnections", "dbc-1")).toEqual({ id: "dbc-1", host: "h" });
    });

    it("importAllData 跳过空数组 store", async () => {
      const result = await storage.importAllData({ committedChanges: [] });
      expect(result.imported).toBe(0);
      expect(result.stores).toEqual([]);
    });

    it("getStorageStats 统计真实记录数", async () => {
      await storage.idbPut("fileVersions", { id: "fv-1" });
      await storage.idbPut("fileVersions", { id: "fv-2" });
      const stats = await storage.getStorageStats();
      expect(stats.stores.find((s) => s.name === "fileVersions")?.count).toBe(2);
      expect(stats.totalRecords).toBeGreaterThanOrEqual(2);
    });

    it("clearAllStorage 清空 localStorage 与 IndexedDB", async () => {
      await storage.idbPut("dashboardSnapshots", { id: "ds-1" });
      localStorage.setItem("yyc3_session", "s");

      await storage.clearAllStorage();
      expect(await storage.idbGet("dashboardSnapshots", "ds-1")).toBeUndefined();
      expect(localStorage.getItem("yyc3_session")).toBeNull();
    });
  });
});
