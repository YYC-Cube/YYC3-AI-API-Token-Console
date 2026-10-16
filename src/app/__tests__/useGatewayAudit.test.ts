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
import { useGatewayAudit, type GatewayAuditLog } from "../hooks/useGatewayAudit";

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
    expect(first?.id).toBe("LOG-3");
    expect(first?.status).toBe("failed");
    expect(first?.risk).toBe("high");
    expect(first?.action).toContain("upstream_error");
    expect(first?.user).toBe("vk-abcd1234");
    expect(result.current.logs[1]?.user).toBe("网关直连");
    expect(result.current.logs[1]?.risk).toBe("medium"); // 3200ms > 3000
    expect(result.current.logs[2]?.risk).toBe("low");
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

// ============================================================
// S5 分支补测: fmtTime/buildTrend 边界 + mapLog 全量缺省兜底 +
// HTTP 错误 / fetch 不可用 / total 与 logs 缺省 / traceRequestId 三态 / 60s 轮询
// ============================================================

describe("useGatewayAudit 分支补测（S5）", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapLog/buildTrend 全量缺省兜底: 非法时间/空字段/同小时分桶/error 无 code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      // total 缺省 → 回退 mapped.length; logs 齐全
      json: async () => ({
        logs: [
          // created_at 非字符串 → time "—" 且不入趋势; 全字段缺省 → 逐项兜底
          { id: null, created_at: 42, key_id: null, model: null, upstream: null, capability: null, status: null, error_code: "boom", request_id: null },
          // created_at 非法字符串 → time 返回原值, 趋势跳过; error 无 error_code → 动作无括号
          { created_at: "not-a-date", status: "error", capability: "embed" },
          // 同小时两行 → 趋势复用同一小时桶（byHour.get 命中侧）
          { id: 3, created_at: "2026-10-15T14:05:00+00:00", status: "ok", latency_ms: 12000 },
          { id: 4, created_at: "2026-10-15T14:45:00+00:00", key_id: "12345678-90ab-cdef", status: "error", error_code: "upstream_5xx" },
          // status 缺省 + created_at 合法 → 趋势内 status ?? "ok" 不计错误
          { id: 5, created_at: "2026-10-15T15:00:00+00:00", status: null },
        ],
      }),
    } as unknown as Response)));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(true));
    // total 缺省 → mapped.length
    expect(result.current.total).toBe(5);

    const [fallback, invalidDate, okLatency, errNoUser] = result.current.logs;
    expect(fallback).toMatchObject({
      id: "LOG-?", time: "—", user: "网关直连", role: "chat", action: "chat 请求",
      target: "? ← ? · 0 tok · 0ms", ip: "—", status: "success", risk: "low", requestId: null,
    });
    expect(invalidDate).toMatchObject({ time: "not-a-date", status: "failed", risk: "high", action: "embed 请求", requestId: null });
    expect(okLatency).toMatchObject({ id: "LOG-3", risk: "medium" }); // 12000ms > 3000
    expect(errNoUser).toMatchObject({ user: "vk-12345678", action: "chat 请求（upstream_5xx）" });

    // 趋势: 非法时间两行跳过; 14 点桶 ops=2/errors=1（同桶复用）; 15 点桶 status 缺省不计错误
    expect(result.current.trend).toHaveLength(2);
    const busyBucket = result.current.trend.find((p) => p.ops === 2);
    const quietBucket = result.current.trend.find((p) => p.ops === 1);
    expect(busyBucket).toMatchObject({ errors: 1 });
    expect(quietBucket).toMatchObject({ errors: 0 });

    // 风险分布: 低=fallback+id5(status 缺省) 2 条; 中=LOG-3(12s) 1 条; 严重=两条 failed
    const dist = Object.fromEntries(result.current.riskDistribution.map((d) => [d.level, d.count]));
    expect(dist["低风险"]).toBe(2);
    expect(dist["中风险"]).toBe(1);
    expect(dist["高风险"]).toBe(0);
    expect(dist["严重"]).toBe(2);
  });

  it("HTTP 错误（ok=false）→ 空态不回退 mock", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 } as unknown as Response)));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(false));
    expect(result.current.logs).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("fetch 全局不可用 → 直接返回保持 null 初态", async () => {
    vi.stubGlobal("fetch", undefined);
    const { result } = renderHook(() => useGatewayAudit());
    // 微任务冲刷后仍为初态: load 早退, 不置 sourceOk
    await act(async () => { await Promise.resolve(); });
    expect(result.current.sourceOk).toBeNull();
    expect(result.current.logs).toEqual([]);
  });

  it("logs 非数组 → 空映射且 sourceOk=true", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as unknown as Response)));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(true));
    expect(result.current.logs).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("traceRequestId: 命中返回 total+映射日志; total/logs 缺省回退; 失败返回空结果", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const u = String(input);
      if (u.includes("request_id=req-1")) {
        return {
          ok: true,
          json: async () => ({
            total: 7,
            logs: [{ id: 9, created_at: "2026-10-15T10:00:00+00:00", key_id: "abcd1234-5678", model: "glm-4-flash", upstream: "zhipu", capability: "chat", status: "ok", request_id: "req-1" }],
          }),
        } as unknown as Response;
      }
      if (u.includes("request_id=req-2")) {
        return { ok: true, json: async () => ({}) } as unknown as Response;
      }
      return { ok: false, status: 500 } as unknown as Response;
    }));
    const { result } = renderHook(() => useGatewayAudit());
    await waitFor(() => expect(result.current.sourceOk).toBe(false)); // 首拉 (无 request_id) 落空态

    let hit!: { count: number; logs: GatewayAuditLog[] };
    await act(async () => { hit = await result.current.traceRequestId("req-1"); });
    expect(hit.count).toBe(7);
    expect(hit.logs).toHaveLength(1);
    expect(hit.logs[0]).toMatchObject({ id: "LOG-9", user: "vk-abcd1234", requestId: "req-1" });

    let fallback!: { count: number; logs: GatewayAuditLog[] };
    await act(async () => { fallback = await result.current.traceRequestId("req-2"); });
    expect(fallback).toEqual({ count: 0, logs: [] }); // total/logs 缺省 → raws.length / []

    let failed!: { count: number; logs: GatewayAuditLog[] };
    await act(async () => { failed = await result.current.traceRequestId("req-3"); });
    expect(failed).toEqual({ count: 0, logs: [] }); // HTTP 错误 → catch 空结果
  });

  it("60s 轮询触发再次拉取", async () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, total: 0, logs: [] }) } as unknown as Response));
      vi.stubGlobal("fetch", spy);
      const { result, unmount } = renderHook(() => useGatewayAudit());
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.sourceOk).toBe(true);
      expect(spy.mock.calls.length).toBe(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(spy.mock.calls.length).toBe(2);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
