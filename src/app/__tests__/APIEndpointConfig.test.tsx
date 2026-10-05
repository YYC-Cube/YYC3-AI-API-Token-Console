/**
 * APIEndpointConfig.test.tsx
 * ===========================
 * settings/APIEndpointConfig.tsx — 后端 API 端点配置分区
 *
 * 覆盖范围:
 * - ENDPOINT_META 分组渲染 (boolean / number / url 三类字段)
 * - updateField: Toggle / 数字输入 / 重试按钮 / 滑块 / URL 输入
 * - handleReset 重置默认
 * - localStorage 持久化 (真实 api-config 模块, BroadcastChannel 缺失时安全降级)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { APIEndpointConfig } from "../components/settings/APIEndpointConfig";
import { getAPIConfig, resetAPIConfig } from "../lib/api-config";
import { toast } from "sonner";

/** 通过标签文本定位其所在设置行容器 */
function rowOf(label: string): HTMLElement {
  return screen.getByText(label).closest("div")!.parentElement as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  // 真实 api-config 模块: 重置内存配置 + 清持久化
  resetAPIConfig();
  localStorage.removeItem("yyc3_api_endpoints");
  resetAPIConfig();
});

describe("settings/APIEndpointConfig", () => {
  it("应渲染标题 / 说明 / 全部分组", () => {
    render(<APIEndpointConfig />);
    expect(screen.getByText("后端 API 端点配置")).toBeInTheDocument();
    expect(screen.getByText(/控制后端 API 连接参数/)).toBeInTheDocument();
    expect(screen.getByText("通用")).toBeInTheDocument();
    expect(screen.getByText("文件系统")).toBeInTheDocument();
    expect(screen.getByText("数据库")).toBeInTheDocument();
    expect(screen.getByText("实时通信")).toBeInTheDocument();
    expect(screen.getByText("AI 推理")).toBeInTheDocument();
    expect(screen.getByText("集群")).toBeInTheDocument();
  });

  it("应渲染三类字段与默认值", () => {
    render(<APIEndpointConfig />);
    // boolean
    expect(screen.getByText("启用后端 API")).toBeInTheDocument();
    // number (timeout 输入框 + maxRetries 滑块行)
    expect(screen.getByText("请求超时 (ms)")).toBeInTheDocument();
    expect(screen.getByText("最大重试次数")).toBeInTheDocument();
    expect(screen.getByDisplayValue("15000")).toBeInTheDocument();
    // url
    expect(screen.getByText("文件系统 API")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/api/fs")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/api/db")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://api.openai.com/v1")).toBeInTheDocument();
  });

  it("默认概要应显示 Mock 模式 / 15s / 2x / 数据库 API", () => {
    render(<APIEndpointConfig />);
    expect(screen.getByText("当前配置概要")).toBeInTheDocument();
    expect(screen.getByText("Mock 模式")).toBeInTheDocument();
    expect(screen.getByText("15s")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("/api/db")).toBeInTheDocument();
  });

  it("切换启用后端 API 应更新概要并持久化", () => {
    render(<APIEndpointConfig />);
    const toggleBtn = rowOf("启用后端 API").querySelector("button")!;
    fireEvent.click(toggleBtn);
    expect(toast.success).toHaveBeenCalledWith(
      "已更新: enableBackend",
      expect.objectContaining({ style: expect.anything() }),
    );
    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(getAPIConfig().enableBackend).toBe(true);
    expect(JSON.parse(localStorage.getItem("yyc3_api_endpoints")!).enableBackend).toBe(true);
  });

  it("修改请求超时应回调并更新概要", () => {
    render(<APIEndpointConfig />);
    fireEvent.change(screen.getByDisplayValue("15000"), { target: { value: "20000" } });
    expect(toast.success).toHaveBeenCalledWith("已更新: timeout", expect.anything());
    expect(getAPIConfig().timeout).toBe(20000);
    expect(screen.getByText("20s")).toBeInTheDocument();
  });

  it("超时输入非法值时应回退为 0", () => {
    render(<APIEndpointConfig />);
    fireEvent.change(screen.getByDisplayValue("15000"), { target: { value: "" } });
    expect(getAPIConfig().timeout).toBe(0);
    expect(screen.getByText("0s")).toBeInTheDocument();
  });

  it("maxRetries 按钮点 0 应显示不重试提示", () => {
    render(<APIEndpointConfig />);
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    expect(screen.getByText("不重试，请求失败立即返回")).toBeInTheDocument();
    expect(screen.getByText("0x")).toBeInTheDocument();
    expect(getAPIConfig().maxRetries).toBe(0);
  });

  it("maxRetries 按钮点 4 应显示指数退避提示", () => {
    render(<APIEndpointConfig />);
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(
      screen.getByText("失败后最多重试 4 次 (指数退避: 500ms → 1000ms → 2000ms → 4000ms)"),
    ).toBeInTheDocument();
    expect(getAPIConfig().maxRetries).toBe(4);
  });

  it("maxRetries 滑块变更应回调整数", () => {
    render(<APIEndpointConfig />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "5" } });
    expect(getAPIConfig().maxRetries).toBe(5);
    expect(screen.getByText("5x")).toBeInTheDocument();
  });

  it("默认重试 2 次应显示对应退避提示", () => {
    render(<APIEndpointConfig />);
    expect(
      screen.getByText("失败后最多重试 2 次 (指数退避: 500ms → 1000ms)"),
    ).toBeInTheDocument();
  });

  it("编辑文件系统 API 应回调并持久化", () => {
    render(<APIEndpointConfig />);
    fireEvent.change(screen.getByDisplayValue("/api/fs"), {
      target: { value: "/v2/fs" },
    });
    expect(toast.success).toHaveBeenCalledWith("已更新: fsBase", expect.anything());
    expect(getAPIConfig().fsBase).toBe("/v2/fs");
    expect(JSON.parse(localStorage.getItem("yyc3_api_endpoints")!).fsBase).toBe("/v2/fs");
  });

  it("点击重置默认应恢复初始值并清理持久化", () => {
    render(<APIEndpointConfig />);
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    fireEvent.change(screen.getByDisplayValue("15000"), { target: { value: "30000" } });
    expect(screen.getByText("30s")).toBeInTheDocument();

    fireEvent.click(screen.getByText("重置默认"));
    expect(toast.info).toHaveBeenCalledWith("API 配置已重置为默认值");
    expect(getAPIConfig().timeout).toBe(15000);
    expect(getAPIConfig().maxRetries).toBe(2);
    expect(localStorage.getItem("yyc3_api_endpoints")).toBeNull();
    expect(screen.getByText("15s")).toBeInTheDocument();
    expect(screen.getByText("2x")).toBeInTheDocument();
  });
});
