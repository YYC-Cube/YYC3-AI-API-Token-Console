// @vitest-environment jsdom
/**
 * gateway-skills.test.ts
 * =======================
 * 网关技能注册表与执行器单测（双端联通 P1 / 硬约束③ §11）
 *
 * 覆盖: 注册表完备性（9 技能 · §11 P1 覆盖族）/ 路径与方法生成（含 P1 新端点与参数编码）/
 * 执行器成功·失败·401/503 语义 / 摘要器输出 / 未知技能防御
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GATEWAY_SKILLS, getSkill, runGatewaySkill } from "../lib/gateway-skills";

/** 按 URL 路由的 fetch 桩 */
function stubFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown } | null) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const hit = handler(url, init);
    if (!hit) throw new Error("offline: " + url);
    return {
      ok: hit.status >= 200 && hit.status < 300,
      status: hit.status,
      json: async () => hit.body,
    } as unknown as Response;
  });
}

describe("gateway-skills: 注册表完备性（§11 P1 覆盖族）", () => {
  it("9 项技能且 id 唯一", () => {
    expect(GATEWAY_SKILLS).toHaveLength(9);
    expect(new Set(GATEWAY_SKILLS.map((s) => s.id)).size).toBe(9);
  });

  it("消费 P1 四新端点（logs/timeline/summary 成本/alerts）", () => {
    const paths = GATEWAY_SKILLS.map((s) => s.path({ minutes: "60", step: "30", days: "7", limit: "20", level: "", model: "m" }));
    expect(paths.some((p) => p.startsWith("/v1/logs"))).toBe(true);
    expect(paths.some((p) => p.startsWith("/v1/usage/timeline"))).toBe(true);
    expect(paths.some((p) => p.startsWith("/v1/admin/alerts"))).toBe(true);
    expect(paths.some((p) => p === "/v1/models/summary")).toBe(true);
  });

  it("getSkill 命中/未命中", () => {
    expect(getSkill("cache-stats")?.label).toBe("缓存统计");
    expect(getSkill("nope")).toBeUndefined();
  });
});

describe("gateway-skills: 执行器", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("成功: GET 走 /console/gw 代理前缀, 摘要与 JSON 详情返回", async () => {
    vi.stubGlobal("fetch", stubFetch((url) => {
      if (url.includes("/v1/models/summary")) {
        return { status: 200, body: { total_requests: 42, total_tokens: 1000, cost_usd: 1.5 } };
      }
      return null;
    }));
    const r = await runGatewaySkill("models-summary");
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("请求 42");
    expect(r.summary).toContain("成本 $1.50");
    expect(r.detail).toContain("total_requests");
    expect(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).toContain("/console/gw/v1/models/summary");
  });

  it("成功: POST + 路径参数编码（缓存失效）", async () => {
    const spy = stubFetch((url) => (url.includes("/v1/cache/invalidate/") ? { status: 200, body: { invalidated: 3 } } : null));
    vi.stubGlobal("fetch", spy);
    const r = await runGatewaySkill("cache-invalidate", { model: "glm-4 flash/1" });
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("3");
    const [calledUrl, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(calledUrl)).toContain(encodeURIComponent("glm-4 flash/1"));
    expect(init?.method).toBe("POST");
  });

  it("参数拼入查询串（logs 分钟/条数）", async () => {
    const spy = stubFetch((url) => (url.includes("/v1/logs") ? { status: 200, body: { total: 5, logs: [] } } : null));
    vi.stubGlobal("fetch", spy);
    const r = await runGatewaySkill("logs-recent", { minutes: "30", limit: "10" });
    expect(r.ok).toBe(true);
    expect(String(spy.mock.calls[0][0])).toContain("minutes=30&limit=10");
    expect(r.summary).toContain("共 5 条");
  });

  it("401 → 未登录语义提示; 503 → 密钥未配置提示", async () => {
    vi.stubGlobal("fetch", stubFetch(() => ({ status: 401, body: {} })));
    const a = await runGatewaySkill("cache-stats");
    expect(a.ok).toBe(false);
    expect(a.summary).toContain("401");
    expect(a.summary).toContain("登录");
    vi.stubGlobal("fetch", stubFetch(() => ({ status: 503, body: {} })));
    const b = await runGatewaySkill("cache-stats");
    expect(b.summary).toContain("GW_ADMIN_KEY");
  });

  it("网络失败 → 如实报错（不伪造成功）; 未知技能防御", async () => {
    vi.stubGlobal("fetch", stubFetch(() => null));
    const r = await runGatewaySkill("cache-stats");
    expect(r.ok).toBe(false);
    expect(r.summary).toContain("执行失败");
    const unknown = await runGatewaySkill("nope");
    expect(unknown.ok).toBe(false);
    expect(unknown.summary).toContain("未知技能");
  });
});
