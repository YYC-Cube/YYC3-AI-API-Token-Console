/**
 * operation-types.test.ts
 * ========================
 * 操作中心 + IDE 终端 类型定义验证
 *
 * 覆盖范围:
 * - OperationCategoryType / OperationStatus 枚举
 * - OperationItem / OperationTemplateItem 结构
 * - OperationLogEntry 结构
 * - TerminalHistoryEntry 结构
 * - IDEPanelTab 枚举
 */

import { describe, it, expect } from "vitest";
import type {
  OperationCategoryType,
  OperationCategoryMeta,
  OperationStatus,
  OperationItem,
  OperationTemplateItem,
  OperationLogEntry,
  LogFilterType,
  TerminalHistoryEntry,
  IDEPanelTab,
} from "../types";

describe("操作中心类型定义 (第 11 类)", () => {
  it("OperationCategoryType 应支持 5 种分类", () => {
    const cats: OperationCategoryType[] = ["node", "model", "task", "system", "custom"];
    expect(cats.length).toBe(5);
  });

  it("OperationStatus 应支持 5 种状态", () => {
    const statuses: OperationStatus[] = ["pending", "running", "success", "failed", "cancelled"];
    expect(statuses.length).toBe(5);
  });

  it("OperationCategoryMeta 应有完整字段", () => {
    const meta: OperationCategoryMeta = {
      key: "node",
      label: "节点操作",
      icon: "Server",
      color: "#00d4ff",
    };
    expect(meta.key).toBe("node");
    expect(meta.label).toBe("节点操作");
  });

  it("OperationItem 应支持完整定义", () => {
    const item: OperationItem = {
      id: "qa1",
      category: "node",
      label: "重启节点",
      description: "重启 GPU 节点",
      icon: "RotateCw",
      status: "pending",
      dangerous: true,
    };
    expect(item.dangerous).toBe(true);
  });

  it("OperationItem 最小字段", () => {
    const item: OperationItem = {
      id: "qa2",
      category: "model",
      label: "部署",
      description: "部署模型",
      icon: "Upload",
      status: "success",
    };
    expect(item.dangerous).toBeUndefined();
  });

  it("OperationTemplateItem 应有完整字段", () => {
    const tpl: OperationTemplateItem = {
      id: "tpl1",
      name: "标准流程",
      description: "描述",
      category: "system",
      steps: ["步骤1", "步骤2"],
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    expect(tpl.steps.length).toBe(2);
    expect(tpl.lastUsed).toBeDefined();
  });

  it("OperationLogEntry 应有完整字段", () => {
    const log: OperationLogEntry = {
      id: "log1",
      timestamp: Date.now(),
      category: "node",
      action: "重启节点",
      user: "admin",
      status: "success",
      detail: "OK",
      duration: 2500,
    };
    expect(log.duration).toBe(2500);
  });

  it("LogFilterType 应支持 4 种筛选", () => {
    const filters: LogFilterType[] = ["all", "byCategory", "byUser", "search"];
    expect(filters.length).toBe(4);
  });
});

describe("IDE 终端类型定义 (第 12 类)", () => {
  it("TerminalHistoryEntry 应有完整字段", () => {
    const entry: TerminalHistoryEntry = {
      id: "cmd-1",
      input: "yyc3 status",
      output: "OK",
      timestamp: Date.now(),
      status: "success",
    };
    expect(entry.status).toBe("success");
  });

  it("TerminalHistoryEntry status 应支持 3 种", () => {
    const statuses: TerminalHistoryEntry["status"][] = ["success", "error", "info"];
    expect(statuses.length).toBe(3);
  });

  it("IDEPanelTab 应支持 4 种", () => {
    const tabs: IDEPanelTab[] = ["monitor", "alerts", "operations", "logs"];
    expect(tabs.length).toBe(4);
  });
});
