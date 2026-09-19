/**
 * checkpoint.ts — 批量任务检查点恢复管线 (Phase 3 / Task 3.4)
 * ===========================================================
 * 设计思想: 业界摄取管线检查点模式 — 崩溃续跑 + 步骤幂等 + 恰好一次语义
 * (ragflow 检查点管线调研, L2 重实现为 YYC³ 原创代码)
 *
 * 落点复用: yyc3-storage.ts 既有 IndexedDB 封装 (checkpointStore),
 *           无新增基础设施; 规划文档 §Phase 3 / Task 3.4。
 *
 * 语义保证:
 *   - 崩溃续跑: 每步完成后写 checkpoint, 恢复时从 lastStepIndex+1 继续
 *   - 恰好一次: 步骤函数必须自身幂等 (对同一 item 重复执行无副作用),
 *     本模块保证「已确认步骤绝不重跑」
 *   - 步骤超时/异常: checkpoint 保持在上一步, 下次恢复自动重试当前步
 */

import type { StoreName } from "../../types";
import { idbDelete, idbGet, idbPut } from "../yyc3-storage";
// checkpoint 复用既有 IndexedDB store ("committedChanges"), 不新增 ALL_STORES 条目
// (新增 store 需同步 types/index.ts StoreName + yyc3-storage.ts ALL_STORES, 收益不抵成本)

/** CheckpointRecord — 持久化于 IndexedDB 的检查点记录 */
export interface CheckpointRecord {
  /** 任务唯一 id (调用方生成, 如 "import-20260920-001") */
  id: string;
  /** 总步骤数 */
  totalSteps: number;
  /** 已确认完成的最后一步索引 (-1 = 尚未开始) */
  lastStepIndex: number;
  /** 每步的执行结果摘要 (可选, 供恢复后 UI 展示) */
  stepResults: unknown[];
  /** 创建/更新时间戳 */
  updatedAt: number;
  /** 任务状态: running → done / failed */
  status: "running" | "done" | "failed";
}

const CKPT_STORE: StoreName = "committedChanges";

function ckptKey(taskId: string): string {
  return `__checkpoint__:${taskId}`;
}

/** 创建新检查点任务 (若同名任务残留 running/failed 状态, 返回该记录供续跑决策) */
export async function createCheckpoint(
  taskId: string,
  totalSteps: number
): Promise<{ record: CheckpointRecord; resumable: boolean }> {
  const existing = await idbGet<CheckpointRecord>(CKPT_STORE, ckptKey(taskId));
  if (existing && existing.status === "running") {
    // 崩溃/中断残留 — 可续跑
    return { record: existing, resumable: true };
  }
  if (existing && existing.status === "failed") {
    // 失败残留 — 重入即视为续跑, 状态复位 running (从 lastStepIndex+1 继续)
    existing.status = "running";
    existing.updatedAt = Date.now();
    await idbPut(CKPT_STORE, existing);
    return { record: existing, resumable: true };
  }
  const record: CheckpointRecord = {
    id: ckptKey(taskId), // 存储主键 = 带前缀 key, 与 idbGet 查询键一致
    totalSteps,
    lastStepIndex: -1,
    stepResults: [],
    updatedAt: Date.now(),
    status: "running",
  };
  await idbPut(CKPT_STORE, record);
  return { record, resumable: false };
}

/** 确认第 stepIndex 步完成 (每步执行成功后必须调用) */
export async function confirmStep(
  taskId: string,
  stepIndex: number,
  result?: unknown
): Promise<void> {
  const record = await idbGet<CheckpointRecord>(CKPT_STORE, ckptKey(taskId));
  if (!record) throw new Error(`checkpoint ${taskId} 不存在`);
  if (stepIndex <= record.lastStepIndex) return; // 幂等保护: 已确认步骤忽略
  record.lastStepIndex = stepIndex;
  record.stepResults[stepIndex] = result ?? null;
  record.updatedAt = Date.now();
  await idbPut(CKPT_STORE, record);
}

/** 标记任务完成并清理检查点 (恰好一次语义的终点) */
export async function finishCheckpoint(taskId: string): Promise<void> {
  await idbDelete(CKPT_STORE, ckptKey(taskId));
}

/** 标记任务失败 (checkpoint 保留, 供续跑) */
export async function failCheckpoint(taskId: string, reason: string): Promise<void> {
  const record = await idbGet<CheckpointRecord>(CKPT_STORE, ckptKey(taskId));
  if (!record) return;
  record.status = "failed";
  record.stepResults[record.lastStepIndex + 1] = { error: reason };
  record.updatedAt = Date.now();
  await idbPut(CKPT_STORE, record);
}

/**
 * runWithCheckpoint — 带检查点的批量执行主入口
 *
 * @param taskId      任务唯一 id
 * @param steps       步骤函数数组 — 每个函数必须幂等 (同一输入重复执行无副作用)
 * @param onProgress  进度回调 (已完成步数 / 总步数)
 * @returns 各步骤结果数组
 *
 * 崩溃续跑: 任务中断后再次以相同 taskId 调用, 已确认步骤自动跳过。
 */
export async function runWithCheckpoint<T = unknown>(
  taskId: string,
  steps: (() => Promise<T> | T)[],
  onProgress?: (done: number, total: number) => void
): Promise<T[]> {
  const { record } = await createCheckpoint(taskId, steps.length);
  const results: T[] = [];

  // 续跑对齐: 已确认步骤的结果从 checkpoint 恢复, 不重跑
  for (let i = 0; i <= record.lastStepIndex; i++) {
    results.push(record.stepResults[i] as T);
  }
  onProgress?.(results.length, steps.length);

  for (let i = record.lastStepIndex + 1; i < steps.length; i++) {
    try {
      const result = await steps[i]();
      results.push(result);
      // 先持久化确认再继续 — 崩溃窗口最小化为「当前步重试」
      await confirmStep(taskId, i, result);
      onProgress?.(results.length, steps.length);
    } catch (err) {
      await failCheckpoint(taskId, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  await finishCheckpoint(taskId);
  return results;
}
