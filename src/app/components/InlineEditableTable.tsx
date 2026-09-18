/**
 * InlineEditableTable.tsx
 * ========================
 * 可内联编辑的数据表格组件
 *
 * 功能:
 *  - 双击单元格进入编辑模式, Enter/Tab 确认, Esc 取消
 *  - 自动生成 UPDATE SQL + 反向 Rollback SQL
 *  - 批量 DELETE: 勾选行 → 生成 DELETE SQL + INSERT rollback
 *  - 批量提交前确认弹窗 (防止误操作)
 *  - 已提交变更的 Undo 回滚支持 (IndexedDB 持久化, 跨刷新)
 *  - 主键列保护 (不可编辑)
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Check, X, Edit3, Send, RotateCcw, AlertTriangle,
  Undo2, ChevronDown, ChevronUp, Trash2, CheckSquare, Square,
} from "lucide-react";
import { toast } from "sonner";
import { idbGetAll, idbPut, idbDelete as idbDeleteRecord, idbClear as idbClearStore } from "../lib/yyc3-storage";
import type { ChangeType, EditableCellChange, CommittedChange } from "../types";

// RF-011: Re-export 已移除

// ── 样式常量 ──
const textDim = "rgba(0,212,255,0.4)";
const f = { xs: "0.65rem", sm: "0.72rem" };

interface InlineEditableTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  tableName?: string;
  /** 主键列名 */
  primaryKey?: string;
  /** 是否启用编辑 */
  editable?: boolean;
  /** 编辑确认回调 */
  onCellChange?: (change: EditableCellChange, generatedSQL: string) => void;
  /** 直接执行 SQL 回调 */
  onExecuteSQL?: (sql: string) => Promise<{ ok: boolean; error?: string; affectedRows?: number }>;
  /** 最大高度 */
  maxHeight?: string;
}

interface EditingCell {
  rowIndex: number;
  column: string;
  value: string;
}

// ============================================================
//  纯函数工具 (可导出测试)
// ============================================================

/** 格式化 SQL 值字面量 */
export function formatSQLValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str === "" || str === "NULL") return "NULL";
  const isNumeric = !isNaN(Number(str)) && str.trim() !== "";
  const isBool = str === "true" || str === "false";
  if (isNumeric || isBool) return str;
  const escaped = str.includes("'") ? str.replace(/'/g, "''") : str;
  return `'${escaped}'`;
}

/** 生成 UPDATE SQL */
export function buildUpdateSQL(
  tableName: string, column: string, newValue: string,
  primaryKey: string, pkValue: unknown
): string {
  return `UPDATE ${tableName}\nSET ${column} = ${formatSQLValue(newValue)}\nWHERE ${primaryKey} = '${pkValue}';`;
}

/** 生成 Rollback SQL (反向 UPDATE) */
export function buildRollbackSQL(
  tableName: string, column: string, oldValue: unknown,
  primaryKey: string, pkValue: unknown
): string {
  return `UPDATE ${tableName}\nSET ${column} = ${formatSQLValue(oldValue)}\nWHERE ${primaryKey} = '${pkValue}';`;
}

/** 生成 DELETE SQL */
export function buildDeleteSQL(
  tableName: string, primaryKey: string, pkValue: unknown
): string {
  return `DELETE FROM ${tableName}\nWHERE ${primaryKey} = '${pkValue}';`;
}

/** 生成 INSERT SQL (用于 DELETE 回滚) */
export function buildInsertSQL(
  tableName: string, columns: string[], row: Record<string, unknown>
): string {
  const cols = columns.join(", ");
  const vals = columns.map(c => formatSQLValue(row[c])).join(", ");
  return `INSERT INTO ${tableName} (${cols})\nVALUES (${vals});`;
}

// ============================================================
//  组件
// ============================================================

export function InlineEditableTable({
  columns,
  rows,
  tableName = "",
  primaryKey = "id",
  editable = true,
  onCellChange,
  onExecuteSQL,
  maxHeight = "300px",
}: InlineEditableTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<EditableCellChange[]>([]);
  const [committedHistory, setCommittedHistory] = useState<CommittedChange[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [executing, setExecuting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── IndexedDB 持久化: 加载 Undo 历史 ──
  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    idbGetAll<CommittedChange>("committedChanges").then((saved) => {
      if (saved.length > 0) {
        // 按提交时间降序, 仅保留同表名的记录
        const filtered = saved
          .filter(c => !tableName || c.tableName === tableName)
          .sort((a, b) => b.committedAt - a.committedAt)
          .slice(0, 20);
        setCommittedHistory(filtered);
      }
    });
  }, [historyLoaded, tableName]);

  // ── 持久化 Undo 历史到 IndexedDB ──
  const persistCommit = useCallback(async (commit: CommittedChange) => {
    await idbPut("committedChanges", commit);
  }, []);

  const persistCommitUpdate = useCallback(async (commit: CommittedChange) => {
    await idbPut("committedChanges", commit);
  }, []);

  // 自动聚焦编辑输入框
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // ── 行选择 ──
  const toggleRowSelection = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  }, [selectedRows, rows]);

  // ── 编辑操作 ──
  const startEditing = useCallback((rowIndex: number, column: string, value: unknown) => {
    if (!editable) return;
    if (column === primaryKey) {
      toast.info("主键列不可编辑");
      return;
    }
    setEditingCell({
      rowIndex,
      column,
      value: value === null || value === undefined ? "" : String(value),
    });
  }, [editable, primaryKey]);

  const confirmEdit = useCallback(() => {
    if (!editingCell) return;

    const row = rows[editingCell.rowIndex];
    const oldValue = row[editingCell.column];
    const newValue = editingCell.value;

    if (String(oldValue ?? "") === newValue) {
      setEditingCell(null);
      return;
    }

    const pkValue = row[primaryKey];
    const sql = buildUpdateSQL(tableName, editingCell.column, newValue, primaryKey, pkValue);
    const rollbackSQL = buildRollbackSQL(tableName, editingCell.column, oldValue, primaryKey, pkValue);

    const change: EditableCellChange = {
      rowIndex: editingCell.rowIndex,
      column: editingCell.column,
      oldValue,
      newValue,
      type: "update",
      sql,
      rollbackSQL,
    };

    setPendingChanges(prev => [...prev, change]);

    if (onCellChange) {
      onCellChange(change, sql);
    }

    toast.success("单元格已修改", {
      description: `${editingCell.column}: ${String(oldValue)} → ${newValue}`,
    });

    setEditingCell(null);
  }, [editingCell, rows, primaryKey, tableName, onCellChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }, [confirmEdit, cancelEdit]);

  // ── 批量 DELETE ──
  const markSelectedForDelete = useCallback(() => {
    if (selectedRows.size === 0) return;

    const deleteChanges: EditableCellChange[] = [];

    for (const ri of selectedRows) {
      const row = rows[ri];
      if (!row) continue;
      const pkValue = row[primaryKey];
      const sql = buildDeleteSQL(tableName, primaryKey, pkValue);
      const rollbackSQL = buildInsertSQL(tableName, columns, row);

      deleteChanges.push({
        rowIndex: ri,
        column: "*",
        oldValue: row,
        newValue: "DELETE",
        type: "delete",
        sql,
        rollbackSQL,
      });
    }

    setPendingChanges(prev => [...prev, ...deleteChanges]);
    setSelectedRows(new Set());

    toast.success(`已标记 ${deleteChanges.length} 行待删除`, {
      description: "点击\"提交变更\"执行 DELETE",
    });
  }, [selectedRows, rows, primaryKey, tableName, columns]);

  // ── 提交 ──
  const requestCommit = useCallback(() => {
    if (pendingChanges.length === 0) return;
    setShowConfirmDialog(true);
  }, [pendingChanges]);

  const commitAllChanges = useCallback(async () => {
    if (pendingChanges.length === 0 || !onExecuteSQL) return;

    setShowConfirmDialog(false);
    setExecuting(true);
    let successCount = 0;
    let failCount = 0;
    const successfulChanges: EditableCellChange[] = [];

    for (const change of pendingChanges) {
      if (!change.sql) continue;
      try {
        const result = await onExecuteSQL(change.sql);
        if (result.ok) {
          successCount++;
          successfulChanges.push(change);
        } else {
          failCount++;
          toast.error(`执行失败: ${change.type === "delete" ? "DELETE" : change.column}`, {
            description: result.error || "未知错误",
          });
        }
      } catch {
        failCount++;
      }
    }

    setExecuting(false);

    if (successfulChanges.length > 0) {
      const committed: CommittedChange = {
        id: `commit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tableName,
        changes: successfulChanges,
        committedAt: Date.now(),
        rolledBack: false,
      };
      setCommittedHistory(prev => [committed, ...prev].slice(0, 20));
      persistCommit(committed);

      const deleteCount = successfulChanges.filter(c => c.type === "delete").length;
      const updateCount = successfulChanges.filter(c => c.type === "update").length;
      const desc: string[] = [];
      if (updateCount > 0) desc.push(`${updateCount} 项 UPDATE`);
      if (deleteCount > 0) desc.push(`${deleteCount} 项 DELETE`);

      toast.success(`已提交 ${successCount} 项变更`, {
        description: (failCount > 0 ? `${failCount} 项失败 · ` : "") + desc.join(", ") + " · 可 Undo 回滚",
      });
    }

    if (failCount === 0) {
      setPendingChanges([]);
    } else {
      setPendingChanges(prev =>
        prev.filter(c => !successfulChanges.includes(c))
      );
    }
  }, [pendingChanges, onExecuteSQL, tableName, persistCommit]);

  const discardAllChanges = useCallback(() => {
    setPendingChanges([]);
    setSelectedRows(new Set());
    setShowConfirmDialog(false);
    toast.info("已撤销所有未提交变更");
  }, []);

  // ── Undo 回滚 ──
  /** Undo: 回滚已提交的变更 (整批) */
  const undoCommit = useCallback(async (commitId: string) => {
    if (!onExecuteSQL) return;

    const commit = committedHistory.find(c => c.id === commitId);
    if (!commit || commit.rolledBack) return;

    setExecuting(true);
    let successCount = 0;
    let failCount = 0;

    // 跳过已单独回滚的索引
    const alreadyRolledBack = new Set(commit.rolledBackIndices ?? []);

    for (let i = commit.changes.length - 1; i >= 0; i--) {
      if (alreadyRolledBack.has(i)) continue;
      const change = commit.changes[i];
      if (!change.rollbackSQL) continue;
      try {
        const result = await onExecuteSQL(change.rollbackSQL);
        if (result.ok) {
          successCount++;
        } else {
          failCount++;
          toast.error(`回滚失败: ${change.type === "delete" ? "INSERT" : change.column}`, {
            description: result.error || "未知错误",
          });
        }
      } catch {
        failCount++;
      }
    }

    setExecuting(false);

    if (failCount === 0) {
      const updated = { ...commit, rolledBack: true };
      setCommittedHistory(prev =>
        prev.map(c => c.id === commitId ? updated : c)
      );
      persistCommitUpdate(updated);
      toast.success(`已回滚 ${successCount} 项变更`);
    } else {
      toast.error(`回滚部分失败: ${successCount} 成功, ${failCount} 失败`);
    }
  }, [committedHistory, onExecuteSQL, persistCommitUpdate]);

  /** Undo: 行级回滚 (单项变更) */
  const undoSingleChange = useCallback(async (commitId: string, changeIndex: number) => {
    if (!onExecuteSQL) return;

    const commit = committedHistory.find(c => c.id === commitId);
    if (!commit || commit.rolledBack) return;

    const alreadyRolledBack = new Set(commit.rolledBackIndices ?? []);
    if (alreadyRolledBack.has(changeIndex)) {
      toast.info("该变更已回滚");
      return;
    }

    const change = commit.changes[changeIndex];
    if (!change?.rollbackSQL) return;

    setExecuting(true);

    try {
      const result = await onExecuteSQL(change.rollbackSQL);
      if (result.ok) {
        const newRolledBackIndices = [...(commit.rolledBackIndices ?? []), changeIndex];
        const allRolledBack = newRolledBackIndices.length === commit.changes.length;
        const updated: CommittedChange = {
          ...commit,
          rolledBackIndices: newRolledBackIndices,
          rolledBack: allRolledBack,
        };
        setCommittedHistory(prev =>
          prev.map(c => c.id === commitId ? updated : c)
        );
        persistCommitUpdate(updated);

        const label = change.type === "delete"
          ? `INSERT ${(change.oldValue as Record<string, unknown>)?.[primaryKey] ?? "?"}`
          : `${change.column}: ${change.newValue} → ${String(change.oldValue ?? "NULL")}`;
        toast.success(`已回滚: ${label}`);
      } else {
        toast.error(`回滚失败`, { description: result.error || "未知错误" });
      }
    } catch {
      toast.error("回滚执行异常");
    }

    setExecuting(false);
  }, [committedHistory, onExecuteSQL, persistCommitUpdate, primaryKey]);

  /** 清除所有 Undo 历史 */
  const clearUndoHistory = useCallback(async () => {
    setCommittedHistory([]);
    await idbClearStore("committedChanges");
    toast.info("Undo 历史已清除");
  }, []);

  if (rows.length === 0 && pendingChanges.length === 0) return null;

  const undoableCommits = committedHistory.filter(c => !c.rolledBack);
  const pendingDeletes = pendingChanges.filter(c => c.type === "delete");
  const pendingUpdates = pendingChanges.filter(c => c.type === "update");
  const markedForDelete = new Set(pendingDeletes.map(c => c.rowIndex));

  return (
    <div>
      {/* ═══ 编辑模式提示 + 操作栏 ═══ */}
      {editable && (
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Edit3 className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
          <span style={{ fontSize: f.xs, color: textDim }}>
            双击编辑 · 勾选行可批量删除
          </span>

          {/* 选中行操作 */}
          {selectedRows.size > 0 && (
            <button
              onClick={markSelectedForDelete}
              className="px-2 py-0.5 rounded-lg bg-[rgba(255,60,60,0.08)] border border-[rgba(255,60,60,0.2)] text-[#ff6464] flex items-center gap-1 hover:bg-[rgba(255,60,60,0.15)] transition-all"
              style={{ fontSize: f.xs }}
            >
              <Trash2 className="w-2.5 h-2.5" />
              删除选中 ({selectedRows.size})
            </button>
          )}

          {/* 待提交徽章 */}
          {pendingChanges.length > 0 && (
            <>
              <span className="px-1.5 py-0.5 rounded-full bg-[rgba(255,170,0,0.1)] text-[#ffaa00]" style={{ fontSize: f.xs }}>
                {pendingChanges.length} 项待提交
                {pendingDeletes.length > 0 && (
                  <span className="ml-1 text-[#ff6464]">({pendingDeletes.length} DELETE)</span>
                )}
              </span>
              {onExecuteSQL && (
                <button
                  onClick={requestCommit}
                  disabled={executing}
                  className="px-2 py-0.5 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] flex items-center gap-1 hover:bg-[rgba(0,255,136,0.18)] transition-all disabled:opacity-50"
                  style={{ fontSize: f.xs }}
                  title="执行所有待提交的 SQL"
                >
                  <Send className="w-2.5 h-2.5" />
                  {executing ? "提交中..." : "提交变更"}
                </button>
              )}
              <button
                onClick={discardAllChanges}
                className="px-2 py-0.5 rounded-lg bg-[rgba(255,60,60,0.06)] border border-[rgba(255,60,60,0.15)] text-[rgba(255,100,100,0.6)] flex items-center gap-1 hover:bg-[rgba(255,60,60,0.12)] transition-all"
                style={{ fontSize: f.xs }}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                撤销
              </button>
            </>
          )}

          {/* Undo 入口 */}
          {undoableCommits.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-2 py-0.5 rounded-lg bg-[rgba(123,140,255,0.08)] border border-[rgba(123,140,255,0.15)] text-[#7b8cff] flex items-center gap-1 hover:bg-[rgba(123,140,255,0.15)] transition-all"
              style={{ fontSize: f.xs }}
            >
              <Undo2 className="w-2.5 h-2.5" />
              Undo ({undoableCommits.length})
              {showHistory ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>
      )}

      {/* ═══ Undo 历史面板 ═══ */}
      {showHistory && undoableCommits.length > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-[rgba(0,20,40,0.5)] border border-[rgba(123,140,255,0.12)]">
          <div className="flex items-center justify-between mb-1">
            <p style={{ fontSize: f.xs, color: textDim }}>已提交变更 (可整批或逐项回滚, IndexedDB 持久化)</p>
            <button
              onClick={clearUndoHistory}
              className="text-[rgba(255,100,100,0.4)] hover:text-[#ff6464] transition-colors"
              style={{ fontSize: "0.6rem" }}
            >
              清除历史
            </button>
          </div>
          {undoableCommits.map(commit => {
            const rolledBackSet = new Set(commit.rolledBackIndices ?? []);
            const remainingCount = commit.changes.length - rolledBackSet.size;
            const dels = commit.changes.filter((c, i) => c.type === "delete" && !rolledBackSet.has(i)).length;
            const upds = commit.changes.filter((c, i) => c.type === "update" && !rolledBackSet.has(i)).length;
            return (
              <div key={commit.id} className="py-1.5 border-b border-[rgba(0,180,255,0.04)] last:border-0">
                {/* 批次标题行 */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: f.xs, color: "#c0dcf0" }}>
                      {remainingCount}/{commit.changes.length} 项可回滚
                      {upds > 0 && <span className="ml-1 text-[#ffaa00]">({upds} UPD)</span>}
                      {dels > 0 && <span className="ml-1 text-[#ff6464]">({dels} DEL)</span>}
                      {" · "}
                      {new Date(commit.committedAt).toLocaleTimeString("zh-CN")}
                    </span>
                  </div>
                  <button
                    onClick={() => undoCommit(commit.id)}
                    disabled={executing || remainingCount === 0}
                    className="px-2 py-0.5 rounded bg-[rgba(123,140,255,0.1)] text-[#7b8cff] hover:bg-[rgba(123,140,255,0.2)] transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                    style={{ fontSize: f.xs }}
                    title="整批回滚所有未撤销的变更"
                  >
                    <Undo2 className="w-2.5 h-2.5" />
                    全部回滚
                  </button>
                </div>
                {/* 逐项变更列表 (行级 Undo) */}
                <div className="ml-3 space-y-0.5">
                  {commit.changes.map((change, ci) => {
                    const isRolledBack = rolledBackSet.has(ci);
                    const label = change.type === "delete"
                      ? `DEL ${primaryKey}=${String((change.oldValue as Record<string, unknown>)?.[primaryKey] ?? "?")}`
                      : `${change.column}: ${String(change.oldValue ?? "NULL")} → ${change.newValue}`;
                    return (
                      <div
                        key={ci}
                        className={`flex items-center justify-between py-0.5 px-1.5 rounded ${
                          isRolledBack ? "opacity-40 line-through" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className={`shrink-0 ${
                            change.type === "delete" ? "text-[#ff6464]" : "text-[#ffaa00]"
                          }`} style={{ fontSize: "0.6rem" }}>
                            {change.type === "delete" ? "DEL" : "UPD"}
                          </span>
                          <span className="text-[#c0dcf0] font-mono truncate" style={{ fontSize: "0.6rem" }}>
                            {label}
                          </span>
                        </div>
                        {!isRolledBack && (
                          <button
                            onClick={() => undoSingleChange(commit.id, ci)}
                            disabled={executing}
                            className="px-1.5 py-0.5 rounded bg-[rgba(123,140,255,0.06)] text-[rgba(123,140,255,0.6)] hover:text-[#7b8cff] hover:bg-[rgba(123,140,255,0.12)] transition-all disabled:opacity-50 shrink-0"
                            style={{ fontSize: "0.58rem" }}
                            title={`回滚此项: ${label}`}
                          >
                            撤销
                          </button>
                        )}
                        {isRolledBack && (
                          <span className="text-[rgba(0,255,136,0.4)] shrink-0" style={{ fontSize: "0.58rem" }}>
                            已撤销
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 确认弹 ═══ */}
      {showConfirmDialog && (
        <div className="mb-2 p-3 rounded-xl bg-[rgba(6,14,31,0.95)] border border-[rgba(255,170,0,0.3)] shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#ffaa00] shrink-0" />
            <span style={{ fontSize: f.sm, color: "#e0f0ff" }}>
              确认提交 {pendingChanges.length} 项数据变更?
            </span>
          </div>
          <div className="mb-3 max-h-[150px] overflow-y-auto">
            {pendingUpdates.map((c, i) => (
              <div key={`u-${i}`} className="py-0.5 px-2 flex items-center gap-2" style={{ fontSize: f.xs }}>
                <span className="text-[#ffaa00] shrink-0">UPD</span>
                <span className="text-[#7b8cff] font-mono">{c.column}</span>
                <span className="text-[rgba(255,100,100,0.6)] line-through font-mono">{String(c.oldValue ?? "NULL")}</span>
                <span className="text-[rgba(0,212,255,0.3)]">&rarr;</span>
                <span className="text-[#00ff88] font-mono">{c.newValue || "NULL"}</span>
              </div>
            ))}
            {pendingDeletes.map((c, i) => (
              <div key={`d-${i}`} className="py-0.5 px-2 flex items-center gap-2" style={{ fontSize: f.xs }}>
                <span className="text-[#ff6464] shrink-0">DEL</span>
                <span className="text-[#7b8cff] font-mono">
                  {primaryKey}={String((c.oldValue as Record<string, unknown>)?.[primaryKey] ?? "?")}
                </span>
                <span className="text-[rgba(255,100,100,0.5)]">整行删除</span>
              </div>
            ))}
          </div>
          <p className="mb-3" style={{ fontSize: f.xs, color: "rgba(255,170,0,0.6)" }}>
            {pendingDeletes.length > 0
              ? "包含 DELETE 操作 (不可恢复)，确认后可通过 Undo 回滚 (执行 INSERT)"
              : "以下 UPDATE SQL 将被执行，提交后可通过 Undo 回滚"}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: f.sm }}
            >
              取消
            </button>
            <button
              onClick={commitAllChanges}
              disabled={executing}
              className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                pendingDeletes.length > 0
                  ? "bg-[rgba(255,60,60,0.12)] border border-[rgba(255,60,60,0.25)] text-[#ff6464]"
                  : "bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)] text-[#00ff88]"
              }`}
              style={{ fontSize: f.sm }}
            >
              <Send className="w-3.5 h-3.5" />
              {executing ? "提交中..." : "确认提交"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ 数据表格 ═══ */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full" style={{ fontSize: f.xs }}>
          <thead className="sticky top-0 bg-[rgba(6,14,31,0.95)]">
            <tr>
              {/* 选择列 */}
              {editable && (
                <th className="py-1.5 px-1.5 w-6 border-b border-[rgba(0,180,255,0.08)]">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-colors"
                  >
                    {selectedRows.size === rows.length && rows.length > 0
                      ? <CheckSquare className="w-3 h-3" />
                      : <Square className="w-3 h-3" />
                    }
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col}
                  className="py-1.5 px-2 text-left border-b border-[rgba(0,180,255,0.08)] whitespace-nowrap"
                  style={{ color: textDim }}
                >
                  {col}
                  {col === primaryKey && (
                    <span className="ml-1 text-[#00ff88]" title="主键">PK</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const isMarkedDelete = markedForDelete.has(ri);
              return (
                <tr
                  key={ri}
                  className={`border-b border-[rgba(0,180,255,0.03)] ${
                    isMarkedDelete
                      ? "bg-[rgba(255,60,60,0.06)] line-through opacity-60"
                      : "hover:bg-[rgba(0,40,80,0.15)]"
                  }`}
                >
                  {/* 选择框 */}
                  {editable && (
                    <td className="py-1 px-1.5 w-6">
                      <button
                        onClick={() => toggleRowSelection(ri)}
                        className={`transition-colors ${
                          selectedRows.has(ri)
                            ? "text-[#00d4ff]"
                            : "text-[rgba(0,212,255,0.15)] hover:text-[rgba(0,212,255,0.4)]"
                        }`}
                      >
                        {selectedRows.has(ri) ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                      </button>
                    </td>
                  )}
                  {columns.map(col => {
                    const isEditing = editingCell?.rowIndex === ri && editingCell?.column === col;
                    const isPK = col === primaryKey;
                    const wasChanged = pendingChanges.some(
                      c => c.rowIndex === ri && c.column === col && c.type === "update"
                    );
                    const displayValue = wasChanged
                      ? pendingChanges.filter(c => c.rowIndex === ri && c.column === col && c.type === "update").pop()?.newValue ?? String(row[col] ?? "NULL")
                      : String(row[col] ?? "NULL");

                    if (isEditing) {
                      return (
                        <td key={col} className="py-0.5 px-1">
                          <div className="flex items-center gap-1">
                            <input
                              ref={inputRef}
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)
                              }
                              onKeyDown={handleKeyDown}
                              onBlur={confirmEdit}
                              className="w-full px-1.5 py-1 rounded bg-[rgba(0,10,20,0.8)] border border-[rgba(0,212,255,0.4)] text-[#00d4ff] font-mono outline-none"
                              style={{ fontSize: f.xs, minWidth: "60px" }}
                            />
                            <button
                              onMouseDown={(e) => { e.preventDefault(); confirmEdit(); }}
                              className="p-0.5 rounded hover:bg-[rgba(0,255,136,0.15)] text-[#00ff88] shrink-0"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                              className="p-0.5 rounded hover:bg-[rgba(255,60,60,0.15)] text-[#ff6464] shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col}
                        className={`py-1.5 px-2 font-mono whitespace-nowrap max-w-[200px] truncate ${
                          isPK
                            ? "text-[#7b8cff]"
                            : wasChanged
                              ? "text-[#ffaa00]"
                              : "text-[#c0dcf0]"
                        } ${
                          editable && !isPK && !isMarkedDelete
                            ? "cursor-pointer hover:bg-[rgba(0,212,255,0.06)] transition-colors"
                            : ""
                        }`}
                        onDoubleClick={() => !isMarkedDelete && startEditing(ri, col, row[col])}
                        title={editable && !isPK ? `双击编辑 · ${col}: ${displayValue}` : String(displayValue)}
                      >
                        {displayValue}
                        {wasChanged && (
                          <span className="ml-1 text-[rgba(255,170,0,0.5)]" title="已修改">*</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}