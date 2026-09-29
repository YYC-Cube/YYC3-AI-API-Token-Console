/**
 * data-editor/models-tab.tsx — 模型管理 Tab（批8 自治拆分）
 * ========================================================
 * 自治: 数据加载(getActiveModels) + CRUD + 输入校验 + 批选 + 排序, 无主壳状态依赖。
 * 原主壳 L228-270 CRUD + L478-604 表格区块逐行迁移。
 */
import { Check, Edit3, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useValidation, validateModelName, validateRange } from "../../hooks/useValidation";
import { addDbModel, deleteDbModel, getActiveModels, resetDbModels, updateDbModel } from "../../lib/db-queries";
import { ViewContext } from "../../lib/view-context";
import type { Model } from "../../types";
import { GlassCard } from "../GlassCard";
import { BatchBar, CellInput, MODEL_TIERS, SortIcon, TabToolbar, sortItems, toastStyle } from "./shared";
import { useRowSelect, useSort, useTableEditor } from "./use-table-state";

export function ModelsTab({ searchQuery, onCountChange }: {
  searchQuery: string;
  onCountChange?: (n: number) => void;
}) {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const { errors, validateField, clearAll, clearError } = useValidation();
  const ed = useTableEditor();
  const { editingId, editDraft, showAddForm, addDraft, startEdit: rawStartEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = ed;
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useRowSelect();
  const { sortKey, sortAsc, handleSort } = useSort();

  // ═══ 数据加载 ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getActiveModels();
    setModels(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { onCountChange?.(models.length); }, [models.length, onCountChange]);

  // ═══ 编辑会话（校验态联动）═══
  const startEdit = useCallback((id: string, data: Record<string, string>) => {
    clearAll();
    rawStartEdit(id, data);
  }, [clearAll, rawStartEdit]);

  const cancelEditWithClear = useCallback(() => {
    clearAll();
    cancelEdit();
  }, [clearAll, cancelEdit]);

  // ═══ CRUD ═══
  const saveModel = useCallback(() => {
    if (!editingId) return;
    // 校验
    const nameErr = validateModelName(editDraft.name || "");
    const latErr = validateRange(editDraft.avg_latency_ms || "0", 0, 99999);
    const thrErr = validateRange(editDraft.throughput || "0", 0, 999999);
    if (nameErr) { validateField("name", "模型名称", editDraft.name || "", [{ type: "modelName" }]); return; }
    if (latErr) { validateField("avg_latency_ms", "延迟", editDraft.avg_latency_ms || "", [{ type: "range", min: 0, max: 99999 }]); return; }
    if (thrErr) { validateField("throughput", "吞吐量", editDraft.throughput || "", [{ type: "range", min: 0, max: 999999 }]); return; }

    updateDbModel(editingId, {
      name: editDraft.name,
      provider: editDraft.provider,
      tier: editDraft.tier as Model["tier"],
      avg_latency_ms: parseInt(editDraft.avg_latency_ms) || 0,
      throughput: parseInt(editDraft.throughput) || 0,
    });
    loadData();
    cancelEditWithClear();
    toast.success("模型已更新", { style: toastStyle });
  }, [editingId, editDraft, loadData, cancelEditWithClear, validateField]);

  const addNewModel = useCallback(() => {
    if (!addDraft.name?.trim()) return;
    addDbModel({
      name: addDraft.name.trim(),
      provider: addDraft.provider || "Custom",
      tier: (addDraft.tier as Model["tier"]) || "standby",
      avg_latency_ms: parseInt(addDraft.avg_latency_ms) || 100,
      throughput: parseInt(addDraft.throughput) || 500,
      created_at: new Date().toISOString(),
    });
    loadData();
    closeAddForm();
    toast.success("模型已添加", { style: toastStyle });
  }, [addDraft, loadData, closeAddForm]);

  const deleteModel = useCallback((id: string) => {
    deleteDbModel(id);
    loadData();
    toast.success("模型已删除", { style: toastStyle });
  }, [loadData]);

  const handleReset = useCallback(() => {
    resetDbModels();
    loadData();
    toast.info("已恢复默认数据", { style: toastStyle });
  }, [loadData]);

  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    ids.forEach((id) => deleteDbModel(id));
    loadData();
    clearSelection();
    toast.success(`已批量删除 ${ids.length} 项`, { style: toastStyle });
  }, [selectedIds, loadData, clearSelection]);

  // ═══ 派生 ═══
  const q = searchQuery.toLowerCase();
  const filtered = models.filter((m) =>
    m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
  );
  const sorted = sortItems(filtered, sortKey, sortAsc);

  return (
    <GlassCard className="p-4 overflow-x-auto">
      {/* 工具行 */}
      <TabToolbar label="模型 · 名称/提供商/延迟/吞吐量 完全可编辑" color="#00d4ff">
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
          <p className="text-[#00d4ff] mb-2" style={{ fontSize: "0.75rem" }}>新增模型</p>
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-5"}`}>
            <CellInput value={addDraft.name || ""} onChange={(v) => setAddDraft((p) => ({ ...p, name: v }))} placeholder="模型名称 *" />
            <CellInput value={addDraft.provider || ""} onChange={(v) => setAddDraft((p) => ({ ...p, provider: v }))} placeholder="提供商" />
            <select
              value={addDraft.tier || "standby"}
              onChange={(e) => setAddDraft((p) => ({ ...p, tier: e.target.value }))}
              className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]"
              style={{ fontSize: "0.72rem" }}
            >
              {MODEL_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <CellInput value={addDraft.avg_latency_ms || ""} onChange={(v) => setAddDraft((p) => ({ ...p, avg_latency_ms: v }))} type="number" placeholder="延迟 (ms)" />
            <CellInput value={addDraft.throughput || ""} onChange={(v) => setAddDraft((p) => ({ ...p, throughput: v }))} type="number" placeholder="吞吐量" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={addNewModel} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
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
              <input type="checkbox" checked={filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id))} onChange={() => toggleSelectAll(filtered.map((m) => m.id))} className="accent-[#00d4ff]" />
            </th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name")}>名称<SortIcon field="name" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("provider")}>提供商<SortIcon field="provider" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("tier")}>层级<SortIcon field="tier" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("avg_latency_ms")}>延迟(ms)<SortIcon field="avg_latency_ms" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("throughput")}>吞吐量<SortIcon field="throughput" sortKey={sortKey} sortAsc={sortAsc} onSort={handleSort} /></th>
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <tr key={m.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(m.id) ? "bg-[rgba(0,212,255,0.03)]" : ""}`}>
                <td className="px-1 py-2 w-8">
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} className="accent-[#00d4ff]" />
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <CellInput value={editDraft.name || ""} onChange={(v) => { setEditDraft((p) => ({ ...p, name: v })); clearError("name"); }} error={errors.name} />
                  ) : (
                    <span className="text-[#e0f0ff]">{m.name}</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <CellInput value={editDraft.provider || ""} onChange={(v) => setEditDraft((p) => ({ ...p, provider: v }))} />
                  ) : (
                    <span className="text-[rgba(0,212,255,0.5)]">{m.provider}</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <select value={editDraft.tier || "standby"} onChange={(e) => setEditDraft((p) => ({ ...p, tier: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                      {MODEL_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <span className={`px-1.5 py-0.5 rounded ${m.tier === "primary" ? "bg-[rgba(0,255,136,0.08)] text-[#00ff88]" : m.tier === "secondary" ? "bg-[rgba(0,212,255,0.08)] text-[#00d4ff]" : "bg-[rgba(255,170,0,0.08)] text-[#ffaa00]"}`} style={{ fontSize: "0.6rem" }}>
                      {m.tier}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <CellInput value={editDraft.avg_latency_ms || ""} onChange={(v) => { setEditDraft((p) => ({ ...p, avg_latency_ms: v })); clearError("avg_latency_ms"); }} type="number" error={errors.avg_latency_ms} />
                  ) : (
                    <span className="text-[rgba(224,240,255,0.7)] font-mono">{m.avg_latency_ms}</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {isEditing ? (
                    <CellInput value={editDraft.throughput || ""} onChange={(v) => setEditDraft((p) => ({ ...p, throughput: v }))} type="number" />
                  ) : (
                    <span className="text-[rgba(224,240,255,0.7)] font-mono">{m.throughput}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={saveModel} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                      <button onClick={cancelEditWithClear} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100" style={{ opacity: 1 }}>
                      <button onClick={() => startEdit(m.id, { name: m.name, provider: m.provider, tier: m.tier, avg_latency_ms: String(m.avg_latency_ms), throughput: String(m.throughput) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                      <button onClick={() => deleteModel(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
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
          {searchQuery ? "无匹配结果" : "暂无模型数据"}
        </p>
      )}
    </GlassCard>
  );
}
