/**
 * DatabaseConnectionPanel.test.tsx
 * ==================================
 * 数据库连接面板组件测试
 *
 * 覆盖:
 * - 基本渲染 (标题、连接列表)
 * - 新建连接表单
 * - 连接池配置子组件
 * - SQL 快速测试子组件
 * - 导出/导入按钮
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock CodeMirror
vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value}>
      {props.placeholder && <span>{props.placeholder}</span>}
    </div>
  ),
}));
vi.mock("@codemirror/lang-javascript", () => ({ javascript: () => [] }));
vi.mock("@codemirror/lang-json", () => ({ json: () => [] }));
vi.mock("@codemirror/lang-python", () => ({ python: () => [] }));
vi.mock("@codemirror/lang-sql", () => ({ sql: () => [] }));
vi.mock("@codemirror/lang-markdown", () => ({ markdown: () => [] }));
vi.mock("@codemirror/lang-html", () => ({ html: () => [] }));
vi.mock("@codemirror/lang-css", () => ({ css: () => [] }));
vi.mock("@codemirror/lang-xml", () => ({ xml: () => [] }));
vi.mock("@codemirror/lang-yaml", () => ({ yaml: () => [] }));
vi.mock("@codemirror/view", () => ({
  EditorView: {
    theme: () => [],
    lineWrapping: [],
    domEventHandlers: () => [],
  },
}));
vi.mock("@codemirror/state", () => ({}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock env
vi.mock("../lib/env-config", () => ({
  env: (key: string) => {
    const defaults: Record<string, any> = {
      SYSTEM_NAME: "YYC\u00B3 Test",
      DB_POOL_MIN: 2,
      DB_POOL_MAX: 10,
      DB_POOL_IDLE_TIMEOUT: 30000,
      DB_POOL_ACQUIRE_TIMEOUT: 5000,
      SQL_BLOCKED_COMMANDS: "DROP,DELETE,TRUNCATE,ALTER",
      SQL_MAX_HISTORY: 20,
      SQL_TEST_SIMULATE_DELAY: 500,
    };
    return defaults[key] ?? "";
  },
}));

// Mock ViewContext
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false }),
}));

// Mock dbConnectionStore
const mockConnections = [
  {
    id: "db-pg-main",
    name: "主数据库 (PostgreSQL)",
    type: "postgresql",
    host: "localhost",
    port: 5433,
    database: "yyc3_matrix",
    username: "admin",
    password: "secret",
    status: "disconnected",
    options: "sslmode=disable",
  },
  {
    id: "db-redis",
    name: "缓存 (Redis)",
    type: "redis",
    host: "localhost",
    port: 6379,
    database: "0",
    username: "",
    password: "",
    status: "disconnected",
  },
];

vi.mock("../stores/dashboard-stores", () => ({
  dbConnectionStore: {
    getAll: vi.fn(() => [...mockConnections]),
    add: vi.fn((item: any) => ({ ...item, id: "db-new-1" })),
    update: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(() => mockConnections),
    exportData: vi.fn(() => JSON.stringify({ data: mockConnections })),
    importData: vi.fn(() => true),
  },
}));

import { DatabaseConnectionPanel } from "../components/DatabaseConnectionPanel";

describe("DatabaseConnectionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the header", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("数据库连接管理")).toBeInTheDocument();
  });

  it("should render connection list", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("主数据库 (PostgreSQL)")).toBeInTheDocument();
    expect(screen.getByText("缓存 (Redis)")).toBeInTheDocument();
  });

  it("should show connection details", () => {
    render(<DatabaseConnectionPanel />);
    // Host and port shown
    expect(screen.getAllByText("localhost").length).toBeGreaterThan(0);
  });

  it("should render 导出/导入/重置 buttons", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("导出")).toBeInTheDocument();
    expect(screen.getByText("导入")).toBeInTheDocument();
    expect(screen.getByText("重置")).toBeInTheDocument();
  });

  it("should render 新建连接 button", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("新建连接")).toBeInTheDocument();
  });

  it("should show add form when 新建连接 is clicked", () => {
    render(<DatabaseConnectionPanel />);
    fireEvent.click(screen.getByText("新建连接"));
    expect(screen.getByText("新建数据库连接")).toBeInTheDocument();
    expect(screen.getByText("创建连接")).toBeInTheDocument();
  });

  it("should render 测试连接 buttons for each connection", () => {
    render(<DatabaseConnectionPanel />);
    const testButtons = screen.getAllByText("测试连接");
    expect(testButtons).toHaveLength(2);
  });

  it("should render 编辑 buttons for each connection", () => {
    render(<DatabaseConnectionPanel />);
    const editButtons = screen.getAllByText("编辑");
    expect(editButtons).toHaveLength(2);
  });

  it("should render 连接池配置 section", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("连接池配置")).toBeInTheDocument();
  });

  it("should render SQL 快速测试 section", () => {
    render(<DatabaseConnectionPanel />);
    expect(screen.getByText("SQL 快速测试")).toBeInTheDocument();
  });

  it("should expand 连接池配置 when clicked", () => {
    render(<DatabaseConnectionPanel />);
    fireEvent.click(screen.getByText("连接池配置"));
    expect(screen.getByText("自动伸缩")).toBeInTheDocument();
    expect(screen.getByText("健康检查")).toBeInTheDocument();
    expect(screen.getByText("最小连接数")).toBeInTheDocument();
    expect(screen.getByText("最大连接数")).toBeInTheDocument();
  });

  it("should expand SQL 快速测试 when clicked", () => {
    render(<DatabaseConnectionPanel />);
    fireEvent.click(screen.getByText("SQL 快速测试"));
    expect(screen.getByText("执行")).toBeInTheDocument();
  });

  it("should show password toggle", () => {
    render(<DatabaseConnectionPanel />);
    // Password should be masked by default
    const masked = screen.getAllByText("••••••");
    expect(masked.length).toBeGreaterThan(0);
  });
});