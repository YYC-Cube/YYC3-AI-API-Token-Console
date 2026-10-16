/**
 * useReportExporter.test.ts
 * ==========================
 * useReportExporter hook 单元测试 — 双端联通 P0-4 真实数据源版
 *
 * 覆盖: 真实三源（usage/summary · models/stats · console/metrics）采集与聚合 /
 * 全源不可达拒绝生成（硬约束①·不产模拟报表）/ 部分源降级（无源显「—」）/
 * 规则化建议（熔断/错误率/磁盘/成本）/ 导出链路（JSON/CSV/可打印 HTML）
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportExporter } from "../hooks/useReportExporter";

/** 真实源桩载荷（契约对齐后端 usage_summary / ModelStat / console-metrics 网关快照） */
const USAGE_PAYLOAD = {
  days: 1,
  total_calls: 1000,
  total_cost_usd: 1.234,
  groups: [
    { grp: "glm-4-flash", calls: 800, prompt_tokens: 100_000, completion_tokens: 50_000, cost_usd: 1.0, avg_latency_ms: 120 },
    { grp: "deepseek-v4", calls: 200, prompt_tokens: 20_000, completion_tokens: 10_000, cost_usd: 0.234, avg_latency_ms: 200 },
  ],
};
const MODELS_PAYLOAD = [
  { model_id: "vllm-flagship", usage_count: 500, avg_latency_ms: 150, error_rate: 0.02, total_tokens: 300_000 },
  { model_id: "bge-embed-nim", usage_count: 100, avg_latency_ms: 30, error_rate: 0.001, total_tokens: 50_000 },
];
const METRICS_PAYLOAD = {
  ts: Date.now(),
  activeCount: "1/1",
  nodes: [{ id: "n1", status: "active", latencyMs: 10, models: ["qwen3:14b"] }],
  gateway: {
    health: {
      status: "healthy", version: "2.0.0",
      services: { ollama: { status: "healthy" }, redis: { status: "healthy" }, postgresql: { status: "healthy" } },
      system: { cpu_percent: 35.5, memory_percent: 60.2, disk_percent: 72.1 },
      metrics: { active_requests: 2 },
    },
    router: {
      upstream_pool: [
        { name: "vllm-flagship", breaker_state: "closed", load: 40 },
        { name: "bge-embed-nim", status: "open" }, // 熔断 → 建议规则应命中
      ],
    },
    models: [],
  },
};

/** 按 URL 路由的 fetch 桩（默认三源全通） */
function stubSourcesFetch(opts: { usage?: boolean; models?: boolean; metrics?: boolean } = {}) {
  const { usage = true, models = true, metrics = true } = opts;
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (usage && url.includes("/v1/admin/usage/summary")) {
      return { ok: true, json: async () => USAGE_PAYLOAD } as unknown as Response;
    }
    if (models && url.includes("/v1/models/stats")) {
      return { ok: true, json: async () => MODELS_PAYLOAD } as unknown as Response;
    }
    if (metrics && url.includes("/console/metrics")) {
      return { ok: true, json: async () => METRICS_PAYLOAD } as unknown as Response;
    }
    throw new Error("offline: " + url);
  });
}

/** 触发生成并冲刷微任务（真实源采集为 async, 无定时器延迟） */
async function generate(result: { current: ReturnType<typeof useReportExporter> }) {
  await act(async () => {
    result.current.generateReport();
  });
}

describe("useReportExporter（真实数据源 P0-4）", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", stubSourcesFetch());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始默认值（历史种子已随 mock 清理移除 → 空）", () => {
    const { result } = renderHook(() => useReportExporter());
    expect(result.current.reportType).toBe("performance");
    expect(result.current.timeRange).toBe("24h");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.report).toBeNull();
    expect(result.current.lastError).toBeNull();
    expect(result.current.recentReports.length).toBe(0);
  });

  it("真实三源生成: 账单/延迟/节点健康卡片为真实聚合值", async () => {
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    const report = result.current.report!;
    expect(report).not.toBeNull();
    expect(result.current.isGenerating).toBe(false);
    const card = (label: string) => report.summary.find((m) => m.label === label)?.value;
    expect(card("总请求次数")).toBe("1,000"); // usage total_calls
    expect(card("Token 总量")).toBe("180,000"); // groups prompt+completion 合计
    expect(card("成本 (USD)")).toBe("$1.23");
    expect(card("节点健康")).toBe("1/2"); // 上游池 closed=active, open=error
    // 延迟: usage calls 加权 (120*800+200*200)/1000 = 136
    expect(card("平均延迟")).toBe("136ms");
  });

  it("规则化建议: 熔断上游命中 + 真实成本 top", async () => {
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    const recs = result.current.report!.recommendations;
    expect(recs.some((r) => r.includes("bge-embed-nim") && r.includes("熔断"))).toBe(true);
    expect(recs.some((r) => r.includes("glm-4-flash") && r.includes("$1.00"))).toBe(true);
  });

  it("性能快照为真实单点（时序待 BL-A2 不伪造历史）+ 安全时序空集", async () => {
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    const report = result.current.report!;
    expect(report.performanceHistory).toHaveLength(1);
    expect(report.performanceHistory[0]!.cpuUsage).toBe(35.5);
    expect(report.performanceHistory[0]!.memoryUsage).toBe(60.2);
    expect(report.performanceHistory[0]!.latencyP99).toBe(0); // 无 P99 源 → 0 不冒充
    expect(report.securityHistory).toEqual([]);
  });

  it("节点明细: 上游行延迟从 models/stats 按名匹配合并", async () => {
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    const vllm = result.current.report!.nodeBreakdown.find((n) => n.nodeId === "vllm-flagship");
    expect(vllm?.avgLatency).toBe(150);
    expect(vllm?.errorRate).toBe(2);
    expect(result.current.report!.nodeBreakdown.some((n) => n.nodeId === "nas-gateway")).toBe(true);
  });

  it("全源不可达: 拒绝生成并显式报错（不产模拟报表, 硬约束①）", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    expect(result.current.report).toBeNull();
    expect(result.current.lastError).toContain("拒绝生成模拟报表");
    expect(result.current.isGenerating).toBe(false);
  });

  it("部分源降级: 仅 models/stats 可达 → 成本/节点健康显「—」", async () => {
    vi.stubGlobal("fetch", stubSourcesFetch({ usage: false, metrics: false }));
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    const report = result.current.report!;
    const card = (label: string) => report.summary.find((m) => m.label === label)?.value;
    expect(card("成本 (USD)")).toBe("—");
    expect(card("节点健康")).toBe("—");
    expect(card("总请求次数")).toBe("600"); // models usage_count 合计
  });

  it("生成后入历史并置顶", async () => {
    const { result } = renderHook(() => useReportExporter());
    await generate(result);
    expect(result.current.recentReports).toHaveLength(1);
    expect(result.current.recentReports[0]!.type).toBe("performance");
  });

  it("无报告时导出不抛错", () => {
    const { result } = renderHook(() => useReportExporter());
    act(() => {
      result.current.exportReport("json");
    });
  });
});

// ============================================================
// 导出链路 (JSON / CSV / 可打印 HTML) — Blob/URL/anchor/window.open 全 stub
// ============================================================

import type { Mock } from "vitest";

describe("useReportExporter 导出链路", () => {
  let downloads: string[];
  let createObjectURL: Mock;
  let revokeObjectURL: Mock;
  let clickSpy: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    downloads = [];
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
    localStorage.clear();
    vi.stubGlobal("fetch", stubSourcesFetch());
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** 生成一份真实源报告（async 采集 + 微任务冲刷） */
  async function generateReadyReport(type?: "audit" | "comprehensive") {
    const { result } = renderHook(() => useReportExporter());
    if (type) {
      act(() => {
        result.current.setReportType(type);
      });
    }
    await generate(result);
    return result;
  }

  it("exportReport json 应走 Blob 下载链路", async () => {
    const result = await generateReadyReport();

    act(() => {
      result.current.exportReport("json");
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0]![0]).toBeInstanceOf(Blob);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^yyc3-performance-report-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportReport csv 应走 Blob 下载链路", async () => {
    const result = await generateReadyReport();

    act(() => {
      result.current.exportReport("csv");
    });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads[0]).toMatch(/^yyc3-performance-report-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exportReport print 应打开新窗口写入 Blob URL", async () => {
    const result = await generateReadyReport();
    const fakeWin = {
      location: { href: "" },
      document: { close: vi.fn() },
    };
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);

    act(() => {
      result.current.exportReport("print");
    });

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fakeWin.location.href).toBe("blob:mock-url");
    expect(fakeWin.document.close).toHaveBeenCalledTimes(1);

    // 60s 后延迟回收 Blob URL
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("window.open 被拦截 (返回 null) 时 print 导出应静默跳过", async () => {
    const result = await generateReadyReport();
    vi.spyOn(window, "open").mockReturnValue(null);

    act(() => {
      result.current.exportReport("print");
    });

    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("audit 类型报告标题应为操作审计报表", async () => {
    const result = await generateReadyReport("audit");
    expect(result.current.report?.title).toBe("操作审计报表");
    expect(result.current.report?.timeRange.label).toBe("最近 24 小时");
  });

  it("历史记录上限 10（连续生成 12 次）", async () => {
    const { result } = renderHook(() => useReportExporter());
    for (let i = 0; i < 12; i++) {
      await generate(result);
    }
    expect(result.current.recentReports.length).toBeLessThanOrEqual(10);
  });
});
