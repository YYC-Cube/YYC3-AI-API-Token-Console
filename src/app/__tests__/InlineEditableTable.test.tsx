/**
 * InlineEditableTable.test.tsx
 * ==============================
 * InlineEditableTable 组件测试
 *
 * 覆盖范围:
 *  - 纯函数 (formatSQLValue / buildUpdateSQL / buildRollbackSQL / buildDeleteSQL / buildInsertSQL)
 *  - 基础渲染 & 主键标识
 *  - 双击编辑 & 确认/取消
 *  - 主键列保护
 *  - 行选择 & 批量 DELETE
 *  - 批量提交确认弹窗
 *  - 提交执行 & 结果处理
 *  - Undo 回滚 (含 IndexedDB 持久化)
 *  - 撤销未提交变更
 */

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  InlineEditableTable,
  buildDeleteSQL,
  buildInsertSQL,
  buildRollbackSQL,
  buildUpdateSQL,
  formatSQLValue,
} from "../components/InlineEditableTable";

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("../lib/yyc3-storage", () => ({
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
  idbClear: vi.fn().mockResolvedValue(undefined),
}));

// ── 测试数据 ──
const mockColumns = ["id", "name", "tier", "avg_latency_ms"];
const mockRows = [
  { id: "m1", name: "LLaMA-70B", tier: "primary", avg_latency_ms: 45 },
  { id: "m2", name: "Qwen-72B", tier: "secondary", avg_latency_ms: 42 },
  { id: "m3", name: "DeepSeek-V3", tier: "primary", avg_latency_ms: 55 },
];

describe("InlineEditableTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  纯函数单元测试
  // ──────────────────────────────────────

  describe("formatSQLValue", () => {
    it("空字符串返回 NULL", () => expect(formatSQLValue("")).toBe("NULL"));
    it("'NULL' 字符串返回 NULL", () => expect(formatSQLValue("NULL")).toBe("NULL"));
    it("null 返回 NULL", () => expect(formatSQLValue(null)).toBe("NULL"));
    it("undefined 返回 NULL", () => expect(formatSQLValue(undefined)).toBe("NULL"));
    it("数字直接返回", () => {
      expect(formatSQLValue("42")).toBe("42");
      expect(formatSQLValue("3.14")).toBe("3.14");
      expect(formatSQLValue("0")).toBe("0");
    });
    it("布尔值直接返回", () => {
      expect(formatSQLValue("true")).toBe("true");
      expect(formatSQLValue("false")).toBe("false");
    });
    it("字符串加单引号", () => expect(formatSQLValue("hello")).toBe("'hello'"));
    it("含单引号的字符串正确转义", () => expect(formatSQLValue("it's")).toBe("'it''s'"));
    it("含多个单引号的字符串正确转义", () => {
      expect(formatSQLValue("it's a 'test'")).toBe("'it''s a ''test'''");
    });
  });

  describe("buildUpdateSQL", () => {
    it("生成正确的 UPDATE SQL (字符串值)", () => {
      const sql = buildUpdateSQL("core.models", "name", "GPT-4", "id", "m1");
      expect(sql).toContain("UPDATE core.models");
      expect(sql).toContain("SET name = 'GPT-4'");
      expect(sql).toContain("WHERE id = 'm1'");
    });
    it("生成正确的 UPDATE SQL (数字值)", () => {
      const sql = buildUpdateSQL("core.models", "avg_latency_ms", "100", "id", "m1");
      expect(sql).toContain("SET avg_latency_ms = 100");
    });
    it("生成正确的 UPDATE SQL (NULL)", () => {
      const sql = buildUpdateSQL("core.models", "name", "NULL", "id", "m1");
      expect(sql).toContain("SET name = NULL");
    });
  });

  describe("buildRollbackSQL", () => {
    it("生成反向 UPDATE SQL (字符串)", () => {
      const sql = buildRollbackSQL("core.models", "name", "LLaMA-70B", "id", "m1");
      expect(sql).toContain("SET name = 'LLaMA-70B'");
    });
    it("生成反向 UPDATE SQL (null 值)", () => {
      const sql = buildRollbackSQL("core.models", "name", null, "id", "m1");
      expect(sql).toContain("SET name = NULL");
    });
  });

  describe("buildDeleteSQL", () => {
    it("生成正确的 DELETE SQL", () => {
      const sql = buildDeleteSQL("core.models", "id", "m1");
      expect(sql).toContain("DELETE FROM core.models");
      expect(sql).toContain("WHERE id = 'm1'");
    });
    it("主键值正确嵌入", () => {
      const sql = buildDeleteSQL("infra.nodes", "hostname", "GPU-A100-03");
      expect(sql).toContain("WHERE hostname = 'GPU-A100-03'");
    });
  });

  describe("buildInsertSQL", () => {
    it("生成正确的 INSERT SQL", () => {
      const sql = buildInsertSQL("core.models", ["id", "name", "tier"], {
        id: "m1", name: "LLaMA-70B", tier: "primary",
      });
      expect(sql).toContain("INSERT INTO core.models (id, name, tier)");
      expect(sql).toContain("VALUES ('m1', 'LLaMA-70B', 'primary')");
    });
    it("处理数字和 NULL 值", () => {
      const sql = buildInsertSQL("core.models", ["id", "latency", "note"], {
        id: "m2", latency: 42, note: null,
      });
      expect(sql).toContain("42");
      expect(sql).toContain("NULL");
    });
    it("含单引号的值正确转义", () => {
      const sql = buildInsertSQL("t", ["name"], { name: "it's a test" });
      expect(sql).toContain("'it''s a test'");
    });
  });

  // ──────────────────────────────────────
  //  组件渲染测试
  // ──────────────────────────────────────

  describe("基础渲染", () => {
    it("正确渲染表头列名", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" />);
      for (const col of mockColumns) {
        expect(screen.getByText(col)).toBeTruthy();
      }
    });

    it("主键列显示 PK 标记", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} primaryKey="id" />);
      expect(screen.getByText("PK")).toBeTruthy();
    });

    it("渲染数据行", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} primaryKey="id" />);
      expect(screen.getByText("LLaMA-70B")).toBeTruthy();
      expect(screen.getByText("Qwen-72B")).toBeTruthy();
      expect(screen.getByText("DeepSeek-V3")).toBeTruthy();
    });

    it("空行数组不渲染", () => {
      const { container } = render(<InlineEditableTable columns={mockColumns} rows={[]} primaryKey="id" />);
      expect(container.innerHTML).toBe("");
    });

    it("显示编辑提示文字", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} editable={true} primaryKey="id" />);
      expect(screen.getByText(/双击编辑/)).toBeTruthy();
    });

    it("editable=false 时不显示编辑提示", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} editable={false} primaryKey="id" />);
      expect(screen.queryByText(/双击编辑/)).toBeNull();
    });
  });

  describe("主键列保护", () => {
    it("双击主键列不进入编辑模式", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} />);
      fireEvent.doubleClick(screen.getByText("m1"));
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(mockToast.info).toHaveBeenCalledWith("主键列不可编辑");
    });
  });

  describe("双击编辑", () => {
    it("双击非主键列进入编辑模式", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      expect(input).toBeTruthy();
      expect((input as HTMLInputElement).value).toBe("LLaMA-70B");
    });

    it("编辑后按 Enter 确认", () => {
      const onCellChange = vi.fn();
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onCellChange={onCellChange} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "GPT-4o" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onCellChange).toHaveBeenCalledTimes(1);
      const [change, sql] = onCellChange.mock.calls[0];
      expect(change.column).toBe("name");
      expect(change.oldValue).toBe("LLaMA-70B");
      expect(change.newValue).toBe("GPT-4o");
      expect(change.type).toBe("update");
      expect(change.rollbackSQL).toContain("SET name = 'LLaMA-70B'");
      expect(sql).toContain("SET name = 'GPT-4o'");
    });

    it("编辑后按 Escape 取消", () => {
      const onCellChange = vi.fn();
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onCellChange={onCellChange} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "something" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(onCellChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("值未变化时不触发 onCellChange", () => {
      const onCellChange = vi.fn();
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onCellChange={onCellChange} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(onCellChange).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────
  //  批量 DELETE
  // ──────────────────────────────────────

  describe("批量 DELETE", () => {
    it("渲染行选择复选框", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} />);
      // 表头全选 + 3行数据 = 4个复选框按钮
      const checkboxes = screen.getAllByRole("button").filter(
        b => b.querySelector("svg")
      );
      // 至少有全选+数据行的按钮
      expect(checkboxes.length).toBeGreaterThanOrEqual(4);
    });

    it("点击行复选框后显示'删除选中'按钮", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={vi.fn()} />);
      // 找到第一行的选择按钮 (第二个 Square 图标)
      const rowButtons = screen.getAllByRole("button");
      // 第一个是表头全选，之后是每行选择
      const firstRowSelectBtn = rowButtons[1];
      fireEvent.click(firstRowSelectBtn);
      expect(screen.getByText(/删除选中/)).toBeTruthy();
    });

    it("点击'删除选中'将行标记为待删除", () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);

      // 选择第一行
      const rowButtons = screen.getAllByRole("button");
      fireEvent.click(rowButtons[1]);

      // 点击删除
      fireEvent.click(screen.getByText(/删除选中/));

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining("1 行待删除"),
        expect.anything()
      );
      // 应显示待提交徽章含 DELETE
      expect(screen.getByText(/1 项待提交/)).toBeTruthy();
      expect(screen.getByText(/DELETE/)).toBeTruthy();
    });
  });

  // ──────────────────────────────────────
  //  批量提交 & 确认弹窗
  // ──────────────────────────────────────

  describe("批量提交 & 确认弹窗", () => {
    it("显示待提交计数徽章", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={vi.fn()} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "GPT-4" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("1 项待提交")).toBeTruthy();
    });

    it("点击'提交变更'打开确认弹窗", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={vi.fn()} />);
      // m3 DeepSeek-V3 的 tier 唯一，避免 getByText 多匹配
      fireEvent.doubleClick(screen.getByText("DeepSeek-V3"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "tertiary" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      expect(screen.getByText(/确认提交.*1.*项数据变更/)).toBeTruthy();
    });

    it("确认提交后执行 SQL 并清空待提交", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true, affectedRows: 1 });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      fireEvent.doubleClick(screen.getByText("DeepSeek-V3"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "tertiary" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => {
        expect(onExecuteSQL).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(screen.queryByText(/项待提交/)).toBeNull();
      });
    });

    it("DELETE 确认弹窗显示 DEL 标记", () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      // 选择行并标记删除
      const rowButtons = screen.getAllByRole("button");
      fireEvent.click(rowButtons[1]);
      fireEvent.click(screen.getByText(/删除选中/));
      // 打开确认弹窗
      fireEvent.click(screen.getByText("提交变更"));
      expect(screen.getByText("DEL")).toBeTruthy();
      expect(screen.getByText(/整行删除/)).toBeTruthy();
    });
  });

  describe("撤销未提交变更", () => {
    it("点击'撤销'清空所有待提交变更", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={vi.fn()} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("1 项待提交")).toBeTruthy();
      fireEvent.click(screen.getByText("撤销"));
      expect(screen.queryByText(/项待提交/)).toBeNull();
      expect(mockToast.info).toHaveBeenCalledWith("已撤销所有未提交变更");
    });
  });

  // ──────────────────────────────────────
  //  Undo 回滚
  // ──────────────────────────────────────

  describe("Undo 回滚", () => {
    it("提交成功后显示 Undo 按钮", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => {
        expect(screen.getByText(/Undo \(1\)/)).toBeTruthy();
      });
    });

    it("点击 Undo 展开历史面板并执行整批回滚", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Rolled" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => expect(screen.getByText(/Undo/)).toBeTruthy());
      fireEvent.click(screen.getByText(/Undo/));
      await waitFor(() => expect(screen.getByText("全部回滚")).toBeTruthy());
      fireEvent.click(screen.getByText("全部回滚"));
      await waitFor(() => {
        expect(onExecuteSQL).toHaveBeenCalledTimes(2);
        const rollbackCall = onExecuteSQL.mock.calls[1][0];
        expect(rollbackCall).toContain("SET name = 'LLaMA-70B'");
      });
    });

    it("行级 Undo: 展开后显示逐项撤销按钮", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      // 做两项修改：m1 名称 + m2 名称（名称均唯一，避免 tier 列值重复导致多匹配）
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      let input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "AAA" } });
      fireEvent.keyDown(input, { key: "Enter" });

      fireEvent.doubleClick(screen.getByText("Qwen-72B"));
      input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "secondary" } });
      fireEvent.keyDown(input, { key: "Enter" });

      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => expect(screen.getByText(/Undo/)).toBeTruthy());
      fireEvent.click(screen.getByText(/Undo/));

      // 应显示两个"撤销"按钮 (每项变更一个)
      await waitFor(() => {
        const undoButtons = screen.getAllByText("撤销");
        expect(undoButtons.length).toBe(2);
      });
    });

    it("行级 Undo: 单项回滚后该项显示'已撤销'", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      // 两项修改：单项回滚后 commit 仍部分未回滚，历史面板保持打开以展示'已撤销'
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      let input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "AAA" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.doubleClick(screen.getByText("Qwen-72B"));
      input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "BBB" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => expect(screen.getByText(/Undo/)).toBeTruthy());
      fireEvent.click(screen.getByText(/Undo/));
      await waitFor(() => expect(screen.getAllByText("撤销").length).toBe(2));
      fireEvent.click(screen.getAllByText("撤销")[0]);
      await waitFor(() => {
        expect(screen.getByText("已撤销")).toBeTruthy();
      });
    });

    it("行级 Undo: 所有单项回滚后整批标记 rolledBack", async () => {
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "AllSingle" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => expect(screen.getByText(/Undo/)).toBeTruthy());
      fireEvent.click(screen.getByText(/Undo/));
      await waitFor(() => expect(screen.getByText("撤销")).toBeTruthy());
      fireEvent.click(screen.getByText("撤销"));
      // 唯一的变更被回滚后, Undo 按钮应消失 (rolledBack=true)
      await waitFor(() => {
        expect(screen.queryByText(/Undo \(\d+\)/)).toBeNull();
      });
    });

    it("IndexedDB 持久化: 提交时调用 idbPut", async () => {
      const { idbPut } = await import("../lib/yyc3-storage") as unknown as { idbPut: Mock };
      const onExecuteSQL = vi.fn().mockResolvedValue({ ok: true });
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} onExecuteSQL={onExecuteSQL} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Persisted" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByText("提交变更"));
      fireEvent.click(screen.getByText("确认提交"));
      await waitFor(() => {
        expect(idbPut).toHaveBeenCalledWith("committedChanges", expect.objectContaining({
          tableName: "core.models",
          rolledBack: false,
        }));
      });
    });
  });

  describe("已修改标记", () => {
    it("修改的单元格显示 * 标记", () => {
      render(<InlineEditableTable columns={mockColumns} rows={mockRows} tableName="core.models" primaryKey="id" editable={true} />);
      fireEvent.doubleClick(screen.getByText("LLaMA-70B"));
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Modified" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByTitle("已修改")).toBeTruthy();
    });
  });
});
