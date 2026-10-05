/**
 * console-metrics.test.ts
 * ========================
 * deploy/console-metrics.mjs 纯逻辑单测（node 项目）
 *
 * 覆盖: filterSettingsPayload 白名单校验 / collectNodeMetrics 聚合
 * (正常+不可达+空节点集) — console-server /console/metrics|settings 端点内核
 */

import { describe, it, expect, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- deploy/ 下 .mjs 为无类型声明的 ESM 纯 JS 模块 (同 console-auth.test 先例)
// @ts-expect-error
import { collectNodeMetrics, filterSettingsPayload, CONSOLE_SETTINGS_KEYS } from "../../../deploy/console-metrics.mjs";

/** console-metrics 导出契约的最小类型描述（.mjs 无声明, 测试侧收敛） */
interface MetricNode { id: string; status: string; latencyMs: number; models?: string[] }
interface MetricsResult { ts: number; activeCount: string; nodes: MetricNode[] }
type CollectFn = (m: Record<string, string>, f?: unknown, t?: number) => Promise<MetricsResult>;
type FilterFn = (o: unknown) => { ok: boolean; settings: Record<string, string | number>; rejected: string[] };
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
    expect(r.nodes[0].models).toEqual(["llama3:8b", "qwen2:7b"]);
    expect(r.nodes[0].latencyMs).toBeGreaterThanOrEqual(0);
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
    expect(r.nodes[0].status).toBe("inactive");
  });

  it("空节点表返回空集", async () => {
    const r = await collect({}, vi.fn());
    expect(r.nodes).toEqual([]);
    expect(r.activeCount).toBe("0/0");
  });
});
