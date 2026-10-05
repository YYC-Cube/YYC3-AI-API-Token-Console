/**
 * ServiceConnectionTest.test.tsx
 * ==============================
 * 全链路服务连接测试面板组件测试 (路由: /connection-test)
 *
 * 覆盖范围:
 * - 初始渲染: 头部 / 环境检测面板 / 空态提示 / 快速单项测试按钮
 * - runAllTests 编排: network → ws → AI(configured) → DB 顺序 + toast 汇总
 * - 无 configured models 时回退到全 provider 探测
 * - 运行中态: 停止测试按钮 + abort 后续阶段跳过
 * - 清空结果 (clearStoredResults)
 * - CORS 代理面板: 展开 / 持久化 / 清除
 * - 快速单项测试按钮触发对应 runner
 *
 * Mock 契约 (零外部依赖):
 * - useModelProvider / dbConnectionStore / service-test/* (tests/panels/results-view/types) 全 mock
 * - sonner toast mock
 * - localStorage 使用 jsdom 真实实现 + beforeEach 重建
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ServiceConnectionTest } from "../components/ServiceConnectionTest";

// ============================================================
// Mock 中心
// ============================================================

const m = vi.hoisted(() => ({
  providers: [
    {
      id: "ollama",
      label: "Ollama",
      baseUrl: "http://localhost:11434",
      authType: "none",
      models: ["qwen3:8b"],
      isLocal: true,
    },
    {
      id: "zai",
      label: "Z.ai",
      baseUrl: "https://api.z.ai",
      authType: "bearer",
      models: ["glm-4-flash"],
      isLocal: false,
    },
  ],
  configuredModels: [
    {
      providerId: "zai",
      providerLabel: "Z.ai",
      baseUrl: "https://api.z.ai",
      apiKey: "sk-test-zai",
      model: "glm-4-flash",
      proxyUrl: "",
    },
  ],
  dbConnections: [] as unknown[],
  storedResults: [] as unknown[],
  runNetworkTest: vi.fn(),
  runWebSocketTest: vi.fn(),
  runAIProviderTest: vi.fn(),
  runDBTest: vi.fn(),
  saveResults: vi.fn(),
  clearStoredResults: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    providers: m.providers,
    configuredModels: m.configuredModels,
  }),
}));

vi.mock("../stores/dashboard-stores", () => ({
  dbConnectionStore: {
    getAll: () => m.dbConnections,
  },
}));

vi.mock("../components/service-test/tests", () => ({
  runNetworkTest: m.runNetworkTest,
  runWebSocketTest: m.runWebSocketTest,
  runAIProviderTest: m.runAIProviderTest,
  runDBTest: m.runDBTest,
}));

vi.mock("../components/service-test/panels", () => ({
  QuickTestButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button onClick={onClick}>{label}</button>
  ),
  DiagnosticCard: ({ title }: { title: string }) => <div>{title}</div>,
  EnvironmentDetectionPanel: () => <div data-testid="env-detection-panel" />,
}));

vi.mock("../components/service-test/results-view", () => ({
  ResultCard: ({
    result,
    expanded,
    onToggle,
  }: {
    result: { id: string; name: string };
    expanded: boolean;
    onToggle: () => void;
  }) => (
    <div data-testid={`result-${result.id}`}>
      <button onClick={onToggle}>{result.name}</button>
      {expanded ? <span>详情已展开</span> : null}
    </div>
  ),
}));

vi.mock("../components/service-test/types", () => ({
  loadResults: () => m.storedResults,
  saveResults: m.saveResults,
  clearStoredResults: m.clearStoredResults,
  toastStyle: {},
}));

vi.mock("sonner", () => ({
  toast: {
    info: m.toastInfo,
    success: m.toastSuccess,
    error: m.toastError,
  },
}));

// ============================================================
// Fixtures
// ============================================================

function makeResult(
  id: string,
  overallStatus: "pass" | "fail" | "warn" = "pass"
) {
  return {
    id,
    category: "network" as const,
    name: id,
    icon: null,
    color: "#00d4ff",
    steps: [],
    overallStatus,
  };
}

const dbConnFixture = {
  id: "dbc-1",
  name: "本地 PG",
  type: "postgresql",
  host: "127.0.0.1",
  port: 5432,
  database: "yyc3_matrix",
  username: "postgres",
  status: "connected",
};

function renderPage() {
  return render(<ServiceConnectionTest />);
}

describe("ServiceConnectionTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    m.storedResults = [];
    m.dbConnections = [];
    m.runNetworkTest.mockResolvedValue(makeResult("net", "pass"));
    m.runWebSocketTest.mockResolvedValue(makeResult("ws", "pass"));
    m.runAIProviderTest.mockResolvedValue(makeResult("ai", "pass"));
    m.runDBTest.mockResolvedValue(makeResult("db", "pass"));
  });

  it("初始渲染应包含头部/环境检测面板/空态与快速按钮", () => {
    renderPage();
    expect(screen.getByText("全链路服务连接测试")).toBeInTheDocument();
    expect(screen.getByTestId("env-detection-panel")).toBeInTheDocument();
    expect(screen.getByText(/点击「一键全部测试」开始诊断/)).toBeInTheDocument();
    expect(screen.getByText(/将测试: 2 个 AI 服务商 · 0 个数据库/)).toBeInTheDocument();
    // 快速按钮: 网络 + WS + 本地 provider + 云 provider (前 4)
    expect(screen.getByRole("button", { name: "网络连通性" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WebSocket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ollama" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Z.ai" })).toBeInTheDocument();
    expect(screen.getByText("诊断参考")).toBeInTheDocument();
  });

  it("runAllTests 应按 network→ws→AI→DB 编排并 toast 汇总", async () => {
    m.dbConnections = [dbConnFixture];
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /一键全部测试/ }));

    await waitFor(() => {
      expect(m.toastSuccess).toHaveBeenCalledWith(
        "测试完成: 4 通过 / 0 警告 / 0 失败",
        expect.anything()
      );
    });

    expect(m.toastInfo).toHaveBeenCalledWith(
      "开始全链路连接测试...",
      expect.anything()
    );
    expect(m.runNetworkTest).toHaveBeenCalledTimes(1);
    expect(m.runWebSocketTest).toHaveBeenCalledTimes(1);
    // configuredModels 非空 → 只测已配置模型, 不做全 provider 探测
    expect(m.runAIProviderTest).toHaveBeenCalledTimes(1);
    expect(m.runAIProviderTest).toHaveBeenCalledWith(
      "zai",
      "Z.ai",
      "https://api.z.ai",
      "bearer",
      "sk-test-zai",
      "glm-4-flash",
      false,
      undefined
    );
    expect(m.runDBTest).toHaveBeenCalledWith(dbConnFixture);
    expect(m.saveResults).toHaveBeenCalledTimes(1);
    // 结果渲染
    expect(screen.getByTestId("result-net")).toBeInTheDocument();
    expect(screen.getByTestId("result-ws")).toBeInTheDocument();
    expect(screen.getByTestId("result-ai")).toBeInTheDocument();
    expect(screen.getByTestId("result-db")).toBeInTheDocument();
  });

  it("无 configured models 时应回退为全 provider 探测", async () => {
    m.configuredModels.length = 0;
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /一键全部测试/ }));

    await waitFor(() => {
      expect(m.toastSuccess).toHaveBeenCalled();
    });

    expect(m.runAIProviderTest).toHaveBeenCalledTimes(2);
    expect(m.runAIProviderTest).toHaveBeenNthCalledWith(
      1,
      "ollama",
      "Ollama",
      "http://localhost:11434",
      "none",
      "",
      "qwen3:8b",
      true,
      undefined
    );
    expect(m.runAIProviderTest).toHaveBeenNthCalledWith(
      2,
      "zai",
      "Z.ai",
      "https://api.z.ai",
      "bearer",
      "",
      "glm-4-flash",
      false,
      undefined
    );
  });

  it("运行中应显示停止测试按钮且 abort 后跳过后续阶段", async () => {
    let resolveNet: (v: unknown) => void = () => {};
    m.runNetworkTest.mockImplementation(
      () =>
        new Promise((res) => {
          resolveNet = res;
        })
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /一键全部测试/ }));
    expect(await screen.findByRole("button", { name: /停止测试/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /停止测试/ }));
    resolveNet(makeResult("net", "pass"));

    await waitFor(() => {
      expect(m.saveResults).toHaveBeenCalledTimes(1);
    });

    // abort 后: ws / AI / DB 均不再执行
    expect(m.runWebSocketTest).not.toHaveBeenCalled();
    expect(m.runAIProviderTest).not.toHaveBeenCalled();
    expect(m.runDBTest).not.toHaveBeenCalled();
  });

  it("清空按钮应清空结果并清理持久化", async () => {
    m.storedResults = [makeResult("r1", "pass")];
    renderPage();

    expect(screen.getByTestId("result-r1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /清空/ }));

    expect(m.clearStoredResults).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId("result-r1")).not.toBeInTheDocument();
    });
  });

  it("CORS 代理面板应支持展开/持久化/清除", () => {
    renderPage();
    expect(screen.queryByText("CORS 代理配置")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /CORS 代理/ }));
    expect(screen.getByText("CORS 代理配置")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("http://localhost:8080");
    fireEvent.change(input, { target: { value: "http://127.0.0.1:8080" } });
    expect(localStorage.getItem("yyc3_cors_proxy")).toBe("http://127.0.0.1:8080");

    fireEvent.click(
      screen.getByPlaceholderText("http://localhost:8080").nextElementSibling as HTMLElement
    );
    expect(localStorage.getItem("yyc3_cors_proxy")).toBeNull();
  });

  it("快速单项测试按钮应触发对应 runner 并合并结果", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "网络连通性" }));
    await waitFor(() => {
      expect(m.runNetworkTest).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "WebSocket" }));
    await waitFor(() => {
      expect(m.runWebSocketTest).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Ollama" }));
    await waitFor(() => {
      // 快速本地 provider 调用只传 7 参 (无 proxyUrl)
      expect(m.runAIProviderTest).toHaveBeenCalledWith(
        "ollama",
        "Ollama",
        "http://localhost:11434",
        "none",
        "",
        "qwen3:8b",
        true
      );
    });

    await waitFor(() => {
      expect(m.saveResults).toHaveBeenCalled();
    });
    expect(screen.getByTestId("result-net")).toBeInTheDocument();
    expect(screen.getByTestId("result-ws")).toBeInTheDocument();
    expect(screen.getByTestId("result-ai")).toBeInTheDocument();
  });

  it("数据库快速按钮应触发 runDBTest", async () => {
    m.dbConnections = [dbConnFixture];
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "本地 PG" }));
    await waitFor(() => {
      expect(m.runDBTest).toHaveBeenCalledWith(dbConnFixture);
    });
  });

  it("ResultCard 点击应切换展开态", async () => {
    m.storedResults = [makeResult("r1", "pass")];
    renderPage();

    expect(screen.queryByText("详情已展开")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "r1" }));
    expect(screen.getByText("详情已展开")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "r1" }));
    expect(screen.queryByText("详情已展开")).not.toBeInTheDocument();
  });
});
