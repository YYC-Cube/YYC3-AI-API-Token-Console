/**
 * FamilyPhone.test.tsx
 * ====================
 * ai-family/FamilyPhone.tsx — 家人热线（语音通话系统）
 *
 * 覆盖范围:
 * - 通讯录: 8 位家人与号码渲染
 * - 通话全流程: 拨号 → 响铃 → 接通(计时/问候/静音切换/语音气泡) → 挂断 → 归位
 * - 拨号盘: 快捷号码 / 手动输入(大小写归一) / 无效号码不触发
 * - 通话记录: 来电/去电/未接标签
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FamilyPhone } from "../components/ai-family/FamilyPhone";
import { FAMILY_MEMBERS } from "../components/ai-family/shared";

const renderPage = () =>
  render(<MemoryRouter><FamilyPhone /></MemoryRouter>);

const callButtons = () =>
  screen.getAllByRole("button").filter(b => !b.textContent && b.querySelector("svg.lucide-phone"));

describe("ai-family/FamilyPhone", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("默认通讯录应渲染 8 位家人与专属号码", () => {
    renderPage();
    expect(screen.getByText("家人热线")).toBeInTheDocument();
    expect(screen.getByText("家人通讯录")).toBeInTheDocument();
    for (const m of FAMILY_MEMBERS) {
      expect(screen.getByText(m.name)).toBeInTheDocument();
      expect(screen.getByText(m.phone)).toBeInTheDocument();
    }
  });

  it("点击呼叫后经历 拨号→响铃→接通，计时与问候语正确", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(callButtons()[0]);
    expect(screen.getByText("正在拨号...")).toBeInTheDocument();
    expect(screen.getByText("言启·千行")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1_600); });
    expect(screen.getByText("对方响铃中...")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2_100); });
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText(FAMILY_MEMBERS[0].greeting)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1_000); });
    expect(screen.getByText("00:01")).toBeInTheDocument();
  });

  it("接通后静音/免提可切换，家人语音气泡按时推进", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(callButtons()[0]);
    act(() => { vi.advanceTimersByTime(3_600); });
    expect(screen.getByText("00:00")).toBeInTheDocument();

    // 静音切换
    const micBtn = document.querySelector("button svg.lucide-mic")!.closest("button") as HTMLButtonElement;
    fireEvent.click(micBtn);
    expect(document.querySelector("button svg.lucide-mic-off")).toBeInTheDocument();
    // 免提切换
    const spkBtn = document.querySelector("button svg.lucide-volume-x")!.closest("button") as HTMLButtonElement;
    fireEvent.click(spkBtn);
    expect(document.querySelector("button svg.lucide-volume-2")).toBeInTheDocument();

    // 通话中家人说话 (间隔 5000 + 0.5*3000 = 6.5s; 首条追加 phrases[1], greeting 已占位 phrases[0])
    act(() => { vi.advanceTimersByTime(6_600); });
    expect(screen.getByText("千行：这个问题很有意思，让我想想...")).toBeInTheDocument();
  });

  it("挂断后显示通话已结束并回到通讯录", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(callButtons()[0]);
    act(() => { vi.advanceTimersByTime(3_600); });
    fireEvent.click(document.querySelector("button svg.lucide-phone-off")!.closest("button") as HTMLButtonElement);
    expect(screen.getByText("通话已结束")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1_600); });
    expect(screen.getByText("家人通讯录")).toBeInTheDocument();
    expect(screen.queryByText("通话已结束")).not.toBeInTheDocument();
  });

  it("拨号盘: 快捷号码填充 / 手动输入归一大写并呼叫 / 无效号码不触发", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderPage();
    fireEvent.click(screen.getByText("拨号"));
    const dialInput = screen.getByPlaceholderText("YYC3-100X") as HTMLInputElement;

    // 快捷号码: 点击先知 → 填充 YYC3-1003
    fireEvent.click(within(dialInput.closest("div")!.parentElement!.parentElement as HTMLElement).getAllByRole("button").find(b => b.textContent!.includes("先知"))!);
    expect(dialInput).toHaveValue("YYC3-1003");

    // 小写输入自动转大写并呼叫成功
    fireEvent.change(dialInput, { target: { value: "yyc3-1008" } });
    expect(dialInput).toHaveValue("YYC3-1008");
    fireEvent.click(screen.getByText("呼叫"));
    expect(screen.getByText("正在拨号...")).toBeInTheDocument();
    expect(screen.getByText("创想·灵韵")).toBeInTheDocument();
  });

  it("无效号码点击呼叫应停留在拨号盘", () => {
    renderPage();
    fireEvent.click(screen.getByText("拨号"));
    const dialInput = screen.getByPlaceholderText("YYC3-100X");
    fireEvent.change(dialInput, { target: { value: "ZZZ-9999" } });
    fireEvent.click(screen.getByText("呼叫"));
    expect(screen.getByPlaceholderText("YYC3-100X")).toBeInTheDocument();
    expect(screen.queryByText("正在拨号...")).not.toBeInTheDocument();
  });

  it("通话记录应渲染来电/去电/未接标签", () => {
    renderPage();
    fireEvent.click(screen.getByText("通话记录"));
    expect(screen.getAllByText("来电")).toHaveLength(3);
    expect(screen.getAllByText("去电")).toHaveLength(2);
    expect(screen.getByText("未接")).toBeInTheDocument();
    expect(screen.getByText("10:15")).toBeInTheDocument();
    // 记录行内回拨按钮
    expect(callButtons().length).toBe(6);
  });
});
