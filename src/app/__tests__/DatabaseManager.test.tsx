/**
 * DatabaseManager.test.tsx
 * ========================
 * 本地数据库管理器页面组件测试 (路由: /database)
 *
 * 覆盖范围:
 * - 头部/统计栏/空连接状态 + 自动检测触发
 * - 连接卡片: 状态徽章 / 测试 / 连接 / 断开 / 删除
 * - 新建连接表单: 空名校验 / 提交载荷 / 类型→端口联动 / 密码可见性切换
 * - 表浏览: 未连接提示 / 表列表 / 展开列定义 / 内联编辑 (onCellChange→setSqlInput) / 查询跳转
 * - 查询控制台: SQLEditor 回显 / 执行按钮门控 / 模板面板过滤与执行
 * - 查询结果: 行数/耗时/复制 JSON / error 与空行分支
 * - 查询历史: 空态 / 重新执行回跳 / 清除历史
 * - 备份恢复: 空态 / 创建 / 恢复 / 删除
 *
 * Mock 契约 (零外部依赖):
 * - useLocalDatabase 整体 mock (IndexedDB/后端 API 全隔离)
 * - SQLEditor (CodeMirror) mock 为受控 textarea
 * - InlineEditableTable / GlassCard 保持真实实现
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DatabaseManager } from "../components/DatabaseManager";

// ============================================================
// Mock: useLocalDatabase
// ============================================================

const mockDb = vi.hoisted(() => ({
  // 连接管理
  connections: [] as unknown[],
  activeConnection: null as unknown,
  activeConnectionId: null as string | null,
  setActiveConnectionId: vi.fn(),
  addConnection: vi.fn(),
  removeConnection: vi.fn(),
  updateConnection: vi.fn(),
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
  testConnection: vi.fn(),
  testing: "",
  detectDatabases: vi.fn(),
  detecting: false,
  // 表浏览
  tables: [] as unknown[],
  selectedTable: null as unknown,
  setSelectedTable: vi.fn(),
  tableData: [] as unknown[],
  tableDataLoading: false,
  loadTableData: vi.fn(),
  // 查询控制台
  sqlInput: "",
  setSqlInput: vi.fn(),
  queryResults: [] as unknown[],
  queryHistory: [] as unknown[],
  executeQuery: vi.fn(),
  executeTemplate: vi.fn(),
  replayQuery: vi.fn(),
  clearQueryHistory: vi.fn(),
  querying: false,
  // 备份恢复
  backups: [] as unknown[],
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  deleteBackup: vi.fn(),
  // 统计 & 工具
  stats: {
    totalConnections: 0,
    connectedCount: 0,
    totalTables: 0,
    totalBackups: 0,
    queryCount: 0,
    totalTableRows: 0,
    totalTableSize: 0,
  },
  sqlTemplates: [] as unknown[],
  DEFAULT_PORTS: {},
}));

vi.mock("../hooks/useLocalDatabase", () => ({
  useLocalDatabase: () => mockDb,
}));

// Mock: SQLEditor (CodeMirror 全隔离, 受控 textarea 等价物)
vi.mock("../components/CodeEditor", () => ({
  SQLEditor: (props: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    readOnly?: boolean;
  }) => (
    <textarea
      data-testid="sql-editor"
      value={props.value}
      placeholder={props.placeholder}
      readOnly={props.readOnly}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

// ============================================================
// Fixtures
// ============================================================

const connectedConn = {
  id: "conn-1",
  name: "本地 PG",
  type: "postgresql",
  host: "127.0.0.1",
  port: 5432,
  database: "yyc3_matrix",
  username: "postgres",
  status: "connected",
  lastConnected: 1735689600000,
};

const idleConn = { ...connectedConn, id: "conn-2", name: "备用库", status: "idle" };

const fixtureTable = {
  name: "core.models",
  schema: "core",
  rowCount: 5,
  sizeBytes: 32768,
  columns: [
    { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
    { name: "name", dataType: "varchar(128)", nullable: false, isPrimaryKey: false, defaultValue: null },
  ],
};

const fixtureQueryResult = {
  id: "qr-1",
  sql: "SELECT * FROM core.models LIMIT 1;",
  columns: ["id", "name"],
  rows: [{ id: "r1", name: "m1" }],
  rowCount: 1,
  executionTimeMs: 2.34,
  executedAt: 1735689600000,
  error: "",
};

const fixtureBackup = {
  id: "bk-1",
  fileName: "yyc3_matrix_dump.sql",
  connectionName: "本地 PG",
  sizeBytes: 2048,
  createdAt: 1735689600000,
  status: "completed",
};

/** 每用例重建 mockDb 状态 (测试数据自包含) */
function resetDb(overrides: Partial<typeof mockDb> = {}): void {
  Object.assign(mockDb, {
    connections: [],
    activeConnection: null,
    activeConnectionId: null,
    testing: "",
    detecting: false,
    tables: [],
    selectedTable: null,
    tableData: [],
    tableDataLoading: false,
    sqlInput: "",
    queryResults: [],
    queryHistory: [],
    querying: false,
    backups: [],
    stats: {
      totalConnections: 0,
      connectedCount: 0,
      totalTables: 0,
      totalBackups: 0,
      queryCount: 0,
      totalTableRows: 0,
      totalTableSize: 0,
    },
    sqlTemplates: [
      { id: "t3", label: "模型列表", sql: "SELECT * FROM core.models;", dbType: "all", category: "业务" },
      { id: "t1", label: "查看所有表", sql: "SELECT ...", dbType: "postgresql", category: "系统" },
    ],
  });
  Object.assign(mockDb, overrides);
}

function renderPage() {
  return render(<DatabaseManager />);
}

describe("DatabaseManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
  });

  // ────────────────── 头部 / 统计 / 空态 ──────────────────

  it("应渲染头部与统计栏", () => {
    renderPage();
    expect(screen.getByText("本地数据库管理")).toBeInTheDocument();
    expect(screen.getByText("连接数")).toBeInTheDocument();
    expect(screen.getByText("自动检测")).toBeInTheDocument();
    expect(screen.getByText("0 个连接")).toBeInTheDocument();
  });

  it("点击自动检测应调用 detectDatabases", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /自动检测/ }));
    expect(mockDb.detectDatabases).toHaveBeenCalledTimes(1);
  });

  it("无连接时应显示空状态引导", () => {
    renderPage();
    expect(screen.getByText("暂无数据库连接")).toBeInTheDocument();
  });

  // ────────────────── 连接管理 ──────────────────

  it("连接卡片应渲染状态徽章与操作按钮", () => {
    resetDb({
      connections: [connectedConn],
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      stats: { ...mockDb.stats, totalConnections: 1, connectedCount: 1 },
    });
    renderPage();
    const card = screen.getByText("本地 PG").closest("div.p-4") as HTMLElement;
    expect(screen.getByText("本地 PG")).toBeInTheDocument();
    expect(within(card).getByText("已连接")).toBeInTheDocument();
    expect(screen.getByText(/已连接: 本地 PG/)).toBeInTheDocument();
    expect(screen.getByText(/127\.0\.0\.1:5432/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "断开" })).toBeInTheDocument();
  });

  it("测试 / 断开 / 删除 应携带连接 id 调用对应方法", () => {
    resetDb({
      connections: [connectedConn],
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
    });
    renderPage();
    const card = screen.getByText("本地 PG").closest("div.p-4") as HTMLElement;

    fireEvent.click(within(card).getByRole("button", { name: "测试" }));
    expect(mockDb.testConnection).toHaveBeenCalledWith("conn-1");

    fireEvent.click(within(card).getByRole("button", { name: "断开" }));
    expect(mockDb.disconnectDB).toHaveBeenCalledWith("conn-1");

    const buttons = within(card).getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]); // 末位 icon 按钮 = 删除
    expect(mockDb.removeConnection).toHaveBeenCalledWith("conn-1");
  });

  it("未连接卡片应显示连接按钮并可触发连接", () => {
    resetDb({ connections: [idleConn] });
    renderPage();
    expect(screen.getByText("未连接")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "连接" }));
    expect(mockDb.connectDB).toHaveBeenCalledWith("conn-2");
  });

  it("新建连接: 空名不应提交, 有效载荷应提交并关闭表单", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新建连接/ }));
    expect(screen.getByText("新建数据库连接")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "添加连接" }));
    expect(mockDb.addConnection).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("YYC³ PostgreSQL"), {
      target: { value: "测试连接" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加连接" }));
    expect(mockDb.addConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "测试连接",
        type: "postgresql",
        host: "127.0.0.1",
        port: 5432,
        database: "yyc3_matrix",
      })
    );
    expect(screen.queryByText("新建数据库连接")).not.toBeInTheDocument();
  });

  it("数据库类型切换应联动默认端口 (mysql→3306)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新建连接/ }));

    const select = document.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "mysql" } });

    fireEvent.change(screen.getByPlaceholderText("YYC³ PostgreSQL"), {
      target: { value: "MySQL 库" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加连接" }));
    expect(mockDb.addConnection).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mysql", port: 3306 })
    );
  });

  it("密码可见性切换应在 password/text 之间翻转", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新建连接/ }));

    const formCard = screen.getByText("新建数据库连接").closest("div.p-4") as HTMLElement;
    const inputs = formCard.querySelectorAll("input");
    const passwordInput = inputs[inputs.length - 1] as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    // 密码行的眼睛按钮 = 密码 input 的下一个兄弟
    fireEvent.click(passwordInput.nextElementSibling as HTMLElement);
    expect(passwordInput.type).toBe("text");
  });

  // ────────────────── 表浏览 ──────────────────

  it("未连接时表浏览应提示先连接", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /表浏览/ }));
    expect(screen.getByText("请先连接数据库")).toBeInTheDocument();
  });

  it("表列表应渲染并支持展开列定义与数据预览", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      tables: [fixtureTable],
      tableData: [{ id: "r1", name: "m1" }],
      stats: { ...mockDb.stats, totalTables: 1, totalTableRows: 5, totalTableSize: 32768 },
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /表浏览/ }));

    expect(screen.getByText("core.models")).toBeInTheDocument();
    expect(screen.getByText("5 行 · 2 列 · 32.0 KB")).toBeInTheDocument();

    fireEvent.click(screen.getByText("core.models"));
    expect(mockDb.setSelectedTable).toHaveBeenCalledWith(fixtureTable);
    expect(mockDb.loadTableData).toHaveBeenCalledWith("core.models");
    expect(screen.getByText("列定义")).toBeInTheDocument();
    expect(screen.getByText("gen_random_uuid()")).toBeInTheDocument();
    expect(screen.getByText("数据预览 (前 20 行)")).toBeInTheDocument();
    expect(screen.getByText("m1")).toBeInTheDocument();
  });

  it("内联编辑提交应生成 UPDATE SQL 并回填查询台", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      tables: [fixtureTable],
      tableData: [{ id: "r1", name: "m1" }],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /表浏览/ }));
    fireEvent.click(screen.getByText("core.models"));

    fireEvent.doubleClick(screen.getByText("m1"));
    const editor = screen.getByRole("textbox");
    fireEvent.change(editor, { target: { value: "m2" } });
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(mockDb.setSqlInput).toHaveBeenCalledWith(
      expect.stringContaining("SET name = 'm2'")
    );
  });

  it("行内查询按钮应回填 SQL 并切换到查询控制台", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      tables: [fixtureTable],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /表浏览/ }));
    fireEvent.click(screen.getByText("core.models"));

    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    expect(mockDb.setSqlInput).toHaveBeenCalledWith("SELECT * FROM core.models LIMIT 20;");
    expect(screen.getByTestId("sql-editor")).toBeInTheDocument();
  });

  // ────────────────── 查询控制台 ──────────────────

  it("查询台应回显 sqlInput 且未连接时执行按钮禁用", () => {
    resetDb({ sqlInput: "SELECT 1;" });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询控制台/ }));

    expect(screen.getByText(/SQL 查询 · 未连接/)).toBeInTheDocument();
    const execBtn = screen.getByRole("button", { name: /执行 \(⌘\+Enter\)/ });
    expect(execBtn).toBeDisabled();
  });

  it("已连接时执行按钮可触发 executeQuery", () => {
    resetDb({
      sqlInput: "SELECT 1;",
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询控制台/ }));

    const editor = screen.getByTestId("sql-editor") as HTMLTextAreaElement;
    expect(editor.value).toBe("SELECT 1;");

    fireEvent.click(screen.getByRole("button", { name: /执行 \(⌘\+Enter\)/ }));
    expect(mockDb.executeQuery).toHaveBeenCalledTimes(1);
  });

  it("模板面板: 分类过滤应生效且点击模板应执行并收起", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询控制台/ }));
    fireEvent.click(screen.getByRole("button", { name: "模板" }));

    expect(screen.getByText("模型列表")).toBeInTheDocument();
    expect(screen.getByText("查看所有表")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "业务" }));
    expect(screen.queryByText("查看所有表")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /模型列表/ }));
    expect(mockDb.executeTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t3", label: "模型列表" })
    );
    expect(screen.queryByText("模型列表")).not.toBeInTheDocument(); // 面板收起
  });

  it("查询结果应渲染数据表且复制按钮写入剪贴板", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      queryResults: [fixtureQueryResult],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询控制台/ }));

    expect(screen.getByText(/1 行 · 2\.3ms/)).toBeInTheDocument();
    expect(screen.getByText("SELECT * FROM core.models LIMIT 1;")).toBeInTheDocument();
    expect(screen.getByText("m1")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("复制 JSON"));
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify([{ id: "r1", name: "m1" }], null, 2)
    );
  });

  it("错误结果应展示错误文案, 空行结果应展示无结果", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      queryResults: [
        { ...fixtureQueryResult, id: "qr-err", error: "relation not found" },
        { ...fixtureQueryResult, id: "qr-empty", rows: [] },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询控制台/ }));

    expect(screen.getByText("relation not found")).toBeInTheDocument();
    expect(screen.getByText("无结果")).toBeInTheDocument();
  });

  // ────────────────── 查询历史 ──────────────────

  it("查询历史空态应提示自动记录", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询历史/ }));
    expect(screen.getByText("执行查询后自动记录")).toBeInTheDocument();
  });

  it("历史记录应支持重新执行回跳查询台与清除历史", () => {
    resetDb({
      queryHistory: [fixtureQueryResult],
      stats: { ...mockDb.stats, queryCount: 1 },
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /查询历史/ }));

    expect(screen.getByText("1 条查询记录 (IndexedDB 持久化)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新执行" }));
    expect(mockDb.replayQuery).toHaveBeenCalledWith(fixtureQueryResult);
    expect(screen.getByTestId("sql-editor")).toBeInTheDocument(); // 已切回查询台

    fireEvent.click(screen.getByRole("button", { name: /查询历史/ }));
    fireEvent.click(screen.getByRole("button", { name: "清除历史" }));
    expect(mockDb.clearQueryHistory).toHaveBeenCalledTimes(1);
  });

  // ────────────────── 备份恢复 ──────────────────

  it("备份空态应提示且未连接时不显示创建按钮", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /备份恢复/ }));
    expect(screen.getByText(/暂无备份 · 连接数据库后可创建备份/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /创建备份/ })).not.toBeInTheDocument();
  });

  it("备份卡片应支持创建 / 恢复 / 删除", () => {
    resetDb({
      activeConnection: connectedConn,
      activeConnectionId: "conn-1",
      connections: [connectedConn],
      backups: [fixtureBackup],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /备份恢复/ }));

    fireEvent.click(screen.getByRole("button", { name: /创建备份/ }));
    expect(mockDb.createBackup).toHaveBeenCalledWith("conn-1");

    expect(screen.getByText("yyc3_matrix_dump.sql")).toBeInTheDocument();
    expect(screen.getByText("完成")).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "恢复" }));
    expect(mockDb.restoreBackup).toHaveBeenCalledWith("bk-1");

    const card = screen.getByText("yyc3_matrix_dump.sql").closest("div.p-4") as HTMLElement;
    const buttons = within(card).getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]); // 末位 icon 按钮 = 删除备份
    expect(mockDb.deleteBackup).toHaveBeenCalledWith("bk-1");
  });
});
