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