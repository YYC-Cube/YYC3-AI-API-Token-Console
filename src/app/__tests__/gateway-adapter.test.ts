/**
 * gateway-adapter.test.ts
 * ========================
 * 网关数据适配层单测（双端联通 P0-2 / 硬约束①）
 *
 * 覆盖: parseGatewayFrame 帧识别 / 熔断状态映射 / 上游节点归一化 /
 * 帧翻译器差分语义（首帧无 QPS、差分 RPS、reset、计数回退防御）/
 * 指标真实化铁则（无源 system_stats 显「—」）
 */

import { describe, it, expect } from "vitest";
import {
  createGatewayFrameTranslator,
  mapUpstreamStatus,
  normalizeUpstreamNode,
  parseGatewayFrame,
} from "../lib/gateway-adapter";
import type { GatewayMonitorFrame, GatewayUpstreamSnapshot } from "../lib/gateway-adapter";

function frame(ts: number, total: number, models: Record<string, GatewayUpstreamSnapshot>): GatewayMonitorFrame {
  return {
    event: "metrics",
    data: { timestamp: ts, active_requests: 3, total_requests: total, cache_hit_rate: 0.5, models },
  };
}

describe("gateway-adapter: parseGatewayFrame", () => {
  it("识别合法 metrics 帧", () => {
    const f = parseGatewayFrame(frame(1, 2, {}));
    expect(f).not.toBeNull();
    expect(f?.event).toBe("metrics");
    expect(f?.data.total_requests).toBe(2);
  });

  it("非对象 / event 非 metrics / 缺 data → null", () => {
    expect(parseGatewayFrame(null)).toBeNull();
    expect(parseGatewayFrame("metrics")).toBeNull();
    expect(parseGatewayFrame({ event: "pong" })).toBeNull();
    expect(parseGatewayFrame({ event: "metrics" })).toBeNull(); // 无 data
  });
});

describe("gateway-adapter: mapUpstreamStatus 熔断映射", () => {
  it("closed/healthy→active, half-open/degraded→warning, open→error, 未知→inactive", () => {
    expect(mapUpstreamStatus("closed")).toBe("active");
    expect(mapUpstreamStatus("healthy")).toBe("active");
    expect(mapUpstreamStatus("half-open")).toBe("warning");
    expect(mapUpstreamStatus("degraded")).toBe("warning");
    expect(mapUpstreamStatus("open")).toBe("error");
    expect(mapUpstreamStatus(undefined)).toBe("inactive");
    expect(mapUpstreamStatus("whatever")).toBe("inactive");
  });
});

describe("gateway-adapter: normalizeUpstreamNode", () => {
  it("load 作为 tasks 真实代理, 无硬件源 gpu/mem/temp=0 不伪造", () => {
    const n = normalizeUpstreamNode("vllm", { status: "closed", latency_ms: 100, load: 37.6 });
    expect(n).toMatchObject({ id: "vllm", status: "active", kind: "upstream", tasks: 38, gpu: 0, mem: 0, temp: 0 });
  });

  it("load 非法值防御 → tasks 0", () => {
    expect(normalizeUpstreamNode("x", { status: "closed", load: Number.NaN }).tasks).toBe(0);
    expect(normalizeUpstreamNode("x", {}).tasks).toBe(0);
  });
});

describe("gateway-adapter: 帧翻译器", () => {
  const MODELS = {
    "vllm-flagship": { status: "closed", latency_ms: 120, error_rate: 0.01, load: 40 },
    "bge-embed-nim": { status: "open", latency_ms: 300, error_rate: 0.9, load: 0 },
  };

  it("首帧: node_status + system_stats + latency_update, 无差分类消息", () => {
    const t = createGatewayFrameTranslator();
    const msgs = t.translate(frame(1000, 100, MODELS));
    const types = msgs.map((m) => m.type);
    expect(types).toContain("node_status");
    expect(types).toContain("system_stats");
    expect(types).toContain("latency_update");
    expect(types).not.toContain("qps_update");
    expect(types).not.toContain("throughput_history");
    // 真实化铁则: 无源 KPI 显「—」
    const sys = msgs.find((m) => m.type === "system_stats");
    expect(sys && sys.type === "system_stats" && sys.payload).toMatchObject({
      activeNodes: "1/2",
      gpuUtil: "—",
      tokenThroughput: "—",
      storageUsed: "—",
    });
  });

  it("次帧: QPS 差分 = (total2-total1)/elapsed, 并产 1 个趋势点", () => {
    const t = createGatewayFrameTranslator();
    t.translate(frame(1000, 100, MODELS));
    const msgs = t.translate(frame(6000, 350, MODELS));
    const qps = msgs.find((m) => m.type === "qps_update");
    expect(qps && qps.type === "qps_update" && qps.payload.qps).toBe(50);
    const hist = msgs.find((m) => m.type === "throughput_history");
    expect(hist && hist.type === "throughput_history" && hist.payload).toHaveLength(1);
  });

  it("total_requests 计数回退（重启清零）→ 不产负 QPS, 重新建立基线", () => {
    const t = createGatewayFrameTranslator();
    t.translate(frame(1000, 500, MODELS));
    const msgs = t.translate(frame(6000, 20, MODELS)); // 网关重启, 计数回退
    expect(msgs.some((m) => m.type === "qps_update")).toBe(false);
    // 再下一帧恢复正常差分
    const msgs3 = t.translate(frame(11000, 170, MODELS));
    const qps = msgs3.find((m) => m.type === "qps_update");
    expect(qps && qps.type === "qps_update" && qps.payload.qps).toBe(30);
  });

  it("reset() 后回到首帧行为（连接重建语义）", () => {
    const t = createGatewayFrameTranslator();
    t.translate(frame(1000, 100, MODELS));
    t.reset();
    const msgs = t.translate(frame(6000, 350, MODELS));
    expect(msgs.some((m) => m.type === "qps_update")).toBe(false);
  });

  it("空上游池 → 仅基线更新, 无节点/延迟消息", () => {
    const t = createGatewayFrameTranslator();
    const msgs = t.translate(frame(1000, 100, {}));
    expect(msgs).toEqual([]);
  });

  it("延迟为负载加权平均（load=0 上游权重取 1）", () => {
    const t = createGatewayFrameTranslator();
    const msgs = t.translate(frame(1000, 100, MODELS));
    const lat = msgs.find((m) => m.type === "latency_update");
    // (120*40 + 300*1) / 41 = 124.39 → 124
    expect(lat && lat.type === "latency_update" && lat.payload.latency).toBe(124);
  });
});
