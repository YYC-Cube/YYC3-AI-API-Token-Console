/**
 * DataEditorPanel.tsx
 * ====================
 * 数据管理面板 · 路由: /data-editor
 *
 * 功能:
 * - 模型 (Models) CRUD — 编辑名称/提供商/延迟/吞吐量等
 * - 节点 (Nodes) CRUD — 编辑主机名/GPU/内存/温度/状态等
 * - Agent CRUD — 编辑名称/角色/描述/启用状态等
 * - 全局配置导入导出 (集成 ConfigExportCenter)
 * - 输入校验 (集成 useValidation)
 */

import React, { useState, useCallback, useEffect, useContext } from "react";
import {
  Cpu, Server, Bot, Plus, Trash2, Save, RotateCcw,
  Edit3, Check, X, AlertTriangle, ChevronDown, ChevronUp,
  Package, RefreshCw, Search, Activity, BarChart3, Zap,
  Radar, PieChart, ScrollText,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { ConfigExportCenter } from "./ConfigExportCenter";
import {
  getActiveModels, getNodesStatus, getAllAgents,
  addDbModel, updateDbModel, deleteDbModel,
  addDbNode, updateDbNode, deleteDbNode,
  addDbAgent, updateDbAgent, deleteDbAgent,
  resetDbModels, resetDbAgents, resetDbNodes,
} from "../lib/db-queries";
import { useValidation, validateRange, validateModelName } from "../hooks/useValidation";
import { ViewContext } from "../lib/view-context";
import { toast } from "sonner";
import type { Model, NodeStatusRecord, Agent, NodeStatusType } from "../types";
import {
  nodeStore, modelPerfStore, recentOpsStore,
  radarStore, modelDistStore, logStore,
  type ModelPerfEntry, type RecentOpEntry,
  type RadarEntry, type ModelDistEntry, type StoredLogEntry,
} from "../stores/dashboard-stores";

// ── 样式常量 ──
const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

type ActiveTab = "models" | "nodes" | "agents" | "export" | "liveNodes" | "modelPerf" | "recentOps" | "radarData" | "modelDist" | "logsData";

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "models", label: "模型管理", icon: <Cpu className="w-4 h-4" />, color: "#00d4ff" },
  { key: "nodes", label: "节点管理", icon: <Server className="w-4 h-4" />, color: "#00ff88" },
  { key: "agents", label: "Agent 管理", icon: <Bot className="w-4 h-4" />, color: "#aa77ff" },
  { key: "liveNodes", label: "实时节点", icon: <Activity className="w-4 h-4" />, color: "#ff6600" },
  { key: "modelPerf", label: "模型性能", icon: <BarChart3 className="w-4 h-4" />, color: "#ffdd00" },
  { key: "recentOps", label: "操作记录", icon: <Zap className="w-4 h-4" />, color: "#ff3366" },
  { key: "radarData", label: "雷达数据", icon: <Radar className="w-4 h-4" />, color: "#00ccaa" },
  { key: "modelDist", label: "模型分布", icon: <PieChart className="w-4 h-4" />, color: "#cc66ff" },
  { key: "logsData", label: "日志管理", icon: <ScrollText className="w-4 h-4" />, color: "#ff8844" },
  { key: "export", label: "配置中心", icon: <Package className="w-4 h-4" />, color: "#ffaa00" },
];

const NODE_STATUSES: NodeStatusType[] = ["active", "warning", "inactive"];
const OP_STATUSES = ["success", "running", "pending", "warning", "error"];
const MODEL_TIERS = ["primary", "secondary", "standby"];
const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"];

// ============================================================
// 子组件: 可编辑输入
// ============================================================

interface CellInputProps {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  error?: string;
  placeholder?: string;
  mono?: boolean;
  width?: string;
}

function CellInput({ value, onChange, type = "text", error, placeholder, mono, width }: CellInputProps) {
  return (
    <div className="relative" style={{ width }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border text-[#e0f0ff] focus:outline-none transition-all ${
          error
            ? "border-[rgba(255,51,102,0.5)] focus:border-[rgba(255,51,102,0.7)]"
            : "border-[rgba(0,180,255,0.15)] focus:border-[rgba(0,212,255,0.4)]"
        } ${mono ? "font-mono" : ""}`}
        style={{ fontSize: "0.72rem" }}
      />
      {error && (
        <p className="absolute -bottom-4 left-0 text-[#ff3366] flex items-center gap-0.5" style={{ fontSize: "0.55rem" }}>
          <AlertTriangle className="w-2.5 h-2.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// 子组件: 状态选择
// ============================================================

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors: Record<string, string> = { active: "#00ff88", warning: "#ffaa00", inactive: "#ff3366" };
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none"
      style={{ fontSize: "0.72rem", color: colors[value] || "#e0f0ff" }}
    >
      {NODE_STATUSES.map((s) => (
        <option key={s} value={s} style={{ color: colors[s] }}>{s}</option>
      ))}
    </select>
  );
}

// ============================================================
// Main Component
// ============================================================

export function DataEditorPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const [activeTab, setActiveTab] = useState<ActiveTab>("models");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [models, setModels] = useState<Model[]>([]);
  const [nodes, setNodes] = useState<NodeStatusRecord[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<Record<string, string>>({});

  // Batch select + Sort
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>("");
  const [sortAsc, setSortAsc] = useState(true);

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

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  }, [sortKey]);

  function sortItems<T>(items: T[], key: string, asc: boolean): T[] {
    if (!key) return items;
    return [...items].sort((a, b) => {
      const va = (a as Record<string, unknown>)[key];
      const vb = (b as Record<string, unknown>)[key];
      if (typeof va === "number" && typeof vb === "number") return asc ? va - vb : vb - va;
      return asc ? String(va ?? "").localeCompare(String(vb ?? "")) : String(vb ?? "").localeCompare(String(va ?? ""));
    });
  }

  const SortIcon = ({ field }: { field: string }) => (
    <span className="inline-block ml-0.5 cursor-pointer" onClick={() => handleSort(field)}>
      {sortKey === field ? (sortAsc ? <ChevronUp className="w-3 h-3 inline text-[#00d4ff]" /> : <ChevronDown className="w-3 h-3 inline text-[#00d4ff]" />) : <ChevronDown className="w-3 h-3 inline text-[rgba(0,212,255,0.15)]" />}
    </span>
  );

  // Validation
  const { errors, validateField, clearAll, clearError } = useValidation();

  // ═══ 加载数据 ═══
  const loadData = useCallback(async () => {
    setLoading(true);
    const [mRes, nRes, aRes] = await Promise.all([
      getActiveModels(),
      getNodesStatus(),
      getAllAgents(),
    ]);
    setModels(mRes.data);
    setNodes(nRes.data);
    setAgents(aRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ═══ 搜索过滤 ═══
  const q = searchQuery.toLowerCase();
  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
  );
  const filteredNodes = nodes.filter((n) =>
    n.hostname.toLowerCase().includes(q) || n.model_deployed.toLowerCase().includes(q)
  );
  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(q) || a.name_cn.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
  );

  // ═══ 编辑操作 ═══
  const startEdit = useCallback((id: string, data: Record<string, string>) => {
    setEditingId(id);
    setEditDraft(data);
    clearAll();
  }, [clearAll]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft({});
    clearAll();
  }, [clearAll]);

  // ═══ 模型 CRUD ═══
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
    cancelEdit();
    toast.success("模型已更新", { style: toastStyle });
  }, [editingId, editDraft, loadData, cancelEdit, validateField]);

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
    setShowAddForm(false);
    setAddDraft({});
    toast.success("模型已添加", { style: toastStyle });
  }, [addDraft, loadData]);

  const deleteModel = useCallback((id: string) => {
    deleteDbModel(id);
    loadData();
    toast.success("模型已删除", { style: toastStyle });
  }, [loadData]);

  // ═══ 节点 CRUD ═══
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
    setShowAddForm(false);
    setAddDraft({});
    toast.success("节点已添加", { style: toastStyle });
  }, [addDraft, loadData]);

  const deleteNode = useCallback((id: string) => {
    deleteDbNode(id);
    loadData();
    toast.success("节点已删除", { style: toastStyle });
  }, [loadData]);

  // ═══ Agent CRUD ═══
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
    setShowAddForm(false);
    setAddDraft({});
    toast.success("Agent 已添加", { style: toastStyle });
  }, [addDraft, loadData]);

  const deleteAgent = useCallback((id: string) => {
    deleteDbAgent(id);
    loadData();
    toast.success("Agent 已删除", { style: toastStyle });
  }, [loadData]);

  // ═══ 重置 ═══
  const handleResetAll = useCallback(() => {
    if (activeTab === "models") { resetDbModels(); }
    else if (activeTab === "nodes") { resetDbNodes(); }
    else if (activeTab === "agents") { resetDbAgents(); }
    loadData();
    toast.info("已恢复默认数据", { style: toastStyle });
  }, [activeTab, loadData]);

  // ═══ 批量删除 ═══
  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (activeTab === "models") ids.forEach((id) => deleteDbModel(id));
    else if (activeTab === "nodes") ids.forEach((id) => deleteDbNode(id));
    else if (activeTab === "agents") ids.forEach((id) => deleteDbAgent(id));
    loadData();
    setSelectedIds(new Set());
    toast.success(`已批量删除 ${ids.length} 项`, { style: toastStyle });
  }, [selectedIds, activeTab, loadData]);

  // ═══ 通用 save/add/delete dispatch ═══
  const handleSave = activeTab === "models" ? saveModel : activeTab === "nodes" ? saveNode : saveAgent;
  const handleAdd = activeTab === "models" ? addNewModel : activeTab === "nodes" ? addNewNode : addNewAgent;
  const handleDelete = activeTab === "models" ? deleteModel : activeTab === "nodes" ? deleteNode : deleteAgent;

  // 排序后的数据
  const sortedModels = sortItems(filteredModels, sortKey, sortAsc);
  const sortedNodes = sortItems(filteredNodes, sortKey, sortAsc);
  const sortedAgents = sortItems(filteredAgents, sortKey, sortAsc);

  // ═══ Render ═══
  return (
    <div className="space-y-4" data-testid="data-editor-panel">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              数据管理
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              模型 · 节点 · Agent — 完全可编辑 CRUD + 持久化
            </p>
          </div>
        </div>
        {activeTab !== "export" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.15)] transition-all"
              style={{ fontSize: "0.72rem" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
            <button
              onClick={() => { setShowAddForm(true); setAddDraft({}); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,140,200,0.25)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tab.key === "models" ? models.length
            : tab.key === "nodes" ? nodes.length
            : tab.key === "agents" ? agents.length
            : tab.key === "liveNodes" ? nodeStore.count()
            : tab.key === "modelPerf" ? modelPerfStore.count()
            : tab.key === "recentOps" ? recentOpsStore.count()
            : tab.key === "radarData" ? radarStore.count()
            : tab.key === "modelDist" ? modelDistStore.count()
            : tab.key === "logsData" ? logStore.count()
            : 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); cancelEdit(); setShowAddForm(false); setSearchQuery(""); setSelectedIds(new Set()); setSortKey(""); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                active
                  ? "bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff]"
                  : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,100,150,0.08)] border border-transparent"
              }`}
              style={{ fontSize: "0.78rem" }}
            >
              <span style={{ color: active ? tab.color : undefined }}>{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 搜索 ── */}
      {activeTab !== "export" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-all"
            style={{ fontSize: "0.78rem" }}
          />
        </div>
      )}

      {/* ═══ 配置中心 Tab ═══ */}
      {activeTab === "export" && <ConfigExportCenter />}

      {/* ═══ 模型管理 ═══ */}
      {activeTab === "models" && (
        <GlassCard className="p-4 overflow-x-auto">
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
                <button onClick={handleAdd} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
                  <Check className="w-3.5 h-3.5 inline mr-1" />添加
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>取消</button>
              </div>
            </div>
          )}

          {/* 批量操作栏 */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
              <span className="text-[#ff3366]" style={{ fontSize: "0.72rem" }}>已选 {selectedIds.size} 项</span>
              <button onClick={handleBatchDelete} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(255,51,102,0.15)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all" style={{ fontSize: "0.68rem" }}>
                <Trash2 className="w-3 h-3" /> 批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]" style={{ fontSize: "0.68rem" }}>取消选择</button>
            </div>
          )}

          {/* 表格 */}
          <table className="w-full" style={{ fontSize: "0.72rem" }}>
            <thead>
              <tr className="text-[rgba(0,212,255,0.4)] text-left">
                <th className="px-1 py-2 w-8">
                  <input type="checkbox" checked={filteredModels.length > 0 && filteredModels.every((m) => selectedIds.has(m.id))} onChange={() => toggleSelectAll(filteredModels.map((m) => m.id))} className="accent-[#00d4ff]" />
                </th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name")}>名称<SortIcon field="name" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("provider")}>提供商<SortIcon field="provider" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("tier")}>层级<SortIcon field="tier" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("avg_latency_ms")}>延迟(ms)<SortIcon field="avg_latency_ms" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("throughput")}>吞吐量<SortIcon field="throughput" /></th>
                <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((m) => {
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
                          <button onClick={handleSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                          <button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100" style={{ opacity: 1 }}>
                          <button onClick={() => startEdit(m.id, { name: m.name, provider: m.provider, tier: m.tier, avg_latency_ms: String(m.avg_latency_ms), throughput: String(m.throughput) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                          <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredModels.length === 0 && (
            <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>
              {searchQuery ? "无匹配结果" : "暂无模型数据"}
            </p>
          )}
        </GlassCard>
      )}

      {/* ═══ 节点管理 ═══ */}
      {activeTab === "nodes" && (
        <GlassCard className="p-4 overflow-x-auto">
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
                <button onClick={handleAdd} disabled={!addDraft.hostname?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
                  <Check className="w-3.5 h-3.5 inline mr-1" />添加
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>取消</button>
              </div>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
              <span className="text-[#ff3366]" style={{ fontSize: "0.72rem" }}>已选 {selectedIds.size} 项</span>
              <button onClick={handleBatchDelete} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(255,51,102,0.15)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all" style={{ fontSize: "0.68rem" }}>
                <Trash2 className="w-3 h-3" /> 批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]" style={{ fontSize: "0.68rem" }}>取消选择</button>
            </div>
          )}
          <table className="w-full" style={{ fontSize: "0.72rem" }}>
            <thead>
              <tr className="text-[rgba(0,212,255,0.4)] text-left">
                <th className="px-1 py-2 w-8">
                  <input type="checkbox" checked={filteredNodes.length > 0 && filteredNodes.every((n) => selectedIds.has(n.id))} onChange={() => toggleSelectAll(filteredNodes.map((n) => n.id))} className="accent-[#00d4ff]" />
                </th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("hostname")}>主机名<SortIcon field="hostname" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("gpu_util")}>GPU%<SortIcon field="gpu_util" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("mem_util")}>内存%<SortIcon field="mem_util" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("temp_celsius")}>温度<SortIcon field="temp_celsius" /></th>
                <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>部署模型</th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("active_tasks")}>任务<SortIcon field="active_tasks" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("status")}>状态<SortIcon field="status" /></th>
                <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedNodes.map((n) => {
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
                          <button onClick={handleSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                          <button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => startEdit(n.id, { hostname: n.hostname, gpu_util: String(n.gpu_util), mem_util: String(n.mem_util), temp_celsius: String(n.temp_celsius), model_deployed: n.model_deployed, active_tasks: String(n.active_tasks), status: n.status })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                          <button onClick={() => handleDelete(n.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredNodes.length === 0 && (
            <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>
              {searchQuery ? "无匹配结果" : "暂无节点数据"}
            </p>
          )}
        </GlassCard>
      )}

      {/* ═══ Agent 管理 ═══ */}
      {activeTab === "agents" && (
        <GlassCard className="p-4 overflow-x-auto">
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
                <button onClick={handleAdd} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.72rem" }}>
                  <Check className="w-3.5 h-3.5 inline mr-1" />添加
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>取消</button>
              </div>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
              <span className="text-[#ff3366]" style={{ fontSize: "0.72rem" }}>已选 {selectedIds.size} 项</span>
              <button onClick={handleBatchDelete} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(255,51,102,0.15)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all" style={{ fontSize: "0.68rem" }}>
                <Trash2 className="w-3 h-3" /> 批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]" style={{ fontSize: "0.68rem" }}>取消选择</button>
            </div>
          )}
          <table className="w-full" style={{ fontSize: "0.72rem" }}>
            <thead>
              <tr className="text-[rgba(0,212,255,0.4)] text-left">
                <th className="px-1 py-2 w-8">
                  <input type="checkbox" checked={filteredAgents.length > 0 && filteredAgents.every((a) => selectedIds.has(a.id))} onChange={() => toggleSelectAll(filteredAgents.map((a) => a.id))} className="accent-[#00d4ff]" />
                </th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name")}>名称<SortIcon field="name" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("name_cn")}>中文名<SortIcon field="name_cn" /></th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("role")}>角色<SortIcon field="role" /></th>
                <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>描述</th>
                <th className="px-2 py-2 cursor-pointer" style={{ fontSize: "0.65rem" }} onClick={() => handleSort("is_active")}>状态<SortIcon field="is_active" /></th>
                <th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((a) => {
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
                          <button onClick={handleSave} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button>
                          <button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => startEdit(a.id, { name: a.name, name_cn: a.name_cn, role: a.role, description: a.description, is_active: String(a.is_active) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAgents.length === 0 && (
            <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>
              {searchQuery ? "无匹配结果" : "暂无 Agent 数据"}
            </p>
          )}
        </GlassCard>
      )}

      {/* ═══ 实时节点 (Dashboard nodeStore) ═══ */}
      {activeTab === "liveNodes" && <LiveNodesTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}

      {/* ═══ 模型性能 (Dashboard modelPerfStore) ═══ */}
      {activeTab === "modelPerf" && <ModelPerfTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}

      {/* ═══ 操作记录 (Dashboard recentOpsStore) ═══ */}
      {activeTab === "recentOps" && <RecentOpsTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}

      {/* ═══ 雷达数据 (Dashboard radarStore) ═══ */}
      {activeTab === "radarData" && <RadarDataTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}

      {/* ═══ 模型分布 (Dashboard modelDistStore) ═══ */}
      {activeTab === "modelDist" && <ModelDistTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}

      {/* ═══ 日志管理 (Dashboard logStore) ═══ */}
      {activeTab === "logsData" && <LogsDataTab isMobile={isMobile} searchQuery={searchQuery} editingId={editingId} editDraft={editDraft} showAddForm={showAddForm} addDraft={addDraft} startEdit={startEdit} cancelEdit={cancelEdit} setEditDraft={setEditDraft} setAddDraft={setAddDraft} setShowAddForm={setShowAddForm} />}
    </div>
  );
}

// ============================================================
// Store Tab 通用 Props
// ============================================================
interface StoreTabProps {
  isMobile: boolean; searchQuery: string; editingId: string | null; editDraft: Record<string, string>;
  showAddForm: boolean; addDraft: Record<string, string>;
  startEdit: (id: string, data: Record<string, string>) => void; cancelEdit: () => void;
  setEditDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAddDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setShowAddForm: React.Dispatch<React.SetStateAction<boolean>>;
}

// ── 实时节点 Tab ──
function LiveNodesTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = nodeStore.getAll().filter((n) => n.id.toLowerCase().includes(q) || n.model.toLowerCase().includes(q));
  const sc = (s: string) => s === "active" ? "#00ff88" : s === "warning" ? "#ffaa00" : "#ff3366";
  const save = () => { if (!editingId) return; nodeStore.update(editingId, { status: editDraft.status as any, gpu: parseInt(editDraft.gpu) || 0, mem: parseInt(editDraft.mem) || 0, temp: parseInt(editDraft.temp) || 0, model: editDraft.model || "", tasks: parseInt(editDraft.tasks) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("实时节点已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.id?.trim()) return; nodeStore.add({ id: addDraft.id.trim(), status: (addDraft.status as any) || "active", gpu: parseInt(addDraft.gpu) || 0, mem: parseInt(addDraft.mem) || 0, temp: parseInt(addDraft.temp) || 40, model: addDraft.model || "", tasks: parseInt(addDraft.tasks) || 0 }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("实时节点已添加", { style: toastStyle }); };
  const del = (id: string) => { nodeStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#ff6600]" style={{ fontSize: "0.75rem" }}>Dashboard 实时节点 · 修改后刷新首页可见</p>
        <button onClick={() => { nodeStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(255,102,0,0.06)] border border-[rgba(255,102,0,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
            <CellInput value={addDraft.id || ""} onChange={(v) => setAddDraft((p) => ({ ...p, id: v }))} placeholder="节点ID *" mono />
            <CellInput value={addDraft.gpu || ""} onChange={(v) => setAddDraft((p) => ({ ...p, gpu: v }))} type="number" placeholder="GPU%" />
            <CellInput value={addDraft.mem || ""} onChange={(v) => setAddDraft((p) => ({ ...p, mem: v }))} type="number" placeholder="MEM%" />
            <CellInput value={addDraft.temp || ""} onChange={(v) => setAddDraft((p) => ({ ...p, temp: v }))} type="number" placeholder="温度°C" />
          </div>
          <div className={`grid gap-2 mt-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <CellInput value={addDraft.model || ""} onChange={(v) => setAddDraft((p) => ({ ...p, model: v }))} placeholder="部署模型" />
            <CellInput value={addDraft.tasks || ""} onChange={(v) => setAddDraft((p) => ({ ...p, tasks: v }))} type="number" placeholder="任务数" />
            <StatusSelect value={addDraft.status || "active"} onChange={(v) => setAddDraft((p) => ({ ...p, status: v }))} />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.id?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(255,102,0,0.4)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>节点ID</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>GPU%</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>MEM%</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>温度</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>任务</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>状态</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((n) => { const isE = editingId === n.id; const c = sc(n.status); return (
            <tr key={n.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2 font-mono text-[#e0f0ff]">{n.id}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.gpu || ""} onChange={(v) => setEditDraft((p) => ({ ...p, gpu: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.gpu}%</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.mem || ""} onChange={(v) => setEditDraft((p) => ({ ...p, mem: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.mem}%</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.temp || ""} onChange={(v) => setEditDraft((p) => ({ ...p, temp: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.temp}°C</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.model || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{n.model || "-"}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.tasks || ""} onChange={(v) => setEditDraft((p) => ({ ...p, tasks: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.tasks}</span>}</td>
              <td className="px-2 py-2">{isE ? <StatusSelect value={editDraft.status || "active"} onChange={(v) => setEditDraft((p) => ({ ...p, status: v }))} /> : <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /><span style={{ color: c, fontSize: "0.65rem" }}>{n.status}</span></span>}</td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(n.id, { status: n.status, gpu: String(n.gpu), mem: String(n.mem), temp: String(n.temp), model: n.model, tasks: String(n.tasks) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(n.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无数据</p>}
    </GlassCard>
  );
}

// ── 模型性能 Tab ──
function ModelPerfTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = modelPerfStore.getAll().filter((m) => m.model.toLowerCase().includes(q));
  const save = () => { if (!editingId) return; modelPerfStore.update(editingId, { model: editDraft.model, accuracy: parseFloat(editDraft.accuracy) || 0, speed: parseInt(editDraft.speed) || 0, memory: parseInt(editDraft.memory) || 0, cost: parseInt(editDraft.cost) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.model?.trim()) return; modelPerfStore.add({ model: addDraft.model.trim(), accuracy: parseFloat(addDraft.accuracy) || 90, speed: parseInt(addDraft.speed) || 80, memory: parseInt(addDraft.memory) || 70, cost: parseInt(addDraft.cost) || 60 }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { modelPerfStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#ffdd00]" style={{ fontSize: "0.75rem" }}>Dashboard 模型性能对比 · 影响首页柱状图</p>
        <button onClick={() => { modelPerfStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(255,221,0,0.04)] border border-[rgba(255,221,0,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-5"}`}>
            <CellInput value={addDraft.model || ""} onChange={(v) => setAddDraft((p) => ({ ...p, model: v }))} placeholder="模型名称 *" />
            <CellInput value={addDraft.accuracy || ""} onChange={(v) => setAddDraft((p) => ({ ...p, accuracy: v }))} type="number" placeholder="准确率" />
            <CellInput value={addDraft.speed || ""} onChange={(v) => setAddDraft((p) => ({ ...p, speed: v }))} type="number" placeholder="速度" />
            <CellInput value={addDraft.memory || ""} onChange={(v) => setAddDraft((p) => ({ ...p, memory: v }))} type="number" placeholder="内存" />
            <CellInput value={addDraft.cost || ""} onChange={(v) => setAddDraft((p) => ({ ...p, cost: v }))} type="number" placeholder="成本" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.model?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(255,221,0,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>准确率</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>速度</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>内存</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>成本</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((m) => { const isE = editingId === m.id; return (
            <tr key={m.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.model || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model: v }))} /> : <span className="text-[#e0f0ff]">{m.model}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.accuracy || ""} onChange={(v) => setEditDraft((p) => ({ ...p, accuracy: v }))} type="number" /> : <span className="font-mono text-[#00d4ff]">{m.accuracy}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.speed || ""} onChange={(v) => setEditDraft((p) => ({ ...p, speed: v }))} type="number" /> : <span className="font-mono text-[#00ff88]">{m.speed}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.memory || ""} onChange={(v) => setEditDraft((p) => ({ ...p, memory: v }))} type="number" /> : <span className="font-mono text-[#aa55ff]">{m.memory}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.cost || ""} onChange={(v) => setEditDraft((p) => ({ ...p, cost: v }))} type="number" /> : <span className="font-mono text-[#ffaa00]">{m.cost}</span>}</td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(m.id, { model: m.model, accuracy: String(m.accuracy), speed: String(m.speed), memory: String(m.memory), cost: String(m.cost) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无数据</p>}
    </GlassCard>
  );
}

// ── 操作记录 Tab ──
function RecentOpsTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = recentOpsStore.getAll().filter((o) => o.action.toLowerCase().includes(q) || o.target.toLowerCase().includes(q));
  const osc: Record<string, string> = { success: "#00ff88", running: "#00d4ff", pending: "#aa55ff", warning: "#ffdd00", error: "#ff3366" };
  const save = () => { if (!editingId) return; recentOpsStore.update(editingId, { action: editDraft.action, target: editDraft.target, user: editDraft.user, time: editDraft.time, status: editDraft.status as any }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.action?.trim()) return; recentOpsStore.add({ action: addDraft.action.trim(), target: addDraft.target || "", user: addDraft.user || "admin", time: new Date().toLocaleTimeString("zh-CN", { hour12: false }), status: (addDraft.status as any) || "success" }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { recentOpsStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#ff3366]" style={{ fontSize: "0.75rem" }}>Dashboard 最近操作 · 影响首页操作列表</p>
        <button onClick={() => { recentOpsStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(255,51,102,0.04)] border border-[rgba(255,51,102,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-4"}`}>
            <CellInput value={addDraft.action || ""} onChange={(v) => setAddDraft((p) => ({ ...p, action: v }))} placeholder="操作类型 *" />
            <CellInput value={addDraft.target || ""} onChange={(v) => setAddDraft((p) => ({ ...p, target: v }))} placeholder="目标" />
            <CellInput value={addDraft.user || ""} onChange={(v) => setAddDraft((p) => ({ ...p, user: v }))} placeholder="用户" />
            <select value={addDraft.status || "success"} onChange={(e) => setAddDraft((p) => ({ ...p, status: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
              {OP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.action?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(255,51,102,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>操作</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>目标</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>用户</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>时间</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>状态</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((o) => { const isE = editingId === o.id; const c = osc[o.status] || "#e0f0ff"; return (
            <tr key={o.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.action || ""} onChange={(v) => setEditDraft((p) => ({ ...p, action: v }))} /> : <span className="text-[#e0f0ff]">{o.action}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.target || ""} onChange={(v) => setEditDraft((p) => ({ ...p, target: v }))} /> : <span className="text-[rgba(0,212,255,0.5)] truncate max-w-[200px] block">{o.target}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.user || ""} onChange={(v) => setEditDraft((p) => ({ ...p, user: v }))} /> : <span className="text-[rgba(224,240,255,0.6)]">{o.user}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.time || ""} onChange={(v) => setEditDraft((p) => ({ ...p, time: v }))} /> : <span className="font-mono text-[rgba(224,240,255,0.5)]">{o.time}</span>}</td>
              <td className="px-2 py-2">{isE ? (<select value={editDraft.status || "success"} onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>{OP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>) : (<span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${c}15`, color: c, fontSize: "0.6rem" }}>{o.status}</span>)}</td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(o.id, { action: o.action, target: o.target, user: o.user, time: o.time, status: o.status })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(o.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无操作记录</p>}
    </GlassCard>
  );
}

// ── 雷达数据 Tab ──
function RadarDataTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = radarStore.getAll().filter((r: RadarEntry) => r.metric.toLowerCase().includes(q));
  const save = () => { if (!editingId) return; radarStore.update(editingId, { metric: editDraft.metric, A: parseInt(editDraft.A) || 0, B: parseInt(editDraft.B) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.metric?.trim()) return; radarStore.add({ metric: addDraft.metric.trim(), A: parseInt(addDraft.A) || 80, B: parseInt(addDraft.B) || 75 }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { radarStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#00ccaa]" style={{ fontSize: "0.75rem" }}>Dashboard 雷达对比数据 · 影响首页雷达图</p>
        <button onClick={() => { radarStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(0,204,170,0.04)] border border-[rgba(0,204,170,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <CellInput value={addDraft.metric || ""} onChange={(v) => setAddDraft((p) => ({ ...p, metric: v }))} placeholder="指标名称 (英文) *" />
            <CellInput value={addDraft.A || ""} onChange={(v) => setAddDraft((p) => ({ ...p, A: v }))} type="number" placeholder="方案 A 分值" />
            <CellInput value={addDraft.B || ""} onChange={(v) => setAddDraft((p) => ({ ...p, B: v }))} type="number" placeholder="方案 B 分值" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.metric?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,204,170,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>指标</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>方案 A</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>方案 B</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>差值</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((r: RadarEntry) => { const isE = editingId === r.id; const diff = r.A - r.B; const diffColor = diff > 0 ? "#00ff88" : diff < 0 ? "#ff3366" : "rgba(224,240,255,0.5)"; return (
            <tr key={r.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.metric || ""} onChange={(v) => setEditDraft((p) => ({ ...p, metric: v }))} mono /> : <span className="text-[#e0f0ff] font-mono">{r.metric}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.A || ""} onChange={(v) => setEditDraft((p) => ({ ...p, A: v }))} type="number" /> : <span className="font-mono text-[#00d4ff]">{r.A}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.B || ""} onChange={(v) => setEditDraft((p) => ({ ...p, B: v }))} type="number" /> : <span className="font-mono text-[#cc66ff]">{r.B}</span>}</td>
              <td className="px-2 py-2"><span className="font-mono" style={{ color: diffColor }}>{diff > 0 ? "+" : ""}{diff}</span></td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(r.id, { metric: r.metric, A: String(r.A), B: String(r.B) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(r.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无雷达数据</p>}
    </GlassCard>
  );
}

// ── 模型分布 Tab ──
function ModelDistTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = modelDistStore.getAll().filter((m: ModelDistEntry) => m.name.toLowerCase().includes(q));
  const total = items.reduce((s: number, m: ModelDistEntry) => s + m.value, 0);
  const save = () => { if (!editingId) return; modelDistStore.update(editingId, { name: editDraft.name, value: parseInt(editDraft.value) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.name?.trim()) return; modelDistStore.add({ name: addDraft.name.trim(), value: parseInt(addDraft.value) || 10 }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { modelDistStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  const distColors = ["#00d4ff", "#00ff88", "#cc66ff", "#ffaa00", "#ff3366", "#ff8844", "#7b8cff"];
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[#cc66ff]" style={{ fontSize: "0.75rem" }}>Dashboard 模型分布 · 影响首页饼图</p>
          <span className="px-2 py-0.5 rounded-full bg-[rgba(204,102,255,0.08)] text-[rgba(204,102,255,0.6)]" style={{ fontSize: "0.6rem" }}>总计: {total}</span>
        </div>
        <button onClick={() => { modelDistStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(204,102,255,0.04)] border border-[rgba(204,102,255,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <CellInput value={addDraft.name || ""} onChange={(v) => setAddDraft((p) => ({ ...p, name: v }))} placeholder="模型名称 *" />
            <CellInput value={addDraft.value || ""} onChange={(v) => setAddDraft((p) => ({ ...p, value: v }))} type="number" placeholder="占���值" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(204,102,255,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>数值</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>占比</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>分布条</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((m: ModelDistEntry, idx: number) => { const isE = editingId === m.id; const pct = total > 0 ? ((m.value / total) * 100).toFixed(1) : "0"; const barColor = distColors[idx % distColors.length]; return (
            <tr key={m.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.name || ""} onChange={(v) => setEditDraft((p) => ({ ...p, name: v }))} /> : <span className="text-[#e0f0ff]">{m.name}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.value || ""} onChange={(v) => setEditDraft((p) => ({ ...p, value: v }))} type="number" /> : <span className="font-mono text-[#cc66ff]">{m.value}</span>}</td>
              <td className="px-2 py-2"><span className="font-mono text-[rgba(224,240,255,0.6)]">{pct}%</span></td>
              <td className="px-2 py-2">
                <div className="w-full h-2 rounded-full bg-[rgba(0,40,80,0.3)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}40` }} />
                </div>
              </td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(m.id, { name: m.name, value: String(m.value) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无分布数据</p>}
    </GlassCard>
  );
}

// ── 日志管理 Tab ──
function LogsDataTab({ isMobile, searchQuery, editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, setEditDraft, setAddDraft, setShowAddForm }: StoreTabProps) {
  const [, forceUpdate] = useState(0);
  const q = searchQuery.toLowerCase();
  const items = logStore.getAll().filter((l: StoredLogEntry) => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q) || l.level.toLowerCase().includes(q));
  const levelColors: Record<string, string> = { debug: "#7b8cff", info: "#00d4ff", warn: "#ffaa00", error: "#ff3366", fatal: "#ff0044" };
  const save = () => { if (!editingId) return; logStore.update(editingId, { level: editDraft.level as any, source: editDraft.source, message: editDraft.message, timestamp: parseInt(editDraft.timestamp) || Date.now() }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.message?.trim()) return; logStore.add({ timestamp: Date.now(), level: (addDraft.level as any) || "info", source: addDraft.source || "system", message: addDraft.message.trim() }); setShowAddForm(false); setAddDraft({}); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { logStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  const fmtTime = (ts: number) => new Date(ts).toLocaleString("zh-CN", { hour12: false });
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <p className="text-[#ff8844]" style={{ fontSize: "0.75rem" }}>Dashboard 日志数据 · 影响首页日志流</p>
          <span className="px-2 py-0.5 rounded-full bg-[rgba(255,136,68,0.08)] text-[rgba(255,136,68,0.6)]" style={{ fontSize: "0.6rem" }}>{items.length} 条</span>
        </div>
        <button onClick={() => { logStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(255,136,68,0.04)] border border-[rgba(255,136,68,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <select value={addDraft.level || "info"} onChange={(e) => setAddDraft((p) => ({ ...p, level: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
              {LOG_LEVELS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <CellInput value={addDraft.source || ""} onChange={(v) => setAddDraft((p) => ({ ...p, source: v }))} placeholder="来源 (如 GPU-A100-01)" />
            <CellInput value={addDraft.message || ""} onChange={(v) => setAddDraft((p) => ({ ...p, message: v }))} placeholder="日志内容 *" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.message?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(255,136,68,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>级别</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>来源</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>消息</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>时间</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((l: StoredLogEntry) => { const isE = editingId === l.id; const lc = levelColors[l.level] || "#e0f0ff"; return (
            <tr key={l.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
              <td className="px-2 py-2">{isE ? (
                <select value={editDraft.level || "info"} onChange={(e) => setEditDraft((p) => ({ ...p, level: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                  {LOG_LEVELS.map((lv) => <option key={lv} value={lv}>{lv.toUpperCase()}</option>)}
                </select>
              ) : (
                <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${lc}15`, color: lc, fontSize: "0.6rem" }}>{l.level.toUpperCase()}</span>
              )}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.source || ""} onChange={(v) => setEditDraft((p) => ({ ...p, source: v }))} mono /> : <span className="font-mono text-[rgba(0,212,255,0.5)]">{l.source}</span>}</td>
              <td className="px-2 py-2">{isE ? <CellInput value={editDraft.message || ""} onChange={(v) => setEditDraft((p) => ({ ...p, message: v }))} /> : <span className="text-[rgba(224,240,255,0.7)] max-w-[300px] truncate block">{l.message}</span>}</td>
              <td className="px-2 py-2"><span className="font-mono text-[rgba(224,240,255,0.4)]" style={{ fontSize: "0.6rem" }}>{fmtTime(l.timestamp)}</span></td>
              <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(l.id, { level: l.level, source: l.source, message: l.message, timestamp: String(l.timestamp) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(l.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
            </tr>); })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无日志数据</p>}
    </GlassCard>
  );
}