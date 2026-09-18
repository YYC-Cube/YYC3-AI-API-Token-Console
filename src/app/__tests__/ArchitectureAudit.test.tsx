/**
 * ArchitectureAudit.test.tsx
 * ===========================
 * ArchitectureAudit 组件测试
 *
 * 覆盖范围:
 * - 页面标题渲染
 * - 6 个 Tab 切换 (overview/routes/stores/tests/checklist/gaps)
 * - 统计卡片渲染
 * - 路由表格渲染
 * - Store 表格渲染
 * - 测试矩阵渲染
 * - 功能清单折叠展开
 * - 已知缺口列表渲染
 */

// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { ArchitectureAudit } from "../components/ArchitectureAudit";

describe("ArchitectureAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("页面基础渲染", () => {
    it("应渲染页面标题", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("YYC3 架构审计全景")).toBeInTheDocument();
    });

    it("应渲染 6 个 Tab 按钮", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("架构概览")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^路由 \(/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^数据层 \(/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^测试 \(/ })).toBeInTheDocument();
      expect(screen.getByText("功能清单")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^缺口 \(/ })).toBeInTheDocument();
    });
  });

  describe("概览 Tab", () => {
    it("应渲染统计卡片", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("路由页面")).toBeInTheDocument();
      expect(screen.getByText("80+")).toBeInTheDocument();
      expect(screen.getByText("i18n 语言")).toBeInTheDocument();
    });

    it("应渲染架构层级图", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("架构层级")).toBeInTheDocument();
      expect(screen.getByText(/表示层/)).toBeInTheDocument();
      expect(screen.getByText(/状态层/)).toBeInTheDocument();
      expect(screen.getByText(/数据层.*Data/)).toBeInTheDocument();
    });

    it("应渲染技术栈", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("技术栈")).toBeInTheDocument();
      expect(screen.getByText("React 18.3")).toBeInTheDocument();
      expect(screen.getByText("Vitest 4.x")).toBeInTheDocument();
    });

    it("应渲染功能完成度进度条", () => {
      render(<ArchitectureAudit />);
      expect(screen.getByText("功能完成度")).toBeInTheDocument();
    });
  });

  describe("路由 Tab", () => {
    it("应切换到路由 Tab 并渲染路由表格", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByRole("button", { name: /^路由 \(/ }));
      expect(screen.getByText(/路由页面清单/)).toBeInTheDocument();
      expect(screen.getByText("DataMonitoring")).toBeInTheDocument();
      expect(screen.getByText("UserManagement")).toBeInTheDocument();
    });
  });

  describe("数据层 Tab", () => {
    it("应切换到数据层 Tab 并渲染 Store 表格", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByRole("button", { name: /^数据层 \(/ }));
      expect(screen.getByText(/localStorage CRUD Stores/)).toBeInTheDocument();
      expect(screen.getByText("yyc3_nodes")).toBeInTheDocument();
      expect(screen.getByText("yyc3_users")).toBeInTheDocument();
    });

    it("应渲染 createLocalStore API 列表", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByRole("button", { name: /^数据层 \(/ }));
      expect(screen.getByText("createLocalStore API")).toBeInTheDocument();
      expect(screen.getByText("getAll(): T[]")).toBeInTheDocument();
    });
  });

  describe("测试 Tab", () => {
    it("应切换到测试 Tab 并渲染测试矩阵", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByRole("button", { name: /^测试 \(/ }));
      expect(screen.getByText("测试文件矩阵")).toBeInTheDocument();
      expect(screen.getByText("覆盖率配置 (vitest.config.ts)")).toBeInTheDocument();
    });
  });

  describe("功能清单 Tab", () => {
    it("应切换到功能清单并展开分类", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByText("功能清单"));
      // 点击展开「数据层」分类
      const dataLayerBtn = screen.getByText("数据层 (Data Layer)");
      fireEvent.click(dataLayerBtn);
      expect(screen.getByText("createLocalStore CRUD 工厂")).toBeInTheDocument();
    });
  });

  describe("缺口 Tab", () => {
    it("应切换到缺口 Tab 并渲染已知缺口", () => {
      render(<ArchitectureAudit />);
      fireEvent.click(screen.getByRole("button", { name: /^缺口 \(/ }));
      expect(screen.getByText("GAP-001")).toBeInTheDocument();
      expect(screen.getByText("测试未运行验证")).toBeInTheDocument();
    });
  });
});
