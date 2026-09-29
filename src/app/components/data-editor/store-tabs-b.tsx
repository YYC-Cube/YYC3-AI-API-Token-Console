/**
 * data-editor/store-tabs-b.tsx — Dashboard store 族 Tab·下（批8 自治拆分）
 * =======================================================================
 * RadarDataTab / ModelDistTab / LogsDataTab: 数据源为 dashboard store 单例,
 * 编辑会话态经 useTableEditor 内聚, 原 11-prop drilling 收敛为 2 props。
 * 原主壳 L1023-1188 三组件逐行迁移。
 */
import { Check, Edit3, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  logStore, modelDistStore, radarStore,
  type ModelDistEntry, type RadarEntry, type StoredLogEntry,
} from "../../stores/dashboard-stores";
import type { LogLevel } from "../../types";
import { GlassCard } from "../GlassCard";
import { CellInput, LOG_LEVELS, toastStyle } from "./shared";
import { useTableEditor } from "./use-table-state";

interface StoreTabShellProps {
  isMobile: boolean;
  searchQuery: string;
}

/** Tab 头部工具行（label 附加节点 + 新增/重置按钮组） */
function StoreToolbar({ label, labelExtra, color, onAdd, onReset }: {
  label: string; labelExtra?: React.ReactNode; color: string; onAdd: () => void; onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <p style={{ color, fontSize: "0.75rem" }}>{label}</p>
        {labelExtra}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAdd} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#00d4ff] bg-[rgba(0,180,255,0.12)] hover:bg-[rgba(0,180,255,0.2)] transition-all" style={{ fontSize: "0.68rem" }}>
          <Plus className="w-3 h-3" />新增
        </button>
        <button onClick={onReset} className="px-2 py-1 rounded-lg text-[#ffaa00] bg-[rgba(255,170,0,0.08)]" style={{ fontSize: "0.68rem" }}><RotateCcw className="w-3 h-3 inline mr-1" />重置</button>
      </div>
    </div>
  );
}

// ── 雷达数据 Tab ──
export function RadarDataTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = radarStore.getAll().filter((r: RadarEntry) => r.metric.toLowerCase().includes(q));
  const save = () => { if (!editingId) return; radarStore.update(editingId, { metric: editDraft.metric, A: parseInt(editDraft.A) || 0, B: parseInt(editDraft.B) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.metric?.trim()) return; radarStore.add({ metric: addDraft.metric.trim(), A: parseInt(addDraft.A) || 80, B: parseInt(addDraft.B) || 75 }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { radarStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar label="Dashboard 雷达对比数据 · 影响首页雷达图" color="#00ccaa" onAdd={openAddForm} onReset={() => { radarStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }} />
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(0,204,170,0.04)] border border-[rgba(0,204,170,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <CellInput value={addDraft.metric || ""} onChange={(v) => setAddDraft((p) => ({ ...p, metric: v }))} placeholder="指标名称 (英文) *" />
            <CellInput value={addDraft.A || ""} onChange={(v) => setAddDraft((p) => ({ ...p, A: v }))} type="number" placeholder="方案 A 分值" />
            <CellInput value={addDraft.B || ""} onChange={(v) => setAddDraft((p) => ({ ...p, B: v }))} type="number" placeholder="方案 B 分值" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.metric?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(0,204,170,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>指标</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>方案 A</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>方案 B</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>差值</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((r: RadarEntry) => {
            const isE = editingId === r.id; const diff = r.A - r.B; const diffColor = diff > 0 ? "#00ff88" : diff < 0 ? "#ff3366" : "rgba(224,240,255,0.5)"; return (
              <tr key={r.id} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.metric || ""} onChange={(v) => setEditDraft((p) => ({ ...p, metric: v }))} mono /> : <span className="text-[#e0f0ff] font-mono">{r.metric}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.A || ""} onChange={(v) => setEditDraft((p) => ({ ...p, A: v }))} type="number" /> : <span className="font-mono text-[#00d4ff]">{r.A}</span>}</td>
                <td className="px-2 py-2">{isE ? <CellInput value={editDraft.B || ""} onChange={(v) => setEditDraft((p) => ({ ...p, B: v }))} type="number" /> : <span className="font-mono text-[#cc66ff]">{r.B}</span>}</td>
                <td className="px-2 py-2"><span className="font-mono" style={{ color: diffColor }}>{diff > 0 ? "+" : ""}{diff}</span></td>
                <td className="px-2 py-2 text-right">{isE ? (<div className="flex gap-1 justify-end"><button onClick={save} className="p-1 rounded hover:bg-[rgba(0,255,136,0.1)]"><Check className="w-3.5 h-3.5 text-[#00ff88]" /></button><button onClick={cancelEdit} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)]"><X className="w-3.5 h-3.5 text-[#ff3366]" /></button></div>) : (<div className="flex gap-1 justify-end"><button onClick={() => startEdit(r.id, { metric: r.metric, A: String(r.A), B: String(r.B) })} className="p-1 rounded hover:bg-[rgba(0,180,255,0.08)]"><Edit3 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /></button><button onClick={() => del(r.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.08)]"><Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" /></button></div>)}</td>
              </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无雷达数据</p>}
    </GlassCard>
  );
}

// ── 模型分布 Tab ──
export function ModelDistTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = modelDistStore.getAll().filter((m: ModelDistEntry) => m.name.toLowerCase().includes(q));
  const total = items.reduce((s: number, m: ModelDistEntry) => s + m.value, 0);
  const save = () => { if (!editingId) return; modelDistStore.update(editingId, { name: editDraft.name, value: parseInt(editDraft.value) || 0 }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.name?.trim()) return; modelDistStore.add({ name: addDraft.name.trim(), value: parseInt(addDraft.value) || 10 }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { modelDistStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  const distColors = ["#00d4ff", "#00ff88", "#cc66ff", "#ffaa00", "#ff3366", "#ff8844", "#7b8cff"];
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar
        label="Dashboard 模型分布 · 影响首页饼图"
        color="#cc66ff"
        labelExtra={<span className="px-2 py-0.5 rounded-full bg-[rgba(204,102,255,0.08)] text-[rgba(204,102,255,0.6)]" style={{ fontSize: "0.6rem" }}>总计: {total}</span>}
        onAdd={openAddForm}
        onReset={() => { modelDistStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }}
      />
      {showAddForm && (
        <div className="p-3 mb-3 rounded-xl bg-[rgba(204,102,255,0.04)] border border-[rgba(204,102,255,0.15)]">
          <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            <CellInput value={addDraft.name || ""} onChange={(v) => setAddDraft((p) => ({ ...p, name: v }))} placeholder="模型名称 *" />
            <CellInput value={addDraft.value || ""} onChange={(v) => setAddDraft((p) => ({ ...p, value: v }))} type="number" placeholder="占用值" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={!addDraft.name?.trim()} className="px-3 py-1.5 rounded-lg bg-[rgba(204,102,255,0.3)] text-white disabled:opacity-30" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />添加</button>
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
          </div>
        </div>
      )}
      <table className="w-full" style={{ fontSize: "0.72rem" }}>
        <thead><tr className="text-[rgba(0,212,255,0.4)] text-left">
          <th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>模型</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>数值</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>占比</th><th className="px-2 py-2" style={{ fontSize: "0.65rem" }}>分布条</th><th className="px-2 py-2 text-right" style={{ fontSize: "0.65rem" }}>操作</th>
        </tr></thead>
        <tbody>
          {items.map((m: ModelDistEntry, idx: number) => {
            const isE = editingId === m.id; const pct = total > 0 ? ((m.value / total) * 100).toFixed(1) : "0"; const barColor = distColors[idx % distColors.length]; return (
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
              </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无分布数据</p>}
    </GlassCard>
  );
}

// ── 日志管理 Tab ──
export function LogsDataTab({ isMobile, searchQuery }: StoreTabShellProps) {
  const [, forceUpdate] = useState(0);
  const { editingId, editDraft, showAddForm, addDraft, startEdit, cancelEdit, openAddForm, closeAddForm, setEditDraft, setAddDraft } = useTableEditor();
  const q = searchQuery.toLowerCase();
  const items = logStore.getAll().filter((l: StoredLogEntry) => l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q) || l.level.toLowerCase().includes(q));
  const levelColors: Record<string, string> = { debug: "#7b8cff", info: "#00d4ff", warn: "#ffaa00", error: "#ff3366", fatal: "#ff0044" };
  const save = () => { if (!editingId) return; logStore.update(editingId, { level: editDraft.level as LogLevel, source: editDraft.source, message: editDraft.message, timestamp: parseInt(editDraft.timestamp) || Date.now() }); cancelEdit(); forceUpdate((n) => n + 1); toast.success("已更新", { style: toastStyle }); };
  const add = () => { if (!addDraft.message?.trim()) return; logStore.add({ timestamp: Date.now(), level: (addDraft.level as LogLevel) || "info", source: addDraft.source || "system", message: addDraft.message.trim() }); closeAddForm(); forceUpdate((n) => n + 1); toast.success("已添加", { style: toastStyle }); };
  const del = (id: string) => { logStore.remove(id); forceUpdate((n) => n + 1); toast.success("已删除", { style: toastStyle }); };
  const fmtTime = (ts: number) => new Date(ts).toLocaleString("zh-CN", { hour12: false });
  return (
    <GlassCard className="p-4 overflow-x-auto">
      <StoreToolbar
        label="Dashboard 日志数据 · 影响首页日志流"
        color="#ff8844"
        labelExtra={<span className="px-2 py-0.5 rounded-full bg-[rgba(255,136,68,0.08)] text-[rgba(255,136,68,0.6)]" style={{ fontSize: "0.6rem" }}>{items.length} 条</span>}
        onAdd={openAddForm}
        onReset={() => { logStore.reset(); forceUpdate((n) => n + 1); toast.info("已恢复默认"); }}
      />
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
            <button onClick={closeAddForm} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
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
            </tr>);
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-center py-6 text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.75rem" }}>暂无日志数据</p>}
    </GlassCard>
  );
}
