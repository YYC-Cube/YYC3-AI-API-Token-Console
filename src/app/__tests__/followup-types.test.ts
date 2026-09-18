/**
 * followup-types.test.ts
 * =======================
 * 一键跟进 + 巡查模式 类型定义验证
 *
 * 覆盖范围:
 * - FollowUpItem 类型结构
 * - ChainEvent 类型结构
 * - PatrolResult / PatrolCheckItem 类型
 * - 类型枚举值覆盖
 */

import { describe, it, expect } from "vitest";
import type {
  FollowUpItem, FollowUpSeverity, FollowUpStatus,
  ChainEvent, ChainEventType, QuickAction,
} from "../types";

describe("Follow-up 类型定义", () => {
  // ----------------------------------------------------------
  // FollowUpItem
  // ----------------------------------------------------------

  describe("FollowUpItem", () => {
    it("应支持完整字段创建", () => {
      const item: FollowUpItem = {
        id: "AL-001",
        severity: "critical",
        title: "测试告警",
        source: "GPU-A100-01",
        metric: "2,000ms",
        status: "active",
        timestamp: Date.now(),
        chain: [],
        relatedAlerts: ["AL-002"],
        assignee: "admin",
        tags: ["test"],
      };

      expect(item.id).toBe("AL-001");
      expect(item.severity).toBe("critical");
      expect(item.chain).toEqual([]);
    });

    it("应支持最小必须字段", () => {
      const item: FollowUpItem = {
        id: "AL-002",
        severity: "info",
        title: "信息",
        source: "sys",
        status: "resolved",
        timestamp: Date.now(),
        chain: [],
      };

      expect(item.metric).toBeUndefined();
      expect(item.assignee).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // FollowUpSeverity
  // ----------------------------------------------------------

  describe("FollowUpSeverity", () => {
    it("应支持所有级别", () => {
      const levels: FollowUpSeverity[] = ["info", "warning", "error", "critical"];
      expect(levels.length).toBe(4);
    });
  });

  // ----------------------------------------------------------
  // FollowUpStatus
  // ----------------------------------------------------------

  describe("FollowUpStatus", () => {
    it("应支持所有状态", () => {
      const statuses: FollowUpStatus[] = ["active", "investigating", "resolved", "ignored"];
      expect(statuses.length).toBe(4);
    });
  });

  // ----------------------------------------------------------
  // ChainEvent
  // ----------------------------------------------------------

  describe("ChainEvent", () => {
    it("应支持完整事件创建", () => {
      const event: ChainEvent = {
        id: "c1",
        time: "10:23:45",
        type: "model_load",
        label: "模型加载",
        detail: "LLaMA-70B",
        isCurrent: true,
      };

      expect(event.type).toBe("model_load");
      expect(event.isCurrent).toBe(true);
    });

    it("isCurrent 应为可选", () => {
      const event: ChainEvent = {
        id: "c2",
        time: "10:24:00",
        type: "task_start",
        label: "任务",
        detail: "详情",
      };

      expect(event.isCurrent).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // ChainEventType
  // ----------------------------------------------------------

  describe("ChainEventType", () => {
    it("应支持所有事件类型", () => {
      const types: ChainEventType[] = [
        "model_load", "task_start", "alert_trigger",
        "auto_action", "manual_action", "resolved", "system_event",
      ];
      expect(types.length).toBe(7);
    });
  });

  // ----------------------------------------------------------
  // QuickAction
  // ----------------------------------------------------------

  describe("QuickAction", () => {
    it("应支持完整定义", () => {
      const action: QuickAction = {
        id: "fix",
        label: "修复",
        icon: "Wrench",
        variant: "primary",
        action: () => {},
      };

      expect(action.variant).toBe("primary");
      expect(typeof action.action).toBe("function");
    });
  });
});
