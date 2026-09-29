/**
 * data-editor/nodes-tab.tsx — 节点管理 Tab（批8 自治拆分）
 * ========================================================
 * 自治: 数据加载(getNodesStatus) + CRUD + 批选 + 排序, 无主壳状态依赖。
 * 原主壳 L272-310 CRUD + L606-718 表格区块逐行迁移。
 */
import { Check, Edit3, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { addDbNode, deleteDbNode, getNodesStatus, resetDbNodes, updateDbNode } from "../../lib/db-queries";
import { ViewContext } from "../../lib/view-context";
import type { NodeStatusRecord, NodeStatusType } from "../../types";
import { GlassCard } from "../GlassCard";
import { BatchBar, CellInput, SortIcon, StatusSelect, TabToolbar, sortItems, toastStyle } from "./shared";
import { useRowSelect, useSort, useTableEditor } from "./use-table-state";

export function NodesTab({ searchQuery, onCountChange }: {
  searchQuery: string;
  onCountChange?: (n: number) => void;
}) {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const [nodes, setNodes] = useState<NodeStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const ed = useTableEditor();
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = ed;
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useRowSelect();
  const { sortKey, sortAsc, handleSort } = useSort();

  // ═══ 数据加载 ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getNodesStatus();
    setNodes(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { onCountChange?.(nodes.length); }, [nodes.length, onCountChange]);

  // ═══ CRUD ═══
  const saveNode = useCallback(() => {
    if (!editingId) return;
    updateDbNode(editingId, {
      hostname: editDraft.hostname,
      gpu_util: parseInt(editDraft.gpu_util) || 0,
      mem_util: parseInt(editDraft.mem_util) || 0,
      temp_celsius: parseInt(editDraft.temp_celsius) || 0,
      model_deployed: editDraft.model_deployed || "",
      active_tasks: parseInt(editDraft.active_tasks) || 0,
      status: (editDraft.status as NodeStatusType) || "active",
    });
    loadData();
    cancelEdit();
    toast.success("节点已更新", { style: toastStyle });
  }, [editingId, editDraft, loadData, cancelEdit]);

  const addNewNode = useCallback(() => {
    if (!addDraft.hostname?.trim()) return;
    addDbNode({
      hostname: addDraft.hostname.trim(),
      gpu_util: parseInt(addDraft.gpu_util) || 0,
      mem_util: parseInt(addDraft.mem_util) || 0,
      temp_celsius: parseInt(addDraft.temp_celsius) || 40,
      model_deployed: addDraft.model_deployed || "",
      active_tasks: parseInt(addDraft.active_tasks) || 0,
      status: (addDraft.status as NodeStatusType) || "active",
    });
    loadData();
    closeAddForm();
    toast.success("节点已添加", { style: toastStyle });
  }, [addDraft, loadData, closeAddForm]);

  const deleteNode = useCallback((id: string) => {
    deleteDbNode(id);
    loadData();
    toast.success("节点已删除", { style: toastStyle });
  }, [loadData]);

  const handleReset = useCallback(() => {
    resetDbNodes();
    loadData();
    toast.info("已恢复默认数据", { style: toastStyle });
  }, [loadData]);

  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    ids.forEach((id) => deleteDbNode(id));
    loadData();
    clearSelection();
    toast.success(`已批量删除 ${ids.length} 项`, { style: toastStyle });
  }, [selectedIds, loadData, clearSelection]);

  // ═══ 派生 ═══
  const q = searchQuery.toLowerCase();
  const filtered = nodes.filter((n) =>
    n.hostname.toLowerCase().includes(q) || n.model_deployed.toLowerCase().includes(q)
  );
  const sorted = sortItems(filtered, sortKey, sortAsc);

  return (
    <GlassCard className="p-4 overflow-x-auto">
      {/* 工具行 */}
      <TabToolbar label="节点 · 主机/GPU/内存/温度/部署模型/任务/状态 完全可编辑" color="#00ff88">
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
          <p className="text-[#00ff88] mb-2" style={{ fontSize: "0.75rem" }}>新增节点</p>
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
            <CellInput value={addDraft.hostname || ""} onChange={(v) => setAddDraft((p) => ({ ...p, hostname: v }))} placeholder="主机名 *" />
            <CellInput value={addDraft.gpu_util || ""} onChange={(v) => setAddDraft((p) => ({ ...p, gpu_util: v }))} type="number" placeholder="GPU%" />
            <CellInput value={addDraft.mem_util || ""} onChange={(v) => setAddDraft((p) => ({ ...p, mem_util: v }))} type="number" placeholder="内存%" />
            <CellInput value={addDraft.temp_celsius || ""} onChange={(v) => setAddDraft((p) => ({ ...p, temp_celsius: v }))} type="number" placeholder="温度°C" />
          </div>
          <div className={`grid gap-2 mt-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <CellInput value={addDraft.model_deployed || ""} onChange={(v) => setAddDraft((p) => ({ ...p, model_deployed: v }))} placeholder="部署模型" />
            <CellInput value={addDraft.active_tasks || ""} onChange={(v) => setAddDraft((p) => ({ ...p, active_tasks: v }))} type="number" placeholder="任务数" />
            <StatusSelect value={addDraft.status || "active"} onChange={(v) => setAddDraft((p) => ({ ...p, status: v }))} />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={addNewNode} disabled={!addDraft.hostname?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
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
              <input type="checkbox" checked={filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id))} onChange={() => toggleSelectAll(filtered.map((n) => n.id))} className="accent-[#00d4ff]" />
            </th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("hostname")}>主机名<SortIcon field="hostname" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("gpu_util")}>GPU%<SortIcon field="gpu_util" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("mem_util")}>内存%<SortIcon field="mem_util" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("temp_celsius")}>温度<SortIcon field="temp_celsius" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>部署模型</th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("active_tasks")}>任务<SortIcon field="active_tasks" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("status")}>状态<SortIcon field="status" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((n) => {
            const isEditing = editingId === n.id;
            const statusColor = n.status === "active" ? "#00ff88" : n.status === "warning" ? "#ffaa00" : "#ff3366";
            return (
              <tr key={n.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(n.id) ? "bg-[rgba(0,212,255,0.03)]" : ""}`}>
                <td className="px-1 py-2 w-8">
                  <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} className="accent-[#00d4ff]" />
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.hostname || ""} onChange={(v) => setEditDraft((p) => ({ ...p, hostname: v }))} mono /> : <span className="text-[#e0f0ff] font-mono">{n.hostname}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.gpu_util || ""} onChange={(v) => setEditDraft((p) => ({ ...p, gpu_util: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.gpu_util}%</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.mem_util || ""} onChange={(v) => setEditDraft((p) => ({ ...p, mem_util: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.mem_util}%</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.temp_celsius || ""} onChange={(v) => setEditDraft((p) => ({ ...p, temp_celsius: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.temp_celsius}°C</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.model_deployed || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model_deployed: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{n.model_deployed || "-"}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? <CellInput value={editDraft.active_tasks || ""} onChange={(v) => setEditDraft((p) => ({ ...p, active_tasks: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.active_tasks}</span>}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <StatusSelect value={editDraft.status || "active"} onChange={(v) => setEditDraft((p) => ({ ...p, status: v }))} />
                  ) : (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}40` }} />
                      <span style={{ color: statusColor, fontSize: "0.65rem" }}>{n.status}</span>
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={saveNode} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                      <button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEdit(n.id, { hostname: n.hostname, gpu_util: String(n.gpu_util), mem_util: String(n.mem_util), temp_celsius: String(n.temp_celsius), model_deployed: n.model_deployed, active_tasks: String(n.active_tasks), status: n.status })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                      <button onClick={() => deleteNode(n.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
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
          {searchQuery ? "无匹配结果" : "暂无节点数据"}
        </p>
      )}
    </GlassCard>
  );
}
