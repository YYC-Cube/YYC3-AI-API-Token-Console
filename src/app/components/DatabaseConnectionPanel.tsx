/**
 * DatabaseConnectionPanel.tsx
 * ============================
 * 数据库连接配置面板 · 路由: /db-connections
 *
 * 基于 dbConnectionStore (localStorage CRUD) 管理连接配置:
 * - 完整 CRUD: 添加 / 编辑 / 删除连接
 * - 连接测试模拟: 模拟 ping / handshake / query 三步测试
 * - 密码显示/隐藏
 * - 导入/导出 JSON
 * - 支持 PostgreSQL / MySQL / SQLite / Redis / MongoDB / Custom
 */

import React, { useState, useCallback, useContext } from "react";
import {
  Database, Plus, Trash2, Edit3, Check, X, Eye, EyeOff,
  Plug, Unplug, TestTube, Download, Upload, RotateCcw,
  Loader2, CheckCircle2, AlertTriangle, XCircle, Server,
  Settings2, Play, Clock, Layers,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { SQLEditor } from "./CodeEditor";
import { ViewContext } from "../lib/view-context";
import { dbConnectionStore, type DBConnection } from "../stores/dashboard-stores";
import { env } from "../lib/env-config";
import { toast } from "sonner";

const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

const DB_TYPES: DBConnection["type"][] = ["postgresql", "mysql", "sqlite", "redis", "mongodb", "custom"];

const DB_TYPE_META: Record<string, { label: string; color: string; defaultPort: number }> = {
  postgresql: { label: "PostgreSQL", color: "#336791", defaultPort: 5432 },
  mysql:      { label: "MySQL",      color: "#4479A1", defaultPort: 3306 },
  sqlite:     { label: "SQLite",     color: "#003B57", defaultPort: 0 },
  redis:      { label: "Redis",      color: "#DC382D", defaultPort: 6379 },
  mongodb:    { label: "MongoDB",    color: "#4DB33D", defaultPort: 27017 },
  custom:     { label: "Custom",     color: "#00d4ff", defaultPort: 0 },
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  connected:    { label: "已连接", color: "#00ff88", icon: CheckCircle2 },
  disconnected: { label: "未连接", color: "rgba(0,212,255,0.4)", icon: Unplug },
  error:        { label: "错误",   color: "#ff3366", icon: XCircle },
  testing:      { label: "测试中", color: "#ffdd00", icon: Loader2 },
};

export function DatabaseConnectionPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;

  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const connections = dbConnectionStore.getAll();

  // ═══ 连接测试模拟 ═══
  const testConnection = useCallback(async (id: string) => {
    setTestingId(id);
    dbConnectionStore.update(id, { status: "testing" });
    refresh();

    // 模拟 3 步测试: ping → handshake → query
    const steps = ["网络 Ping...", "握手认证...", "测试查询..."];
    for (const step of steps) {
      toast.info(step, { style: toastStyle, duration: 800 });
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
    }

    // 随机结果 (80% 成功)
    const success = Math.random() > 0.2;
    dbConnectionStore.update(id, {
      status: success ? "connected" : "error",
      lastTestAt: Date.now(),
    });
    setTestingId(null);
    refresh();
    if (success) toast.success("连接测试成功", { style: toastStyle });
    else toast.error("连接测试失败: 模拟超时", { style: toastStyle });
  }, []);

  // ═══ CRUD ═══
  const startEdit = (conn: DBConnection) => {
    setEditingId(conn.id);
    setDraft({
      name: conn.name, type: conn.type, host: conn.host,
      port: String(conn.port), database: conn.database,
      username: conn.username, password: conn.password, options: conn.options || "",
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    dbConnectionStore.update(editingId, {
      name: draft.name, type: draft.type as DBConnection["type"],
      host: draft.host, port: parseInt(draft.port) || 0,
      database: draft.database, username: draft.username,
      password: draft.password, options: draft.options,
      status: "disconnected",
    });
    setEditingId(null);
    setDraft({});
    refresh();
    toast.success("连接已更新", { style: toastStyle });
  };

  const addNew = () => {
    if (!draft.name?.trim()) return;
    dbConnectionStore.add({
      name: draft.name.trim(),
      type: (draft.type as DBConnection["type"]) || "postgresql",
      host: draft.host || "localhost",
      port: parseInt(draft.port) || DB_TYPE_META[draft.type || "postgresql"]?.defaultPort || 0,
      database: draft.database || "",
      username: draft.username || "",
      password: draft.password || "",
      status: "disconnected",
      options: draft.options || "",
    });
    setShowAddForm(false);
    setDraft({});
    refresh();
    toast.success("连接已添加", { style: toastStyle });
  };

  const deleteConn = (id: string) => {
    dbConnectionStore.remove(id);
    refresh();
    toast.success("连接已删除", { style: toastStyle });
  };

  const exportAll = () => {
    const json = dbConnectionStore.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yyc3-db-connections-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("已导出", { style: toastStyle });
  };

  const importAll = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = dbConnectionStore.importData(reader.result as string);
        if (ok) { refresh(); toast.success("已导入", { style: toastStyle }); }
        else toast.error("导入失败", { style: toastStyle });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const sysName = env("SYSTEM_NAME");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(51,103,145,0.15)] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#336791]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>数据库连接管理</h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>{sysName} · 连接配置 CRUD + 测试模拟</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
          <button onClick={importAll} className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(0,100,150,0.1)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.72rem" }}>
            <Upload className="w-3.5 h-3.5" /> 导入
          </button>
          <button onClick={() => { dbConnectionStore.reset(); refresh(); toast.info("已恢复默认"); }} className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] transition-all" style={{ fontSize: "0.72rem" }}>
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
          <button onClick={() => { setShowAddForm(true); setDraft({ type: "postgresql", host: "localhost", port: "5432" }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff] transition-all" style={{ fontSize: "0.78rem" }}>
            <Plus className="w-4 h-4" /> 新建连接
          </button>
        </div>
      </div>

      {/* 新建表单 */}
      {showAddForm && (
        <GlassCard className="p-4">
          <p className="text-[#00d4ff] mb-3" style={{ fontSize: "0.8rem" }}>新建数据库连接</p>
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>连接名称 *</label>
              <input value={draft.name || ""} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.75rem" }} placeholder="主数据库" />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>类型</label>
              <select value={draft.type || "postgresql"} onChange={(e) => { const t = e.target.value; setDraft((p) => ({ ...p, type: t, port: String(DB_TYPE_META[t]?.defaultPort || 0) })); }} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.75rem" }}>
                {DB_TYPES.map((t) => <option key={t} value={t}>{DB_TYPE_META[t]?.label || t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>主机</label>
              <input value={draft.host || ""} onChange={(e) => setDraft((p) => ({ ...p, host: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none font-mono" style={{ fontSize: "0.75rem" }} placeholder="localhost" />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>端口</label>
              <input type="number" value={draft.port || ""} onChange={(e) => setDraft((p) => ({ ...p, port: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none font-mono" style={{ fontSize: "0.75rem" }} />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>数据库名</label>
              <input value={draft.database || ""} onChange={(e) => setDraft((p) => ({ ...p, database: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.75rem" }} placeholder="yyc3_matrix" />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>用户名</label>
              <input value={draft.username || ""} onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.75rem" }} placeholder="admin" />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>密码</label>
              <input type="password" value={draft.password || ""} onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.75rem" }} />
            </div>
            <div>
              <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.65rem" }}>选项</label>
              <input value={draft.options || ""} onChange={(e) => setDraft((p) => ({ ...p, options: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none font-mono" style={{ fontSize: "0.75rem" }} placeholder="sslmode=disable" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addNew} disabled={!draft.name?.trim()} className="px-4 py-2 rounded-lg bg-[rgba(0,140,200,0.5)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all disabled:opacity-30" style={{ fontSize: "0.75rem" }}>
              <Check className="w-3.5 h-3.5 inline mr-1" />创建连接
            </button>
            <button onClick={() => { setShowAddForm(false); setDraft({}); }} className="px-4 py-2 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff]" style={{ fontSize: "0.75rem" }}>取消</button>
          </div>
        </GlassCard>
      )}

      {/* 连接列表 */}
      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {connections.map((conn) => {
          const meta = DB_TYPE_META[conn.type] || DB_TYPE_META.custom;
          const sMeta = STATUS_META[conn.status] || STATUS_META.disconnected;
          const isEditing = editingId === conn.id;
          const isTesting = testingId === conn.id;
          const StatusIcon = sMeta.icon;

          return (
            <GlassCard key={conn.id} className="p-4">
              {isEditing ? (
                /* 编辑模式 */
                <div className="space-y-3">
                  <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                    <input value={draft.name || ""} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.72rem" }} placeholder="名称" />
                    <select value={draft.type || "postgresql"} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff]" style={{ fontSize: "0.72rem" }}>
                      {DB_TYPES.map((t) => <option key={t} value={t}>{DB_TYPE_META[t]?.label}</option>)}
                    </select>
                    <input value={draft.host || ""} onChange={(e) => setDraft((p) => ({ ...p, host: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none font-mono" style={{ fontSize: "0.72rem" }} placeholder="host" />
                    <input type="number" value={draft.port || ""} onChange={(e) => setDraft((p) => ({ ...p, port: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none font-mono" style={{ fontSize: "0.72rem" }} placeholder="port" />
                    <input value={draft.database || ""} onChange={(e) => setDraft((p) => ({ ...p, database: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.72rem" }} placeholder="database" />
                    <input value={draft.username || ""} onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))} className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none" style={{ fontSize: "0.72rem" }} placeholder="username" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.15)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.25)]" style={{ fontSize: "0.72rem" }}><Check className="w-3.5 h-3.5 inline mr-1" />保存</button>
                    <button onClick={() => { setEditingId(null); setDraft({}); }} className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.72rem" }}>取消</button>
                  </div>
                </div>
              ) : (
                /* 显示模式 */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                        <Database className="w-4 h-4" style={{ color: meta.color }} />
                      </div>
                      <div>
                        <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{conn.name}</h3>
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${meta.color}15`, color: meta.color, fontSize: "0.6rem" }}>{meta.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} style={{ color: sMeta.color }} />
                      <span style={{ color: sMeta.color, fontSize: "0.68rem" }}>{sMeta.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3" style={{ fontSize: "0.7rem" }}>
                    <div className="text-[rgba(0,212,255,0.35)]">主机: <span className="text-[#c0dcf0] font-mono">{conn.host}</span></div>
                    <div className="text-[rgba(0,212,255,0.35)]">端口: <span className="text-[#c0dcf0] font-mono">{conn.port}</span></div>
                    <div className="text-[rgba(0,212,255,0.35)]">数据库: <span className="text-[#c0dcf0]">{conn.database || "-"}</span></div>
                    <div className="text-[rgba(0,212,255,0.35)]">用户: <span className="text-[#c0dcf0]">{conn.username || "-"}</span></div>
                    <div className="text-[rgba(0,212,255,0.35)] flex items-center gap-1">
                      密码: <span className="text-[#c0dcf0] font-mono">{showPw[conn.id] ? (conn.password || "(空)") : "••••••"}</span>
                      <button onClick={() => setShowPw((p) => ({ ...p, [conn.id]: !p[conn.id] }))} className="p-0.5">
                        {showPw[conn.id] ? <EyeOff className="w-3 h-3 text-[rgba(0,212,255,0.3)]" /> : <Eye className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />}
                      </button>
                    </div>
                    {conn.options && <div className="text-[rgba(0,212,255,0.35)]">选项: <span className="text-[#c0dcf0] font-mono">{conn.options}</span></div>}
                    {conn.lastTestAt && <div className="text-[rgba(0,212,255,0.35)]">上次测试: <span className="text-[#c0dcf0]">{new Date(conn.lastTestAt).toLocaleString("zh-CN")}</span></div>}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(0,180,255,0.06)]">
                    <button onClick={() => testConnection(conn.id)} disabled={isTesting} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.15)] transition-all disabled:opacity-30" style={{ fontSize: "0.7rem" }}>
                      <TestTube className="w-3 h-3" /> 测试连接
                    </button>
                    <button onClick={() => startEdit(conn)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(0,140,200,0.08)] border border-[rgba(0,180,255,0.15)] text-[rgba(0,212,255,0.6)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.7rem" }}>
                      <Edit3 className="w-3 h-3" /> 编辑
                    </button>
                    <button onClick={() => deleteConn(conn.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.15)] text-[rgba(255,51,102,0.5)] hover:text-[#ff3366] transition-all" style={{ fontSize: "0.7rem" }}>
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </div>
                </>
              )}
            </GlassCard>
          );
        })}
      </div>

      {connections.length === 0 && (
        <GlassCard className="p-8 text-center">
          <Server className="w-10 h-10 text-[rgba(0,212,255,0.15)] mx-auto mb-3" />
          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.85rem" }}>暂无数据库连接</p>
          <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.7rem" }}>点击"新建连接"开始配置</p>
        </GlassCard>
      )}

      {/* ═══ 连接池配置 ═══ */}
      <ConnectionPoolConfig />

      {/* ═══ SQL 快速测试 ═══ */}
      <SQLQuickTest connections={connections} />
    </div>
  );
}

// ============================================================
// 连接池配置子组件
// ============================================================

const POOL_STORAGE_KEY = "yyc3_db_pool_config";

interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  maxRetries: number;
  healthCheckIntervalMs: number;
  enableAutoScale: boolean;
  enableHealthCheck: boolean;
}

const DEFAULT_POOL: PoolConfig = {
  minConnections: env("DB_POOL_MIN"),
  maxConnections: env("DB_POOL_MAX"),
  idleTimeoutMs: env("DB_POOL_IDLE_TIMEOUT"),
  acquireTimeoutMs: env("DB_POOL_ACQUIRE_TIMEOUT"),
  maxRetries: 3,
  healthCheckIntervalMs: 60000,
  enableAutoScale: true,
  enableHealthCheck: true,
};

function loadPoolConfig(): PoolConfig {
  try {
    const raw = localStorage.getItem(POOL_STORAGE_KEY);
    if (raw) return { ...DEFAULT_POOL, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_POOL };
}

function savePoolConfig(config: PoolConfig): void {
  try { localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

function ConnectionPoolConfig() {
  const [pool, setPool] = useState<PoolConfig>(loadPoolConfig);
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof PoolConfig, value: number | boolean) => {
    const next = { ...pool, [key]: value };
    setPool(next);
    savePoolConfig(next);
  };

  const resetPool = () => {
    localStorage.removeItem(POOL_STORAGE_KEY);
    setPool({ ...DEFAULT_POOL });
    toast.info("连接池配置已重置", { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>连接池配置</h3>
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,212,255,0.06)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>
            {pool.minConnections}~{pool.maxConnections} 连接
          </span>
        </div>
        <Settings2 className={`w-4 h-4 text-[rgba(0,212,255,0.3)] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* 开关组 */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pool.enableAutoScale} onChange={(e) => update("enableAutoScale", e.target.checked)} className="accent-[#00d4ff]" />
              <span className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.72rem" }}>自动伸缩</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pool.enableHealthCheck} onChange={(e) => update("enableHealthCheck", e.target.checked)} className="accent-[#00d4ff]" />
              <span className="text-[rgba(224,240,255,0.7)]" style={{ fontSize: "0.72rem" }}>健康检查</span>
            </label>
          </div>

          {/* 数值配置 */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { key: "minConnections" as const, label: "最小连接数", min: 0, max: 50, unit: "" },
              { key: "maxConnections" as const, label: "最大连接数", min: 1, max: 200, unit: "" },
              { key: "idleTimeoutMs" as const, label: "空闲超时", min: 1000, max: 300000, unit: "ms" },
              { key: "acquireTimeoutMs" as const, label: "获取超时", min: 500, max: 60000, unit: "ms" },
              { key: "maxRetries" as const, label: "最大重试次数", min: 0, max: 10, unit: "" },
              { key: "healthCheckIntervalMs" as const, label: "健康检查间隔", min: 5000, max: 600000, unit: "ms" },
            ] as const).map(({ key, label, min, max, unit }) => (
              <div key={key}>
                <label className="block text-[rgba(0,212,255,0.4)] mb-1" style={{ fontSize: "0.62rem" }}>{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={pool[key] as number}
                    min={min}
                    max={max}
                    onChange={(e) => update(key, Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                    className="w-full px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.72rem" }}
                  />
                  {unit && <span className="text-[rgba(0,212,255,0.3)] whitespace-nowrap" style={{ fontSize: "0.6rem" }}>{unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* 连接池状态模拟 */}
          <div className="p-3 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.65rem" }}>连接池状态 (模拟)</span>
            </div>
            <div className="grid grid-cols-4 gap-3" style={{ fontSize: "0.68rem" }}>
              <div className="text-center">
                <div className="text-[#00ff88] font-mono" style={{ fontSize: "0.85rem" }}>{pool.minConnections}</div>
                <div className="text-[rgba(0,212,255,0.3)]">活跃</div>
              </div>
              <div className="text-center">
                <div className="text-[#ffaa00] font-mono" style={{ fontSize: "0.85rem" }}>{Math.floor(pool.maxConnections * 0.3)}</div>
                <div className="text-[rgba(0,212,255,0.3)]">空闲</div>
              </div>
              <div className="text-center">
                <div className="text-[rgba(224,240,255,0.5)] font-mono" style={{ fontSize: "0.85rem" }}>0</div>
                <div className="text-[rgba(0,212,255,0.3)]">等待</div>
              </div>
              <div className="text-center">
                <div className="text-[#00d4ff] font-mono" style={{ fontSize: "0.85rem" }}>{pool.maxConnections}</div>
                <div className="text-[rgba(0,212,255,0.3)]">上限</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={resetPool} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(255,170,0,0.08)] border border-[rgba(255,170,0,0.2)] text-[#ffaa00] hover:bg-[rgba(255,170,0,0.15)] transition-all" style={{ fontSize: "0.7rem" }}>
              <RotateCcw className="w-3 h-3" /> 重置默认
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================
// SQL 快速测试子组件
// ============================================================

const SQL_HISTORY_KEY = "yyc3_sql_history";

interface SQLResult {
  columns: string[];
  rows: string[][];
  executionTime: number;
  rowCount: number;
}

const MOCK_SQL_RESULTS: Record<string, SQLResult> = {
  "SELECT": {
    columns: ["id", "name", "status", "created_at"],
    rows: [
      ["1", "GPU-A100-01", "active", "2026-03-07 10:00:00"],
      ["2", "GPU-A100-02", "active", "2026-03-07 10:01:00"],
      ["3", "GPU-A100-03", "warning", "2026-03-07 10:02:00"],
    ],
    executionTime: 12,
    rowCount: 3,
  },
  "SHOW": {
    columns: ["table_name", "table_type", "row_count"],
    rows: [
      ["nodes", "BASE TABLE", "13"],
      ["models", "BASE TABLE", "8"],
      ["tasks", "BASE TABLE", "256"],
      ["logs", "BASE TABLE", "15420"],
    ],
    executionTime: 5,
    rowCount: 4,
  },
  "DESCRIBE": {
    columns: ["column", "type", "nullable", "default"],
    rows: [
      ["id", "SERIAL", "NO", "auto_increment"],
      ["hostname", "VARCHAR(255)", "NO", "NULL"],
      ["gpu_util", "INTEGER", "YES", "0"],
      ["status", "VARCHAR(50)", "YES", "'active'"],
    ],
    executionTime: 3,
    rowCount: 4,
  },
};

function SQLQuickTest({ connections }: { connections: DBConnection[] }) {
  const [expanded, setExpanded] = useState(false);
  const [sqlValue, setSqlValue] = useState("SELECT * FROM nodes WHERE status = 'active' LIMIT 10;");
  const [selectedConnId, setSelectedConnId] = useState(connections[0]?.id || "");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<SQLResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    try { const raw = localStorage.getItem(SQL_HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  const executeSQL = useCallback(async () => {
    if (!sqlValue.trim()) return;
    setExecuting(true);
    setResult(null);
    setError(null);

    // 保存历史
    const newHistory = [sqlValue, ...history.filter((h) => h !== sqlValue)].slice(0, 20);
    setHistory(newHistory);
    try { localStorage.setItem(SQL_HISTORY_KEY, JSON.stringify(newHistory)); } catch { /* ignore */ }

    // 模拟执行
    const delay = env("SQL_TEST_SIMULATE_DELAY");
    await new Promise((r) => setTimeout(r, delay + Math.random() * (delay * 1.4)));

    const upper = sqlValue.trim().toUpperCase();
    if (upper.startsWith("DROP") || upper.startsWith("DELETE") || upper.startsWith("TRUNCATE")) {
      setError("安全拦截: 危险操作 (DROP/DELETE/TRUNCATE) 已被阻止");
    } else if (upper.startsWith("INSERT") || upper.startsWith("UPDATE")) {
      setResult({ columns: ["affected_rows"], rows: [["1"]], executionTime: Math.floor(8 + Math.random() * 15), rowCount: 1 });
    } else if (upper.startsWith("SHOW") || upper.includes("INFORMATION_SCHEMA")) {
      setResult({ ...MOCK_SQL_RESULTS.SHOW, executionTime: Math.floor(3 + Math.random() * 10) });
    } else if (upper.startsWith("DESC") || upper.startsWith("EXPLAIN")) {
      setResult({ ...MOCK_SQL_RESULTS.DESCRIBE, executionTime: Math.floor(2 + Math.random() * 8) });
    } else {
      setResult({ ...MOCK_SQL_RESULTS.SELECT, executionTime: Math.floor(5 + Math.random() * 25) });
    }
    setExecuting(false);
  }, [sqlValue, history]);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(SQL_HISTORY_KEY);
    toast.info("历史已清除");
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-[#00ff88]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>SQL 快速测试</h3>
          <span className="px-1.5 py-0.5 rounded bg-[rgba(0,255,136,0.06)] text-[rgba(0,255,136,0.4)]" style={{ fontSize: "0.55rem" }}>
            模拟执行
          </span>
        </div>
        <Settings2 className={`w-4 h-4 text-[rgba(0,212,255,0.3)] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* 连接选择 + 执行按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedConnId}
              onChange={(e) => setSelectedConnId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none"
              style={{ fontSize: "0.72rem" }}
            >
              {connections.length === 0 && <option value="">无可用连接</option>}
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
            <button
              onClick={executeSQL}
              disabled={executing || !sqlValue.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.2)] transition-all disabled:opacity-30"
              style={{ fontSize: "0.75rem" }}
            >
              {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {executing ? "执行中..." : "执行"}
            </button>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.6rem" }}>Ctrl+Enter 快速执行</span>
          </div>

          {/* SQL 编辑器 */}
          <SQLEditor
            value={sqlValue}
            onChange={setSqlValue}
            onExecute={executeSQL}
            height="140px"
            placeholder="输入 SQL 查询语句..."
          />

          {/* 错误信息 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
              <XCircle className="w-4 h-4 text-[#ff3366]" />
              <span className="text-[#ff3366]" style={{ fontSize: "0.72rem" }}>{error}</span>
            </div>
          )}

          {/* 查询结果 */}
          {result && (
            <div className="rounded-xl border border-[rgba(0,180,255,0.1)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[rgba(0,20,40,0.5)] border-b border-[rgba(0,180,255,0.06)]">
                <div className="flex items-center gap-3">
                  <span className="text-[#00ff88]" style={{ fontSize: "0.65rem" }}>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    {result.rowCount} 行
                  </span>
                  <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.6rem" }}>
                    <Clock className="w-3 h-3 inline mr-1" />{result.executionTime}ms
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: "0.68rem" }}>
                  <thead>
                    <tr className="bg-[rgba(0,40,80,0.15)]">
                      {result.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-[rgba(0,212,255,0.5)] whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-[rgba(0,180,255,0.04)] hover:bg-[rgba(0,40,80,0.08)]">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 text-[rgba(224,240,255,0.7)] font-mono whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SQL 历史 */}
          {history.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.65rem" }}>历史查询 ({history.length})</span>
                <button onClick={clearHistory} className="text-[rgba(255,170,0,0.4)] hover:text-[#ffaa00]" style={{ fontSize: "0.6rem" }}>清除</button>
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                {history.slice(0, 8).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSqlValue(h)}
                    className="w-full text-left px-2 py-1 rounded-lg text-[rgba(224,240,255,0.5)] hover:text-[#e0f0ff] hover:bg-[rgba(0,40,80,0.1)] font-mono truncate transition-all"
                    style={{ fontSize: "0.62rem" }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}