/**
 * device-inventory.test.ts
 * =========================
 * 多端设备清单四源归一化单测（双端联通 P0-3 / 硬约束①）
 *
 * 覆盖: 上游池快照（含 breaker_state 回退）/ Ollama 节点 / 网关本体（healthy·warning·error）/
 * A2A Agent 容器 / 四源合流顺序 / KPI（活跃计数、真实磁盘占用率与无源 null）
 */

import { describe, it, expect } from "vitest";
import {
  activeNodesKpi,
  agentNodesFromA2A,
  gatewaySelfNode,
  mergeDeviceNodes,
  ollamaNodesFromMetrics,
  storageUsedFromHealth,
  upstreamNodesFromRouterStats,
} from "../lib/device-inventory";
import type { NodeData } from "../types";

const up = (over: Partial<NodeData>): NodeData => ({
  id: "x", status: "active", gpu: 0, mem: 0, temp: 0, model: "", tasks: 0, ...over,
});

describe("device-inventory: upstreamNodesFromRouterStats", () => {
  it("upstream_pool 归一化, breaker_state 回退 + status 优先", () => {
    const nodes = upstreamNodesFromRouterStats({
      upstream_pool: [
        { name: "vllm-flagship", breaker_state: "closed", load: 40 },
        { name: "bge-nim", status: "open" },
        { name: "sgl-qwen", breaker_state: "half-open" },
      ],
    });
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toMatchObject({ id: "vllm-flagship", status: "active", kind: "upstream", tasks: 40 });
    expect(nodes[1].status).toBe("error");
    expect(nodes[2].status).toBe("warning");
  });

  it("非对象/缺 upstream_pool → 空数组（降级不抛错）", () => {
    expect(upstreamNodesFromRouterStats(null)).toEqual([]);
    expect(upstreamNodesFromRouterStats({ nodes: [] })).toEqual([]);
    expect(upstreamNodesFromRouterStats({ upstream_pool: "bad" })).toEqual([]);
  });
});

describe("device-inventory: ollamaNodesFromMetrics", () => {
  it("console/metrics.nodes → kind ollama, 运行模型计数", () => {
    const nodes = ollamaNodesFromMetrics({
      nodes: [
        { id: "n1", status: "active", latencyMs: 12, models: ["qwen3:14b", "llama3:8b"] },
        { id: "n2", status: "inactive", latencyMs: -1, models: [] },
      ],
    });
    expect(nodes[0]).toMatchObject({ id: "n1", status: "active", kind: "ollama", tasks: 2, model: "qwen3:14b" });
    expect(nodes[1]).toMatchObject({ id: "n2", status: "inactive", kind: "ollama" });
  });
});

describe("device-inventory: gatewaySelfNode（/health 契约）", () => {
  const health = {
    status: "healthy",
    version: "2.0.0",
    uptime_seconds: 172800,
    services: { ollama: { status: "healthy" }, redis: { status: "healthy" }, postgresql: { status: "healthy" } },
    system: { cpu_percent: 23.5, memory_percent: 61.2, disk_percent: 62.42 },
    metrics: { active_requests: 4, total_requests: 1000, cache_hit_rate: 0.3 },
  };

  it("healthy + 全依赖可达 → active, 真实内存/在途请求/运行时长", () => {
    const n = gatewaySelfNode(health);
    expect(n).toMatchObject({
      id: "nas-gateway", status: "active", kind: "gateway",
      mem: 61, tasks: 4, uptime: "48h", model: "YYC³ 网关 v2.0.0",
    });
  });

  it("依赖降级（redis unreachable）→ warning; 整体非 healthy → error", () => {
    const w = gatewaySelfNode({ ...health, services: { ...health.services, redis: { status: "unreachable" } } });
    expect(w?.status).toBe("warning");
    const e = gatewaySelfNode({ ...health, status: "unreachable" });
    expect(e?.status).toBe("error");
  });

  it("非对象 → null", () => {
    expect(gatewaySelfNode(null)).toBeNull();
    expect(gatewaySelfNode("x")).toBeNull();
  });
});

describe("device-inventory: agentNodesFromA2A", () => {
  it("管理面列表（含离线）→ online=active / 其余=inactive", () => {
    const nodes = agentNodesFromA2A({
      agents: [
        { agent_id: "yuanqi-tianshu-001", agent_name: "元启·天枢", status: "online", capabilities: ["multi_agent_coordination", "synthesis"] },
        { agent_id: "yushu-wanwu-001", agent_name: "语枢·万物", status: "offline", capabilities: [] },
      ],
    });
    expect(nodes[0]).toMatchObject({ id: "yuanqi-tianshu-001", status: "active", kind: "agent", tasks: 2, model: "元启·天枢" });
    expect(nodes[1].status).toBe("inactive");
  });
});

describe("device-inventory: 合流与 KPI", () => {
  it("四源合流固定顺序 upstream→ollama→gateway→agent, 空分片跳过", () => {
    const merged = mergeDeviceNodes({
      upstream: [up({ id: "u1", kind: "upstream" })],
      ollama: [up({ id: "o1", kind: "ollama" }), up({ id: "o2", kind: "ollama", status: "inactive" })],
      gateway: up({ id: "nas-gateway", kind: "gateway" }),
      agents: [up({ id: "a1", kind: "agent", status: "inactive" })],
    });
    expect(merged.map((n) => n.id)).toEqual(["u1", "o1", "o2", "nas-gateway", "a1"]);
    expect(activeNodesKpi(merged)).toBe("3/5"); // active+warning 计活跃
  });

  it("storageUsedFromHealth: 真实磁盘占用率一位小数; 无源 null（显「—」）", () => {
    expect(storageUsedFromHealth({ system: { disk_percent: 62.42 } })).toBe("62.4%");
    expect(storageUsedFromHealth({ system: {} })).toBeNull();
    expect(storageUsedFromHealth(null)).toBeNull();
  });
});
