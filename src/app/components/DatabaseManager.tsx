/**
 * DatabaseManager.tsx
 * ====================
 * 本地数据库管理器 · 路由: /database
 *
 * 功能: 连接管理 / 表浏览+数据预览 / SQL 查询控制台+模板+历史 / 备份恢复
 * 后端接口预留: POST /api/db/{detect|connect|query|tables|backup|restore|test|table-data}
 */

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Eye, EyeOff,
  HardDrive,
  History,
  Key,
  Loader2,
  Play, Plug,
  Plus,
  RefreshCcw,
  Scan,
  Table2,
  TestTube,
  Trash2,
  Unplug,
  X
} from "lucide-react";
import { useCallback, useContext, useState } from "react";
import { useLocalDatabase } from "../hooks/useLocalDatabase";
import { ViewContext } from "../lib/view-context";
import type { DatabaseType } from "../types";
import { SQLEditor } from "./CodeEditor";
import { GlassCard } from "./GlassCard";
import { InlineEditableTable } from "./InlineEditableTable";

// ── 样式常量 ──
const textPrimary = "#e0f0ff";
const textDim = "rgba(0,212,255,0.4)";
const f = { xs: "0.65rem", sm: "0.72rem", md: "0.8rem", lg: "0.92rem" };

const DB_TYPE_LABELS: Record<DatabaseType, { label: string; color: string; icon: string }> = {
  postgresql: { label: "PostgreSQL", color: "#336791", icon: "PG" },
  mysql: { label: "MySQL", color: "#4479A1", icon: "My" },
  redis: { label: "Redis", color: "#DC382D", icon: "Rd" },
};

type ActiveTab = "connections" | "tables" | "query" | "history" | "backups";

export function DatabaseManager() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const db = useLocalDatabase();
  const [activeTab, setActiveTab] = useState<ActiveTab>("connections");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [editingConn, setEditingConn] = useState<string | null>(null);

  /** Execute SQL directly from InlineEditableTable (for UPDATE operations) */
  const executeInlineSQL = useCallback(async (sql: string): Promise<{ ok: boolean; error?: string; affectedRows?: number }> => {
    if (!db.activeConnectionId) {
      return { ok: false, error: "未连接数据库" };
    }
    try {
      const result = await db.executeQuery(sql);
      if (result?.error) {
        return { ok: false, error: result.error };
      }
      const affected = result?.rows?.[0]?.affected_rows;
      return { ok: true, affectedRows: typeof affected === "number" ? affected : 1 };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : "执行失败" };
    }
  }, [db]);

  // 新建连接表单
  const [formData, setFormData] = useState<{
    name: string; type: DatabaseType; host: string; port: string;
    database: string; username: string; password: string;
  }>({
    name: "", type: "postgresql", host: "127.0.0.1", port: "5432",
    database: "yyc3_matrix", username: "postgres", password: "",
  });

  const handleAddConnection = useCallback(() => {
    if (!formData.name.trim()) return;
    db.addConnection({
      name: formData.name,
      type: formData.type,
      host: formData.host,
      port: parseInt(formData.port) || 5432,
      database: formData.database,
      username: formData.username,
      password: formData.password,
    });
    setShowAddForm(false);
    setFormData({ name: "", type: "postgresql", host: "127.0.0.1", port: "5432", database: "yyc3_matrix", username: "postgres", password: "" });
  }, [formData, db]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const tabs = [
    { key: "connections" as const, label: "连接管理", icon: Plug, count: db.connections.length },
    { key: "tables" as const, label: "表浏览", icon: Table2, count: db.tables.length },
    { key: "query" as const, label: "查询控制台", icon: Play, count: db.queryResults.length },
    { key: "history" as const, label: "查询历史", icon: History, count: db.queryHistory.length },
    { key: "backups" as const, label: "备份恢复", icon: HardDrive, count: db.backups.length },
  ];

  return (
    <div className="space-y-4">
      {/* ══ Header ══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Database className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 style={{ fontSize: f.lg, color: textPrimary }}>本地数据库管理</h2>
            <p style={{ fontSize: f.xs, color: textDim }}>
              连接 · 查询 · 表浏览 · 备份恢复
              {db.activeConnection && (
                <span className="text-[#00ff88]"> · 已连接: {db.activeConnection.name}</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={db.detectDatabases}
          disabled={db.detecting}
          className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,180,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center gap-1.5 disabled:opacity-50"
          style={{ fontSize: f.sm }}
        >
          {db.detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
          自动检测
        </button>
      </div>

      {/* ══ Stats Bar ══ */}
      <div className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-5"}`}>
        {[
          { label: "连接数", value: db.stats.totalConnections, color: "#00d4ff" },
          { label: "已连接", value: db.stats.connectedCount, color: "#00ff88" },
          { label: "表数量", value: db.stats.totalTables, color: "#7b8cff" },
          { label: "总行数", value: db.stats.totalTableRows.toLocaleString(), color: "#ffaa00" },
          { label: "查询历史", value: db.stats.queryCount, color: "#ff6b9d" },
        ].map(s => (
          <div key={s.label} className="px-3 py-2 rounded-xl bg-[rgba(0,40,80,0.12)] border border-[rgba(0,180,255,0.06)]">
            <p style={{ fontSize: f.xs, color: textDim }}>{s.label}</p>
            <p style={{ fontSize: "1.1rem", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ══ Tab 导航 ══ */}
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === tab.key
                ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
                : "text-[rgba(0,212,255,0.35)] border border-transparent hover:border-[rgba(0,180,255,0.12)]"
              }`}
            style={{ fontSize: f.sm }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {!isMobile && tab.label}
            {tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)]" style={{ fontSize: f.xs }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/*  连接管理 Tab                                  */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "connections" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: f.xs, color: textDim }}>{db.connections.length} 个连接</span>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] flex items-center gap-1.5"
              style={{ fontSize: f.sm }}
            >
              <Plus className="w-3.5 h-3.5" /> 新建连接
            </button>
          </div>

          {/* 新建连接表单 */}
          {showAddForm && (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: f.md, color: textPrimary }}>新建数据库连接</span>
                <button onClick={() => setShowAddForm(false)} className="text-[rgba(0,212,255,0.3)]"><X className="w-4 h-4" /></button>
              </div>
              <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>连接名称</label>
                  <input value={formData.name} onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                    placeholder="YYC³ PostgreSQL"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none focus:border-[rgba(0,212,255,0.3)]"
                    style={{ fontSize: f.sm }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>数据库类型</label>
                  <select value={formData.type} onChange={(e) => {
                    const t = e.target.value as DatabaseType;
                    const ports: Record<string, string> = { postgresql: "5432", mysql: "3306", redis: "6379" };
                    setFormData(d => ({ ...d, type: t, port: ports[t] || "5432" }));
                  }}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                    style={{ fontSize: f.sm }}
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>主机地址</label>
                  <input value={formData.host} onChange={(e) => setFormData(d => ({ ...d, host: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                    style={{ fontSize: f.sm }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>端口</label>
                  <input value={formData.port} onChange={(e) => setFormData(d => ({ ...d, port: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                    style={{ fontSize: f.sm }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>数据库名</label>
                  <input value={formData.database} onChange={(e) => setFormData(d => ({ ...d, database: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                    style={{ fontSize: f.sm }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: f.xs, color: textDim }}>用户名</label>
                  <input value={formData.username} onChange={(e) => setFormData(d => ({ ...d, username: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                    style={{ fontSize: f.sm }}
                  />
                </div>
                <div className="col-span-full">
                  <label style={{ fontSize: f.xs, color: textDim }}>密码</label>
                  <div className="relative mt-1">
                    <input type={showPassword["form"] ? "text" : "password"} value={formData.password}
                      onChange={(e) => setFormData(d => ({ ...d, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 rounded-lg bg-[rgba(0,10,20,0.5)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
                      style={{ fontSize: f.sm }}
                    />
                    <button onClick={() => setShowPassword(p => ({ ...p, form: !p.form }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(0,212,255,0.3)]"
                    >
                      {showPassword["form"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-[rgba(0,212,255,0.4)]" style={{ fontSize: f.sm }}>取消</button>
                <button onClick={handleAddConnection}
                  className="px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff]"
                  style={{ fontSize: f.sm }}
                >添加连接</button>
              </div>
            </GlassCard>
          )}

          {/* 连接列表 */}
          {db.connections.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-[rgba(0,212,255,0.15)]" />
              <p style={{ fontSize: f.md, color: textPrimary }}>暂无数据库连接</p>
              <p style={{ fontSize: f.xs, color: textDim }}>点击"自动检测"扫描本地服务，或手动"新建连接"</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {db.connections.map(conn => {
                const meta = DB_TYPE_LABELS[conn.type];
                const isActive = conn.id === db.activeConnectionId;
                return (
                  <GlassCard key={conn.id} className={`p-4 ${isActive ? "ring-1 ring-[rgba(0,255,136,0.3)]" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}22`, border: `1px solid ${meta.color}44` }}
                      >
                        <span style={{ color: meta.color, fontSize: f.sm, fontFamily: "monospace" }}>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: f.md, color: textPrimary }}>{conn.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${conn.status === "connected" ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]" :
                              conn.status === "connecting" ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]" :
                                conn.status === "error" ? "bg-[rgba(255,60,60,0.1)] text-[#ff6464]" :
                                  "bg-[rgba(0,212,255,0.05)] text-[rgba(0,212,255,0.3)]"
                            }`} style={{ fontSize: f.xs }}>
                            {conn.status === "connected" ? "已连接" :
                              conn.status === "connecting" ? "连接中..." :
                                conn.status === "error" ? "错误" : "未连接"}
                          </span>
                        </div>
                        <p style={{ fontSize: f.xs, color: textDim }}>
                          {meta.label} · {conn.host}:{conn.port} · {conn.database}
                          {conn.username && ` · ${conn.username}`}
                          {conn.lastConnected && ` · 上次: ${new Date(conn.lastConnected).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* 测试连接 */}
                        <button
                          onClick={() => db.testConnection(conn.id)}
                          disabled={db.testing === conn.id}
                          className="px-2 py-1.5 rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,180,255,0.12)] text-[rgba(0,212,255,0.5)] flex items-center gap-1 disabled:opacity-50"
                          style={{ fontSize: f.xs }}
                        >
                          {db.testing === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                          测试
                        </button>
                        {conn.status === "connected" ? (
                          <button onClick={() => db.disconnectDB(conn.id)}
                            className="px-3 py-1.5 rounded-lg bg-[rgba(255,60,60,0.08)] border border-[rgba(255,60,60,0.2)] text-[#ff6464] flex items-center gap-1.5"
                            style={{ fontSize: f.xs }}
                          >
                            <Unplug className="w-3 h-3" /> 断开
                          </button>
                        ) : (
                          <button onClick={() => db.connectDB(conn.id)} disabled={conn.status === "connecting"}
                            className="px-3 py-1.5 rounded-lg bg-[rgba(0,255,136,0.08)] border border-[rgba(0,255,136,0.2)] text-[#00ff88] flex items-center gap-1.5 disabled:opacity-50"
                            style={{ fontSize: f.xs }}
                          >
                            {conn.status === "connecting" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                            连接
                          </button>
                        )}
                        <button onClick={() => db.removeConnection(conn.id)}
                          className="p-1.5 rounded-lg hover:bg-[rgba(255,60,60,0.1)] text-[rgba(255,100,100,0.4)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  表浏览 Tab                                    */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "tables" && (
        <div className="space-y-2">
          {!db.activeConnection ? (
            <GlassCard className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-[rgba(255,170,0,0.4)]" />
              <p style={{ fontSize: f.md, color: textPrimary }}>请先连接数据库</p>
            </GlassCard>
          ) : db.tables.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Table2 className="w-8 h-8 mx-auto mb-3 text-[rgba(0,212,255,0.2)]" />
              <p style={{ fontSize: f.sm, color: textDim }}>暂无表数据</p>
            </GlassCard>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: f.xs, color: textDim }}>
                  {db.tables.length} 个表 · 总计 {db.stats.totalTableRows.toLocaleString()} 行 · {formatBytes(db.stats.totalTableSize)}
                </span>
              </div>
              {db.tables.map(table => (
                <GlassCard key={table.name} className="p-0 overflow-hidden">
                  <button
                    onClick={() => {
                      const isExpanding = expandedTable !== table.name;
                      setExpandedTable(isExpanding ? table.name : null);
                      db.setSelectedTable(isExpanding ? table : null);
                      if (isExpanding) db.loadTableData(table.name);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[rgba(0,40,80,0.2)] transition-all text-left group"
                  >
                    {expandedTable === table.name
                      ? <ChevronDown className="w-4 h-4 text-[#00d4ff] shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-[rgba(0,212,255,0.3)] shrink-0" />
                    }
                    <Table2 className="w-4 h-4 text-[#00d4ff] shrink-0" />
                    <span style={{ fontSize: f.sm, color: textPrimary }}>{table.name}</span>
                    <span style={{ fontSize: f.xs, color: textDim }}>
                      {table.rowCount.toLocaleString()} 行 · {table.columns.length} 列 · {formatBytes(table.sizeBytes)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        db.setSqlInput(`SELECT * FROM ${table.name} LIMIT 20;`);
                        setActiveTab("query");
                      }}
                      className="ml-auto px-2 py-1 rounded bg-[rgba(0,212,255,0.1)] text-[#00d4ff] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontSize: f.xs }}
                    >
                      查询
                    </button>
                  </button>

                  {expandedTable === table.name && (
                    <div className="px-4 pb-4 border-t border-[rgba(0,180,255,0.06)]">
                      {/* 列定义 */}
                      <p className="mt-3 mb-1" style={{ fontSize: f.xs, color: textDim }}>列定义</p>
                      <div className="overflow-x-auto">
                        <table className="w-full" style={{ fontSize: f.xs }}>
                          <thead>
                            <tr className="text-left">
                              <th className="py-1.5 px-2" style={{ color: textDim }}>列名</th>
                              <th className="py-1.5 px-2" style={{ color: textDim }}>类型</th>
                              <th className="py-1.5 px-2" style={{ color: textDim }}>可空</th>
                              <th className="py-1.5 px-2" style={{ color: textDim }}>主键</th>
                              <th className="py-1.5 px-2" style={{ color: textDim }}>默认值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.columns.map(col => (
                              <tr key={col.name} className="border-t border-[rgba(0,180,255,0.04)]">
                                <td className="py-1.5 px-2 text-[#e0f0ff] font-mono">{col.name}</td>
                                <td className="py-1.5 px-2 text-[#7b8cff] font-mono">{col.dataType}</td>
                                <td className="py-1.5 px-2">{col.nullable ? <span className="text-[#ffaa00]">YES</span> : <span style={{ color: textDim }}>NO</span>}</td>
                                <td className="py-1.5 px-2">{col.isPrimaryKey && <Key className="w-3 h-3 text-[#00ff88]" />}</td>
                                <td className="py-1.5 px-2 font-mono" style={{ color: textDim }}>{col.defaultValue || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 数据预览 */}
                      <div className="mt-3 flex items-center justify-between">
                        <p style={{ fontSize: f.xs, color: textDim }}>数据预览 (前 20 行)</p>
                        <button
                          onClick={() => db.loadTableData(table.name)}
                          className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.3)]"
                        >
                          <RefreshCcw className="w-3 h-3" />
                        </button>
                      </div>
                      {db.tableDataLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />
                        </div>
                      ) : db.tableData.length > 0 ? (
                        <InlineEditableTable
                          columns={Object.keys(db.tableData[0])}
                          rows={db.tableData}
                          tableName={table.name}
                          primaryKey={table.columns.find(c => c.isPrimaryKey)?.name || "id"}
                          editable={db.activeConnection?.status === "connected"}
                          onCellChange={(_change, sql) => {
                            db.setSqlInput(sql);
                          }}
                          onExecuteSQL={async (sql) => {
                            const result = await executeInlineSQL(sql);
                            // 提交成功后刷新表数据
                            if (result.ok) {
                              db.loadTableData(table.name);
                            }
                            return result;
                          }}
                          maxHeight="300px"
                        />
                      ) : (
                        <p className="mt-2" style={{ fontSize: f.xs, color: textDim }}>无数据</p>
                      )}
                    </div>
                  )}
                </GlassCard>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  查询控制台 Tab                                */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "query" && (
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: f.xs, color: textDim }}>
                  SQL 查询 · {db.activeConnection ? db.activeConnection.name : "未连接"}
                </span>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${showTemplates
                      ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff]"
                      : "bg-[rgba(0,212,255,0.04)] text-[rgba(0,212,255,0.4)] hover:bg-[rgba(0,212,255,0.08)]"
                    }`}
                  style={{ fontSize: f.xs }}
                >
                  <BookOpen className="w-3 h-3" />
                  模板
                </button>
              </div>
              <button
                onClick={() => db.executeQuery()}
                disabled={db.querying || !db.activeConnectionId}
                className="px-4 py-1.5 rounded-lg bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.25)] text-[#00ff88] flex items-center gap-1.5 disabled:opacity-40"
                style={{ fontSize: f.sm }}
              >
                {db.querying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                执行 (⌘+Enter)
              </button>
            </div>

            {/* SQL 模板面板 */}
            {showTemplates && (
              <div className="mb-3 p-3 rounded-lg bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.08)]">
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  {["all", "业务", "系统", "分析", "审计"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTemplateFilter(cat)}
                      className={`px-2 py-0.5 rounded ${templateFilter === cat
                          ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]"
                          : "text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]"
                        }`}
                      style={{ fontSize: f.xs }}
                    >
                      {cat === "all" ? "全部" : cat}
                    </button>
                  ))}
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                  {db.sqlTemplates
                    .filter(t => templateFilter === "all" || t.category === templateFilter)
                    .map(t => (
                      <button
                        key={t.id}
                        onClick={() => { db.executeTemplate(t); setShowTemplates(false); }}
                        className="px-2 py-1.5 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.06)] text-left hover:border-[rgba(0,212,255,0.2)] transition-all"
                      >
                        <span className="block truncate" style={{ fontSize: f.xs, color: textPrimary }}>{t.label}</span>
                        <span style={{ fontSize: "0.6rem", color: textDim }}>
                          {t.dbType === "all" ? "通用" : DB_TYPE_LABELS[t.dbType]?.label || t.dbType}
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}

            <SQLEditor
              value={db.sqlInput}
              onChange={(val) => db.setSqlInput(val)}
              onExecute={() => db.executeQuery()}
              height="140px"
              placeholder="SELECT * FROM core.models LIMIT 10;"
            />
          </GlassCard>

          {/* 查询结果 */}
          {db.queryResults.map(result => (
            <GlassCard key={result.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {result.error
                    ? <AlertTriangle className="w-3.5 h-3.5 text-[#ff6464]" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88]" />
                  }
                  <span style={{ fontSize: f.xs, color: textDim }}>
                    {result.rowCount} 行 · {result.executionTimeMs.toFixed(1)}ms
                    · {new Date(result.executedAt).toLocaleTimeString("zh-CN")}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(result.rows, null, 2))}
                  className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] text-[rgba(0,212,255,0.3)]"
                  title="复制 JSON"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mb-2 px-2 py-1 rounded bg-[rgba(0,10,20,0.4)] font-mono text-[#7b8cff] overflow-x-auto" style={{ fontSize: f.xs }}>
                {result.sql}
              </div>

              {result.error ? (
                <p className="text-[#ff6464]" style={{ fontSize: f.sm }}>{result.error}</p>
              ) : result.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full" style={{ fontSize: f.xs }}>
                    <thead className="sticky top-0 bg-[rgba(6,14,31,0.95)]">
                      <tr>
                        {result.columns.map(col => (
                          <th key={col} className="py-1.5 px-2 text-left border-b border-[rgba(0,180,255,0.08)] whitespace-nowrap" style={{ color: textDim }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-[rgba(0,180,255,0.03)] hover:bg-[rgba(0,40,80,0.15)]">
                          {result.columns.map(col => (
                            <td key={col} className="py-1.5 px-2 text-[#c0dcf0] font-mono whitespace-nowrap max-w-[200px] truncate">
                              {String(row[col] ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: f.xs, color: textDim }}>无结果</p>
              )}
            </GlassCard>
          ))}

          {db.queryResults.length === 0 && (
            <GlassCard className="p-8 text-center">
              <Play className="w-8 h-8 mx-auto mb-3 text-[rgba(0,212,255,0.15)]" />
              <p style={{ fontSize: f.sm, color: textDim }}>执行 SQL 查询查看结果</p>
            </GlassCard>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  查询历史 Tab                                  */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: f.xs, color: textDim }}>{db.queryHistory.length} 条查询记录 (IndexedDB 持久化)</span>
            {db.queryHistory.length > 0 && (
              <button
                onClick={db.clearQueryHistory}
                className="px-3 py-1 rounded-lg text-[rgba(255,100,100,0.5)] hover:bg-[rgba(255,60,60,0.1)]"
                style={{ fontSize: f.xs }}
              >
                清除历史
              </button>
            )}
          </div>

          {db.queryHistory.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <History className="w-8 h-8 mx-auto mb-3 text-[rgba(0,212,255,0.15)]" />
              <p style={{ fontSize: f.sm, color: textDim }}>执行查询后自动记录</p>
            </GlassCard>
          ) : (
            db.queryHistory.slice(0, 30).map(result => (
              <GlassCard key={result.id} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {result.error
                    ? <AlertTriangle className="w-3 h-3 text-[#ff6464] shrink-0" />
                    : <CheckCircle2 className="w-3 h-3 text-[#00ff88] shrink-0" />
                  }
                  <span style={{ fontSize: f.xs, color: textDim }}>
                    {result.rowCount} 行 · {result.executionTimeMs.toFixed(1)}ms · {new Date(result.executedAt).toLocaleString("zh-CN")}
                  </span>
                  <button
                    onClick={() => { db.replayQuery(result); setActiveTab("query"); }}
                    className="ml-auto px-2 py-0.5 rounded bg-[rgba(0,212,255,0.08)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)]"
                    style={{ fontSize: f.xs }}
                  >
                    重新执行
                  </button>
                </div>
                <pre className="px-2 py-1 rounded bg-[rgba(0,10,20,0.4)] font-mono text-[#7b8cff] overflow-x-auto whitespace-pre-wrap" style={{ fontSize: f.xs }}>
                  {result.sql}
                </pre>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  备份恢复 Tab                                  */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === "backups" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: f.xs, color: textDim }}>{db.backups.length} 个备份</span>
            {db.activeConnectionId && (
              <button
                onClick={() => db.createBackup(db.activeConnectionId!)}
                className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] flex items-center gap-1.5"
                style={{ fontSize: f.sm }}
              >
                <HardDrive className="w-3.5 h-3.5" /> 创建备份
              </button>
            )}
          </div>

          {db.backups.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <HardDrive className="w-8 h-8 mx-auto mb-3 text-[rgba(0,212,255,0.15)]" />
              <p style={{ fontSize: f.sm, color: textDim }}>暂无备份 · 连接数据库后可创建备份</p>
            </GlassCard>
          ) : (
            db.backups.map(backup => (
              <GlassCard key={backup.id} className="p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-[#00d4ff] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: f.sm, color: textPrimary }}>{backup.fileName}</p>
                    <p style={{ fontSize: f.xs, color: textDim }}>
                      {backup.connectionName} · {formatBytes(backup.sizeBytes)} · {new Date(backup.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full ${backup.status === "completed" ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]" :
                      backup.status === "in_progress" ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]" :
                        "bg-[rgba(255,60,60,0.1)] text-[#ff6464]"
                    }`} style={{ fontSize: f.xs }}>
                    {backup.status === "completed" ? "完成" : backup.status === "in_progress" ? "进行中" : "失败"}
                  </span>
                  <button
                    onClick={() => db.restoreBackup(backup.id)}
                    className="px-2 py-1 rounded bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                    style={{ fontSize: f.xs }}
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => db.deleteBackup(backup.id)}
                    className="p-1 rounded hover:bg-[rgba(255,60,60,0.1)] text-[rgba(255,100,100,0.4)]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
