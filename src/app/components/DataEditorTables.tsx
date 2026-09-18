/**
 * DataEditorTables.tsx
 * =====================
 * 模型/节点/Agent 表格渲染 + 批量删除 + 排序
 * 从 DataEditorPanel 拆分，避免单文件过大
 */

import React, { useMemo, useState, useCallback } from "react";
import {
  Edit3, Check, X, Trash2, AlertTriangle,
  ArrowUpDown, ChevronUp, ChevronDown,
  CheckSquare, Square,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { toast } from "sonner";
import type { Model, NodeStatusRecord, Agent, NodeStatusType } from "../types";

const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

// ── 排序工具 ──
function sortItems<T>(items: T[], field: string, dir: "asc" | "desc"): T[] {
  if (!field) return items;
  return [...items].sort((a, b) => {
    const va = (a as any)[field];
    const vb = (b as any)[field];
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
    const sa = String(va ?? "").toLowerCase();
    const sb = String(vb ?? "").toLowerCase();
    return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
}

// ── 可排序表头 ──
function SortTh({ label, field, sortField, sortDir, onSort }: {
  label: string; field: string; sortField: string; sortDir: "asc" | "desc"; onSort: (f: string) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="px-2 py-2 cursor-pointer select-none hover:text-[rgba(0,212,255,0.7)] transition-colors"
      style={{ fontSize: "0.65rem" }}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />
        )}
      </span>
    </th>
  );
}

// ── 行复选框 ──
function RowCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <td className="px-1.5 py-2 w-8">
      <button onClick={onChange} className="p-0.5 rounded hover:bg-[rgba(0,180,255,0.06)]">
        {checked ? <CheckSquare className="w-3.5 h-3.5 text-[#00d4ff]" /> : <Square className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />}
      </button>
    </td>
  );
}

// ── 批量工具栏 ──
function BatchBar({ count, onDelete, onClear }: { count: number; onDelete: () => void; onClear: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]" style={{ fontSize: "0.72rem" }}>
      <span className="text-[rgba(0,212,255,0.5)]">已选 <span className="text-[#00d4ff]">{count}</span> 项</span>
      {!confirm ? (
        <button onClick={() => setConfirm(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(255,51,102,0.12)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.2)] transition-all">
          <Trash2 className="w-3 h-3" />批量删除
        </button>
      ) : (
        <>
          <span className="text-[#ff3366]">确认删除?</span>
          <button onClick={() => { onDelete(); setConfirm(false); }} className="px-2 py-1 rounded-lg bg-[rgba(255,51,102,0.3)] text-white hover:bg-[rgba(255,51,102,0.5)] transition-all">确认</button>
          <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all">取消</button>
        </>
      )}
      <button onClick={onClear} className="ml-auto text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all">清除选择</button>
    </div>
  );
}

// ── 简易输入 ──
function CellInput({ value, onChange, type = "text", error, placeholder, mono }: {
  value: string; onChange: (v: string) => void; type?: "text" | "number"; error?: string; placeholder?: string; mono?: boolean;
}) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border text-[#e0f0ff] focus:outline-none transition-all ${error ? "border-[rgba(255,51,102,0.5)]" : "border-[rgba(0,180,255,0.15)]"} ${mono ? "font-mono" : ""}`}
        style={{ fontSize: "0.72rem" }} />
      {error && <p className="absolute -bottom-4 left-0 text-[#ff3366] flex items-center gap-0.5" style={{ fontSize: "0.55rem" }}><AlertTriangle className="w-2.5 h-2.5" />{error}</p>}
    </div>
  );
}

const NODE_STATUSES: NodeStatusType[] = ["active", "warning", "inactive"];
const MODEL_TIERS = ["primary", "secondary", "standby"];

// ============================================================
// 模型表格
// ============================================================

interface ModelTableProps {
  models: Model[];
  editingId: string | null;
  editDraft: Record<string, string>;
  errors: Record<string, string>;
  onStartEdit: (id: string, data: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  setEditDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearError: (k: string) => void;
  searchQuery: string;
}

export function ModelTable({ models, editingId, editDraft, errors, onStartEdit, onSave, onCancel, onDelete, onBatchDelete, setEditDraft, clearError, searchQuery }: ModelTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback((f: string) => {
    if (sortField === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  }, [sortField]);

  const sorted = useMemo(() => sortItems(models, sortField, sortDir), [models, sortField, sortDir]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds((prev) => prev.size === sorted.length ? new Set() : new Set(sorted.map((m) => m.id)));

  return (
    <GlassCard className="p-4 overflow-x-auto">
      <BatchBar count={selectedIds.size} onDelete={() => { onBatchDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }} onClear={() => setSelectedIds(new Set())} />
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead>
          <tr className="text-[rgba(0,212,255,0.4)] text-left">
            <th className="px-1.5 py-2 w-8">
              <button onClick={toggleAll} className="p-0.5">
                {selectedIds.size === sorted.length && sorted.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-[#00d4ff]" /> : <Square className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />}
              </button>
            </th>
            <SortTh label="名称" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="提供商" field="provider" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="层级" field="tier" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="延迟(ms)" field="avg_latency_ms" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="吞吐量" field="throughput" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <tr key={m.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(m.id) ? "bg-[rgba(0,212,255,0.04)]" : ""}`}>
                <RowCheck checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} />
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.name || ""} onChange={(v) => { setEditDraft((p) => ({ ...p, name: v })); clearError("name"); }} error={errors.name} /> : <span className="text-[#e0f0ff]">{m.name}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.provider || ""} onChange={(v) => setEditDraft((p) => ({ ...p, provider: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{m.provider}</span>}</td>
                <td className="px-2 py-2">{isEditing ? (
                  <select value={editDraft.tier || "standby"} onChange={(e) => setEditDraft((p) => ({ ...p, tier: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                    {MODEL_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded ${m.tier === "primary" ? "bg-[rgba(0,255,136,0.08)] text-[#00ff88]" : m.tier === "secondary" ? "bg-[rgba(0,212,255,0.08)] text-[#00d4ff]" : "bg-[rgba(255,170,0,0.08)] text-[#ffaa00]"}`} style={{ fontSize: "0.6rem" }}>{m.tier}</span>
                )}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.avg_latency_ms || ""} onChange={(v) => { setEditDraft((p) => ({ ...p, avg_latency_ms: v })); clearError("avg_latency_ms"); }} type="number" error={errors.avg_latency_ms} /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{m.avg_latency_ms}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.throughput || ""} onChange={(v) => setEditDraft((p) => ({ ...p, throughput: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{m.throughput}</span>}</td>
                <td className="px-2 py-2 text-right">{isEditing ? (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={onSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                    <button onClick={onCancel} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onStartEdit(m.id, { name: m.name, provider: m.provider, tier: m.tier, avg_latency_ms: String(m.avg_latency_ms), throughput: String(m.throughput) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                    <button onClick={() => onDelete(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                  </div>
                )}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>{searchQuery ? "无匹配结果" : "暂无模型数据"}</p>}
    </GlassCard>
  );
}

// ============================================================
// 节点表格
// ============================================================

interface NodeTableProps {
  nodes: NodeStatusRecord[];
  editingId: string | null;
  editDraft: Record<string, string>;
  onStartEdit: (id: string, data: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  setEditDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  searchQuery: string;
}

export function NodeTable({ nodes, editingId, editDraft, onStartEdit, onSave, onCancel, onDelete, onBatchDelete, setEditDraft, searchQuery }: NodeTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback((f: string) => {
    if (sortField === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  }, [sortField]);

  const sorted = useMemo(() => sortItems(nodes, sortField, sortDir), [nodes, sortField, sortDir]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds((prev) => prev.size === sorted.length ? new Set() : new Set(sorted.map((n) => n.id)));

  const statusColor = (s: string) => s === "active" ? "#00ff88" : s === "warning" ? "#ffaa00" : "#ff3366";

  return (
    <GlassCard className="p-4 overflow-x-auto">
      <BatchBar count={selectedIds.size} onDelete={() => { onBatchDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }} onClear={() => setSelectedIds(new Set())} />
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead>
          <tr className="text-[rgba(0,212,255,0.4)] text-left">
            <th className="px-1.5 py-2 w-8"><button onClick={toggleAll} className="p-0.5">{selectedIds.size === sorted.length && sorted.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-[#00d4ff]" /> : <Square className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />}</button></th>
            <SortTh label="主机名" field="hostname" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="GPU%" field="gpu_util" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="内存%" field="mem_util" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="温度" field="temp_celsius" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="部署模型" field="model_deployed" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="任务" field="active_tasks" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="状态" field="status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((n) => {
            const isEditing = editingId === n.id;
            const sc = statusColor(n.status);
            return (
              <tr key={n.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(n.id) ? "bg-[rgba(0,212,255,0.04)]" : ""}`}>
                <RowCheck checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} />
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.hostname || ""} onChange={(v) => setEditDraft((p) => ({ ...p, hostname: v }))} mono /> : <span className="text-[#e0f0ff] font-mono">{n.hostname}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.gpu_util || ""} onChange={(v) => setEditDraft((p) => ({ ...p, gpu_util: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.gpu_util}%</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.mem_util || ""} onChange={(v) => setEditDraft((p) => ({ ...p, mem_util: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.mem_util}%</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.temp_celsius || ""} onChange={(v) => setEditDraft((p) => ({ ...p, temp_celsius: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.temp_celsius}°C</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.model_deployed || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model_deployed: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{n.model_deployed || "-"}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.active_tasks || ""} onChange={(v) => setEditDraft((p) => ({ ...p, active_tasks: v }))} type="number" /> : <span className="text-[rgba(224,240,255,0.7)] font-mono">{n.active_tasks}</span>}</td>
                <td className="px-2 py-2">{isEditing ? (
                  <select value={editDraft.status || "active"} onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem", color: statusColor(editDraft.status || "") }}>{NODE_STATUSES.map((s) => <option key={s} value={s} style={{ color: statusColor(s) }}>{s}</option>)}</select>
                ) : (
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc, boxShadow: `0 0 6px ${sc}40` }} /><span style={{ color: sc, fontSize: "0.65rem" }}>{n.status}</span></span>
                )}</td>
                <td className="px-2 py-2 text-right">{isEditing ? (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={onSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                    <button onClick={onCancel} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onStartEdit(n.id, { hostname: n.hostname, gpu_util: String(n.gpu_util), mem_util: String(n.mem_util), temp_celsius: String(n.temp_celsius), model_deployed: n.model_deployed, active_tasks: String(n.active_tasks), status: n.status })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                    <button onClick={() => onDelete(n.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                  </div>
                )}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>{searchQuery ? "无匹配结果" : "暂无节点数据"}</p>}
    </GlassCard>
  );
}

// ============================================================
// Agent 表格
// ============================================================

interface AgentTableProps {
  agents: Agent[];
  editingId: string | null;
  editDraft: Record<string, string>;
  onStartEdit: (id: string, data: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  setEditDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  searchQuery: string;
}

export function AgentTable({ agents, editingId, editDraft, onStartEdit, onSave, onCancel, onDelete, onBatchDelete, setEditDraft, searchQuery }: AgentTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback((f: string) => {
    if (sortField === f) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  }, [sortField]);

  const sorted = useMemo(() => sortItems(agents, sortField, sortDir), [agents, sortField, sortDir]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds((prev) => prev.size === sorted.length ? new Set() : new Set(sorted.map((a) => a.id)));

  return (
    <GlassCard className="p-4 overflow-x-auto">
      <BatchBar count={selectedIds.size} onDelete={() => { onBatchDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }} onClear={() => setSelectedIds(new Set())} />
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead>
          <tr className="text-[rgba(0,212,255,0.4)] text-left">
            <th className="px-1.5 py-2 w-8"><button onClick={toggleAll} className="p-0.5">{selectedIds.size === sorted.length && sorted.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-[#00d4ff]" /> : <Square className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />}</button></th>
            <SortTh label="名称" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="中文名" field="name_cn" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="角色" field="role" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>描述</th>
            <SortTh label="状态" field="is_active" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const isEditing = editingId === a.id;
            return (
              <tr key={a.id} className={`border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)] transition-all ${selectedIds.has(a.id) ? "bg-[rgba(0,212,255,0.04)]" : ""}`}>
                <RowCheck checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} />
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.name || ""} onChange={(v) => setEditDraft((p) => ({ ...p, name: v }))} /> : <span className="text-[#e0f0ff]">{a.name}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.name_cn || ""} onChange={(v) => setEditDraft((p) => ({ ...p, name_cn: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{a.name_cn}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.role || ""} onChange={(v) => setEditDraft((p) => ({ ...p, role: v }))} /> : <span className="px-1.5 py-0.5 rounded bg-[rgba(170,119,255,0.08)] text-[#aa77ff]" style={{ fontSize: "0.6rem" }}>{a.role}</span>}</td>
                <td className="px-2 py-2">{isEditing ? <CellInput value={editDraft.description || ""} onChange={(v) => setEditDraft((p) => ({ ...p, description: v }))} /> : <span className="text-[rgba(224,240,255,0.6)] truncate max-w-[200px] block">{a.description}</span>}</td>
                <td className="px-2 py-2">{isEditing ? (
                  <select value={editDraft.is_active || "true"} onChange={(e) => setEditDraft((p) => ({ ...p, is_active: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                    <option value="true">启用</option><option value="false">禁用</option>
                  </select>
                ) : (
                  <span className={`flex items-center gap-1 ${a.is_active ? "text-[#00ff88]" : "text-[rgba(255,51,102,0.5)]"}`} style={{ fontSize: "0.65rem" }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.is_active ? "#00ff88" : "#ff3366", boxShadow: `0 0 6px ${a.is_active ? "rgba(0,255,136,0.4)" : "rgba(255,51,102,0.4)"}` }} />
                    {a.is_active ? "启用" : "禁用"}
                  </span>
                )}</td>
                <td className="px-2 py-2 text-right">{isEditing ? (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={onSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                    <button onClick={onCancel} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onStartEdit(a.id, { name: a.name, name_cn: a.name_cn, role: a.role, description: a.description, is_active: String(a.is_active) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                    <button onClick={() => onDelete(a.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                  </div>
                )}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>{searchQuery ? "无匹配结果" : "暂无 Agent 数据"}</p>}
    </GlassCard>
  );
}
