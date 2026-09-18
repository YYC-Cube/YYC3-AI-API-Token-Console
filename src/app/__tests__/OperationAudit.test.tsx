/**
 * OperationAudit.test.tsx
 * ========================
 * OperationAudit 组件测试
 *
 * 覆盖范围:
 * - 4 个统计卡片渲染
 * - 操作趋势图表标题
 * - 风险分布图表标题
 * - 审计日志表格 (分页后首页 5 条)
 * - 表头渲染
 * - 筛选按钮交互
 * - 搜索框渲染 + 实际搜索过滤
 * - 导出按钮
 * - 分页控件
 * - 详情 Modal 打开/关闭
 * - Modal 中详情字段
 * - 追踪链路/导出报告按钮
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { OperationAudit } from "../components/OperationAudit";

describe("OperationAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("统计卡片", () => {
    it("应渲染 4 个统计卡片", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.todayOps")).toBeInTheDocument();
      expect(screen.getByText("audit.abnormalEvents")).toBeInTheDocument();
      expect(screen.getByText("audit.securityEvents")).toBeInTheDocument();
      expect(screen.getByText("audit.activeUsers")).toBeInTheDocument();
    });

    it("应渲染统计数值", () => {
      render(<OperationAudit />);
      expect(screen.getByText("1,284")).toBeInTheDocument();
    });

    it("应渲染副标签", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.comparedYesterday")).toBeInTheDocument();
      expect(screen.getByText("audit.needProcess")).toBeInTheDocument();
    });
  });

  describe("图表区域", () => {
    it("应渲染操作趋势图表标题", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.opsTrend")).toBeInTheDocument();
    });

    it("应渲染风险分布图表标题", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.riskDist")).toBeInTheDocument();
    });
  });

  describe("审计日志表格", () => {
    it("应渲染审计日志标题", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.auditLog")).toBeInTheDocument();
    });

    it("应渲染表头列", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.colStatus")).toBeInTheDocument();
      expect(screen.getByText("audit.colAuditId")).toBeInTheDocument();
      expect(screen.getByText("audit.colTime")).toBeInTheDocument();
      expect(screen.getByText("audit.colUser")).toBeInTheDocument();
      expect(screen.getByText("audit.colRole")).toBeInTheDocument();
      expect(screen.getByText("audit.colAction")).toBeInTheDocument();
      expect(screen.getByText("audit.colTarget")).toBeInTheDocument();
      expect(screen.getByText("audit.colIp")).toBeInTheDocument();
      expect(screen.getByText("audit.colRisk")).toBeInTheDocument();
    });

    it("首页应渲染前 5 条审计日志 (分页)", () => {
      render(<OperationAudit />);
      expect(screen.getByText("AUD-20260222-0001")).toBeInTheDocument();
      expect(screen.getByText("AUD-20260222-0005")).toBeInTheDocument();
      // 第 6 条不在首页
      expect(screen.queryByText("AUD-20260222-0006")).not.toBeInTheDocument();
    });

    it("应渲染操作类型", () => {
      render(<OperationAudit />);
      expect(screen.getByText("模型部署")).toBeInTheDocument();
      expect(screen.getByText("节点重启")).toBeInTheDocument();
      expect(screen.getByText("数据迁移")).toBeInTheDocument();
    });

    it("应渲染风险等级标签", () => {
      render(<OperationAudit />);
      expect(screen.getAllByText("audit.riskLow").length).toBeGreaterThan(0);
      expect(screen.getAllByText("audit.riskMedium").length).toBeGreaterThan(0);
      expect(screen.getAllByText("audit.riskHigh").length).toBeGreaterThan(0);
    });
  });

  describe("筛选按钮", () => {
    it("应渲染 4 个筛选按钮", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.filterAll")).toBeInTheDocument();
      expect(screen.getByText("audit.filterSuccess")).toBeInTheDocument();
      expect(screen.getByText("audit.filterAbnormal")).toBeInTheDocument();
      expect(screen.getByText("audit.filterAlert")).toBeInTheDocument();
    });

    it("默认选中全部", () => {
      render(<OperationAudit />);
      const allBtn = screen.getByText("audit.filterAll").closest("button")!;
      expect(allBtn.className).toContain("text-[#00d4ff]");
    });

    it("点击筛选按钮应切换激活状态", () => {
      render(<OperationAudit />);
      fireEvent.click(screen.getByText("audit.filterSuccess"));
      const successBtn = screen.getByText("audit.filterSuccess").closest("button")!;
      expect(successBtn.className).toContain("text-[#00d4ff]");
      const allBtn = screen.getByText("audit.filterAll").closest("button")!;
      expect(allBtn.className).not.toContain("bg-[rgba(0,212,255,0.12)]");
    });

    it("异常筛选应只显示 failed/warning 条目", () => {
      render(<OperationAudit />);
      fireEvent.click(screen.getByText("audit.filterAbnormal"));
      // Only failed/warning logs shown
      expect(screen.queryByText("AUD-20260222-0001")).not.toBeInTheDocument();
    });
  });

  describe("搜索与导出", () => {
    it("应渲染搜索框", () => {
      render(<OperationAudit />);
      expect(screen.getByPlaceholderText("audit.searchLog")).toBeInTheDocument();
    });

    it("搜索应过滤日志", () => {
      render(<OperationAudit />);
      const input = screen.getByPlaceholderText("audit.searchLog");
      fireEvent.change(input, { target: { value: "模型部署" } });
      expect(screen.getByText("AUD-20260222-0001")).toBeInTheDocument();
      expect(screen.queryByText("AUD-20260222-0002")).not.toBeInTheDocument();
    });

    it("应渲染导出按钮", () => {
      render(<OperationAudit />);
      expect(screen.getByText("audit.export")).toBeInTheDocument();
    });
  });

  describe("分页", () => {
    it("应渲染总记录数", () => {
      render(<OperationAudit />);
      expect(screen.getByText(/12/)).toBeInTheDocument();
    });

    it("应渲染分页页码", () => {
      render(<OperationAudit />);
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });

    it("点击下一页应显示后续记录", () => {
      render(<OperationAudit />);
      // Page 1 shows first 5
      expect(screen.getByText("AUD-20260222-0001")).toBeInTheDocument();
      // Click page 2
      const page2Btns = screen.getAllByText("2");
      const page2Btn = page2Btns.find(el => el.closest("button"));
      if (page2Btn) {
        fireEvent.click(page2Btn);
        // Page 2 should show logs 6-10
        expect(screen.getByText("AUD-20260222-0006")).toBeInTheDocument();
        expect(screen.queryByText("AUD-20260222-0001")).not.toBeInTheDocument();
      }
    });
  });

  describe("详情 Modal", () => {
    it("点击日志行应打开详情 Modal", () => {
      render(<OperationAudit />);
      const row = screen.getByText("AUD-20260222-0001").closest("tr")!;
      fireEvent.click(row);
      expect(screen.getByText("audit.detailTitle")).toBeInTheDocument();
    });

    it("Modal 应显示详情字段", () => {
      render(<OperationAudit />);
      const row = screen.getByText("AUD-20260222-0001").closest("tr")!;
      fireEvent.click(row);
      expect(screen.getByText("audit.fieldAuditId")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldTime")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldUser")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldRole")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldAction")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldTarget")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldIp")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldStatus")).toBeInTheDocument();
      expect(screen.getByText("audit.fieldRisk")).toBeInTheDocument();
    });

    it("Modal 应显示追踪链路和导出按钮", () => {
      render(<OperationAudit />);
      const row = screen.getByText("AUD-20260222-0001").closest("tr")!;
      fireEvent.click(row);
      expect(screen.getByText("audit.traceLink")).toBeInTheDocument();
      expect(screen.getByText("audit.exportReport")).toBeInTheDocument();
    });

    it("关闭按钮应关闭 Modal", () => {
      render(<OperationAudit />);
      const row = screen.getByText("AUD-20260222-0001").closest("tr")!;
      fireEvent.click(row);
      expect(screen.getByText("audit.detailTitle")).toBeInTheDocument();
      const closeBtn = screen.getByText("audit.detailTitle").parentElement?.querySelector("button");
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(screen.queryByText("audit.detailTitle")).not.toBeInTheDocument();
      }
    });

    it("点击遮罩应关闭 Modal", () => {
      render(<OperationAudit />);
      const row = screen.getByText("AUD-20260222-0001").closest("tr")!;
      fireEvent.click(row);
      const modalOuter = screen.getByText("audit.detailTitle").closest(".fixed");
      if (modalOuter) {
        fireEvent.click(modalOuter);
        expect(screen.queryByText("audit.detailTitle")).not.toBeInTheDocument();
      }
    });
  });
});
