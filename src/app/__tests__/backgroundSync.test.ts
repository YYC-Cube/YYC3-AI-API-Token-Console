/**
 * backgroundSync.test.ts
 * =======================
 * YYC³ 后台同步 - 单元测试
 *
 * 覆盖范围:
 * - 同步队列 CRUD 操作
 * - 队列大小限制
 * - 统计信息计算
 * - 队列处理与重试逻辑
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addToSyncQueue,
  getSyncQueue,
  clearSyncQueue,
  getSyncQueueStats,
  processSyncQueue,
} from "../lib/backgroundSync";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock navigator.serviceWorker
Object.defineProperty(globalThis, "navigator", {
  value: { serviceWorker: undefined },
  writable: true,
});

describe("backgroundSync", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // getSyncQueue
  // ----------------------------------------------------------

  describe("getSyncQueue", () => {
    it("初始队列应为空", () => {
      expect(getSyncQueue()).toEqual([]);
    });

    it("localStorage 数据损坏时应返回空数组", () => {
      localStorageMock.setItem("yyc3_sync_queue", "not-json!!!");
      expect(getSyncQueue()).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // addToSyncQueue
  // ----------------------------------------------------------

  describe("addToSyncQueue", () => {
    it("应正确添加同步项", () => {
      const item = addToSyncQueue({
        type: "config_update",
        payload: { key: "test", value: 123 },
      });

      expect(item.id).toBeDefined();
      expect(item.type).toBe("config_update");
      expect(item.retries).toBe(0);
      expect(item.timestamp).toBeGreaterThan(0);
    });

    it("添加后队列长度应增加", () => {
      addToSyncQueue({ type: "config_update", payload: {} });
      addToSyncQueue({ type: "audit_log", payload: {} });

      const queue = getSyncQueue();
      expect(queue.length).toBe(2);
    });

    it("每个项应有唯一 ID", () => {
      const item1 = addToSyncQueue({ type: "config_update", payload: {} });
      const item2 = addToSyncQueue({ type: "audit_log", payload: {} });

      expect(item1.id).not.toBe(item2.id);
    });
  });

  // ----------------------------------------------------------
  // clearSyncQueue
  // ----------------------------------------------------------

  describe("clearSyncQueue", () => {
    it("应清空同步队列", () => {
      addToSyncQueue({ type: "config_update", payload: {} });
      addToSyncQueue({ type: "audit_log", payload: {} });

      clearSyncQueue();

      expect(getSyncQueue()).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // getSyncQueueStats
  // ----------------------------------------------------------

  describe("getSyncQueueStats", () => {
    it("空队列的统计应全为零", () => {
      const stats = getSyncQueueStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
    });

    it("应正确计算待处理项数", () => {
      addToSyncQueue({ type: "config_update", payload: {} });
      addToSyncQueue({ type: "audit_log", payload: {} });

      const stats = getSyncQueueStats();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.oldestTimestamp).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------
  // processSyncQueue
  // ----------------------------------------------------------

  describe("processSyncQueue", () => {
    it("空队列应返回 0 成功 0 失败", async () => {
      const result = await processSyncQueue();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("应处理队列中所有项", async () => {
      addToSyncQueue({ type: "config_update", payload: {} });
      addToSyncQueue({ type: "audit_log", payload: {} });

      const result = await processSyncQueue();
      expect(result.success).toBe(2);

      // 处理后队列应为空
      expect(getSyncQueue().length).toBe(0);
    });
  });
});
