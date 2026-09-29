/**
 * data-editor/agents-tab.tsx — Agent 管理 Tab（批8 自治拆分）
 * ==========================================================
 * 自治: 数据加载(getAllAgents) + CRUD + 批选 + 排序, 无主壳状态依赖。
 * 原主壳 L312-346 CRUD + L720-823 表格区块逐行迁移。
 */
import { Check, Edit3, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { addDbAgent, deleteDbAgent, getAllAgents, resetDbAgents, updateDbAgent } from "../../lib/db-queries";
import { ViewContext } from "../../lib/view-context";
import type { Agent } from "../../types";
import { GlassCard } from "../GlassCard";
import { BatchBar, CellInput, SortIcon, TabToolbar, sortItems, toastStyle } from "./shared";
import { useRowSelect, useSort, useTableEditor } from "./use-table-state";

export function AgentsTab({ searchQuery, onCountChange }: {
  searchQuery: string;
  onCountChange?: (n: number) => void;
}) {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const ed = useTableEditor();
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = ed;
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useRowSelect();
  const { sortKey, sortAsc, handleSort } = useSort();

  // ═══ 数据加载 ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getAllAgents();
    setAgents(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { onCountChange?.(agents.length); }, [agents.length, onCountChange]);

  // ═══ CRUD ═══
  const saveAgent = useCallback(() => {
    if (!editingId) return;
    updateDbAgent(editingId, {
      name: editDraft.name,
      name_cn: editDraft.name_cn,
      role: editDraft.role,
      description: editDraft.description,
      is_active: editDraft.is_active === "true",
    });
    loadData();
    cancelEdit();
    toast.success("Agent 已更新", { style: toastStyle });
  }, [editingId, editDraft, loadData, cancelEdit]);

  const addNewAgent = useCallback(() => {
    if (!addDraft.name?.trim()) return;
    addDbAgent({
      name: addDraft.name.trim(),
      name_cn: addDraft.name_cn || addDraft.name.trim(),
      role: addDraft.role || "general",
      description: addDraft.description || "",
      is_active: true,
    });
    loadData();
    closeAddForm();
    toast.success("Agent 已添加", { style: toastStyle });
  }, [addDraft, loadData, closeAddForm]);

  const deleteAgent = useCallback((id: string) => {
    deleteDbAgent(id);
    loadData();
    toast.success("Agent 已删除", { style: toastStyle });
  }, [loadData]);

  const handleReset = useCallback(() => {
    resetDbAgents();
    loadData();
    toast.info("已恢复默认数据", { style: toastStyle });
  }, [loadData]);

  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    ids.forEach((id) => deleteDbAgent(id));
    loadData();
    clearSelection();
    toast.success(`已批量删除 ${ids.length} 项`, { style: toastStyle });
  }, [selectedIds, loadData, clearSelection]);

  // ═══ 派生 ═══
  const q = searchQuery.toLowerCase();
  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(q) || a.name_cn.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
  );
  const sorted = sortItems(filtered, sortKey, sortAsc);

  return (
    <GlassCard className="p-4 overflow-x-auto">
      {/* 工具行 */}
      <TabToolbar label="Agent · 名称/角色/描述/启用状态 完全可编辑" color="#aa77ff">
        <button
          onClick={() => loadData()}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
          style={{ fontSize: "0.72rem" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.15)] transition-all"
          style={{ fontSize: "0.72rem" }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all"
          style={{ fontSize: "0.78rem" }}
        >
          <Plus className="w-4 h-4" />
          新增
        </button>
      </TabToolbar>

      {/* 新增表单 */}
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(0,80,120,0.12)] border border-[rgba(0,180,255,0.15)]">
          <p className="text-[#aa77ff] mb-2" style={{ fontSize: "0.75rem" }}>新增 Agent</p>
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
            <CellInput value={addDraft.name || ""} onChange={(v) => setAddDraft((p) => ({ ...p, name: v }))} placeholder="英文名 *" />
            <CellInput value={addDraft.name_cn || ""} onChange={(v) => setAddDraft((p) => ({ ...p, name_cn: v }))} placeholder="中文名" />
            <CellInput value={addDraft.role || ""} onChange={(v) => setAddDraft((p) => ({ ...p, role: v }))} placeholder="角色 (coding/analysis...)" />
            <CellInput value={addDraft.description || ""} onChange={(v) => setAddDraft((p) => ({ ...p, description: v }))} placeholder="描述" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={addNewAgent} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
              <Check className="w-3.5 h-3.5 inline mr-1" />添加
            </button>
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <BatchBar count={selectedIds.size} onDelete={handleBatchDelete} onClear={clearSelection} />
      )}

      {/* 表格 */}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead>
          <tr className="text-[rgba(0,212,255,0.4)] text-left">
            <th className="px-1 py-2 w-8">
              <input type="checkbox" checked={filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id))} onChange={() => toggleSelectAll(filtered.map((a) => a.id))} className="accent-[#00d4ff]" />
            </th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name")}>名称<SortIcon field="name" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name_cn")}>中文名<SortIcon field="name_cn" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("role")}>角色<SortIcon field="role" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>描述</th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("is_active")}>状态<SortIcon field="is_active" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const isEditing = editingId === a.id;
            return (
              <tr key={a.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(a.id) ? "bg-[rgba(0,212,255,0.03)]" : ""}`}>
                <td className="px-1 py-2 w-8">
                  <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="accent-[#00d4ff]" />
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.name || ""} onChange={(v) => setEditDraft((p) => ({ ...p, name: v }))} /> : <span className="text-[#e0f0ff]">{a.name}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.name_cn || ""} onChange={(v) => setEditDraft((p) => ({ ...p, name_cn: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{a.name_cn}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.role || ""} onChange={(v) => setEditDraft((p) => ({ ...p, role: v }))} /> : (
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(170,119,255,0.08)] text-[#aa77ff]" style={{ fontSize: "0.6rem" }}>{a.role}</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.description || ""} onChange={(v) => setEditDraft((p) => ({ ...p, description: v }))} /> : <span className="text-[rgba(224,240,255,0.6)] truncate max-w-[200px] block">{a.description}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <select value={editDraft.is_active || "true"} onChange={(e) => setEditDraft((p) => ({ ...p, is_active: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                      <option value="true">启用</option>
                      <option value="false">禁用</option>
                    </select>
                  ) : (
                    <span className={`flex items-center gap-1 ${a.is_active ? "text-[#00ff88]" : "text-[rgba(255,51,102,0.5)]"}`} style={{ fontSize: "0.65rem" }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.is_active ? "#00ff88" : "#ff3366", boxShadow: `0 0 6px ${a.is_active ? "rgba(0,255,136,0.4)" : "rgba(255,51,102,0.4)"}` }} />
                      {a.is_active ? "启用" : "禁用"}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={saveAgent} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                      <button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(a.id, { name: a.name, name_cn: a.name_cn, role: a.role, description: a.description, is_active: String(a.is_active) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                      <button onClick={() => deleteAgent(a.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>
          {searchQuery ? "无匹配结果" : "暂无 Agent 数据"}
        </p>
      )}
    </GlassCard>
  );
}
