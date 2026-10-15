/**
 * OperationAudit.test.tsx
 * ========================
 * OperationAudit 组件测试 — R5 真实化版（hook mock 固定实况形状数据）
 *
 * 覆盖: 源状态条 / 概览卡（真实计数）/ 表格分页 / 筛选（成功·异常）/
 * 搜索（动作错误码/目标上游/空态）/ 详情 Modal 追踪与导出 / 导出全量 JSON
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: ["zh-CN", "en-US"],
  }),
}));

vi.mock("../components/GlassCard", () => ({
  GlassCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock recharts
vi.mock("recharts", () => {
  const Wrap = ({ children }: any) => <div data-testid="chart">{children}</div>;
  return {
    ResponsiveContainer: Wrap,
    AreaChart: Wrap,
    Area: () => null,
    BarChart: Wrap,
    Bar: ({ children }: any) => <div>{children}</div>,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── R5: 数据源 hook mock（真实形状: /v1/logs 映射产物）──
const AUDIT_FIXTURE = {
  logs: [
    { id: "LOG-1006", time: "14:32:08", user: "vk-abcd1234", role: "chat", action: "chat 请求", target: "glm-4-flash ← zhipu · 900 tok · 800ms", ip: "zhipu", status: "success" as const, risk: "low" as const, requestId: "chatcmpl-e2e-006" },
    { id: "LOG-1005", time: "14:28:45", user: "网关直连", role: "chat", action: "chat 请求（upstream_error）", target: "deepseek-v4 ← deepseek · 0 tok · 5200ms", ip: "deepseek", status: "failed" as const, risk: "high" as const },
    { id: "LOG-1004", time: "14:25:10", user: "vk-abcd1234", role: "chat", action: "chat 请求", target: "qwen3 ← vllm · 400 tok · 3500ms", ip: "vllm", status: "success" as const, risk: "medium" as const },
    { id: "LOG-1003", time: "14:20:55", user: "vk-efef9090", role: "chat", action: "chat 请求", target: "glm-4-flash ← zhipu · 700 tok · 600ms", ip: "zhipu", status: "success" as const, risk: "low" as const },
    { id: "LOG-1002", time: "14:15:22", user: "网关直连", role: "chat", action: "chat 请求（vk_tpm_limited）", target: "glm-4-flash ← gateway · 0 tok · 30ms", ip: "gateway", status: "failed" as const, risk: "high" as const },
    { id: "LOG-1001", time: "14:10:08", user: "vk-abcd1234", role: "chat", action: "chat 请求", target: "bge ← nim · 50 tok · 100ms", ip: "nim", status: "success" as const, risk: "low" as const },
  ],
  trend: [
    { time: "12:00", ops: 1, errors: 0 },
    { time: "13:00", ops: 2, errors: 1 },
    { time: "14:00", ops: 3, errors: 1 },
  ],
  riskDistribution: [
    { level: "低风险", count: 3 },
    { level: "中风险", count: 1 },
    { level: "高风险", count: 0 },
    { level: "严重", count: 2 },
  ],
  sourceOk: true,
  total: 42,
  fetchedAt: "14:32:10",
  refresh: vi.fn(),
  traceRequestId: vi.fn(async () => ({ count: 1, logs: [] })),
};

vi.mock("../hooks/useGatewayAudit", () => ({
  useGatewayAudit: () => AUDIT_FIXTURE,
}));

import { OperationAudit } from "../components/OperationAudit";
import { toast } from "sonner";

describe("OperationAudit 扩展覆盖（R5 真实数据源）", () => {
  const origCreate = (URL as any).createObjectURL;
  const origRevoke = (URL as any).revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    (URL as any).createObjectURL = vi.fn(() => "blob:mock-url");
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    (URL as any).createObjectURL = origCreate;
    (URL as any).revokeObjectURL = origRevoke;
  });

  it("源状态条呈现实况（条数/总数/更新时间）+ 刷新按钮", () => {
    render(<OperationAudit />);
    expect(screen.getByText(/网关请求流水 · 6\/42 条/)).toBeInTheDocument();
    expect(screen.getByText(/更新 14:32:10/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("刷新"));
    expect(AUDIT_FIXTURE.refresh).toHaveBeenCalled();
  });

  it("概览卡标签与真实计数副标渲染", () => {
    render(<OperationAudit />);
    expect(screen.getByText("audit.todayOps")).toBeInTheDocument();
    expect(screen.getByText("audit.abnormalEvents")).toBeInTheDocument();
    expect(screen.getByText("audit.securityEvents")).toBeInTheDocument();
    expect(screen.getByText("audit.activeUsers")).toBeInTheDocument();
    expect(screen.getByText("总计 42 条（近 24h）")).toBeInTheDocument();
  });

  it("表格首页 5 条（LOG-1006..1002）, 第 6 条在第 2 页", () => {
    render(<OperationAudit />);
    expect(screen.getByText("LOG-1006")).toBeInTheDocument();
    expect(screen.getByText("LOG-1002")).toBeInTheDocument();
    expect(screen.queryByText("LOG-1001")).not.toBeInTheDocument();
  });

  it("筛选: 成功态 / 异常态（failed）", () => {
    render(<OperationAudit />);
    fireEvent.click(screen.getByText("audit.filterSuccess"));
    expect(screen.getByText("LOG-1006")).toBeInTheDocument();
    expect(screen.queryByText("LOG-1005")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("audit.filterAbnormal"));
    expect(screen.getByText("LOG-1005")).toBeInTheDocument();
    expect(screen.queryByText("LOG-1006")).not.toBeInTheDocument();
  });

  it("搜索: 动作错误码命中 / 目标上游命中 / 空态提示", () => {
    render(<OperationAudit />);
    fireEvent.change(screen.getByPlaceholderText("audit.searchLog"), { target: { value: "upstream_error" } });
    expect(screen.getByText("LOG-1005")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("audit.searchLog"), { target: { value: "zhipu" } });
    expect(screen.getByText("LOG-1006")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("audit.searchLog"), { target: { value: "zzz-no-match" } });
    expect(screen.getByText("无匹配记录")).toBeInTheDocument();
  });

  it("详情 Modal: 追踪链路 toast + 导出报告关闭 Modal", () => {
    render(<OperationAudit />);
    fireEvent.click(screen.getByText("LOG-1006").closest("tr")!);
    fireEvent.click(screen.getByText("audit.traceLink"));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("追踪链路: LOG-1006"),
      expect.anything(),
    );
    fireEvent.click(screen.getByText("audit.exportReport"));
    expect(toast.success).toHaveBeenCalledWith("报告已导出", expect.anything());
    expect(screen.queryByText("audit.detailTitle")).not.toBeInTheDocument();
  });

  it("R7 链路检索: 详情抽屉 request_id 按钮 → traceRequestId → toast 命中数", () => {
    render(<OperationAudit />);
    fireEvent.click(screen.getByText("LOG-1006").closest("tr")!);
    const btn = screen.getByText(/链路检索 · request_id: chatcmpl-e2e-006/);
    fireEvent.click(btn);
    expect(AUDIT_FIXTURE.traceRequestId).toHaveBeenCalledWith("chatcmpl-e2e-006");
  });

  it("导出全量按钮触发下载与 toast（计数=当前筛选集）", () => {
    render(<OperationAudit />);
    fireEvent.click(screen.getByText("audit.export"));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("已导出 6 条审计日志"),
      expect.anything(),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("分页: 第 2 页呈现 LOG-1001", () => {
    render(<OperationAudit />);
    const page2 = screen.getAllByText("2").find((el) => el.closest("button"));
    expect(page2).toBeTruthy();
    fireEvent.click(page2!);
    expect(screen.getByText("LOG-1001")).toBeInTheDocument();
    expect(screen.queryByText("LOG-1006")).not.toBeInTheDocument();
  });
});
