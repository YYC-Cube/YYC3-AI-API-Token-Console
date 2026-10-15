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
  it("13 项技能且 id 唯一（R6: +OCR/ASR/MCP×2）", () => {
    expect(GATEWAY_SKILLS).toHaveLength(13);
    expect(new Set(GATEWAY_SKILLS.map((s) => s.id)).size).toBe(13);
    expect(GATEWAY_SKILLS.some((s) => s.id === "ocr")).toBe(true);
    expect(GATEWAY_SKILLS.some((s) => s.id === "asr-transcribe")).toBe(true);
    expect(GATEWAY_SKILLS.some((s) => s.id === "mcp-tools")).toBe(true);
    expect(GATEWAY_SKILLS.some((s) => s.id === "mcp-execute")).toBe(true);
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

  it("R6 OCR: file 参数走 FormData（无 Content-Type 头, 浏览器带 boundary）", async () => {
    const spy = stubFetch((url) => (url.includes("/v1/ocr") ? { status: 200, body: { choices: [{ message: { content: "识别结果文本" } }] } } : null));
    vi.stubGlobal("fetch", spy);
    const fakeFile = new File(["x"], "img.png", { type: "image/png" });
    const r = await runGatewaySkill("ocr", { file: fakeFile, prompt: "提取文本" });
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("识别结果文本");
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("prompt")).toBe("提取文本");
    expect((init.headers as Record<string, string> | undefined)?.["Content-Type"]).toBeUndefined();
  });

  it("R6 MCP execute: JSON body 构造器（非法 JSON 容错为空对象）", async () => {
    const spy = stubFetch((url) => (url.includes("/v1/mcp/execute") ? { status: 200, body: { success: true, tool_name: "web_search" } } : null));
    vi.stubGlobal("fetch", spy);
    const r = await runGatewaySkill("mcp-execute", { tool_name: "web_search", parameters: "{not-json" });
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("执行成功");
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(String(init.body));
    expect(sent).toEqual({ tool_name: "web_search", parameters: {} });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("R6 MCP tools 发现摘要", async () => {
    vi.stubGlobal("fetch", stubFetch((url) => (url.includes("/v1/mcp/tools") ? { status: 200, body: { tools: [{ name: "a" }], local_tools: [{ name: "b" }, { name: "c" }], total_count: 3 } } : null)));
    const r = await runGatewaySkill("mcp-tools");
    expect(r.ok).toBe(true);
    expect(r.summary).toContain("共 3 个工具");
    expect(r.summary).toContain("本地 2");
  });

  it("R8 全技能 summarize 分支矩阵: 满载荷/空对象/缺字段三态不抛错且产出摘要", () => {
    const full: Record<string, unknown> = {
      hit_rate: 0.5, total_entries: 9, size: 3, invalidated: 2,
      results: [1, 2], probed: 2,
      entries: [1], audit: [1], total: 3,
      total_calls: 10, total_cost_usd: 1.5, groups: [{}, {}],
      totals: { calls: 4, tokens: 90, cost_usd: 0.5 }, series: { a: [1], b: [2] },
      logs: [{ status: "ok" }, { status: "error" }, {}],
      alerts: [{ level: "critical" }, { level: "info" }], level: "critical",
      total_requests: 7, total_tokens: 700,
      choices: [{ message: { content: "识别文本ABC" } }], text: "转写文本XYZ",
      success: true, error: "boom", tool_name: "t", tools: [1], local_tools: [1, 2], total_count: 3,
    };
    for (const skill of GATEWAY_SKILLS) {
      const a = skill.summarize(full);
      const b = skill.summarize({});
      expect(typeof a).toBe("string");
      expect(typeof b).toBe("string");
    }
    // 关键派生抽查
    const ocr = getSkill("ocr")!;
    expect(ocr.summarize(full)).toContain("识别文本ABC");
    expect(getSkill("asr-transcribe")!.summarize(full)).toContain("转写文本XYZ");
    expect(getSkill("mcp-execute")!.summarize({ success: false, error: "boom" })).toContain("boom");
    expect(getSkill("alerts-critical")!.summarize(full)).toContain("critical 1");
    expect(getSkill("logs-recent")!.summarize(full)).toContain("错误 1");
  });

  it("R8 全技能 path 构造矩阵: 参数编码与查询串形态", () => {
    const p = { model: "m x", days: "3", minutes: "30", step: "15", limit: "9", level: "critical", tool_name: "t", parameters: "{}", file: "" };
    for (const skill of GATEWAY_SKILLS) {
      const out = skill.path(p);
      expect(out.startsWith("/")).toBe(true);
      expect(out).not.toContain(" ");
    }
    expect(getSkill("cache-invalidate")!.path(p)).toBe("/v1/cache/invalidate/m%20x");
    expect(getSkill("usage-summary")!.path(p)).toContain("days=3&group_by=model");
    expect(getSkill("usage-timeline")!.path(p)).toContain("minutes=30&step_minutes=15");
    expect(getSkill("logs-recent")!.path(p)).toContain("minutes=30&limit=9");
    expect(getSkill("alerts-critical")!.path({ ...p, level: "" })).toBe("/v1/admin/alerts");
  });

  it("R8 无 body 的 POST: 仅设 JSON 头无请求体（upstream-probe 形态）", async () => {
    const spy = stubFetch((url) => (url.includes("/v1/admin/upstreams/probe") ? { status: 200, body: { probed: 3 } } : null));
    vi.stubGlobal("fetch", spy);
    const r = await runGatewaySkill("upstream-probe");
    expect(r.summary).toContain("3");
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
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
