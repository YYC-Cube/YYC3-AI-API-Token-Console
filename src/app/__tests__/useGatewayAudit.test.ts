/**
 * useGatewayAudit.test.ts
 * ========================
 * 操作审计真实数据源测试（双端联通 R5 / BL-A1 消费端）
 *
 * 覆盖: /v1/logs 载荷映射（status→审计态/风险/时间/用户派生）/ 趋势按小时分桶 /
 * 风险四档分布 / 不可达空态（不回退 mock）
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGatewayAudit } from "../hooks/useGatewayAudit";

const LOGS_PAYLOAD = {
  ok: true,
  total: 100,
  logs: [
    { id: 3, created_at: "2026-10-15T14:32:08+00:00", key_id: "abcd1234-5678", model: "glm-4-flash", upstream: "zhipu", capability: "chat", status: "error", error_code: "upstream_error", request_id: "chatcmpl-x3", tokens: 400, cost_usd: 0, latency_ms: 5200 },
    { id: 2, created_at: "2026-10-15T13:20:00+00:00", key_id: null, model: "deepseek-v4", upstream: "deepseek", capability: "chat", status: "ok", tokens: 1500, cost_usd: 0.2, latency_ms: 3200 },
    { id: 1, created_at: "2026-10-15T12:10:00+00:00", key_id: "abcd1234-5678", model: "glm-4-flash", upstream: "zhipu", capability: "chat", status: "ok", tokens: 900, cost_usd: 0.1, latency_ms: 800 },
  ],
};

describe("useGatewayAudit（R5 真实数据源）", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("映射: 错误行→failed/high + error_code 入动作; 直连→网关直连; vk 短 id 派生用户", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/v1/logs")) {
        return { ok: true, json: async () => LOGS_PAYLOAD } as unknown as Response;
      }
      throw new Error("offline");
    }));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(true));
    const [first] = result.current.logs;
    expect(first.id).toBe("LOG-3");
    expect(first.status).toBe("failed");
    expect(first.risk).toBe("high");
    expect(first.action).toContain("upstream_error");
    expect(first.user).toBe("vk-abcd1234");
    expect(result.current.logs[1].user).toBe("网关直连");
    expect(result.current.logs[1].risk).toBe("medium"); // 3200ms > 3000
    expect(result.current.logs[2].risk).toBe("low");
  });

  it("趋势按小时分桶与风险四档分布", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => LOGS_PAYLOAD } as unknown as Response)));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(true));
    const trend = result.current.trend;
    expect(trend).toHaveLength(3); // 三行三个小时桶
    expect(trend.every((p) => p.ops === 1)).toBe(true);
    expect(trend.reduce((s, p) => s + p.ops, 0)).toBe(3);
    expect(trend.reduce((s, p) => s + p.errors, 0)).toBe(1); // 仅 id=3 一行 error
    const dist = Object.fromEntries(result.current.riskDistribution.map((d) => [d.level, d.count]));
    expect(dist["严重"]).toBe(1);
    expect(dist["低风险"]).toBe(1);
  });

  it("不可达 → 空态（sourceOk=false, 零数据, 不回退 mock）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(false));
    expect(result.current.logs).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("refresh 触发重新拉取", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => LOGS_PAYLOAD } as unknown as Response));
    vi.stubGlobal("fetch", spy);
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(true));
    act(() => result.current.refresh());
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
