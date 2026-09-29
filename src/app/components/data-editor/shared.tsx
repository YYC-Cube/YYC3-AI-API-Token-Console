/**
 * data-editor/shared.tsx — 数据编辑面板共享子组件与常量（批8 自治 Tab 拆分）
 * =========================================================================
 * 主壳 DataEditorPanel.tsx 与各自治 Tab 的公共依赖。
 * 规范: 新增分区放 data-editor/ sibling, 禁止回填主壳。
 */
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { NodeStatusType } from "../../types";

// ── 样式常量 ──
export const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

export const NODE_STATUSES: NodeStatusType[] = ["active", "warning", "inactive"];
export const OP_STATUSES = ["success", "running", "pending", "warning", "error"];
export const MODEL_TIERS = ["primary", "secondary", "standby"];
export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"];

/** 通用排序（数字优先, 其余字符串比较） */
export function sortItems<T>(items: T[], key: string, asc: boolean): T[] {
  if (!key) return items;
  return [...items].sort((a, b) => {
    const va = (a as Record<string, unknown>)[key];
    const vb = (b as Record<string, unknown>)[key];
    if (typeof va === "number" && typeof vb === "number") return asc ? va - vb : vb - va;
    return asc ? String(va ?? "").localeCompare(String(vb ?? "")) : String(vb ?? "").localeCompare(String(va ?? ""));
  });
}

// ============================================================
// 可编辑输入
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

export function CellInput({ value, onChange, type = "text", error, placeholder, mono, width }: CellInputProps) {
  return (
    <div className="relative" style={{ width }}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border text-[#e0f0ff] focus:outline-none transition-all ${error ? "border-[rgba(255,51,102,0.5)] focus:border-[rgba(255,51,102,0.7)]" : "border-[rgba(0,180,255,0.15)] focus:border-[rgba(0,212,255,0.4)]"} ${mono ? "font-mono" : ""}`}
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
// 状态选择
// ============================================================

export function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
// 排序指示器（表头点击排序）
// ============================================================

export function SortIcon({ field, sortKey, sortAsc, onSort }: {
  field: string;
  sortKey: string;
  sortAsc: boolean;
  onSort: (key: string) => void;
}) {
  return (
    <span className="inline-block ml-0.5 cursor-pointer" onClick={() => onSort(field)}>
      {sortKey === field ? (sortAsc ? <ChevronUp className="w-3 h-3 inline text-[#00d4ff]" /> : <ChevronDown className="w-3 h-3 inline text-[#00d4ff]" />) : <ChevronDown className="w-3 h-3 inline text-[rgba(0,212,255,0.15)]" />}
    </span>
  );
}

// ============================================================
// 批量操作栏（三 db Tab 同构）
// ============================================================

export function BatchBar({ count, onDelete, onClear }: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 mb-2 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
      <span className="text-[#ff3366]" style={{ fontSize: "0.72rem" }}>已选 {count} 项</span>
      <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(255,51,102,0.15)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.25)] transition-all" style={{ fontSize: "0.68rem" }}>
        <Trash2 className="w-3 h-3" /> 批量删除
      </button>
      <button onClick={onClear} className="text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]" style={{ fontSize: "0.68rem" }}>取消选择</button>
    </div>
  );
}

/** Tab 卡片头部工具行（说明文案 + 操作按钮组, 三 db Tab 与 StoreTab 同构布局） */
export function TabToolbar({ label, color, children }: { label: string; color: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <p style={{ color, fontSize: "0.75rem" }}>{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
