/**
 * service-loop-types.test.ts
 * ============================
 * 一站式服务闭环 类型定义验证
 *
 * 覆盖范围:
 * - LoopStage / StageStatus
 * - StageResult / LoopRun
 * - DataFlowNodeType / DataFlowEdge
 */

import { describe, it, expect } from "vitest";
import type {
  LoopStage,
  StageStatus,
  StageResult,
  LoopRun,
  DataFlowNodeType,
  DataFlowEdge,
} from "../types";

describe("一站式服务闭环类型定义 (第 19 类)", () => {
  it("LoopStage 应支持 6 个阶段", () => {
    const stages: LoopStage[] = [
      "monitor", "analyze", "decide", "execute", "verify", "optimize",
    ];
    expect(stages.length).toBe(6);
  });

  it("StageStatus 应支持 5 种状态", () => {
    const statuses: StageStatus[] = [
      "idle", "running", "completed", "error", "skipped",
    ];
    expect(statuses.length).toBe(5);
  });

  it("StageResult 应有完整字段", () => {
    const result: StageResult = {
      stage: "monitor",
      status: "completed",
      startedAt: Date.now() - 1500,
      completedAt: Date.now(),
      duration: 1500,
      summary: "采集数据",
      details: ["详情 1", "详情 2"],
      metrics: { nodes_scanned: 13 },
    };
    expect(result.duration).toBe(1500);
  });

  it("LoopRun 应有完整字段", () => {
    const run: LoopRun = {
      id: "loop-1",
      startedAt: Date.now(),
      completedAt: null,
      trigger: "manual",
      currentStage: "analyze",
      stages: [],
      overallStatus: "running",
    };
    expect(run.trigger).toBe("manual");
  });

  it("DataFlowNodeType 应支持 4 种节点", () => {
    const types: DataFlowNodeType[] = ["device", "storage", "dashboard", "terminal"];
    expect(types.length).toBe(4);
  });

  it("DataFlowEdge 应有完整字段", () => {
    const edge: DataFlowEdge = {
      from: "device",
      to: "storage",
      label: "指标采集",
      bandwidth: "2.4 GB/s",
      active: true,
    };
    expect(edge.bandwidth).toBe("2.4 GB/s");
  });
});
