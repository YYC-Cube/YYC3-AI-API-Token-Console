/**
 * data-editor/store-tabs-a.tsx — Dashboard store 族 Tab·上（批8 自治拆分）
 * =======================================================================
 * LiveNodesTab / ModelPerfTab / RecentOpsTab: 数据源为 dashboard store 单例,
 * 编辑会话态经 useTableEditor 内聚, 原 11-prop drilling 收敛为 2 props。
 * 原主壳 L858-1021 三组件逐行迁移。
 */
import { Check, Edit3, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  modelPerfStore, nodeStore, recentOpsStore,
  type RecentOpEntry,
} from "../../stores/dashboard-stores";
import type { NodeStatusType } from "../../types";
import { GlassCard } from "../GlassCard";
import { CellInput, OP_STATUSES, StatusSelect, toastStyle } from "./shared";
import { useTableEditor } from "./use-table-state";

interface StoreTabShellProps {
  isMobile: boolean;
  searchQuery: string;
}

/** Tab 头部工具行（label + 新增/重置按钮组） */
function StoreToolbar({ label, color, onAdd, onReset }: {
  label: string; color: string; onAdd: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p style={{ color, fontSize: "0.75rem" }}>{label}</p>
      <div className="flex items-center gap-2">
        <button onClick={onAdd} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#00d4ff] bg-[rgba(0,180,255,0.12)] hover:bg-[rgba(0,180,255,0.2)] transition-all" style={{ fontSize: "0.68rem" }}>
          <Plus className="w-3 h-3" />新增
        </button>
        <button onClick={onReset} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
    </div>
  );
}

// ── 实时节点 Tab ──
export function LiveNodesTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = nodeStore.getAll().filter((n) => n.id.toLowerCase().includes(q) || n.model.toLowerCase().includes(q));
  const sc = (s: string) => s === "active" ? "#00ff88" : s === "warning" ? "#ffaa00" : "#ff3366";
  const save = () => { if (!editingId) return; nodeStore.update(editingId, { status: editDraft.status as NodeStatusType, gpu: parseInt(editDraft.gpu) || 0, mem: parseInt(editDraft.mem) || 0, temp: parseInt(editDraft.temp) || 0, model: editDraft.model || "", tasks: parseInt(editDraft.tasks) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("实时节点已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.id?.trim()) return; nodeStore.add({ id: addDraft.id.trim(), status: (addDraft.status as NodeStatusType) || "active", gpu: parseInt(addDraft.gpu) || 0, mem: parseInt(addDraft.mem) || 0, temp: parseInt(addDraft.temp) || 40, model: addDraft.model || "", tasks: parseInt(addDraft.tasks) || 0 }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("实时节点已添加", { style: toastStyle }); };
  const del = (id: string) => { nodeStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar label="Dashboard 实时节点 · 修改后刷新首页可见" color="#ff6600" onAdd={openAddForm} onReset={() => { nodeStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} />
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
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>节点ID</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>GPU%</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>MEM%</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>温度</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>任务</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>状态</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((n) => {
            const isE = editingId === n.id; const c = sc(n.status); return (
              <tr key={n.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
                <td className="px-2 py-2 font-mono text-[#e0f0ff]">{n.id}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.gpu || ""} onChange={(v) => setEditDraft((p) => ({ ...p, gpu: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.gpu}%</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.mem || ""} onChange={(v) => setEditDraft((p) => ({ ...p, mem: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.mem}%</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.temp || ""} onChange={(v) => setEditDraft((p) => ({ ...p, temp: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.temp}°C</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.model || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model: v }))} /> : <span className="text-[rgba(0,212,255,0.5)]">{n.model || "-"}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.tasks || ""} onChange={(v) => setEditDraft((p) => ({ ...p, tasks: v }))} type="number" /> : <span className="font-mono text-[rgba(224,240,255,0.7)]">{n.tasks}</span>}</td>
                <td className="px-2 py-2">{isE ? <StatusSelect value={editDraft.status || "active"} onChange={(v) => setEditDraft((p) => ({ ...p, status: v }))} /> : <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /><span style={{ color: c, fontSize: "0.65rem" }}>{n.status}</span></span>}</td>
                <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(n.id, { status: n.status, gpu: String(n.gpu), mem: String(n.mem), temp: String(n.temp), model: n.model, tasks: String(n.tasks) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(n.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
              </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无数据</p>}
    </GlassCard>
  );
}

// ── 模型性能 Tab ──
export function ModelPerfTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = modelPerfStore.getAll().filter((m) => m.model.toLowerCase().includes(q));
  const save = () => { if (!editingId) return; modelPerfStore.update(editingId, { model: editDraft.model, accuracy: parseFloat(editDraft.accuracy) || 0, speed: parseInt(editDraft.speed) || 0, memory: parseInt(editDraft.memory) || 0, cost: parseInt(editDraft.cost) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.model?.trim()) return; modelPerfStore.add({ model: addDraft.model.trim(), accuracy: parseFloat(addDraft.accuracy) || 90, speed: parseInt(addDraft.speed) || 80, memory: parseInt(addDraft.memory) || 70, cost: parseInt(addDraft.cost) || 60 }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { modelPerfStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar label="Dashboard 模型性能对比 · 影响首页柱状图" color="#ffdd00" onAdd={openAddForm} onReset={() => { modelPerfStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} />
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
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>准确率</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>速度</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>内存</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>成本</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((m) => {
            const isE = editingId === m.id; return (
              <tr key={m.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.model || ""} onChange={(v) => setEditDraft((p) => ({ ...p, model: v }))} /> : <span className="text-[#e0f0ff]">{m.model}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.accuracy || ""} onChange={(v) => setEditDraft((p) => ({ ...p, accuracy: v }))} type="number" /> : <span className="font-mono text-[#00d4ff]">{m.accuracy}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.speed || ""} onChange={(v) => setEditDraft((p) => ({ ...p, speed: v }))} type="number" /> : <span className="font-mono text-[#00ff88]">{m.speed}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.memory || ""} onChange={(v) => setEditDraft((p) => ({ ...p, memory: v }))} type="number" /> : <span className="font-mono text-[#aa55ff]">{m.memory}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.cost || ""} onChange={(v) => setEditDraft((p) => ({ ...p, cost: v }))} type="number" /> : <span className="font-mono text-[#ffaa00]">{m.cost}</span>}</td>
                <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(m.id, { model: m.model, accuracy: String(m.accuracy), speed: String(m.speed), memory: String(m.memory), cost: String(m.cost) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(m.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
              </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无数据</p>}
    </GlassCard>
  );
}

// ── 操作记录 Tab ──
export function RecentOpsTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = recentOpsStore.getAll().filter((o) => o.action.toLowerCase().includes(q) || o.target.toLowerCase().includes(q));
  const osc: Record<string, string> = { success: "#00ff88", running: "#00d4ff", pending: "#aa55ff", warning: "#ffdd00", error: "#ff3366" };
  const save = () => { if (!editingId) return; recentOpsStore.update(editingId, { action: editDraft.action, target: editDraft.target, user: editDraft.user, time: editDraft.time, status: editDraft.status as RecentOpEntry["status"] }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.action?.trim()) return; recentOpsStore.add({ action: addDraft.action.trim(), target: addDraft.target || "", user: addDraft.user || "admin", time: new Date().toLocaleTimeString("zh-CN", { hour12: false }), status: (addDraft.status as RecentOpEntry["status"]) || "success" }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { recentOpsStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar label="Dashboard 最近操作 · 影响首页操作列表" color="#ff3366" onAdd={openAddForm} onReset={() => { recentOpsStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} />
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
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>操作</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>目标</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>用户</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>时间</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>状态</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((o) => {
            const isE = editingId === o.id; const c = osc[o.status] || "#e0f0ff"; return (
              <tr key={o.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.action || ""} onChange={(v) => setEditDraft((p) => ({ ...p, action: v }))} /> : <span className="text-[#e0f0ff]">{o.action}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.target || ""} onChange={(v) => setEditDraft((p) => ({ ...p, target: v }))} /> : <span className="text-[rgba(0,212,255,0.5)] truncate max-w-[200px] block">{o.target}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.user || ""} onChange={(v) => setEditDraft((p) => ({ ...p, user: v }))} /> : <span className="text-[rgba(224,240,255,0.6)]">{o.user}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.time || ""} onChange={(v) => setEditDraft((p) => ({ ...p, time: v }))} /> : <span className="font-mono text-[rgba(224,240,255,0.5)]">{o.time}</span>}</td>
                <td className="px-2 py-2">{isE ? (<select value={editDraft.status || "success"} onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value }))} className="px-2 py-1 rounded bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>{OP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>) : (<span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${c}15`, color: c, fontSize: "0.6rem" }}>{o.status}</span>)}</td>
                <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(o.id, { action: o.action, target: o.target, user: o.user, time: o.time, status: o.status })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(o.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
              </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无操作记录</p>}
    </GlassCard>
  );
}
