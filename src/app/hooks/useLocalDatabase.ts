/**
 * useLocalDatabase.ts
 * ====================
 * 本地数据库管理 Hook
 *
 * 功能:
 *  - 自动检测本地数据库服务 (PostgreSQL / MySQL / Redis)
 *  - 连接管理 (CRUD, 测试连接, IndexedDB 持久化)
 *  - SQL 查询控制台 (含历史记录持久化)
 *  - 表浏览 & 数据预览
 *  - 备份 & 恢复
 *  - 快速 SQL 模板
 *
 * 后端 API 接口规范 (预留):
 *  POST /api/db/detect          → 自动扫描本地数据库端口
 *  POST /api/db/connect         → 建立连接
 *  POST /api/db/disconnect      → 断开连接
 *  POST /api/db/query           → 执行 SQL
 *  POST /api/db/tables          → 获取表列表
 *  POST /api/db/table/:name     → 获取表详情 + 数据
 *  POST /api/db/backup          → 创建备份
 *  POST /api/db/restore         → 恢复备份
 *  POST /api/db/test            → 测试连接
 *  POST /api/db/table-data      → 分页获取表数据
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { idbGetAll, idbPut, idbPutMany, idbDelete, idbClear } from "../lib/yyc3-storage";
import { getAPIConfig } from "../lib/api-config";
import type {
  DatabaseType,
  DBConnection,
  DBConnectionStatus,
  DBTable,
  DBColumn,
  QueryResult,
  DBBackup,
  SQLTemplate,
} from "../types";

// RF-011: Re-export 已移除

// ============================================================
//  后端 API 层 (预留)
// ============================================================

/**
 * 计算指数退避延迟 (ms)
 * 公式: min(baseDelay * 2^attempt, maxDelay) + jitter
 */
export function calcBackoffDelay(attempt: number, baseDelay = 500, maxDelay = 8000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * baseDelay * 0.5; // 0 ~ 50% jitter
  return Math.round(delay + jitter);
}

/**
 * 发送数据库 API 请求
 * - enableBackend=false 时直接跳过走 Mock
 * - enableBackend=true 时自动指数退避重试 (最多 maxRetries 次)
 */
async function dbAPI<T = unknown>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const config = getAPIConfig();

  // enableBackend === false 时直接跳过网络请求，走 Mock 路径
  if (!config.enableBackend) {
    return { ok: false, error: "后端 API 未启用 (enableBackend=false)" };
  }

  const maxAttempts = 1 + Math.max(0, config.maxRetries ?? 0); // 首次 + 重试
  let lastError = "";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 重试前等待 (首次请求不等待)
    if (attempt > 0) {
      const delay = calcBackoffDelay(attempt - 1);
      // 进度反馈 toast
      toast.info(`正在重试 ${attempt}/${config.maxRetries}...`, {
        description: `${endpoint} · ${Math.round(delay)}ms 后重试 · 上次错误: ${lastError}`,
        duration: Math.min(delay + 500, 4000),
      });
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const res = await fetch(`${config.dbBase}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { ok: true, data: await res.json() };
      }

      lastError = `HTTP ${res.status}`;

      // 4xx 客户端错误不重试
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, error: lastError };
      }
      // 5xx 继续重试
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = `请求超时 (${config.timeout}ms)`;
      } else {
        lastError = "后端服务未启动, 使用前端模拟模式";
      }
    }
  }

  return { ok: false, error: lastError };
}

// ============================================================
//  常量 & 模拟数据
// ============================================================

const DB_COLORS: Record<DatabaseType, string> = {
  postgresql: "#336791",
  mysql: "#4479A1",
  redis: "#DC382D",
};

const DEFAULT_PORTS: Record<DatabaseType, number> = {
  postgresql: 5432,
  mysql: 3306,
  redis: 6379,
};

export const SQL_TEMPLATES: SQLTemplate[] = [
  { id: "t1", label: "查看所有表", sql: "SELECT table_schema, table_name, pg_total_relation_size(quote_ident(table_schema)||'.'||quote_ident(table_name)) as size\nFROM information_schema.tables\nWHERE table_schema NOT IN ('pg_catalog','information_schema')\nORDER BY table_schema, table_name;", dbType: "postgresql", category: "系统" },
  { id: "t2", label: "表行数统计", sql: "SELECT schemaname, relname as table_name, n_live_tup as row_count\nFROM pg_stat_user_tables\nORDER BY n_live_tup DESC;", dbType: "postgresql", category: "系统" },
  { id: "t3", label: "模型列表", sql: "SELECT * FROM core.models ORDER BY avg_latency_ms ASC;", dbType: "all", category: "业务" },
  { id: "t4", label: "活跃Agent", sql: "SELECT * FROM core.agents WHERE is_active = true;", dbType: "all", category: "业务" },
  { id: "t5", label: "最近推理日志", sql: "SELECT * FROM telemetry.inference_logs\nORDER BY created_at DESC\nLIMIT 50;", dbType: "all", category: "业务" },
  { id: "t6", label: "推理延迟统计", sql: "SELECT model_id, \n  COUNT(*) as total,\n  AVG(latency_ms)::integer as avg_latency,\n  MAX(latency_ms) as max_latency,\n  MIN(latency_ms) as min_latency\nFROM telemetry.inference_logs\nWHERE created_at > NOW() - INTERVAL '24 hours'\nGROUP BY model_id;", dbType: "postgresql", category: "分析" },
  { id: "t7", label: "节点状态", sql: "SELECT * FROM infra.nodes ORDER BY hostname;", dbType: "all", category: "业务" },
  { id: "t8", label: "操作审计", sql: "SELECT * FROM audit.operations\nORDER BY created_at DESC\nLIMIT 30;", dbType: "all", category: "审计" },
  { id: "t9", label: "数据库大小", sql: "SELECT pg_database.datname,\n  pg_size_pretty(pg_database_size(pg_database.datname)) as size\nFROM pg_database\nORDER BY pg_database_size(pg_database.datname) DESC;", dbType: "postgresql", category: "系统" },
  { id: "t10", label: "Redis 键统计", sql: "INFO keyspace", dbType: "redis", category: "系统" },
];

// Mock 表结构
const MOCK_TABLES: DBTable[] = [
  {
    name: "core.models", schema: "core", rowCount: 5, sizeBytes: 32768,
    columns: [
      { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
      { name: "name", dataType: "varchar(128)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "provider", dataType: "varchar(64)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "tier", dataType: "varchar(16)", nullable: false, isPrimaryKey: false, defaultValue: "'secondary'" },
      { name: "avg_latency_ms", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "throughput", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "created_at", dataType: "timestamptz", nullable: false, isPrimaryKey: false, defaultValue: "now()" },
    ],
  },
  {
    name: "core.agents", schema: "core", rowCount: 5, sizeBytes: 16384,
    columns: [
      { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
      { name: "name", dataType: "varchar(64)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "name_cn", dataType: "varchar(64)", nullable: true, isPrimaryKey: false, defaultValue: null },
      { name: "role", dataType: "varchar(32)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "description", dataType: "text", nullable: true, isPrimaryKey: false, defaultValue: null },
      { name: "is_active", dataType: "boolean", nullable: false, isPrimaryKey: false, defaultValue: "true" },
    ],
  },
  {
    name: "telemetry.inference_logs", schema: "telemetry", rowCount: 128456, sizeBytes: 52428800,
    columns: [
      { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
      { name: "model_id", dataType: "uuid", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "agent_id", dataType: "uuid", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "latency_ms", dataType: "integer", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "tokens_in", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "tokens_out", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "status", dataType: "varchar(16)", nullable: false, isPrimaryKey: false, defaultValue: "'success'" },
      { name: "created_at", dataType: "timestamptz", nullable: false, isPrimaryKey: false, defaultValue: "now()" },
    ],
  },
  {
    name: "infra.nodes", schema: "infra", rowCount: 8, sizeBytes: 8192,
    columns: [
      { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
      { name: "hostname", dataType: "varchar(64)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "gpu_util", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "mem_util", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "temp_celsius", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "model_deployed", dataType: "varchar(64)", nullable: true, isPrimaryKey: false, defaultValue: null },
      { name: "active_tasks", dataType: "integer", nullable: true, isPrimaryKey: false, defaultValue: "0" },
      { name: "status", dataType: "varchar(16)", nullable: false, isPrimaryKey: false, defaultValue: "'active'" },
    ],
  },
  {
    name: "audit.operations", schema: "audit", rowCount: 3456, sizeBytes: 2097152,
    columns: [
      { name: "id", dataType: "uuid", nullable: false, isPrimaryKey: true, defaultValue: "gen_random_uuid()" },
      { name: "user_id", dataType: "uuid", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "action", dataType: "varchar(64)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "category", dataType: "varchar(32)", nullable: false, isPrimaryKey: false, defaultValue: null },
      { name: "detail", dataType: "jsonb", nullable: true, isPrimaryKey: false, defaultValue: null },
      { name: "created_at", dataType: "timestamptz", nullable: false, isPrimaryKey: false, defaultValue: "now()" },
    ],
  },
];

// Mock table data generator
function mockTableData(tableName: string, limit = 20): Record<string, unknown>[] {
  const table = MOCK_TABLES.find(t => t.name === tableName);
  if (!table) return [];

  if (tableName === "core.models") {
    return [
      { id: "m1", name: "LLaMA-70B", provider: "Meta", tier: "primary", avg_latency_ms: 45, throughput: 3200, created_at: "2025-12-01T00:00:00Z" },
      { id: "m2", name: "Qwen-72B", provider: "Alibaba", tier: "primary", avg_latency_ms: 42, throughput: 3500, created_at: "2025-11-15T00:00:00Z" },
      { id: "m3", name: "DeepSeek-V3", provider: "DeepSeek", tier: "primary", avg_latency_ms: 55, throughput: 2800, created_at: "2026-01-20T00:00:00Z" },
      { id: "m4", name: "GLM-4", provider: "Zhipu", tier: "secondary", avg_latency_ms: 38, throughput: 4100, created_at: "2025-10-08T00:00:00Z" },
      { id: "m5", name: "Mixtral-8x7B", provider: "Mistral", tier: "secondary", avg_latency_ms: 32, throughput: 4800, created_at: "2025-09-20T00:00:00Z" },
    ].slice(0, limit);
  }

  if (tableName === "core.agents") {
    return [
      { id: "a1", name: "orchestrator", name_cn: "编排器", role: "core", description: "任务调度与编排", is_active: true },
      { id: "a2", name: "retriever", name_cn: "检索器", role: "rag", description: "向量检索与文档召回", is_active: true },
      { id: "a3", name: "evaluator", name_cn: "评估器", role: "quality", description: "输出质量评估", is_active: true },
      { id: "a4", name: "router", name_cn: "路由器", role: "routing", description: "模型路由与负载均衡", is_active: true },
      { id: "a5", name: "monitor", name_cn: "监控器", role: "ops", description: "系统监控与告警", is_active: true },
    ].slice(0, limit);
  }

  if (tableName === "infra.nodes") {
    return [
      { id: "n1", hostname: "GPU-A100-01", gpu_util: 87, mem_util: 72, temp_celsius: 68, model_deployed: "LLaMA-70B", active_tasks: 128, status: "active" },
      { id: "n2", hostname: "GPU-A100-02", gpu_util: 92, mem_util: 85, temp_celsius: 74, model_deployed: "Qwen-72B", active_tasks: 156, status: "active" },
      { id: "n3", hostname: "GPU-A100-03", gpu_util: 98, mem_util: 94, temp_celsius: 82, model_deployed: "DeepSeek-V3", active_tasks: 89, status: "warning" },
      { id: "n4", hostname: "GPU-H100-01", gpu_util: 65, mem_util: 58, temp_celsius: 55, model_deployed: "GLM-4", active_tasks: 210, status: "active" },
      { id: "n5", hostname: "GPU-H100-02", gpu_util: 78, mem_util: 66, temp_celsius: 62, model_deployed: "Mixtral", active_tasks: 178, status: "active" },
    ].slice(0, limit);
  }

  // Generic mock
  return Array.from({ length: Math.min(limit, table.rowCount) }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const col of table.columns) {
      if (col.isPrimaryKey) row[col.name] = `row-${i + 1}`;
      else if (col.dataType.includes("varchar")) row[col.name] = `value_${i}`;
      else if (col.dataType === "integer") row[col.name] = Math.floor(Math.random() * 100);
      else if (col.dataType === "boolean") row[col.name] = Math.random() > 0.3;
      else if (col.dataType.includes("timestamp")) row[col.name] = new Date(Date.now() - i * 86400000).toISOString();
      else if (col.dataType === "jsonb") row[col.name] = JSON.stringify({ key: `val_${i}` });
      else row[col.name] = `data_${i}`;
    }
    return row;
  });
}

function mockQueryResult(sql: string): QueryResult {
  const trimmed = sql.trim().toLowerCase();
  const id = `qr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const executedAt = Date.now();

  // SELECT 查询模拟
  if (trimmed.startsWith("select")) {
    // 尝试匹配 FROM table_name
    const fromMatch = trimmed.match(/from\s+([a-zA-Z_.]+)/);
    const tableName = fromMatch?.[1] || "";
    const limitMatch = trimmed.match(/limit\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

    const matchedTable = MOCK_TABLES.find(t => t.name === tableName || tableName.includes(t.name.split(".")[1]));
    
    if (matchedTable) {
      const rows = mockTableData(matchedTable.name, limit);
      return {
        id, sql, columns: rows.length > 0 ? Object.keys(rows[0]) : matchedTable.columns.map(c => c.name),
        rows, rowCount: rows.length,
        executionTimeMs: 8 + Math.random() * 45, executedAt,
      };
    }

    // Count query
    if (trimmed.includes("count(")) {
      return {
        id, sql, columns: ["count"], rows: [{ count: 128456 }],
        rowCount: 1, executionTimeMs: 12 + Math.random() * 20, executedAt,
      };
    }

    // Generic
    const rows = Array.from({ length: Math.min(limit, 5 + Math.floor(Math.random() * 10)) }, (_, i) => ({
      id: `row-${i + 1}`,
      name: ["LLaMA-70B", "Qwen-72B", "DeepSeek-V3", "GLM-4", "Mixtral"][i % 5],
      status: ["active", "active", "warning", "active", "inactive"][i % 5],
      latency_ms: Math.floor(20 + Math.random() * 80),
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    return { id, sql, columns: Object.keys(rows[0]), rows, rowCount: rows.length, executionTimeMs: 8 + Math.random() * 45, executedAt };
  }

  // INSERT / UPDATE / DELETE
  if (trimmed.startsWith("insert") || trimmed.startsWith("update") || trimmed.startsWith("delete")) {
    const affected = Math.floor(1 + Math.random() * 5);
    return { id, sql, columns: ["affected_rows"], rows: [{ affected_rows: affected }], rowCount: 1, executionTimeMs: 5 + Math.random() * 15, executedAt };
  }

  // 错误模拟
  if (trimmed.includes("error") || trimmed.includes("syntax error")) {
    return { id, sql, columns: [], rows: [], rowCount: 0, executionTimeMs: 1, executedAt, error: "ERROR: syntax error at or near \"error\"" };
  }

  return { id, sql, columns: ["result"], rows: [{ result: "OK" }], rowCount: 1, executionTimeMs: 2 + Math.random() * 10, executedAt };
}

// ============================================================
//  Password encoding (simple obfuscation, NOT real encryption)
// ============================================================

function encodePassword(pw: string): string {
  if (!pw) return "";
  try { return btoa(pw); } catch { return pw; }
}

function decodePassword(encoded: string): string {
  if (!encoded) return "";
  try { return atob(encoded); } catch { return encoded; }
}

// ============================================================
//  Hook
// ============================================================

export function useLocalDatabase() {
  const [connections, setConnections] = useState<DBConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [tables, setTables] = useState<DBTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [sqlInput, setSqlInput] = useState("SELECT * FROM core.models LIMIT 10;");
  const [backups, setBackups] = useState<DBBackup[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // ── IndexedDB 持久化: 加载 ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 加载连接 (解码密码)
    idbGetAll<DBConnection>("dbConnections").then((saved) => {
      if (saved.length > 0) {
        setConnections(saved.map(c => ({
          ...c,
          password: decodePassword(c.password),
          status: "disconnected" as DBConnectionStatus, // 重启后重置状态
        })));
      }
    });

    // 加载查询历史
    idbGetAll<QueryResult & { id: string }>("queryHistory").then((saved) => {
      if (saved.length > 0) {
        setQueryHistory(saved.sort((a, b) => b.executedAt - a.executedAt).slice(0, 100));
      }
    });
  }, []);

  // ── 持久化连接到 IndexedDB ──
  const persistConnection = useCallback(async (conn: DBConnection) => {
    await idbPut("dbConnections", {
      ...conn,
      password: encodePassword(conn.password),
      status: "disconnected", // 不持久化运行时状态
    });
  }, []);

  const persistAllConnections = useCallback(async (conns: DBConnection[]) => {
    await idbClear("dbConnections");
    await idbPutMany("dbConnections", conns.map(c => ({
      ...c,
      password: encodePassword(c.password),
      status: "disconnected" as DBConnectionStatus,
    })));
  }, []);

  // ── 自动检测本地数据库 ──
  const detectDatabases = useCallback(async () => {
    setDetecting(true);
    toast.info("正在扫描本地数据库服务...");

    // 尝试真实 API
    const res = await dbAPI<{ detected: { type: DatabaseType; port: number; reachable: boolean }[] }>("detect");
    if (res.ok && res.data) {
      const detected = res.data.detected.filter(d => d.reachable);
      const newConns: DBConnection[] = detected.map(d => ({
        id: `db-${d.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `Local ${d.type.charAt(0).toUpperCase() + d.type.slice(1)}`,
        type: d.type,
        host: "127.0.0.1",
        port: d.port,
        database: d.type === "postgresql" ? "yyc3_matrix" : d.type === "redis" ? "0" : "yyc3",
        username: d.type === "redis" ? "" : "postgres",
        password: "",
        status: "disconnected",
        lastConnected: null,
        createdAt: Date.now(),
        color: DB_COLORS[d.type],
      }));
      setConnections(prev => {
        const all = [...prev, ...newConns];
        persistAllConnections(all);
        return all;
      });
      toast.success(`检测到 ${detected.length} 个数据库服务`);
      setDetecting(false);
      return;
    }

    // Mock: 模拟检测
    await new Promise(r => setTimeout(r, 2000));

    const mockDetected: DBConnection[] = [
      {
        id: `db-pg-${Date.now()}`, name: "YYC³ PostgreSQL", type: "postgresql",
        host: "127.0.0.1", port: 5432, database: "yyc3_matrix", username: "postgres", password: "",
        status: "disconnected", lastConnected: null, createdAt: Date.now(), color: DB_COLORS.postgresql,
      },
      {
        id: `db-redis-${Date.now() + 1}`, name: "YYC³ Redis Cache", type: "redis",
        host: "127.0.0.1", port: 6379, database: "0", username: "", password: "",
        status: "disconnected", lastConnected: null, createdAt: Date.now(), color: DB_COLORS.redis,
      },
    ];

    setConnections(prev => {
      const existing = new Set(prev.map(c => `${c.type}:${c.host}:${c.port}`));
      const newOnes = mockDetected.filter(d => !existing.has(`${d.type}:${d.host}:${d.port}`));
      const updated = [...prev, ...newOnes];
      persistAllConnections(updated);
      return updated;
    });

    toast.success(`检测到 ${mockDetected.length} 个本地数据库`);
    setDetecting(false);
  }, [persistAllConnections]);

  // ── 测试连接 ──
  const testConnection = useCallback(async (id: string) => {
    const conn = connections.find(c => c.id === id);
    if (!conn) return false;

    setTesting(id);

    // 尝试真实 API
    const res = await dbAPI<{ latency: number }>("test", {
      type: conn.type, host: conn.host, port: conn.port,
      database: conn.database, username: conn.username, password: conn.password,
    });

    if (res.ok) {
      toast.success(`连接测试成功: ${res.data?.latency}ms`);
      setTesting(null);
      return true;
    }

    // Mock
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    const success = Math.random() > 0.15;

    if (success) {
      toast.success(`连接测试成功: ${Math.floor(5 + Math.random() * 20)}ms (模拟)`);
    } else {
      toast.error(`连接测试失败: 连接被拒绝 (${conn.host}:${conn.port})`);
    }

    setTesting(null);
    return success;
  }, [connections]);

  // ── ��加连接 ──
  const addConnection = useCallback((conn: Omit<DBConnection, "id" | "status" | "lastConnected" | "createdAt" | "color">) => {
    const newConn: DBConnection = {
      ...conn,
      id: `db-${conn.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: "disconnected",
      lastConnected: null,
      createdAt: Date.now(),
      color: DB_COLORS[conn.type] || "#00d4ff",
    };
    setConnections(prev => [...prev, newConn]);
    persistConnection(newConn);
    toast.success(`连接已添加: ${conn.name}`);
    return newConn;
  }, [persistConnection]);

  // ── 更新连接配置 ──
  const updateConnection = useCallback((id: string, updates: Partial<DBConnection>) => {
    setConnections(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      const conn = updated.find(c => c.id === id);
      if (conn) persistConnection(conn);
      return updated;
    });
  }, [persistConnection]);

  // ── 删除连接 ──
  const removeConnection = useCallback(async (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    await idbDelete("dbConnections", id);
    if (activeConnectionId === id) {
      setActiveConnectionId(null);
      setTables([]);
      setSelectedTable(null);
      setTableData([]);
    }
    toast.success("连接已删除");
  }, [activeConnectionId]);

  // ── 连接数据库 ──
  const connectDB = useCallback(async (id: string) => {
    setConnections(prev =>
      prev.map(c => c.id === id ? { ...c, status: "connecting" as DBConnectionStatus } : c)
    );

    const conn = connections.find(c => c.id === id);
    if (!conn) return;

    // 尝试真实 API
    const res = await dbAPI("connect", {
      type: conn.type, host: conn.host, port: conn.port,
      database: conn.database, username: conn.username, password: conn.password,
    });

    if (res.ok) {
      setConnections(prev =>
        prev.map(c => c.id === id ? { ...c, status: "connected", lastConnected: Date.now() } : c)
      );
      setActiveConnectionId(id);
      const tablesRes = await dbAPI<DBTable[]>("tables", { connectionId: id });
      if (tablesRes.ok && tablesRes.data) {
        setTables(tablesRes.data);
      }
      persistConnection({ ...conn, lastConnected: Date.now() });
      toast.success(`已连接: ${conn.name}`);
      return;
    }

    // Mock 模拟
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    setConnections(prev => {
      const updated = prev.map(c =>
        c.id === id ? { ...c, status: "connected" as DBConnectionStatus, lastConnected: Date.now() } : c
      );
      return updated;
    });
    setActiveConnectionId(id);
    setTables(MOCK_TABLES);
    persistConnection({ ...conn, lastConnected: Date.now() });
    toast.success(`已连接: ${conn.name} (模拟模式)`);
  }, [connections, persistConnection]);

  // ── 断开连接 ──
  const disconnectDB = useCallback(async (id: string) => {
    await dbAPI("disconnect", { connectionId: id });
    setConnections(prev =>
      prev.map(c => c.id === id ? { ...c, status: "disconnected" as DBConnectionStatus } : c)
    );
    if (activeConnectionId === id) {
      setActiveConnectionId(null);
      setTables([]);
      setSelectedTable(null);
      setTableData([]);
    }
    toast.info("已断开连接");
  }, [activeConnectionId]);

  // ── 加载表数据 ──
  const loadTableData = useCallback(async (tableName: string, limit = 20) => {
    if (!activeConnectionId) return;
    setTableDataLoading(true);

    // 尝试真实 API
    const res = await dbAPI<Record<string, unknown>[]>("table-data", {
      connectionId: activeConnectionId,
      tableName,
      limit,
    });

    if (res.ok && res.data) {
      setTableData(res.data);
      setTableDataLoading(false);
      return;
    }

    // Mock
    await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
    setTableData(mockTableData(tableName, limit));
    setTableDataLoading(false);
  }, [activeConnectionId]);

  // ── 执行查询 ──
  const executeQuery = useCallback(async (sql?: string) => {
    const query = sql ?? sqlInput;
    if (!query.trim()) return;
    if (!activeConnectionId) {
      toast.error("请先连接数据库");
      return;
    }

    setQuerying(true);

    // 尝试真实 API
    const res = await dbAPI<QueryResult>("query", {
      connectionId: activeConnectionId,
      sql: query,
    });

    let result: QueryResult;

    if (res.ok && res.data) {
      result = res.data;
    } else {
      // Mock
      await new Promise(r => setTimeout(r, 200 + Math.random() * 500));
      result = mockQueryResult(query);
    }

    setQueryResults(prev => [result, ...prev].slice(0, 50));
    setQuerying(false);

    // 持久化查询历史
    const historyItem = { ...result, id: result.id || `qh-${Date.now()}` };
    setQueryHistory(prev => [historyItem, ...prev].slice(0, 100));
    idbPut("queryHistory", historyItem);

    if (result.error) {
      toast.error(`查询错误: ${result.error}`);
    } else {
      toast.success(`查询完成: ${result.rowCount} 行, ${result.executionTimeMs.toFixed(1)}ms`);
    }

    return result;
  }, [sqlInput, activeConnectionId]);

  // ── 从模板执行 ──
  const executeTemplate = useCallback((template: SQLTemplate) => {
    setSqlInput(template.sql);
    // 不自动执行，让用户确认
    toast.info(`已加载模板: ${template.label}`);
  }, []);

  // ── 从历史重新执行 ──
  const replayQuery = useCallback((result: QueryResult) => {
    setSqlInput(result.sql);
    toast.info("已加载历史查询");
  }, []);

  // ── 清除查询历史 ──
  const clearQueryHistory = useCallback(async () => {
    setQueryHistory([]);
    setQueryResults([]);
    await idbClear("queryHistory");
    toast.success("查询历史已清除");
  }, []);

  // ── 创建备份 ──
  const createBackup = useCallback(async (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;

    toast.info(`正在备份 ${conn.name}...`);

    const res = await dbAPI<DBBackup>("backup", { connectionId });
    if (res.ok && res.data) {
      setBackups(prev => [res.data!, ...prev]);
      toast.success("备份完成");
      return;
    }

    // Mock
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 1500));
    const backup: DBBackup = {
      id: `bk-${Date.now()}`,
      connectionId,
      connectionName: conn.name,
      type: conn.type,
      fileName: `yyc3_${conn.type}_${new Date().toISOString().slice(0, 10)}.sql`,
      sizeBytes: Math.floor(1024 * 1024 * (5 + Math.random() * 20)),
      createdAt: Date.now(),
      status: "completed",
    };
    setBackups(prev => [backup, ...prev]);
    toast.success(`备份完成: ${backup.fileName}`);
  }, [connections]);

  // ── 恢复备份 ──
  const restoreBackup = useCallback(async (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    toast.info(`正在恢复 ${backup.fileName}...`);

    const res = await dbAPI("restore", { backupId });
    if (res.ok) {
      toast.success("恢复完成");
      return;
    }

    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    toast.success(`恢复完成: ${backup.fileName} (模拟)`);
  }, [backups]);

  // ── 删除备份 ──
  const deleteBackup = useCallback((backupId: string) => {
    setBackups(prev => prev.filter(b => b.id !== backupId));
    toast.success("备份已删除");
  }, []);

  // 活跃连接
  const activeConnection = connections.find(c => c.id === activeConnectionId) ?? null;

  // 统计
  const stats = {
    totalConnections: connections.length,
    connectedCount: connections.filter(c => c.status === "connected").length,
    totalTables: tables.length,
    totalBackups: backups.length,
    queryCount: queryHistory.length,
    totalTableRows: tables.reduce((acc, t) => acc + t.rowCount, 0),
    totalTableSize: tables.reduce((acc, t) => acc + t.sizeBytes, 0),
  };

  return {
    // 连接管理
    connections,
    activeConnection,
    activeConnectionId,
    setActiveConnectionId,
    addConnection,
    removeConnection,
    updateConnection,
    connectDB,
    disconnectDB,
    testConnection,
    testing,
    detectDatabases,
    detecting,
    // 表浏览
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    tableDataLoading,
    loadTableData,
    // 查询控制台
    sqlInput,
    setSqlInput,
    queryResults,
    queryHistory,
    executeQuery,
    executeTemplate,
    replayQuery,
    clearQueryHistory,
    querying,
    // 备份恢复
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    // 统计 & 工具
    stats,
    sqlTemplates: SQL_TEMPLATES,
    DEFAULT_PORTS,
  };
}