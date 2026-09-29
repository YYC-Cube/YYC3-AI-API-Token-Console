/**
 * data-editor/use-table-state.ts — 表格交互协议 Hooks（批8 自治 Tab 拆分）
 * =======================================================================
 * 原 DataEditorPanel 主壳上提的编辑会话态（editingId/editDraft/showAddForm/addDraft）
 * 实为「Tab 内会话」: 条件渲染卸载即重置, 下放为各自治 Tab 内部 state。
 * 三个 hook 均零依赖组件状态, 可独立复用。
 */
import { useCallback, useState } from "react";

/** 编辑会话: 行编辑 + 新增表单 */
export function useTableEditor() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<Record<string, string>>({});

  const startEdit = useCallback((id: string, data: Record<string, string>) => {
    setEditingId(id);
    setEditDraft(data);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft({});
  }, []);

  const openAddForm = useCallback(() => {
    setShowAddForm(true);
    setAddDraft({});
  }, []);

  const closeAddForm = useCallback(() => {
    setShowAddForm(false);
    setAddDraft({});
  }, []);

  return {
    editingId, editDraft, showAddForm, addDraft,
    startEdit, cancelEdit, openAddForm, closeAddForm,
    setEditDraft, setAddDraft,
  };
}

/** 批量选择 */
export function useRowSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, toggleSelect, toggleSelectAll, clearSelection };
}

/** 表头排序 */
export function useSort() {
  const [sortKey, setSortKey] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  }, [sortKey]);

  return { sortKey, sortAsc, handleSort };
}
