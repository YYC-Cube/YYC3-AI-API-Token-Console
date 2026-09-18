/**
 * create-local-store.test.ts
 * ===========================
 * createLocalStore 通用 localStorage CRUD 工厂单元测试
 *
 * 覆盖:
 * - getAll / getById
 * - add (auto id / custom id)
 * - update / remove / removeBatch
 * - reset
 * - exportData / importData
 * - count
 * - localStorage 持久化
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

import { createLocalStore, type LocalStore } from "../lib/create-local-store";

interface TestItem {
  id: string;
  name: string;
  value: number;
}

const DEFAULTS: TestItem[] = [
  { id: "t-1", name: "Alpha", value: 10 },
  { id: "t-2", name: "Beta", value: 20 },
  { id: "t-3", name: "Gamma", value: 30 },
];

describe("createLocalStore", () => {
  let s: LocalStore<TestItem>;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    s = createLocalStore<TestItem>("test_store", DEFAULTS, "t");
  });

  // ───────────── getAll ─────────────
  describe("getAll", () => {
    it("should return defaults on first call", () => {
      const items = s.getAll();
      expect(items).toHaveLength(3);
      expect(items[0].name).toBe("Alpha");
    });

    it("should return a copy, not reference", () => {
      const a = s.getAll();
      const b = s.getAll();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });

    it("should persist defaults to localStorage on first call", () => {
      s.getAll();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "test_store",
        expect.any(String)
      );
    });
  });

  // ───────────── getById ─────────────
  describe("getById", () => {
    it("should find existing item", () => {
      const item = s.getById("t-2");
      expect(item).toBeDefined();
      expect(item!.name).toBe("Beta");
    });

    it("should return undefined for non-existent id", () => {
      expect(s.getById("nope")).toBeUndefined();
    });
  });

  // ───────────── add ─────────────
  describe("add", () => {
    it("should add item with auto-generated id", () => {
      const added = s.add({ name: "Delta", value: 40 });
      expect(added.id).toBeDefined();
      expect(added.id).toMatch(/^t-/);
      expect(s.count()).toBe(4);
    });

    it("should add item with custom id", () => {
      const added = s.add({ id: "custom-99", name: "Custom", value: 99 });
      expect(added.id).toBe("custom-99");
      expect(s.getById("custom-99")?.name).toBe("Custom");
    });

    it("should persist after add", () => {
      s.add({ name: "New", value: 50 });
      const stored = JSON.parse(store["test_store"]);
      expect(stored).toHaveLength(4);
    });
  });

  // ───────────── update ─────────────
  describe("update", () => {
    it("should update existing item", () => {
      const updated = s.update("t-1", { name: "Alpha Updated", value: 15 });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Alpha Updated");
      expect(updated!.value).toBe(15);
    });

    it("should return null for non-existent id", () => {
      expect(s.update("nope", { name: "X" })).toBeNull();
    });

    it("should persist after update", () => {
      s.update("t-1", { value: 999 });
      const stored = JSON.parse(store["test_store"]);
      expect(stored.find((i: TestItem) => i.id === "t-1").value).toBe(999);
    });
  });

  // ───────────── remove ─────────────
  describe("remove", () => {
    it("should remove existing item", () => {
      expect(s.remove("t-2")).toBe(true);
      expect(s.count()).toBe(2);
      expect(s.getById("t-2")).toBeUndefined();
    });

    it("should return false for non-existent id", () => {
      expect(s.remove("nope")).toBe(false);
    });
  });

  // ───────────── removeBatch ─────────────
  describe("removeBatch", () => {
    it("should remove multiple items", () => {
      const removed = s.removeBatch(["t-1", "t-3"]);
      expect(removed).toBe(2);
      expect(s.count()).toBe(1);
      expect(s.getById("t-2")).toBeDefined();
    });

    it("should return 0 for non-existent ids", () => {
      expect(s.removeBatch(["nope", "nope2"])).toBe(0);
    });
  });

  // ───────────── reset ─────────────
  describe("reset", () => {
    it("should restore defaults after modifications", () => {
      s.add({ name: "Extra", value: 99 });
      s.remove("t-1");
      const items = s.reset();
      expect(items).toHaveLength(3);
      expect(items[0].name).toBe("Alpha");
    });
  });

  // ───────────── exportData ─────────────
  describe("exportData", () => {
    it("should export valid JSON with metadata", () => {
      const json = s.exportData();
      const parsed = JSON.parse(json);
      expect(parsed._key).toBe("test_store");
      expect(parsed._exportedAt).toBeDefined();
      expect(parsed.data).toHaveLength(3);
    });
  });

  // ───────────── importData ─────────────
  describe("importData", () => {
    it("should import from exported format", () => {
      const json = s.exportData();
      s.remove("t-1");
      s.remove("t-2");
      expect(s.count()).toBe(1);
      const ok = s.importData(json);
      expect(ok).toBe(true);
      expect(s.count()).toBe(3);
    });

    it("should import from raw array", () => {
      const data = [{ id: "x-1", name: "Imported", value: 100 }];
      const ok = s.importData(JSON.stringify(data));
      expect(ok).toBe(true);
      expect(s.count()).toBe(1);
      expect(s.getById("x-1")?.name).toBe("Imported");
    });

    it("should return false for invalid JSON", () => {
      expect(s.importData("not json")).toBe(false);
    });

    it("should return false for non-array data", () => {
      expect(s.importData(JSON.stringify({ notAnArray: true }))).toBe(false);
    });
  });

  // ───────────── count ─────────────
  describe("count", () => {
    it("should return correct count", () => {
      expect(s.count()).toBe(3);
      s.add({ name: "New", value: 0 });
      expect(s.count()).toBe(4);
      s.remove("t-1");
      expect(s.count()).toBe(3);
    });
  });

  // ───────────── localStorage 读取 ─────────────
  describe("localStorage integration", () => {
    it("should read from existing localStorage data", () => {
      const existingData = [{ id: "stored-1", name: "Stored", value: 42 }];
      store["test_store2"] = JSON.stringify(existingData);
      const s2 = createLocalStore<TestItem>("test_store2", DEFAULTS, "t");
      expect(s2.count()).toBe(1);
      expect(s2.getById("stored-1")?.name).toBe("Stored");
    });
  });
});
