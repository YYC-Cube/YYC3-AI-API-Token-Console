/**
 * useLocalDatabase.test.ts
 * =========================
 * useLocalDatabase Hook 测试
 *
 * 覆盖范围:
 *  - 初始状态
 *  - 连接 CRUD
 *  - SQL 模板
 *  - 查询执行 (Mock 模式)
 *  - enableBackend 开关对 dbAPI 的影响
 *  - 统计计算
 *  - 备份管理
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mock 函数 (定义在 vi.mock 之前) ──
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockGetAPIConfig, DEFAULT_API_CONFIG } = vi.hoisted(() => {
  const DEFAULT_API_CONFIG = {
    enableBackend: false,
    timeout: 15000,
    maxRetries: 2,
    dbBase: "/api/db",
    fsBase: "/api/fs",
    wsEndpoint: "ws://localhost:3113/ws",
    aiBase: "https://api.openai.com/v1",
    clusterBase: "/api/cluster",
  };
  return {
    DEFAULT_API_CONFIG,
    mockGetAPIConfig: vi.fn(() => ({ ...DEFAULT_API_CONFIG })),
  };
});

// ── Mock 依赖 ──
vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("../lib/yyc3-storage", () => ({
  idbGetAll: vi.fn().mockResolvedValue([]),
  idbPut: vi.fn().mockResolvedValue(undefined),
  idbPutMany: vi.fn().mockResolvedValue(undefined),
  idbDelete: vi.fn().mockResolvedValue(undefined),
  idbClear: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/api-config", () => ({
  getAPIConfig: mockGetAPIConfig,
}));

import { idbGetAll, idbPut } from "../lib/yyc3-storage";
import { useLocalDatabase, SQL_TEMPLATES, calcBackoffDelay } from "../hooks/useLocalDatabase";

describe("useLocalDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 enableBackend = false (Mock 模式)
    mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG });
  });

  // ──────────────────────────────────────
  //  初始状态
  // ──────────────────────────────────────

  describe("初始状态", () => {
    it("connections 初始为空数组", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.connections).toEqual([]);
    });

    it("activeConnection 初始为 null", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.activeConnection).toBeNull();
    });

    it("tables 初始为空", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.tables).toEqual([]);
    });

    it("初始 sqlInput 有默认值", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.sqlInput).toContain("SELECT");
    });

    it("querying 初始为 false", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.querying).toBe(false);
    });

    it("detecting 初始为 false", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.detecting).toBe(false);
    });
  });

  // ──────────────────────────────────────
  //  SQL 模板
  // ──────────────────────────────────────

  describe("SQL 模板", () => {
    it("提供 10 个预置模板", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.sqlTemplates.length).toBe(10);
    });

    it("每个模板都有 id/label/sql/category", () => {
      for (const t of SQL_TEMPLATES) {
        expect(t.id).toBeTruthy();
        expect(t.label).toBeTruthy();
        expect(t.sql).toBeTruthy();
        expect(t.category).toBeTruthy();
      }
    });

    it("执行模板只设置 sqlInput 不执行查询", () => {
      const { result } = renderHook(() => useLocalDatabase());
      const template = SQL_TEMPLATES[0];

      act(() => {
        result.current.executeTemplate(template);
      });

      expect(result.current.sqlInput).toBe(template.sql);
      expect(mockToast.info).toHaveBeenCalledWith(`已加载模板: ${template.label}`);
    });
  });

  // ──────────────────────────────────────
  //  连接管理
  // ──────────────────────────────────────

  describe("连接管理", () => {
    it("addConnection 添加新连接", () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({
          name: "Test PG",
          type: "postgresql",
          host: "127.0.0.1",
          port: 5432,
          database: "test_db",
          username: "admin",
          password: "secret",
        });
      });

      expect(result.current.connections.length).toBe(1);
      expect(result.current.connections[0].name).toBe("Test PG");
      expect(result.current.connections[0].type).toBe("postgresql");
      expect(result.current.connections[0].status).toBe("disconnected");
      expect(mockToast.success).toHaveBeenCalledWith("连接已添加: Test PG");
    });

    it("removeConnection 删除连接", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({
          name: "To Delete",
          type: "mysql",
          host: "127.0.0.1",
          port: 3306,
          database: "test",
          username: "root",
          password: "",
        });
      });

      const id = result.current.connections[0].id;

      await act(async () => {
        await result.current.removeConnection(id);
      });

      expect(result.current.connections.length).toBe(0);
    });

    it("updateConnection 更新连接字段", () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({
          name: "Original",
          type: "postgresql",
          host: "127.0.0.1",
          port: 5432,
          database: "test",
          username: "postgres",
          password: "",
        });
      });

      const id = result.current.connections[0].id;

      act(() => {
        result.current.updateConnection(id, { name: "Updated Name", port: 5433 });
      });

      const updated = result.current.connections.find(c => c.id === id);
      expect(updated?.name).toBe("Updated Name");
      expect(updated?.port).toBe(5433);
    });

    it("添加多种类型的连接", () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({
          name: "PG", type: "postgresql",
          host: "127.0.0.1", port: 5432, database: "test", username: "pg", password: "",
        });
        result.current.addConnection({
          name: "MySQL", type: "mysql",
          host: "127.0.0.1", port: 3306, database: "test", username: "root", password: "",
        });
        result.current.addConnection({
          name: "Redis", type: "redis",
          host: "127.0.0.1", port: 6379, database: "0", username: "", password: "",
        });
      });

      expect(result.current.connections.length).toBe(3);
      expect(result.current.connections.map(c => c.type)).toEqual(["postgresql", "mysql", "redis"]);
    });
  });

  // ──────────────────────────────────────
  //  统计信息
  // ──────────────────────────────────────

  describe("统计信息", () => {
    it("初始统计全为零", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.stats.totalConnections).toBe(0);
      expect(result.current.stats.connectedCount).toBe(0);
      expect(result.current.stats.totalTables).toBe(0);
      expect(result.current.stats.queryCount).toBe(0);
    });

    it("添加连接后更新统计", () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({
          name: "PG", type: "postgresql",
          host: "127.0.0.1", port: 5432, database: "test", username: "postgres", password: "",
        });
      });

      expect(result.current.stats.totalConnections).toBe(1);
      expect(result.current.stats.connectedCount).toBe(0); // 未连接
    });
  });

  // ──────────────────────────────────────
  //  setSqlInput
  // ──────────────────────────────────────

  describe("setSqlInput", () => {
    it("更新 SQL 输入内容", () => {
      const { result } = renderHook(() => useLocalDatabase());
      act(() => {
        result.current.setSqlInput("SELECT 1;");
      });
      expect(result.current.sqlInput).toBe("SELECT 1;");
    });
  });

  // ──────────────────────────────────────
  //  指数退避
  // ──────────────────────────────────────

  describe("calcBackoffDelay", () => {
    it("attempt=0 返回 baseDelay 附近的值", () => {
      const delay = calcBackoffDelay(0, 500, 8000);
      // 500 * 2^0 = 500, + jitter (0~250)
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(750);
    });

    it("attempt=1 返回约 1000ms 附近", () => {
      const delay = calcBackoffDelay(1, 500, 8000);
      // 500 * 2^1 = 1000, + jitter (0~250)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1250);
    });

    it("attempt=2 返回约 2000ms 附近", () => {
      const delay = calcBackoffDelay(2, 500, 8000);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(2250);
    });

    it("不超过 maxDelay", () => {
      const delay = calcBackoffDelay(10, 500, 8000);
      // 500 * 2^10 = 512000, 但被限制为 8000 + jitter
      expect(delay).toBeLessThanOrEqual(8250);
    });

    it("自定义 baseDelay 和 maxDelay", () => {
      const delay = calcBackoffDelay(0, 100, 1000);
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(150);
    });
  });

  // ──────────────────────────────────────
  //  enableBackend 开关
  // ──────────────────────────────────────

  describe("enableBackend 开关", () => {
    it("enableBackend=false 时不发起真实网络请求", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: false });

      const { result } = renderHook(() => useLocalDatabase());

      // 添加连接
      act(() => {
        result.current.addConnection({
          name: "No Backend", type: "postgresql",
          host: "127.0.0.1", port: 5432, database: "test", username: "postgres", password: "",
        });
      });

      // 尝试检测 — enableBackend=false 时应跳过 fetch
      await act(async () => {
        await result.current.detectDatabases();
      });

      // fetch 不应被调用 (因为 enableBackend=false 直接 short-circuit)
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("enableBackend=true 时尝试发起 fetch 请求", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });

      // enableBackend=true 时应尝试 fetch
      expect(fetchSpy).toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("enableBackend=true 但后端不可达时回退 Mock", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });

      // 应回退到 Mock 模式并检测到模拟数据库
      expect(mockToast.success).toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("enableBackend=true + maxRetries=0 时只请求一次", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
      mockGetAPIConfig.mockReturnValue({
        ...DEFAULT_API_CONFIG,
        enableBackend: true,
        maxRetries: 0,
      });

      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });

      // maxRetries=0: 仅首次请求 (1 次 fetch for detect endpoint)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });

    it("enableBackend=true + maxRetries=2 且持续失败时最多重试 3 次", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
      mockGetAPIConfig.mockReturnValue({
        ...DEFAULT_API_CONFIG,
        enableBackend: true,
        maxRetries: 2,
        timeout: 100, // 短超时加快测试
      });

      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });

      // 1 首次 + 2 重试 = 3 次 fetch
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      // 重试时应触发进度反馈 toast (2 次)
      const infoCalls = mockToast.info.mock.calls.map((c: unknown[]) => String(c[0]));
      const retryCalls = infoCalls.filter((msg: string) => msg.includes("正在重试"));
      expect(retryCalls.length).toBe(2);
      expect(retryCalls[0]).toContain("1/2");
      expect(retryCalls[1]).toContain("2/2");
      fetchSpy.mockRestore();
    });

    it("enableBackend=true + 4xx 错误不重试", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: "not found" }), { status: 404 })
      );
      mockGetAPIConfig.mockReturnValue({
        ...DEFAULT_API_CONFIG,
        enableBackend: true,
        maxRetries: 3,
      });

      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });

      // 4xx 应该只请求 1 次, 不重试
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  备份管理
  // ──────────────────────────────────────

  describe("备份管理", () => {
    it("deleteBackup 删除指定备份", () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.deleteBackup("non-existent");
      });

      expect(mockToast.success).toHaveBeenCalledWith("备份已删除");
    });
  });

  // ──────────────────────────────────────
  //  DEFAULT_PORTS
  // ──────────────────────────────────────

  describe("DEFAULT_PORTS", () => {
    it("包含 postgresql/mysql/redis 默认端口", () => {
      const { result } = renderHook(() => useLocalDatabase());
      expect(result.current.DEFAULT_PORTS.postgresql).toBe(5432);
      expect(result.current.DEFAULT_PORTS.mysql).toBe(3306);
      expect(result.current.DEFAULT_PORTS.redis).toBe(6379);
    });
  });

  // ──────────────────────────────────────
  //  replayQuery
  // ──────────────────────────────────────

  describe("replayQuery", () => {
    it("加载历史查询到 sqlInput", () => {
      const { result } = renderHook(() => useLocalDatabase());
      const mockResult = {
        id: "qr-1",
        sql: "SELECT * FROM test;",
        columns: ["id"],
        rows: [],
        rowCount: 0,
        executionTimeMs: 10,
        executedAt: Date.now(),
      };

      act(() => {
        result.current.replayQuery(mockResult);
      });

      expect(result.current.sqlInput).toBe("SELECT * FROM test;");
      expect(mockToast.info).toHaveBeenCalledWith("已加载历史查询");
    });
  });

  // ──────────────────────────────────────
  //  clearQueryHistory
  // ──────────────────────────────────────

  describe("clearQueryHistory", () => {
    it("清除查询历史和结果", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.clearQueryHistory();
      });

      expect(result.current.queryHistory).toEqual([]);
      expect(result.current.queryResults).toEqual([]);
      expect(mockToast.success).toHaveBeenCalledWith("查询历史已清除");
    });
  });

  // ──────────────────────────────────────
  //  查询执行 (Mock 模式)
  // ──────────────────────────────────────

  describe("查询执行", () => {
    it("未连接时提示错误", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.executeQuery("SELECT 1;");
      });

      expect(mockToast.error).toHaveBeenCalledWith("请先连接数据库");
    });

    it("空 SQL 不执行", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.executeQuery("  ");
      });

      // 不应有任何 toast（因为空查询直接 return）
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
//  覆盖率补测 (第三批 P2) — 错误重试/降级/后端成功/CRUD 全路径
// ============================================================

describe("useLocalDatabase 覆盖率补测", () => {
  const idbGetAllMock = idbGetAll as unknown as ReturnType<typeof vi.fn>;
  const idbPutMock = idbPut as unknown as ReturnType<typeof vi.fn>;

  const PG_CONN = {
    name: "Test PG",
    type: "postgresql" as const,
    host: "127.0.0.1",
    port: 5432,
    database: "test_db",
    username: "postgres",
    password: "secret",
  };

  /** 构造 dbAPI fetch 成功响应 (免 Response 全局依赖) */
  function jsonRes(data: unknown, status = 200): Response {
    return { ok: status >= 200 && status < 300, status, json: async () => data } as unknown as Response;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG });
    idbGetAllMock.mockReset().mockResolvedValue([]);
  });

  /** 添加 PG 连接并返回其 id */
  function addPG(result: { current: ReturnType<typeof useLocalDatabase> }): string {
    act(() => {
      result.current.addConnection(PG_CONN);
    });
    return result.current.connections[0].id;
  }

  /** 冲刷挂载 effect 中的 idbGetAll 微任务 */
  async function flushMount() {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  // ──────────────────────────────────────
  //  IndexedDB 持久化加载
  // ──────────────────────────────────────

  describe("IndexedDB 加载", () => {
    it("挂载时加载已存连接: 解码密码 + 状态重置为 disconnected", async () => {
      idbGetAllMock.mockImplementation(async (store: string) => {
        if (store === "dbConnections") {
          return [
            { ...PG_CONN, id: "c1", status: "connected", lastConnected: 123, createdAt: 1, color: "#fff", password: btoa("secret") },
            { ...PG_CONN, name: "Broken", id: "c2", status: "connected", lastConnected: 123, createdAt: 2, color: "#fff", password: "not-base64!!!" },
          ];
        }
        return [];
      });

      const { result } = renderHook(() => useLocalDatabase());
      await flushMount();

      expect(result.current.connections.length).toBe(2);
      expect(result.current.connections[0].password).toBe("secret");
      expect(result.current.connections[0].status).toBe("disconnected");
      // atob 解码失败 → 原样返回
      expect(result.current.connections[1].password).toBe("not-base64!!!");
    });

    it("挂载时加载查询历史并按 executedAt 倒序", async () => {
      const mk = (id: string, at: number) => ({ id, sql: `SELECT ${id};`, columns: [], rows: [], rowCount: 0, executionTimeMs: 1, executedAt: at });
      idbGetAllMock.mockImplementation(async (store: string) => {
        if (store === "queryHistory") return [mk("h1", 3000), mk("h2", 1000), mk("h3", 2000)];
        return [];
      });

      const { result } = renderHook(() => useLocalDatabase());
      await flushMount();

      expect(result.current.queryHistory.map((h) => h.id)).toEqual(["h1", "h3", "h2"]);
    });
  });

  // ──────────────────────────────────────
  //  detectDatabases 分支
  // ──────────────────────────────────────

  describe("detectDatabases 补测", () => {
    it("后端成功: 过滤不可达服务并按类型生成连接", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes({
        detected: [
          { type: "postgresql", port: 5432, reachable: true },
          { type: "mysql", port: 3306, reachable: false },
          { type: "redis", port: 6379, reachable: true },
        ],
      }));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());
      await act(async () => {
        await result.current.detectDatabases();
      });

      expect(result.current.connections.length).toBe(2); // mysql 不可达被过滤
      const pg = result.current.connections.find((c) => c.type === "postgresql");
      const redis = result.current.connections.find((c) => c.type === "redis");
      expect(pg?.name).toBe("Local Postgresql");
      expect(pg?.database).toBe("yyc3_matrix");
      expect(pg?.username).toBe("postgres");
      expect(pg?.color).toBe("#336791");
      expect(redis?.database).toBe("0");
      expect(redis?.username).toBe("");
      expect(redis?.color).toBe("#DC382D");
      expect(mockToast.success).toHaveBeenCalledWith("检测到 2 个数据库服务");
      expect(result.current.detecting).toBe(false);
      fetchSpy.mockRestore();
    });

    it("Mock 检测: 追加 PG/Redis 且重复检测去重", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.detectDatabases();
      });
      expect(result.current.connections.length).toBe(2);
      expect(result.current.connections.map((c) => c.name)).toContain("YYC³ PostgreSQL");
      expect(result.current.connections.map((c) => c.name)).toContain("YYC³ Redis Cache");

      await act(async () => {
        await result.current.detectDatabases();
      });
      // type:host:port 已存在 → 不重复添加
      expect(result.current.connections.length).toBe(2);
      expect(mockToast.success).toHaveBeenCalledWith("检测到 2 个本地数据库");
    });

    it("请求超时 (AbortError) 回退 Mock 检测", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("aborted", "AbortError"));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true, maxRetries: 0 });

      const { result } = renderHook(() => useLocalDatabase());
      await act(async () => {
        await result.current.detectDatabases();
      });

      expect(result.current.connections.length).toBe(2);
      fetchSpy.mockRestore();
    });

    it("5xx 持续失败按 maxRetries 重试后回退 Mock", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes({}, 500));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true, maxRetries: 1 });

      const { result } = renderHook(() => useLocalDatabase());
      await act(async () => {
        await result.current.detectDatabases();
      });

      // 首次 + 1 次重试
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.current.connections.length).toBe(2);
      fetchSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  连接生命周期 (Mock 模式)
  // ──────────────────────────────────────

  describe("连接生命周期", () => {
    it("connectDB Mock 模式: 置为 connected 并加载 Mock 表", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      await act(async () => {
        await result.current.connectDB(id);
      });

      expect(result.current.activeConnectionId).toBe(id);
      expect(result.current.activeConnection?.status).toBe("connected");
      expect(result.current.activeConnection?.lastConnected).not.toBeNull();
      expect(result.current.tables.length).toBe(5);
      expect(mockToast.success).toHaveBeenCalledWith("已连接: Test PG (模拟模式)");
      // 统计
      expect(result.current.stats.connectedCount).toBe(1);
      expect(result.current.stats.totalTables).toBe(5);
      expect(result.current.stats.totalTableRows).toBe(131930);
      expect(result.current.stats.totalTableSize).toBe(54583296);
    });

    it("connectDB 未知 id: 静默返回不产生副作用", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.connectDB("nonexistent");
      });

      expect(result.current.tables).toEqual([]);
      expect(result.current.activeConnectionId).toBeNull();
      expect(mockToast.success).not.toHaveBeenCalledWith(expect.stringContaining("已连接"));
    });

    it("disconnectDB 活跃连接: 断开并清空表", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);
      await act(async () => {
        await result.current.connectDB(id);
      });
      expect(result.current.tables.length).toBe(5);

      await act(async () => {
        await result.current.disconnectDB(id);
      });

      expect(result.current.connections[0].status).toBe("disconnected");
      expect(result.current.tables).toEqual([]);
      expect(result.current.activeConnection).toBeNull();
      expect(mockToast.info).toHaveBeenCalledWith("已断开连接");
    });

    it("removeConnection 活跃连接: 清空表数据", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);
      await act(async () => {
        await result.current.connectDB(id);
      });

      await act(async () => {
        await result.current.removeConnection(id);
      });

      expect(result.current.connections.length).toBe(0);
      expect(result.current.tables).toEqual([]);
      expect(result.current.activeConnectionId).toBeNull();
      expect(mockToast.success).toHaveBeenCalledWith("连接已删除");
    });
  });

  // ──────────────────────────────────────
  //  connectDB 后端成功路径
  // ──────────────────────────────────────

  describe("connectDB 后端路径", () => {
    it("后端连接成功且表接口成功", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonRes({}))
        .mockResolvedValueOnce(jsonRes([{ name: "remote_t", schema: "public", rowCount: 7, sizeBytes: 99, columns: [] }]));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      await act(async () => {
        await result.current.connectDB(id);
      });

      expect(result.current.activeConnection?.status).toBe("connected");
      expect(result.current.tables.length).toBe(1);
      expect(result.current.tables[0].name).toBe("remote_t");
      expect(mockToast.success).toHaveBeenCalledWith("已连接: Test PG");
      fetchSpy.mockRestore();
    });

    it("后端连接成功但表接口 4xx: 表保持为空", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonRes({}))
        .mockResolvedValueOnce(jsonRes({}, 404));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true, maxRetries: 3 });

      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      await act(async () => {
        await result.current.connectDB(id);
      });

      expect(result.current.activeConnection?.status).toBe("connected");
      expect(result.current.tables).toEqual([]);
      fetchSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  loadTableData
  // ──────────────────────────────────────

  describe("loadTableData", () => {
    it("未激活连接时直接返回", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.loadTableData("core.models");
      });

      expect(result.current.tableData).toEqual([]);
      expect(result.current.tableDataLoading).toBe(false);
    });

    it("后端成功: 使用后端行数据", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes([{ x: 1 }, { x: 2 }]));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());
      act(() => {
        result.current.setActiveConnectionId("c-backend");
      });

      await act(async () => {
        await result.current.loadTableData("any.table", 10);
      });

      expect(result.current.tableData).toEqual([{ x: 1 }, { x: 2 }]);
      expect(result.current.tableDataLoading).toBe(false);
      fetchSpy.mockRestore();
    });

    it("Mock 模式: 各表生成器分支与未知表空结果", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);
      await act(async () => {
        await result.current.connectDB(id);
      });

      await act(async () => {
        await result.current.loadTableData("core.models", 3);
      });
      expect(result.current.tableData.length).toBe(3);
      expect(result.current.tableData[0].name).toBe("LLaMA-70B");

      await act(async () => {
        await result.current.loadTableData("core.agents", 2);
      });
      expect(result.current.tableData[0].name_cn).toBe("编排器");
      expect(typeof result.current.tableData[0].is_active).toBe("boolean");

      await act(async () => {
        await result.current.loadTableData("infra.nodes", 2);
      });
      expect(result.current.tableData[0].hostname).toBe("GPU-A100-01");

      await act(async () => {
        await result.current.loadTableData("telemetry.inference_logs", 2);
      });
      expect(typeof result.current.tableData[0].latency_ms).toBe("number");

      await act(async () => {
        await result.current.loadTableData("audit.operations", 2);
      });
      expect(result.current.tableData[0].id).toBe("row-1");
      expect(JSON.parse(String(result.current.tableData[0].detail)).key).toBe("val_0");

      await act(async () => {
        await result.current.loadTableData("unknown.table");
      });
      expect(result.current.tableData).toEqual([]);
      expect(result.current.tableDataLoading).toBe(false);
    });
  });

  // ──────────────────────────────────────
  //  executeQuery (Mock 结果分支)
  // ──────────────────────────────────────

  describe("executeQuery 结果分支", () => {
    function withActive() {
      const { result } = renderHook(() => useLocalDatabase());
      act(() => {
        result.current.setActiveConnectionId("c-active");
      });
      return result;
    }

    it("SELECT 命中表 / count / 兜底 / 写操作 / 错误 / OK 六类结果", async () => {
      const result = withActive();
      let r1: { rows: Record<string, unknown>[]; columns: string[] } | undefined;

      await act(async () => {
        r1 = await result.current.executeQuery("SELECT * FROM core.models LIMIT 2;") as typeof r1;
      });
      expect(r1?.rows.length).toBe(2);
      expect(r1?.columns).toContain("provider");

      let r2: { rows: Record<string, unknown>[] } | undefined;
      await act(async () => {
        r2 = await result.current.executeQuery("SELECT count(*) FROM dual;") as typeof r2;
      });
      expect(r2?.rows[0].count).toBe(128456);

      let r3: { columns: string[] } | undefined;
      await act(async () => {
        r3 = await result.current.executeQuery("SELECT * FROM totally_unknown LIMIT 3;") as typeof r3;
      });
      expect(r3?.columns).toContain("status");

      let r4: { rows: Record<string, unknown>[] } | undefined;
      await act(async () => {
        r4 = await result.current.executeQuery("INSERT INTO core.models VALUES ('x');") as typeof r4;
      });
      expect(r4?.rows[0].affected_rows).toBeDefined();

      let r5: { error?: string } | undefined;
      await act(async () => {
        r5 = await result.current.executeQuery("custom error 命令;") as typeof r5;
      });
      expect(r5?.error).toContain("syntax error");
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("查询错误"));

      let r6: { rows: Record<string, unknown>[] } | undefined;
      await act(async () => {
        r6 = await result.current.executeQuery("VACUUM ANALYZE;") as typeof r6;
      });
      expect(r6?.rows[0].result).toBe("OK");

      expect(result.current.queryResults.length).toBe(6);
      expect(result.current.queryHistory.length).toBe(6);
      expect(idbPutMock).toHaveBeenCalledWith("queryHistory", expect.objectContaining({ sql: "VACUUM ANALYZE;" }));
      expect(result.current.querying).toBe(false);
    });

    it("无参调用使用 sqlInput 当前值", async () => {
      const result = withActive();
      act(() => {
        result.current.setSqlInput("SELECT * FROM core.agents;");
      });

      let r: { rows: Record<string, unknown>[] } | undefined;
      await act(async () => {
        r = await result.current.executeQuery() as typeof r;
      });
      expect(r?.rows[0].name_cn).toBe("编排器");
    });

    it("后端成功: 直接使用后端 QueryResult", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes({
        id: "backend-1", sql: "SELECT 1;", columns: ["a"], rows: [{ a: 1 }], rowCount: 1, executionTimeMs: 12.5, executedAt: 1,
      }));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const result = withActive();
      let r: { id: string; rowCount: number } | undefined;
      await act(async () => {
        r = await result.current.executeQuery("SELECT 1;") as typeof r;
      });

      expect(r?.id).toBe("backend-1");
      expect(result.current.queryResults[0].rowCount).toBe(1);
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("查询完成: 1 行"));
      fetchSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  testConnection
  // ──────────────────────────────────────

  describe("testConnection", () => {
    it("未知连接 id 返回 false", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.testConnection("nope");
      });
      expect(ok).toBe(false);
      expect(result.current.testing).toBeNull();
    });

    it("Mock 模式随机成功: 返回 true 并提示 (模拟)", async () => {
      const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.testConnection(id);
      });

      expect(ok).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("(模拟)"));
      expect(result.current.testing).toBeNull();
      randSpy.mockRestore();
    });

    it("Mock 模式随机失败: 返回 false 并提示连接被拒绝", async () => {
      const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.testConnection(id);
      });

      expect(ok).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith("连接测试失败: 连接被拒绝 (127.0.0.1:5432)");
      randSpy.mockRestore();
    });

    it("后端成功: 返回 true 并展示延迟", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes({ latency: 42 }));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.testConnection(id);
      });

      expect(ok).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith("连接测试成功: 42ms");
      fetchSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────
  //  备份 / 恢复
  // ──────────────────────────────────────

  describe("备份与恢复", () => {
    const REMOTE_BACKUP = {
      id: "bk-remote", connectionId: "c1", connectionName: "Test PG", type: "postgresql",
      fileName: "remote.sql", sizeBytes: 1024, createdAt: 1, status: "completed" as const,
    };

    /** 经后端成功路径快速注入备份 */
    async function seedBackup(result: { current: ReturnType<typeof useLocalDatabase> }): Promise<string> {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes(REMOTE_BACKUP));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });
      const id = addPG(result);
      await act(async () => {
        await result.current.createBackup(id);
      });
      fetchSpy.mockRestore();
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG });
      return id;
    }

    it("createBackup 未知连接静默返回", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.createBackup("nope");
      });

      expect(result.current.backups).toEqual([]);
      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it("createBackup Mock 模式生成备份文件", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      const id = addPG(result);

      await act(async () => {
        await result.current.createBackup(id);
      });

      expect(result.current.backups.length).toBe(1);
      expect(result.current.backups[0].fileName).toMatch(/^yyc3_postgresql_\d{4}-\d{2}-\d{2}\.sql$/);
      expect(result.current.backups[0].sizeBytes).toBeGreaterThan(0);
      expect(result.current.backups[0].status).toBe("completed");
      expect(result.current.stats.totalBackups).toBe(1);
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("备份完成"));
    });

    it("createBackup 后端成功直接入列", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      await seedBackup(result);

      expect(result.current.backups.length).toBe(1);
      expect(result.current.backups[0].fileName).toBe("remote.sql");
      expect(mockToast.success).toHaveBeenCalledWith("备份完成");
    });

    it("restoreBackup 未知备份静默返回", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      await act(async () => {
        await result.current.restoreBackup("nope");
      });

      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it("restoreBackup Mock 模式完成恢复", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      await seedBackup(result);

      await act(async () => {
        await result.current.restoreBackup("bk-remote");
      });

      expect(mockToast.success).toHaveBeenCalledWith("恢复完成: remote.sql (模拟)");
    });

    it("restoreBackup 后端成功", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      await seedBackup(result);
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonRes({}));
      mockGetAPIConfig.mockReturnValue({ ...DEFAULT_API_CONFIG, enableBackend: true });

      await act(async () => {
        await result.current.restoreBackup("bk-remote");
      });

      expect(mockToast.success).toHaveBeenCalledWith("恢复完成");
      fetchSpy.mockRestore();
    });

    it("deleteBackup 从列表移除指定备份", async () => {
      const { result } = renderHook(() => useLocalDatabase());
      await seedBackup(result);

      act(() => {
        result.current.deleteBackup("bk-remote");
      });

      expect(result.current.backups).toEqual([]);
      expect(mockToast.success).toHaveBeenCalledWith("备份已删除");
    });
  });

  // ──────────────────────────────────────
  //  密码编码
  // ──────────────────────────────────────

  describe("密码持久化编码", () => {
    it("非 Latin1 密码 btoa 失败时原样持久化", async () => {
      const { result } = renderHook(() => useLocalDatabase());

      act(() => {
        result.current.addConnection({ ...PG_CONN, password: "密码🔐" });
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(idbPutMock).toHaveBeenCalledWith(
        "dbConnections",
        expect.objectContaining({ password: "密码🔐", status: "disconnected" })
      );
    });
  });
});