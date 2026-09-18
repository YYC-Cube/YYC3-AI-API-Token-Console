/**
 * types.test.ts
 * ==============
 * YYC³ 全局类型系统 - 完整性测试
 *
 * 覆盖范围:
 * - 中心化类型文件导出完整性
 * - 各模块 re-export 兼容性
 * - 类型约束验证（枚举值、必填字段）
 * - toNodeData 转换函数正确性
 * - 跨模块类型一致性
 */

import { describe, it, expect } from "vitest";
import { toNodeData } from "../types";
import type {
  UserRole,
  AppUser,
  AppSession,
  AuthContextValue,
  NodeStatusType,
  NodeData,
  NodeStatusRecord,
  ModelTier,
  Model,
  Agent,
  InferenceStatus,
  InferenceLog,
  ModelStats,
  ConnectionState,
  AlertLevel,
  AlertData,
  ThroughputPoint,
  SystemStats,
  WSMessage,
  WebSocketDataState,
  NetworkInterface,
  NetworkMode,
  NetworkConfig,
  TestStatus,
  ConnectionTestResult,
  NetworkConfigState,
  SyncItemType,
  SyncItem,
  SyncQueueStats,
  SyncProcessResult,
  ErrorCategory,
  ErrorSeverity,
  AppError,
  ErrorStats,
  Breakpoint,
  ViewState,
  ErrorBoundaryLevel,
  ChatMessage,
  CommandCategory,
  BeforeInstallPromptEvent,
} from "../types";

// ============================================================
// 1. 类型导出完整性 — 所有类型应可导入
// ============================================================

describe("类型导出完整性", () => {
  it("所有用户/认证类型应可导入", () => {
    const user: AppUser = {
      id: "u1",
      email: "test@test.com",
      role: "admin",
      name: "Test",
    };
    expect(user.id).toBe("u1");
    expect(user.role).toBe("admin");
  });

  it("AppSession 应包含 user + token + expiresAt", () => {
    const session: AppSession = {
      user: { id: "u1", email: "t@t.com", role: "developer", name: "T" },
      token: "abc",
      expiresAt: Date.now() + 3600000,
    };
    expect(session.token).toBe("abc");
    expect(session.user.role).toBe("developer");
  });

  it("AuthContextValue 应包含 logout + userEmail + userRole", () => {
    const ctx: AuthContextValue = {
      logout: () => {},
      userEmail: "admin@yyc.local",
      userRole: "admin",
    };
    expect(typeof ctx.logout).toBe("function");
  });
});

// ============================================================
// 2. 节点类型完整性
// ============================================================

describe("节点类型", () => {
  it("NodeData 应包含 7 个字段", () => {
    const node: NodeData = {
      id: "GPU-A100-01",
      status: "active",
      gpu: 87,
      mem: 72,
      temp: 68,
      model: "LLaMA-70B",
      tasks: 128,
    };
    expect(node.status).toBe("active");
    expect(node.gpu).toBe(87);
  });

  it("NodeStatusRecord 应包含 DB schema 字段", () => {
    const record: NodeStatusRecord = {
      id: "n1",
      hostname: "GPU-A100-01",
      gpu_util: 87,
      mem_util: 72,
      temp_celsius: 68,
      model_deployed: "LLaMA-70B",
      active_tasks: 128,
      status: "active",
    };
    expect(record.hostname).toBe("GPU-A100-01");
    expect(record.gpu_util).toBe(87);
  });

  it("NodeStatusType 应只接受 3 种值", () => {
    const validStatuses: NodeStatusType[] = ["active", "warning", "inactive"];
    expect(validStatuses.length).toBe(3);
  });
});

// ============================================================
// 3. toNodeData 转换函数
// ============================================================

describe("toNodeData 转换", () => {
  it("应正确将 NodeStatusRecord 转为 NodeData", () => {
    const record: NodeStatusRecord = {
      id: "n1",
      hostname: "GPU-H100-01",
      gpu_util: 92,
      mem_util: 85,
      temp_celsius: 74,
      model_deployed: "Qwen-72B",
      active_tasks: 156,
      status: "warning",
    };

    const node = toNodeData(record);

    expect(node.id).toBe("GPU-H100-01");
    expect(node.status).toBe("warning");
    expect(node.gpu).toBe(92);
    expect(node.mem).toBe(85);
    expect(node.temp).toBe(74);
    expect(node.model).toBe("Qwen-72B");
    expect(node.tasks).toBe(156);
  });

  it("inactive 节点转换后保持 inactive 状态", () => {
    const record: NodeStatusRecord = {
      id: "n6",
      hostname: "GPU-H100-03",
      gpu_util: 0,
      mem_util: 12,
      temp_celsius: 32,
      model_deployed: "-",
      active_tasks: 0,
      status: "inactive",
    };

    const node = toNodeData(record);
    expect(node.status).toBe("inactive");
    expect(node.gpu).toBe(0);
    expect(node.tasks).toBe(0);
  });
});

// ============================================================
// 4. 模型与 Agent 类型
// ============================================================

describe("模型与 Agent 类型", () => {
  it("Model 应包含 tier 约束", () => {
    const tiers: ModelTier[] = ["primary", "secondary", "standby"];
    expect(tiers).toContain("primary");
    expect(tiers).toContain("standby");
  });

  it("InferenceLog status 应限制为 3 种", () => {
    const statuses: InferenceStatus[] = ["success", "error", "timeout"];
    expect(statuses.length).toBe(3);
  });

  it("ModelStats 应包含 4 个指标", () => {
    const stats: ModelStats = {
      avgLatency: 45,
      totalRequests: 10000,
      totalTokens: 500000,
      successRate: 98.5,
    };
    expect(stats.successRate).toBe(98.5);
  });
});

// ============================================================
// 5. WebSocket 通信类型
// ============================================================

describe("WebSocket 类型", () => {
  it("ConnectionState 应包含 5 种状态", () => {
    const states: ConnectionState[] = [
      "connecting",
      "connected",
      "disconnected",
      "reconnecting",
      "simulated",
    ];
    expect(states.length).toBe(5);
  });

  it("AlertLevel 应包含 4 个级别", () => {
    const levels: AlertLevel[] = ["info", "warning", "error", "critical"];
    expect(levels.length).toBe(4);
  });

  it("AlertData 应包含 level 字段", () => {
    const alert: AlertData = {
      id: "a1",
      level: "critical",
      message: "GPU 过热",
      source: "GPU-A100-03",
      timestamp: Date.now(),
    };
    expect(alert.level).toBe("critical");
  });

  it("ThroughputPoint 应包含 4 个字段", () => {
    const point: ThroughputPoint = {
      time: "14:00",
      qps: 3800,
      latency: 55,
      tokens: 138000,
    };
    expect(point.qps).toBe(3800);
  });
});

// ============================================================
// 6. 网络配置类型
// ============================================================

describe("网络配置类型", () => {
  it("NetworkMode 应包含 3 种模式", () => {
    const modes: NetworkMode[] = ["auto", "wifi", "manual"];
    expect(modes.length).toBe(3);
  });

  it("TestStatus 应包含 4 种状态", () => {
    const statuses: TestStatus[] = ["idle", "testing", "success", "failed"];
    expect(statuses.length).toBe(4);
  });

  it("ConnectionTestResult 应包含 success + latency", () => {
    const result: ConnectionTestResult = {
      success: true,
      latency: 42,
    };
    expect(result.success).toBe(true);

    const failResult: ConnectionTestResult = {
      success: false,
      latency: 5000,
      error: "连接超时",
    };
    expect(failResult.error).toBe("连接超时");
  });
});

// ============================================================
// 7. 后台同步类型
// ============================================================

describe("后台同步类型", () => {
  it("SyncItemType 应包含 3 种类型", () => {
    const types: SyncItemType[] = ["config_update", "audit_log", "user_action"];
    expect(types.length).toBe(3);
  });

  it("SyncItem.payload 应为 Record<string, unknown>", () => {
    const item: SyncItem = {
      id: "sync-1",
      type: "config_update",
      payload: { key: "theme", value: "dark" },
      timestamp: Date.now(),
      retries: 0,
    };
    expect(item.payload).toEqual({ key: "theme", value: "dark" });
  });

  it("SyncProcessResult 应包含 success + failed", () => {
    const result: SyncProcessResult = { success: 3, failed: 0 };
    expect(result.success + result.failed).toBe(3);
  });
});

// ============================================================
// 8. 错误处理类型
// ============================================================

describe("错误处理类型", () => {
  it("ErrorCategory 应包含 7 种分类", () => {
    const categories: ErrorCategory[] = [
      "NETWORK",
      "PARSE",
      "AUTH",
      "RUNTIME",
      "VALIDATION",
      "STORAGE",
      "UNKNOWN",
    ];
    expect(categories.length).toBe(7);
  });

  it("ErrorSeverity 应包含 4 个级别", () => {
    const severities: ErrorSeverity[] = ["info", "warning", "error", "critical"];
    expect(severities.length).toBe(4);
  });

  it("AppError 应包含所有必要字段", () => {
    const err: AppError = {
      id: "err_001",
      category: "NETWORK",
      severity: "warning",
      message: "WebSocket 连接失败",
      timestamp: Date.now(),
      resolved: false,
    };
    expect(err.resolved).toBe(false);
  });
});

// ============================================================
// 9. 响应式布局类型
// ============================================================

describe("响应式布局类型", () => {
  it("Breakpoint 应包含 5 种断点", () => {
    const bps: Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];
    expect(bps.length).toBe(5);
  });

  it("ViewState 应包含 6 个字段", () => {
    const state: ViewState = {
      breakpoint: "lg",
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1440,
      isTouch: false,
    };
    expect(state.isDesktop).toBe(true);
    expect(state.width).toBe(1440);
  });
});

// ============================================================
// 10. UI 组件类型
// ============================================================

describe("UI 组件公共类型", () => {
  it("ErrorBoundaryLevel 应包含 3 个级别", () => {
    const levels: ErrorBoundaryLevel[] = ["page", "module", "widget"];
    expect(levels.length).toBe(3);
  });

  it("ChatMessage 应包含 role 约束", () => {
    const msg: ChatMessage = {
      id: "msg-1",
      role: "assistant",
      content: "你好！",
      timestamp: Date.now(),
    };
    expect(msg.role).toBe("assistant");
  });

  it("CommandCategory 应包含 5 种分类", () => {
    const cats: CommandCategory[] = [
      "cluster",
      "model",
      "data",
      "security",
      "monitor",
    ];
    expect(cats.length).toBe(5);
  });
});

// ============================================================
// 11. 模块导出验证 (RF-011: Re-export 已移除，仅验证值导出)
// ============================================================

describe("模块导出验证", () => {
  it("useWebSocketData 模块应导出 hook", async () => {
    const mod = await import("../hooks/useWebSocketData");
    expect(mod.useWebSocketData).toBeDefined();
  });

  it("useMobileView 模块应导出 hook", async () => {
    const mod = await import("../hooks/useMobileView");
    expect(mod.useMobileView).toBeDefined();
  });

  it("network-utils 模块应导出常量和函数", async () => {
    const mod = await import("../lib/network-utils");
    expect(mod.DEFAULT_NETWORK_CONFIG).toBeDefined();
    expect(typeof mod.generateWsUrl).toBe("function");
    expect(typeof mod.loadNetworkConfig).toBe("function");
  });

  it("db-queries 模块应导出查询函数", async () => {
    const mod = await import("../lib/db-queries");
    expect(typeof mod.getActiveModels).toBe("function");
    expect(typeof mod.getNodesStatus).toBe("function");
    expect(typeof mod.getRecentLogs).toBe("function");
    expect(typeof mod.getModelStats).toBe("function");
    expect(typeof mod.getActiveAgents).toBe("function");
  });

  it("error-handler 模块应导出错误处理函数", async () => {
    const mod = await import("../lib/error-handler");
    expect(typeof mod.captureError).toBe("function");
    expect(typeof mod.captureNetworkError).toBe("function");
    expect(typeof mod.captureWSError).toBe("function");
    expect(typeof mod.captureAuthError).toBe("function");
    expect(typeof mod.captureParseError).toBe("function");
    expect(typeof mod.trySafe).toBe("function");
    expect(typeof mod.trySafeSync).toBe("function");
    expect(typeof mod.getErrorLog).toBe("function");
    expect(typeof mod.clearErrorLog).toBe("function");
    expect(typeof mod.getErrorStats).toBe("function");
    // RF-002: 新增 IndexedDB 异步读取 API
    expect(typeof mod.getFullErrorLog).toBe("function");
  });

  it("backgroundSync 模块应导出队列操作函数", async () => {
    const mod = await import("../lib/backgroundSync");
    expect(typeof mod.addToSyncQueue).toBe("function");
    expect(typeof mod.getSyncQueue).toBe("function");
    expect(typeof mod.clearSyncQueue).toBe("function");
    expect(typeof mod.processSyncQueue).toBe("function");
    expect(typeof mod.getSyncQueueStats).toBe("function");
  });
});