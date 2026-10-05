/**
 * EnvConfigEditor.test.tsx
 * ========================
 * 环境变量 UI 编辑面板组件测试 (路由: /env-config)
 *
 * 覆盖范围:
 * - 初始渲染: 头部统计 / 分组卡片 / FieldRow 各类型值展示
 * - 分组折叠/展开
 * - boolean 字段: 切换开关 → setEnvConfig + toast
 * - string 字段: 编辑/Enter 确认/Escape 取消/复制
 * - number 字段: 整数 parseInt / 浮点 parseFloat / 非法值 toast.error 且不保存
 * - 重置: confirm true/false 双路径
 * - 导出: Blob 下载链路 (createObjectURL + anchor click)
 * - 导入: FileReader 流程成功/失败分支
 *
 * Mock 契约 (零外部依赖):
 * - lib/env-config 整体 mock (localStorage 覆盖层隔离)
 * - sonner toast mock
 * - navigator.clipboard / URL.createObjectURL / anchor click / window.confirm stub
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { EnvConfigEditor } from "../components/EnvConfigEditor";
import type { EnvConfig } from "../lib/env-config";

// ============================================================
// Mock 中心
// ============================================================

const m = vi.hoisted(() => ({
  currentConfig: {} as Record<string, unknown>,
  getEnvConfig: vi.fn(),
  setEnvConfig: vi.fn(),
  resetEnvConfig: vi.fn(),
  exportEnvConfig: vi.fn(),
  importEnvConfig: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../lib/env-config", () => ({
  getEnvConfig: m.getEnvConfig,
  setEnvConfig: m.setEnvConfig,
  resetEnvConfig: m.resetEnvConfig,
  exportEnvConfig: m.exportEnvConfig,
  importEnvConfig: m.importEnvConfig,
}));

vi.mock("sonner", () => ({
  toast: {
    info: m.toastInfo,
    success: m.toastSuccess,
    error: m.toastError,
  },
}));

// ============================================================
// Fixture — 覆盖 string/number/boolean 三种类型
// ============================================================

const baseConfig: EnvConfig = {
  SYSTEM_NAME: "YYC³ Test",
  SYSTEM_VERSION: "3.2.0",
  SYSTEM_BUILD: "2026.03.07",
  API_BASE_URL: "http://192.168.3.1:3118/api",
  WS_ENDPOINT: "ws://localhost:3113/ws",
  OLLAMA_BASE_URL: "http://localhost:11434",
  OLLAMA_PROXY_PATH: "/api/v1/llm/ollama",
  STORAGE_PREFIX: "yyc3_",
  IDB_NAME: "yyc3_matrix",
  IDB_VERSION: 3,
  CLUSTER_ID: "CN-EAST-PROD-01",
  NODE_ENV: "development",
  DEFAULT_AI_BASE_URL: "https://api.openai.com/v1",
  DEFAULT_AI_MODEL: "gpt-4o",
  DEFAULT_AI_TEMPERATURE: 0.7,
  DEFAULT_AI_MAX_TOKENS: 2048,
  DEFAULT_AI_TIMEOUT: 30000,
  SESSION_TIMEOUT_MIN: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  CORS_ORIGINS: "192.168.1.0/24",
  ENABLE_MOCK_MODE: true,
  ENABLE_DEBUG: false,
  ENABLE_PWA: true,
  ENABLE_ELECTRON_IPC: false,
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 10,
  DB_POOL_IDLE_TIMEOUT: 30000,
  DB_POOL_ACQUIRE_TIMEOUT: 5000,
  SQL_BLOCKED_COMMANDS: "DROP,DELETE",
  SQL_MAX_HISTORY: 20,
  SQL_TEST_SIMULATE_DELAY: 500,
};

function renderPage() {
  return render(<EnvConfigEditor />);
}

/** 定位字段行 (row 容器含 group class) */
function fieldRow(label: string): HTMLElement {
  return screen.getByText(label).closest("div.group") as HTMLElement;
}

describe("EnvConfigEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.currentConfig = { ...baseConfig };
    m.getEnvConfig.mockImplementation(() => ({ ...m.currentConfig }));
    m.setEnvConfig.mockImplementation((patch: Record<string, unknown>) => {
      m.currentConfig = { ...m.currentConfig, ...patch };
      return { ...m.currentConfig };
    });
    m.resetEnvConfig.mockImplementation(() => {
      m.currentConfig = { ...baseConfig };
      return { ...m.currentConfig };
    });
    m.exportEnvConfig.mockReturnValue(JSON.stringify(baseConfig));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应渲染头部统计与六个分组", () => {
    renderPage();
    expect(screen.getByText("环境变量管理")).toBeInTheDocument();
    expect(screen.getByText(/项配置 · 7 项不可逆/)).toBeInTheDocument();
    expect(screen.getByText("系统标识")).toBeInTheDocument();
    expect(screen.getByText("网络端点")).toBeInTheDocument();
    expect(screen.getByText("存储配置")).toBeInTheDocument();
    expect(screen.getByText("AI 默认配置")).toBeInTheDocument();
    expect(screen.getByText("安全配置")).toBeInTheDocument();
    expect(screen.getByText("功能开关")).toBeInTheDocument();
  });

  it("分组折叠/展开应切换字段可见性", () => {
    renderPage();
    expect(screen.getByText("系统名称")).toBeInTheDocument();

    fireEvent.click(screen.getByText("系统标识"));
    expect(screen.queryByText("系统名称")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("系统标识"));
    expect(screen.getByText("系统名称")).toBeInTheDocument();
  });

  it("boolean 字段切换应调用 setEnvConfig 并 toast", () => {
    renderPage();
    const row = fieldRow("Mock 模式");
    expect(within(row).getByText("已启用")).toBeInTheDocument();

    fireEvent.click(within(row).getByText("已启用"));
    expect(m.setEnvConfig).toHaveBeenCalledWith({ ENABLE_MOCK_MODE: false });
    expect(m.toastSuccess).toHaveBeenCalledWith("ENABLE_MOCK_MODE 已更新");
  });

  it("string 字段: Enter 确认应保存, Escape 应取消", () => {
    renderPage();
    const row = fieldRow("系统名称");

    // 复制按钮 = 行内第 1 个操作按钮
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    const buttons = within(row).getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(writeText).toHaveBeenCalledWith("YYC³ Test");
    expect(m.toastSuccess).toHaveBeenCalledWith("已复制: SYSTEM_NAME");

    // 编辑按钮 = 第 2 个
    fireEvent.click(buttons[1]);
    const input = within(row).getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("YYC³ Test");

    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(m.setEnvConfig).not.toHaveBeenCalled();
    expect(within(row).queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(within(row).getAllByRole("button")[1]);
    const input2 = within(row).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input2, { target: { value: "New Name" } });
    fireEvent.keyDown(input2, { key: "Enter" });
    expect(m.setEnvConfig).toHaveBeenCalledWith({ SYSTEM_NAME: "New Name" });
    expect(m.toastSuccess).toHaveBeenCalledWith("SYSTEM_NAME 已更新");
    expect(screen.queryByText("YYC³ Test")).not.toBeInTheDocument(); // 旧值已不在
  });

  it("number 字段: 整数 parseInt / 浮点 parseFloat 双路径", () => {
    renderPage();

    const maxTokensRow = fieldRow("Max Tokens");
    fireEvent.click(within(maxTokensRow).getAllByRole("button")[1]);
    const input = within(maxTokensRow).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "4096" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(m.setEnvConfig).toHaveBeenCalledWith({ DEFAULT_AI_MAX_TOKENS: 4096 });

    const tempRow = fieldRow("Temperature");
    fireEvent.click(within(tempRow).getAllByRole("button")[1]);
    const input2 = within(tempRow).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input2, { target: { value: "0.9" } });
    fireEvent.keyDown(input2, { key: "Enter" });
    expect(m.setEnvConfig).toHaveBeenCalledWith({ DEFAULT_AI_TEMPERATURE: 0.9 });
  });

  it("number 字段非法输入应 toast.error 且不保存", () => {
    renderPage();
    const row = fieldRow("Max Tokens");
    fireEvent.click(within(row).getAllByRole("button")[1]);
    const input = within(row).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(m.toastError).toHaveBeenCalledWith("无效数值");
    expect(m.setEnvConfig).not.toHaveBeenCalled();
  });

  it("重置: confirm 确认后应调用 resetEnvConfig", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /重置/ }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(m.resetEnvConfig).toHaveBeenCalledTimes(1);
    expect(m.toastInfo).toHaveBeenCalledWith("环境变量已重置为默认值");
  });

  it("重置: confirm 取消后不应调用 resetEnvConfig", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /重置/ }));
    expect(m.resetEnvConfig).not.toHaveBeenCalled();
  });

  it("导出应走 Blob 下载链路", () => {
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL =
      createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL =
      revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /导出/ }));

    expect(m.exportEnvConfig).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads[0]).toMatch(/^yyc3-env-config-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(m.toastSuccess).toHaveBeenCalledWith("环境变量已导出");
  });

  it("导入合法 JSON 应刷新配置并 toast 成功", async () => {
    m.importEnvConfig.mockReturnValue(true);
    const { container } = renderPage();

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['{"SYSTEM_NAME":"Imported"}'], "cfg.json", {
      type: "application/json",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(m.importEnvConfig).toHaveBeenCalledWith('{"SYSTEM_NAME":"Imported"}');
    });
    await waitFor(() => {
      expect(m.toastSuccess).toHaveBeenCalledWith("环境变量已导入");
    });
  });

  it("导入非法 JSON 应 toast 失败", async () => {
    m.importEnvConfig.mockReturnValue(false);
    const { container } = renderPage();

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(m.toastError).toHaveBeenCalledWith("导入失败: JSON 格式错误");
    });
  });
});
