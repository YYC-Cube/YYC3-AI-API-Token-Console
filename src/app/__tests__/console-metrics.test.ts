/**
 * console-metrics.test.ts
 * ========================
 * deploy/console-metrics.mjs 纯逻辑单测（node 项目）
 *
 * 覆盖: filterSettingsPayload 白名单校验（含 ollamaNodes 节点表 R2）/
 * collectNodeMetrics 聚合（正常+不可达+空节点集）/
 * effectiveOllamaNodes desired-state / collectGatewaySnapshot 网关三端点快照
 * — console-server /console/metrics|settings 端点内核
 */

import { describe, it, expect, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- deploy/ 下 .mjs 为无类型声明的 ESM 纯 JS 模块 (同 console-auth.test 先例; 单行 import 保证 @ts-expect-error 覆盖)
// @ts-expect-error
import { collectGatewaySnapshot, collectNodeMetrics, effectiveOllamaNodes, filterSettingsPayload, CONSOLE_SETTINGS_KEYS } from "../../../deploy/console-metrics.mjs";

/** console-metrics 导出契约的最小类型描述（.mjs 无声明, 测试侧收敛） */
interface MetricNode { id: string; status: string; latencyMs: number; models?: string[] }
interface MetricsResult { ts: number; activeCount: string; nodes: MetricNode[] }
type CollectFn = (m: Record<string, string>, f?: unknown, t?: number) => Promise<MetricsResult>;
type Settings = Record<string, string | number | Record<string, string>>;
type FilterFn = (o: unknown) => { ok: boolean; settings: Settings; rejected: string[] };
const collect = collectNodeMetrics as unknown as CollectFn;
const filter = filterSettingsPayload as unknown as FilterFn;

describe("console-metrics: filterSettingsPayload", () => {
  it("白名单键通过且类型收敛 (字符串/数字)", () => {
    const r = filter({
      corsOrigins: "https://a.com,https://b.com",
      sessionTimeoutMin: "45",       // 字符串数字应收敛为 number
      alertEmailAddr: "ops@yyc3.vip",
      unknownKey: "dropped",         // 非白名单丢弃
    });
    expect(r.ok).toBe(true);
    expect(r.settings.corsOrigins).toBe("https://a.com,https://b.com");
    expect(r.settings.sessionTimeoutMin).toBe(45);
    expect(r.settings.alertEmailAddr).toBe("ops@yyc3.vip");
    expect(r.rejected).toEqual([]);
    expect(Object.keys(r.settings)).not.toContain("unknownKey");
  });

  it("非法值进 rejected (超界数字/超长字符串)", () => {
    const r = filter({
      sessionTimeoutMin: 99999,                       // >1440 拒绝
      webhookUrl: "x".repeat(3000),                   // >2048 拒绝
      ipWhitelist: "192.168.0.0/16\n10.0.0.0/8",      // 合法
    });
    expect(r.settings.ipWhitelist).toContain("192.168.0.0/16");
    expect(r.rejected).toEqual(["sessionTimeoutMin", "webhookUrl"]);
  });

  it("非对象载荷 ok=false", () => {
    expect(filter(null).ok).toBe(false);
    expect(filter([1, 2]).ok).toBe(false);
    expect(filter("str").ok).toBe(false);
  });

  it("白名单键清单与契约一致", () => {
    expect(CONSOLE_SETTINGS_KEYS).toEqual(
      expect.arrayContaining(["corsOrigins", "sessionTimeoutMin", "ipWhitelist", "alertEmailAddr", "webhookUrl"])
    );
  });
});

describe("console-metrics: collectNodeMetrics", () => {
  const mockFetchOk = (body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  it("正常聚合各节点运行模型与延迟", async () => {
    const fetchImpl = mockFetchOk({ models: [{ name: "llama3:8b" }, { name: "qwen2:7b" }] });
    const r = await collect({ n1: "http://a:11434", n2: "http://b:11434" }, fetchImpl);
    expect(r.nodes).toHaveLength(2);
    expect(r.nodes.every((n: { status: string }) => n.status === "active")).toBe(true);
    expect(r.nodes[0]!.models).toEqual(["llama3:8b", "qwen2:7b"]);
    expect(r.nodes[0]!.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.activeCount).toBe("2/2");
    expect(r.ts).toBeGreaterThan(0);
  });

  it("不可达节点标记 inactive 且不影响其他节点", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("bad")) throw new Error("ECONNREFUSED");
      return new Response(JSON.stringify({ models: [{ name: "glm4" }] }), { status: 200 });
    });
    const r = await collect({ good: "http://g:11434", bad: "http://bad:11434" }, fetchImpl);
    const good = r.nodes.find((n: { id: string }) => n.id === "good");
    const bad = r.nodes.find((n: { id: string }) => n.id === "bad");
    expect(good?.status).toBe("active");
    expect(bad?.status).toBe("inactive");
    expect(bad?.latencyMs).toBe(-1);
    expect(r.activeCount).toBe("1/2");
  });

  it("HTTP 非 200 按不可达处理", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));
    const r = await collect({ n1: "http://x:11434" }, fetchImpl);
    expect(r.nodes[0]!.status).toBe("inactive");
  });

  it("空节点表返回空集", async () => {
    const r = await collect({}, vi.fn());
    expect(r.nodes).toEqual([]);
    expect(r.activeCount).toBe("0/0");
  });
});

// ============================================================
// 双端联通 R2（2026-10-15）: ollamaNodes 可编辑 + 网关快照
// ============================================================

describe("console-metrics: filterSettingsPayload.ollamaNodes（设备可编辑增减）", () => {
  it("合法节点表通过（desired-state 全量）", () => {
    const r = filter({ ollamaNodes: { n1: "http://100.65.64.49:11434", nas: "https://nas.lan:11434" } });
    expect(r.rejected).toEqual([]);
    expect(r.settings.ollamaNodes).toEqual({ n1: "http://100.65.64.49:11434", nas: "https://nas.lan:11434" });
  });

  it("非法项整键拒绝: 非 http(s) scheme / 非法 ID / 数组 / 超限(>32)", () => {
    expect(filter({ ollamaNodes: { n1: "ftp://x:11434" } }).rejected).toEqual(["ollamaNodes"]);
    expect(filter({ ollamaNodes: { "bad id!": "http://x:11434" } }).rejected).toEqual(["ollamaNodes"]);
    expect(filter({ ollamaNodes: ["n1"] }).rejected).toEqual(["ollamaNodes"]);
    const oversize: Record<string, string> = {};
    for (let i = 0; i < 33; i++) oversize[`n${i}`] = "http://x:11434";
    expect(filter({ ollamaNodes: oversize }).rejected).toEqual(["ollamaNodes"]);
  });

  it("空对象合法（清空语义: 回退内置表由 effectiveOllamaNodes 判定）", () => {
    const r = filter({ ollamaNodes: {} });
    expect(r.rejected).toEqual([]);
    expect(r.settings.ollamaNodes).toEqual({});
  });
});

describe("console-metrics: effectiveOllamaNodes（desired-state / 回退）", () => {
  const base = { n1: "http://a:11434", n2: "http://b:11434" };
  it("设置含非空节点表 → 完全接管（可删除内置项）", () => {
    expect(effectiveOllamaNodes(base, { ollamaNodes: { gx3: "http://c:11434" } })).toEqual({ gx3: "http://c:11434" });
  });
  it("无设置 / 空表 / 非法载体 → 回退内置表（拷贝, 防外改）", () => {
    expect(effectiveOllamaNodes(base, {})).toEqual(base);
    expect(effectiveOllamaNodes(base, { ollamaNodes: {} })).toEqual(base);
    const fallback = effectiveOllamaNodes(base, {});
    expect(fallback).not.toBe(base);
  });
});

describe("console-metrics: collectGatewaySnapshot（P0-3 网关三端点）", () => {
  const gwSnapshotFetch = vi.fn(async (url: string | URL | Request, _init?: { headers?: Record<string, string> }) => {
    const u = String(url);
    if (u.endsWith("/health")) return new Response(JSON.stringify({ status: "healthy", system: { disk_percent: 62.4 } }), { status: 200 });
    if (u.endsWith("/v1/router/stats")) return new Response(JSON.stringify({ upstream_pool: [{ name: "vllm", breaker_state: "closed" }] }), { status: 200 });
    if (u.endsWith("/v1/models/stats")) return new Response(JSON.stringify([{ model_id: "vllm", total_tokens: 100 }]), { status: 200 });
    throw new Error("unexpected " + u);
  });

  it("三端点并发聚合 + 鉴权头注入", async () => {
    const r = await collectGatewaySnapshot("http://127.0.0.1:8800", "sk-admin-x", gwSnapshotFetch, 1000);
    expect(r.ok).toBe(true);
    expect(r.health).toMatchObject({ status: "healthy" });
    expect(r.router).toMatchObject({ upstream_pool: [{ name: "vllm", breaker_state: "closed" }] });
    expect(r.models).toEqual([{ model_id: "vllm", total_tokens: 100 }]);
    const authed = gwSnapshotFetch.mock.calls.filter((c) => String(c[0]).includes("v1/"));
    expect(authed.length).toBe(2);
    expect((authed[0]![1] as { headers: Record<string, string> }).headers["X-API-Key"]).toBe("sk-admin-x");
  });

  it("部分降级: 鉴权端点 503 不拖垮 /health", async () => {
    const partial = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/health")) return new Response(JSON.stringify({ status: "healthy" }), { status: 200 });
      return new Response("nope", { status: 503 });
    });
    const r = await collectGatewaySnapshot("http://gw:8800", "k", partial, 1000);
    expect(r.ok).toBe(true);
    expect(r.router).toBeNull();
    expect(r.models).toBeNull();
  });

  it("全不可达 → ok=false; 无密钥 → 鉴权端点跳过（/health 单源仍可用）; 非法 origin 拒绝", async () => {
    const dead = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const all = await collectGatewaySnapshot("http://gw:8800", "k", dead, 1000);
    expect(all.ok).toBe(false);
    const healthOnly = vi.fn(async () => new Response(JSON.stringify({ status: "healthy" }), { status: 200 }));
    const noKey = await collectGatewaySnapshot("http://gw:8800", "", healthOnly, 1000);
    expect(noKey.ok).toBe(true);
    expect(noKey.health).toMatchObject({ status: "healthy" });
    expect(noKey.router).toBeNull();
    expect(noKey.models).toBeNull();
    const badOrigin = await collectGatewaySnapshot("ftp://gw", "k", dead, 1000);
    expect(badOrigin.ok).toBe(false);
    expect(String(badOrigin.error)).toContain("http/https");
  });
});
