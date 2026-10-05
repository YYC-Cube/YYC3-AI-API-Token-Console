/**
 * FamilyCommCenter.test.tsx
 * =========================
 * ai-family/FamilyCommCenter.tsx — Family 通信中心
 *
 * 覆盖范围:
 * - 样例消息播种 / 头部统计 / 类型过滤 / 成员过滤
 * - 发送消息 + 定时自动回复
 * - 搜索 / 全部已读 / 删除单条 / 清空全部 / 导出
 * - 历史分页 (加载更早的消息) / 日期分组
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { FamilyCommCenter } from "../components/ai-family/FamilyCommCenter";
import type { FamilyMessage } from "../components/ai-family/shared";

const COMM_KEY = "yyc3-family-comm-messages";

function seedMessages(msgs: FamilyMessage[]) {
  localStorage.setItem(COMM_KEY, JSON.stringify(msgs));
}

function makeMsg(i: number, overrides: Partial<FamilyMessage> = {}): FamilyMessage {
  const base = new Date();
  base.setHours(8, i, 0, 0);
  return {
    id: `seed-${i}`,
    from: "thinker",
    to: "prophet",
    content: `测试消息 ${i}`,
    timestamp: base.toISOString(),
    type: "text",
    read: true,
    ...overrides,
  };
}

const headerStats = () => screen.getByText(/条消息 · /).textContent ?? "";

describe("ai-family/FamilyCommCenter", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    createObjectURLMock = vi.fn(() => "blob:mock-url");
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURLMock, configurable: true, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURLMock, configurable: true, writable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("空存储时应播种样例消息并渲染头部统计", () => {
    render(<FamilyCommCenter />);
    expect(screen.getByText("Family 通信中心")).toBeInTheDocument();
    // 10 条样例 · 7 未读 · 7 人在线
    expect(headerStats()).toContain("10 条消息");
    expect(headerStats()).toContain("7 条未读");
    expect(headerStats()).toContain("7 人在线");
    expect(screen.getByText(/全家早会通知/)).toBeInTheDocument();
    expect(screen.getAllByText("@全家").length).toBeGreaterThanOrEqual(1);
    // 播种已持久化
    expect(JSON.parse(localStorage.getItem(COMM_KEY)!)).toHaveLength(10);
  });

  it("类型过滤: 公告 2 条 / 警报 1 条 / 心跳 2 条", () => {
    render(<FamilyCommCenter />);
    fireEvent.click(screen.getByText("公告"));
    expect(screen.getByText("共 2 条")).toBeInTheDocument();
    fireEvent.click(screen.getByText("警报"));
    expect(screen.getByText("共 1 条")).toBeInTheDocument();
    fireEvent.click(screen.getByText("心跳"));
    expect(screen.getByText("共 2 条")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("全部").pop()!);
    expect(screen.getByText("共 10 条")).toBeInTheDocument();
  });

  it("成员过滤: 仅保留与该家人相关的消息 (含 @全家 广播)", () => {
    render(<FamilyCommCenter />);
    fireEvent.click(screen.getAllByText("千行")[0]); // 筛选按钮 (消息气泡发送者名同文本)
    // msg-003 (from 千行) + msg-004 (to 千行) + 5 条 @全家 广播
    expect(screen.getByText("共 7 条")).toBeInTheDocument();
    expect(screen.getByText(/刚写了一首关于春天的小诗/)).toBeInTheDocument();
    // 私聊给天枢的警报不在千行视图内
    expect(screen.queryByText(/异常端口扫描/)).not.toBeInTheDocument();
  });

  it("发送消息: Enter 发送后清空输入并触发自动回复", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0); // 回复取 AI_RESPONSES 首条
    render(<FamilyCommCenter />);
    const input = screen.getByPlaceholderText("输入消息...");
    fireEvent.change(input, { target: { value: "全家注意" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("全家注意")).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(headerStats()).toContain("11 条消息");

    // 自动回复: 500ms 后安排, 首个回复 500+800=1300ms
    act(() => { vi.advanceTimersByTime(1_400); });
    expect(screen.getByText("我理解你的意图了！让我帮你路由到最合适的家人来处理。")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByText("有趣的问题！让我深入分析一下数据背后的模式。")).toBeInTheDocument();
  });

  it("发送按钮在输入为空时禁用", () => {
    render(<FamilyCommCenter />);
    const sendBtn = document.querySelector("button svg.lucide-send")!.closest("button") as HTMLButtonElement;
    expect(sendBtn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("输入消息..."), { target: { value: "hi" } });
    expect(sendBtn).not.toBeDisabled();
  });

  it("搜索: 打开搜索栏后按内容过滤并显示结果数", () => {
    render(<FamilyCommCenter />);
    const searchBtn = document.querySelector("button svg.lucide-search")!.closest("button") as HTMLButtonElement;
    fireEvent.click(searchBtn);
    const input = screen.getByPlaceholderText("搜索消息内容或家人名称...");
    fireEvent.change(input, { target: { value: "端口扫描" } });
    expect(screen.getByText("1 条结果")).toBeInTheDocument();
    expect(screen.getByText(/异常端口扫描/)).toBeInTheDocument();
    // 清空搜索
    fireEvent.click(document.querySelector("button svg.lucide-x")!.closest("button") as HTMLButtonElement);
    expect(screen.getByText("共 10 条")).toBeInTheDocument();
  });

  it("全部已读后未读数归零", () => {
    render(<FamilyCommCenter />);
    expect(headerStats()).toContain("7 条未读");
    fireEvent.click(screen.getByTitle("全部已读"));
    expect(headerStats()).toContain("0 条未读");
  });

  it("删除单条消息后计数减一", () => {
    render(<FamilyCommCenter />);
    const bubble = screen.getByText(/全家早会通知/).closest("div.group") as HTMLElement;
    const delBtn = bubble.querySelector("button") as HTMLButtonElement;
    fireEvent.click(delBtn);
    expect(headerStats()).toContain("9 条消息");
    expect(screen.queryByText(/全家早会通知/)).not.toBeInTheDocument();
  });

  it("清空全部后显示空态并清空持久化", () => {
    render(<FamilyCommCenter />);
    fireEvent.click(screen.getByTitle("清空全部"));
    expect(screen.getByText("暂无消息")).toBeInTheDocument();
    expect(screen.getByText("共 0 条")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(COMM_KEY)!)).toHaveLength(0);
  });

  it("导出记录应触发 blob 下载", () => {
    render(<FamilyCommCenter />);
    fireEvent.click(screen.getByTitle("导出记录"));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it("历史分页: 超过 30 条时显示加载更早按钮", () => {
    const msgs = Array.from({ length: 41 }, (_, i) => makeMsg(i));
    seedMessages(msgs);
    render(<FamilyCommCenter />);
    expect(screen.getByText("共 41 条")).toBeInTheDocument();
    expect(screen.queryByText("测试消息 0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/加载更早的消息 \(11 条\)/));
    expect(screen.getByText("测试消息 0")).toBeInTheDocument();
    expect(screen.queryByText(/加载更早的消息/)).not.toBeInTheDocument();
  });

  it("当日消息应出现「今天」日期分组", () => {
    seedMessages([makeMsg(1), makeMsg(2)]);
    render(<FamilyCommCenter />);
    expect(screen.getByText("今天")).toBeInTheDocument();
    expect(screen.getByText("共 2 条")).toBeInTheDocument();
  });

  it("以指定家人身份发送 (select 切换)", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<FamilyCommCenter />);
    const selects = document.querySelectorAll("select");
    expect(selects).toHaveLength(2); // sendAs / sendTo
    fireEvent.change(selects[0], { target: { value: "sentinel" } });
    fireEvent.change(selects[1], { target: { value: "master" } });
    fireEvent.change(screen.getByPlaceholderText("输入消息..."), { target: { value: "点对点" } });
    fireEvent.click(document.querySelector("button svg.lucide-send")!.closest("button") as HTMLButtonElement);
    // 点对点回复仅来自 master
    act(() => { vi.advanceTimersByTime(1_400); });
    expect(screen.getByText("从架构角度来看，这个方案可以进一步优化。")).toBeInTheDocument();
  });
});
