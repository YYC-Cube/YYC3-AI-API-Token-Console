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

  it("Enter 发送消息后 AI 延时回复 (群聊随机家人)", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // responder=meta-oracle, 回复 index=2
    renderChat();
    const input = screen.getByPlaceholderText("和家人说点什么...");
    fireEvent.change(input, { target: { value: "你好家人们" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("你好家人们")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.getByText("你")).toBeInTheDocument(); // 用户头像标识

    act(() => { vi.advanceTimersByTime(1_500); });
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
