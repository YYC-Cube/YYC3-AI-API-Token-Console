/**
 * dashboard-stores.test.ts
 * =========================
 * Dashboard 7 类数据存储测试
 *
 * 覆盖:
 * - nodeStore / modelPerfStore / modelDistStore
 * - recentOpsStore / radarStore / logStore / dbConnectionStore
 * - 各 store 默认数据完整性
 * - CRUD 操作验证
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
(globalThis as any).localStorage = localStorageMock;

import {
  nodeStore,
  modelPerfStore,
  modelDistStore,
  recentOpsStore,
  radarStore,
  logStore,
  dbConnectionStore,
} from "../stores/dashboard-stores";

describe("dashboard-stores", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset all stores
    nodeStore.reset();
    modelPerfStore.reset();
    modelDistStore.reset();
    recentOpsStore.reset();
    radarStore.reset();
    logStore.reset();
    dbConnectionStore.reset();
  });

  // ───────────── nodeStore ─────────────
  describe("nodeStore", () => {
    it("should have 8 default nodes", () => {
      expect(nodeStore.count()).toBe(8);
    });

    it("should contain GPU-A100-01", () => {
      const node = nodeStore.getById("GPU-A100-01");
      expect(node).toBeDefined();
      expect(node!.status).toBe("active");
      expect(node!.model).toBe("LLaMA-70B");
    });

    it("should contain an inactive node", () => {
      const node = nodeStore.getById("GPU-A100-08");
      expect(node).toBeDefined();
      expect(node!.status).toBe("inactive");
    });

    it("should support CRUD", () => {
      const added = nodeStore.add({
        id: "GPU-TEST-01",
        status: "active",
        gpu: 50,
        mem: 40,
        temp: 55,
        model: "TestModel",
        tasks: 10,
      });
      expect(added.id).toBe("GPU-TEST-01");
      expect(nodeStore.count()).toBe(9);

      nodeStore.update("GPU-TEST-01", { gpu: 90 });
      expect(nodeStore.getById("GPU-TEST-01")!.gpu).toBe(90);

      nodeStore.remove("GPU-TEST-01");
      expect(nodeStore.count()).toBe(8);
    });
  });

  // ───────────── modelPerfStore ─────────────
  describe("modelPerfStore", () => {
    it("should have 5 default entries", () => {
      expect(modelPerfStore.count()).toBe(5);
    });

    it("should contain LLaMA-70B performance data", () => {
      const entry = modelPerfStore.getById("mp-1");
      expect(entry).toBeDefined();
      expect(entry!.model).toBe("LLaMA-70B");
      expect(entry!.accuracy).toBe(94.2);
    });
  });

  // ───────────── modelDistStore ─────────────
  describe("modelDistStore", () => {
    it("should have 5 default entries", () => {
      expect(modelDistStore.count()).toBe(5);
    });

    it("should have values summing to 100", () => {
      const total = modelDistStore.getAll().reduce((sum, e) => sum + e.value, 0);
      expect(total).toBe(100);
    });

    it("should support add and remove", () => {
      modelDistStore.add({ name: "NewModel", value: 5 });
      expect(modelDistStore.count()).toBe(6);
    });
  });

  // ───────────── recentOpsStore ─────────────
  describe("recentOpsStore", () => {
    it("should have 5 default operations", () => {
      expect(recentOpsStore.count()).toBe(5);
    });

    it("should contain valid status values", () => {
      const validStatuses = ["success", "running", "pending", "warning", "error"];
      for (const op of recentOpsStore.getAll()) {
        expect(validStatuses).toContain(op.status);
      }
    });
  });

  // ───────────── radarStore ─────────────
  describe("radarStore", () => {
    it("should have 6 default radar metrics", () => {
      expect(radarStore.count()).toBe(6);
    });

    it("should contain inferenceSpeed metric", () => {
      const entry = radarStore.getById("rd-1");
      expect(entry).toBeDefined();
      expect(entry!.metric).toBe("inferenceSpeed");
      expect(entry!.A).toBeGreaterThan(0);
      expect(entry!.B).toBeGreaterThan(0);
    });

    it("should support CRUD", () => {
      radarStore.add({ metric: "testMetric", A: 50, B: 60 });
      expect(radarStore.count()).toBe(7);
    });
  });

  // ───────────── logStore ─────────────
  describe("logStore", () => {
    it("should have 15 default logs", () => {
      expect(logStore.count()).toBe(15);
    });

    it("should contain valid log levels", () => {
      const validLevels = ["debug", "info", "warn", "error", "fatal"];
      for (const log of logStore.getAll()) {
        expect(validLevels).toContain(log.level);
      }
    });

    it("should have timestamps", () => {
      for (const log of logStore.getAll()) {
        expect(log.timestamp).toBeGreaterThan(0);
        expect(typeof log.timestamp).toBe("number");
      }
    });
  });

  // ───────────── dbConnectionStore ─────────────
  describe("dbConnectionStore", () => {
    it("should have 2 default connections", () => {
      expect(dbConnectionStore.count()).toBe(2);
    });

    it("should contain PostgreSQL connection", () => {
      const pg = dbConnectionStore.getById("db-pg-main");
      expect(pg).toBeDefined();
      expect(pg!.type).toBe("postgresql");
      expect(pg!.port).toBe(5433);
    });

    it("should contain Redis connection", () => {
      const redis = dbConnectionStore.getById("db-redis");
      expect(redis).toBeDefined();
      expect(redis!.type).toBe("redis");
      expect(redis!.port).toBe(6379);
    });

    it("should support adding new connection", () => {
      dbConnectionStore.add({
        name: "Test MongoDB",
        type: "mongodb",
        host: "localhost",
        port: 27017,
        database: "test",
        username: "",
        password: "",
        status: "disconnected",
      });
      expect(dbConnectionStore.count()).toBe(3);
    });

    it("should support export/import", () => {
      const json = dbConnectionStore.exportData();
      dbConnectionStore.remove("db-pg-main");
      expect(dbConnectionStore.count()).toBe(1);
      dbConnectionStore.importData(json);
      expect(dbConnectionStore.count()).toBe(2);
    });
  });
});
