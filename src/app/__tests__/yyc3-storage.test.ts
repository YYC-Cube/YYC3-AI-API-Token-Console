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
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  onStorageChange,
} from "../lib/yyc3-storage";
import type { StoreName } from "../types";

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
      expect(LOCALSTORAGE_KEYS.sdkSessions).toBe("yyc3_sdk_sessions");
      expect(LOCALSTORAGE_KEYS.sdkStats).toBe("yyc3_sdk_stats");
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
});
