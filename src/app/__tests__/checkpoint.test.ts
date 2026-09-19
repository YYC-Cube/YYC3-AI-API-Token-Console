/**
 * checkpoint.test.ts — 检查点恢复管线单测 (Phase 3 / Task 3.4)
 * ============================================================
 * unit 档 (jsdom 项目): yyc3-storage 的 IndexedDB 层经 vi.mock 替换为内存 Map,
 * 只验证检查点协议本身 (续跑/幂等/恰好一次), 不测 IndexedDB 实现。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// 内存版 idb 三件套 — 模拟「进程崩溃重启后数据仍在」跨调用共享
// vi.hoisted: vi.mock 工厂被提升至文件顶部, 共享状态必须经 hoisted 创建
const { memStore } = vi.hoisted(() => ({ memStore: new Map<string, unknown>() }));

vi.mock("../lib/yyc3-storage", () => ({
  idbPut: async (_s: string, item: { id: string }) => {
    memStore.set(item.id, structuredClone(item));
  },
  idbGet: async <T>(_s: string, id: string) =>
    memStore.has(id) ? (structuredClone(memStore.get(id)) as T) : undefined,
  idbDelete: async (_s: string, id: string) => {
    memStore.delete(id);
  },
}));

import {
  createCheckpoint,
  confirmStep,
  finishCheckpoint,
  failCheckpoint,
  runWithCheckpoint,
} from "../lib/batch/checkpoint";

beforeEach(() => {
  memStore.clear();
  vi.clearAllMocks();
});

describe("checkpoint 检查点恢复管线", () => {
  it("全量执行: 全部步骤完成并清理检查点", async () => {
    const calls: number[] = [];
    const results = await runWithCheckpoint<string>("task-a", [
      () => (calls.push(1), "r1"),
      () => (calls.push(2), "r2"),
      () => (calls.push(3), "r3"),
    ]);
    expect(results).toEqual(["r1", "r2", "r3"]);
    expect(calls).toEqual([1, 2, 3]);
    // 恰好一次终点: checkpoint 已清理
    const { resumable } = await createCheckpoint("task-a", 3);
    expect(resumable).toBe(false);
  });

  it("崩溃续跑: 中断后重跑, 已确认步骤不重复执行", async () => {
    // 模拟第一次执行: 3 步中完成 2 步后崩溃
    await createCheckpoint("task-b", 3);
    await confirmStep("task-b", 0, "r1");
    await confirmStep("task-b", 1, "r2");
    // (此处模拟进程中断 — 无 finishCheckpoint)

    const calls: number[] = [];
    const results = await runWithCheckpoint<string>("task-b", [
      () => (calls.push(1), "r1"),
      () => (calls.push(2), "r2"),
      () => (calls.push(3), "r3"),
    ]);
    // 步骤 1/2 未重跑, 仅步骤 3 执行
    expect(calls).toEqual([3]);
    expect(results).toEqual(["r1", "r2", "r3"]);
  });

  it("步骤幂等保护: confirmStep 对已确认索引静默忽略", async () => {
    await createCheckpoint("task-c", 2);
    await confirmStep("task-c", 0, "first");
    await confirmStep("task-c", 0, "second-should-be-ignored");
    const { record } = await createCheckpoint("task-c", 2);
    expect(record.stepResults[0]).toBe("first");
  });

  it("失败标记: failed 状态保留 checkpoint, 重入自动复位续跑", async () => {
    await createCheckpoint("task-d", 2);
    await confirmStep("task-d", 0, "r1");
    await failCheckpoint("task-d", "步骤 2 爆炸");
    // failed 残留被 createCheckpoint 读到前, 直接验证记录存在
    const { record, resumable } = await createCheckpoint("task-d", 2);
    // 重入语义: failed → 复位 running 并可续跑 (从 lastStepIndex+1 继续)
    expect(resumable).toBe(true);
    expect(record.status).toBe("running");
    expect(record.lastStepIndex).toBe(0);
    // 完成后清理
    await finishCheckpoint("task-d");
    const after = await createCheckpoint("task-d", 2);
    expect(after.resumable).toBe(false);
  });

  it("进度回调: 每步确认后收到 (done, total)", async () => {
    const progress: [number, number][] = [];
    await runWithCheckpoint("task-e", [() => 1, () => 2], (done, total) =>
      progress.push([done, total])
    );
    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });
});
