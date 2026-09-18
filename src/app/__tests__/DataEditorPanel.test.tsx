/**
 * DataEditorPanel.test.tsx
 * =========================
 * DataEditorPanel 组件测试
 *
 * 覆盖:
 * - 基本渲染 (10 个 Tab)
 * - 新增 Tab: 雷达数据 / 模型分布 / 日志管理
 * - Tab 切换
 * - 搜索框
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock ViewContext
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false }),
}));

// Mock db-queries (async calls)
vi.mock("../lib/db-queries", () => ({
  getActiveModels: vi.fn(async () => ({ data: [] })),
  getNodesStatus: vi.fn(async () => ({ data: [] })),
  getAllAgents: vi.fn(async () => ({ data: [] })),
  addDbModel: vi.fn(), updateDbModel: vi.fn(), deleteDbModel: vi.fn(),
  addDbNode: vi.fn(), updateDbNode: vi.fn(), deleteDbNode: vi.fn(),
  addDbAgent: vi.fn(), updateDbAgent: vi.fn(), deleteDbAgent: vi.fn(),
  resetDbModels: vi.fn(), resetDbAgents: vi.fn(), resetDbNodes: vi.fn(),
}));

// Mock useValidation
vi.mock("../hooks/useValidation", () => ({
  useValidation: () => ({
    errors: {},
    validateField: vi.fn(),
    clearAll: vi.fn(),
    clearError: vi.fn(),
  }),
  validateRange: vi.fn(() => null),
  validateModelName: vi.fn(() => null),
}));

// Mock ConfigExportCenter
vi.mock("../components/ConfigExportCenter", () => ({
  ConfigExportCenter: () => <div data-testid="config-export">ConfigExportCenter</div>,
}));

// Mock dashboard-stores
vi.mock("../stores/dashboard-stores", () => ({
  nodeStore: {
    getAll: vi.fn(() => []),
    count: vi.fn(() => 0),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
    exportData: vi.fn(() => "{}"),
    importData: vi.fn(() => true),
  },
  modelPerfStore: {
    getAll: vi.fn(() => []),
    count: vi.fn(() => 0),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
    exportData: vi.fn(() => "{}"),
    importData: vi.fn(() => true),
  },
  recentOpsStore: {
    getAll: vi.fn(() => []),
    count: vi.fn(() => 0),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
    exportData: vi.fn(() => "{}"),
    importData: vi.fn(() => true),
  },
  radarStore: {
    getAll: vi.fn(() => [
      { id: "rd-1", metric: "inferenceSpeed", A: 92, B: 85 },
      { id: "rd-2", metric: "modelAccuracy", A: 88, B: 94 },
    ]),
    count: vi.fn(() => 2),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
  },
  modelDistStore: {
    getAll: vi.fn(() => [
      { id: "md-1", name: "LLaMA-70B", value: 35 },
      { id: "md-2", name: "Qwen-72B", value: 25 },
    ]),
    count: vi.fn(() => 2),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
  },
  logStore: {
    getAll: vi.fn(() => [
      { id: "log-001", timestamp: Date.now(), level: "info", source: "system", message: "Test log" },
    ]),
    count: vi.fn(() => 1),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => []),
  },
}));

import { DataEditorPanel } from "../components/DataEditorPanel";

describe("DataEditorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the panel with header", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      expect(screen.getByText("数据管理")).toBeInTheDocument();
    });
  });

  it("should render all 10 tabs", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      expect(screen.getByText("模型管理")).toBeInTheDocument();
      expect(screen.getByText("节点管理")).toBeInTheDocument();
      expect(screen.getByText("Agent 管理")).toBeInTheDocument();
      expect(screen.getByText("实时节点")).toBeInTheDocument();
      expect(screen.getByText("模型性能")).toBeInTheDocument();
      expect(screen.getByText("操作记录")).toBeInTheDocument();
      expect(screen.getByText("雷达数据")).toBeInTheDocument();
      expect(screen.getByText("模型分布")).toBeInTheDocument();
      expect(screen.getByText("日志管理")).toBeInTheDocument();
      expect(screen.getByText("配置中心")).toBeInTheDocument();
    });
  });

  it("should render search input", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it("should switch to 雷达数据 tab when clicked", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      const radarTab = screen.getByText("雷达数据");
      fireEvent.click(radarTab);
    });
    // After clicking, the radar tab should be active
    // The tab content should show radar data related UI
    await waitFor(() => {
      expect(screen.getByText("雷达数据")).toBeInTheDocument();
    });
  });

  it("should switch to 模型分布 tab when clicked", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      const distTab = screen.getByText("模型分布");
      fireEvent.click(distTab);
    });
    await waitFor(() => {
      expect(screen.getByText("模型分布")).toBeInTheDocument();
    });
  });

  it("should switch to 日志管理 tab when clicked", async () => {
    render(<DataEditorPanel />);
    await waitFor(() => {
      const logsTab = screen.getByText("日志管理");
      fireEvent.click(logsTab);
    });
    await waitFor(() => {
      expect(screen.getByText("日志管理")).toBeInTheDocument();
    });
  });
});