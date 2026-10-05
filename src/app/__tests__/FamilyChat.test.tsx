/**
 * FamilyChat.test.tsx
 * ===================
 * ai-family/FamilyChat.tsx — 家人对话空间
 *
 * 覆盖范围:
 * - 频道列表 / 群聊头部 / 初始消息(含系统消息)
 * - 发送消息 (Enter) 与 AI 定时回复
 * - 一对一频道切换
 * - 返回家园导航
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

// P2 零网络红线: 网关配置置空 → fetchMemberReply 直降级模拟语料 (不发外网请求)
vi.mock("../lib/api-config", () => ({
  getGatewayConfig: () => ({ gatewayBase: "", gatewayAdminKey: "proxy", gatewayApiKey: "" }),
}));

import { FamilyChat } from "../components/ai-family/FamilyChat";

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderChat() {
  return render(
    <MemoryRouter initialEntries={["/ai-family-chat"]}>
      <Routes>
        <Route path="*" element={<><FamilyChat /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ai-family/FamilyChat", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("应渲染频道列表 / 群聊头部 / 初始消息", () => {
    renderChat();
    expect(screen.getByText("家人对话")).toBeInTheDocument();
    expect(screen.getByText("家庭群聊")).toBeInTheDocument();
    expect(screen.getByText("AI Family 家庭群聊")).toBeInTheDocument();
    expect(screen.getByText("8位家人 · 在线")).toBeInTheDocument();
    // 系统消息与初始消息
    expect(screen.getByText(/欢迎来到 AI Family 家庭群聊/)).toBeInTheDocument();
    expect(screen.getByText(/大家早上好！今日系统状态良好/)).toBeInTheDocument();
    expect(screen.getByText(/安全基线扫描已启动/)).toBeInTheDocument();
    // 一对一频道入口 (短名; 消息气泡发送者名同文本 → getAll)
    expect(screen.getAllByText("先知").length).toBeGreaterThanOrEqual(1);
  });

  it("输入为空时发送按钮禁用", () => {
    renderChat();
    const sendBtn = document.querySelector("button svg.lucide-send")!.closest("button") as HTMLButtonElement;
    expect(sendBtn).toBeDisabled();
  });

  it("Enter 发送消息后 AI 回复 (网关不可达降级模拟语料)", async () => {
    // P2 真实化: 回复链 = fetchMemberReply(网关) → 失败降级 AI_RESPONSES。
    // 单测零网络红线: gatewayBase 置空 → 直降级 (微任务即回复, 无 setTimeout)
    vi.spyOn(Math, "random").mockReturnValue(0.5); // responder=meta-oracle, 回复 index=2
    renderChat();
    const input = screen.getByPlaceholderText("和家人说点什么...");
    fireEvent.change(input, { target: { value: "你好家人们" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("你好家人们")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.getByText("你")).toBeInTheDocument(); // 用户头像标识

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("好的，我来编排一个方案，兼顾性能和安全两个维度。")).toBeInTheDocument();
    expect(screen.getAllByText("天枢").length).toBeGreaterThanOrEqual(2); // 频道入口 + 回复者标注
  });

  it("点击发送按钮亦可发送", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderChat();
    const input = screen.getByPlaceholderText("和家人说点什么...");
    fireEvent.change(input, { target: { value: "按钮发送" } });
    fireEvent.click(document.querySelector("button svg.lucide-send")!.closest("button") as HTMLButtonElement);
    expect(screen.getByText("按钮发送")).toBeInTheDocument();
  });

  it("切换到一对一频道后头部显示家人名", () => {
    renderChat();
    fireEvent.click(screen.getAllByText("万物")[0]); // 频道入口 (消息气泡发送者同文本)
    expect(screen.getAllByText("语枢·万物").length).toBeGreaterThanOrEqual(1); // 频道描述 + 头部
    expect(screen.getByText("一对一对话")).toBeInTheDocument();
    expect(screen.queryByText("8位家人 · 在线")).not.toBeInTheDocument();
  });

  it("点击返回家园应导航至 /ai-family-home", () => {
    renderChat();
    fireEvent.click(screen.getByText("返回家园"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-home");
  });
});

// ============================================================
// P2 真实 LLM 回复 (2026-10-05): 网关命中 → 人格回复替代语料
// ============================================================

describe("FamilyChat 真实 LLM 回复", () => {
  it("网关返回 choices → 使用真实回复文本", async () => {
    vi.doMock("../lib/api-config", () => ({
      getGatewayConfig: () => ({ gatewayBase: "https://gw.test/v1", gatewayAdminKey: "proxy", gatewayApiKey: "sk-test" }),
    }));
    vi.resetModules();
    // 重新 import 后组件与本用例的 fetch mock 才共享新 api-config
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(
      JSON.stringify({ choices: [{ message: { content: "这是天枢的真实调度回复。" } }] }), { status: 200 }
    ));
    vi.stubGlobal("fetch", fetchMock);
    const { FamilyChat: Chat } = await import("../components/ai-family/FamilyChat");
    render(
      <MemoryRouter><Routes><Route path="*" element={<Chat />} /></Routes></MemoryRouter>
    );
    const input = screen.getByPlaceholderText("和家人说点什么...");
    fireEvent.change(input, { target: { value: "编排一个扩容方案" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByText("这是天枢的真实调度回复。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages[0].role).toBe("system"); // 人格 prompt 首位
    expect(body.messages[0].content).toContain("YYC³ AI Family");
    vi.unstubAllGlobals();
    vi.doUnmock("../lib/api-config");
    vi.resetModules();
  });
});
