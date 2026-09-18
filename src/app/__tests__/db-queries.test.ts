/**
 * db-queries.test.ts
 * ===================
 * YYC³ 数据库查询层 - 单元测试
 *
 * 覆盖范围:
 * - Mock 数据格式校验
 * - 查询返回值结构验证
 * - 边界条件测试（空ID、大批量）
 * - 数据类型一致性检查
 */

import { describe, it, expect } from "vitest";
import {
  getActiveModels,
  getRecentLogs,
  getModelStats,
  getNodesStatus,
  getActiveAgents,
} from "../lib/db-queries";
import type {
  Model,
  InferenceLog,
  NodeStatusRecord,
  Agent,
} from "../types";

describe("db-queries", () => {
  // ----------------------------------------------------------
  // getActiveModels
  // ----------------------------------------------------------

  describe("getActiveModels", () => {
    it("应返回非空模型列表", async () => {
      const { data, error } = await getActiveModels();
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it("每个模型应包含必要字段", async () => {
      const { data } = await getActiveModels();
      for (const model of data) {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(["primary", "secondary", "standby"]).toContain(model.tier);
        expect(typeof model.avg_latency_ms).toBe("number");
        expect(typeof model.throughput).toBe("number");
        expect(model.created_at).toBeDefined();
      }
    });

    it("每个模型的 ID 应唯一", async () => {
      const { data } = await getActiveModels();
      const ids = data.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("延迟值应为正数", async () => {
      const { data } = await getActiveModels();
      for (const model of data) {
        expect(model.avg_latency_ms).toBeGreaterThan(0);
      }
    });
  });

  // ----------------------------------------------------------
  // getRecentLogs
  // ----------------------------------------------------------

  describe("getRecentLogs", () => {
    it("应返回指定数量的日志", async () => {
      const { data, error } = await getRecentLogs(10);
      expect(error).toBeNull();
      expect(data.length).toBe(10);
    });

    it("每条日志应包含必要字段", async () => {
      const { data } = await getRecentLogs(5);
      for (const log of data) {
        expect(log.id).toBeDefined();
        expect(log.model_id).toBeDefined();
        expect(log.agent_id).toBeDefined();
        expect(typeof log.latency_ms).toBe("number");
        expect(typeof log.tokens_in).toBe("number");
        expect(typeof log.tokens_out).toBe("number");
        expect(["success", "error", "timeout"]).toContain(log.status);
        expect(log.created_at).toBeDefined();
      }
    });

    it("默认应返回 100 条日志", async () => {
      const { data } = await getRecentLogs();
      expect(data.length).toBe(100);
    });

    it("日志 ID 应唯一", async () => {
      const { data } = await getRecentLogs(50);
      const ids = data.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("tokens 值应为正数", async () => {
      const { data } = await getRecentLogs(20);
      for (const log of data) {
        expect(log.tokens_in).toBeGreaterThan(0);
        expect(log.tokens_out).toBeGreaterThan(0);
      }
    });
  });

  // ----------------------------------------------------------
  // getModelStats
  // ----------------------------------------------------------

  describe("getModelStats", () => {
    it("有效模型 ID 应返回统计数据", async () => {
      const { data, error } = await getModelStats("m1");
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.avgLatency).toBeGreaterThan(0);
      expect(data!.totalRequests).toBeGreaterThan(0);
      expect(data!.totalTokens).toBeGreaterThan(0);
      expect(data!.successRate).toBeGreaterThan(0);
      expect(data!.successRate).toBeLessThanOrEqual(100);
    });

    it("无效模型 ID 应返回 null", async () => {
      const { data, error } = await getModelStats("nonexistent");
      expect(error).toBeNull();
      expect(data).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // getNodesStatus
  // ----------------------------------------------------------

  describe("getNodesStatus", () => {
    it("应返回节点列表", async () => {
      const { data, error } = await getNodesStatus();
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it("每个节点应包含必要字段", async () => {
      const { data } = await getNodesStatus();
      for (const node of data) {
        expect(node.id).toBeDefined();
        expect(node.hostname).toBeDefined();
        expect(typeof node.gpu_util).toBe("number");
        expect(typeof node.mem_util).toBe("number");
        expect(typeof node.temp_celsius).toBe("number");
        expect(["active", "warning", "inactive"]).toContain(node.status);
      }
    });

    it("GPU 利用率应在 0-100 范围内", async () => {
      const { data } = await getNodesStatus();
      for (const node of data) {
        expect(node.gpu_util).toBeGreaterThanOrEqual(0);
        expect(node.gpu_util).toBeLessThanOrEqual(100);
      }
    });

    it("温度应在合理范围内 (0-120°C)", async () => {
      const { data } = await getNodesStatus();
      for (const node of data) {
        expect(node.temp_celsius).toBeGreaterThanOrEqual(0);
        expect(node.temp_celsius).toBeLessThanOrEqual(120);
      }
    });
  });

  // ----------------------------------------------------------
  // getActiveAgents
  // ----------------------------------------------------------

  describe("getActiveAgents", () => {
    it("应返回活跃 Agent 列表", async () => {
      const { data, error } = await getActiveAgents();
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it("所有返回的 Agent 应为活跃状态", async () => {
      const { data } = await getActiveAgents();
      for (const agent of data) {
        expect(agent.is_active).toBe(true);
      }
    });

    it("每个 Agent 应包含中文名", async () => {
      const { data } = await getActiveAgents();
      for (const agent of data) {
        expect(agent.name_cn).toBeDefined();
        expect(agent.name_cn.length).toBeGreaterThan(0);
      }
    });
  });
});