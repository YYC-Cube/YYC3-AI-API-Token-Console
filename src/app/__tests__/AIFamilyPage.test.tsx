/**
 * AIFamilyPage.test.tsx
 * =====================
 * components/AIFamilyPage.tsx — AI Family 时钟环交互中心
 *
 * 覆盖范围:
 * - 时钟环 8 位成员 / 中心标识 / 顶部标题与统计 / 底部标语
 * - 成员悬停 tooltip
 * - 成员点击 → 详情抽屉 (角色/职责/能力/指标/快捷操作) → 遮罩关闭
 * - 时钟/发言轮换 interval 不崩溃
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AIFamilyPage } from "../components/AIFamilyPage";

const MEMBER_NAMES = [
  "言启·千行", "语枢·万物", "预见·先知", "千里·伯乐",
  "元启·天枢", "智云·守护", "格物·宗师", "创想·灵韵",
];

const memberBtn = (name: string) => screen.getByText(name).previousElementSibling as HTMLElement;

describe("components/AIFamilyPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("应渲染时钟环 8 位成员 / 中心标识 / 统计 / 标语", () => {
    render(<AIFamilyPage />);
    for (const name of MEMBER_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText("YYC³").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("AI Family").length).toBeGreaterThanOrEqual(2); // 中心标识 + 左上标题
    expect(screen.getByText("八魂归一，云枢乃成")).toBeInTheDocument();
    expect(screen.getByText("7/8")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("99.97%")).toBeInTheDocument();
    expect(screen.getByText("亦师亦友亦伯乐 · 一言一语一协同")).toBeInTheDocument();
    expect(screen.getByText("Words Initiate Quadrants, Language Serves as Core for the Future")).toBeInTheDocument();
    // 时钟环时间刻度
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("16:30")).toBeInTheDocument();
  });

  it("悬停成员应显示职位与语录 tooltip", () => {
    render(<AIFamilyPage />);
    expect(screen.queryByText("Navigator · 领航者")).not.toBeInTheDocument();
    fireEvent.mouseEnter(memberBtn("言启·千行"));
    expect(screen.getByText("Navigator · 领航者")).toBeInTheDocument();
    expect(screen.getByText(/我聆听万千言语，为您指引航向。/)).toBeInTheDocument();
    fireEvent.mouseLeave(memberBtn("言启·千行"));
    expect(screen.queryByText("Navigator · 领航者")).not.toBeInTheDocument();
  });

  it("点击成员应打开详情抽屉，遮罩点击关闭", () => {
    render(<AIFamilyPage />);
    fireEvent.click(memberBtn("言启·千行"));
    expect(screen.getByText("Navigator · 领航者")).toBeInTheDocument();
    expect(screen.getByText("发言中")).toBeInTheDocument();
    expect(screen.getByText("「我聆听万千言语，为您指引航向。」")).toBeInTheDocument();
    expect(screen.getByText("角色定位")).toBeInTheDocument();
    expect(screen.getByText(/「耳朵」与「翻译官」/)).toBeInTheDocument();
    expect(screen.getByText("核心职责")).toBeInTheDocument();
    expect(screen.getByText("自然语言理解 (NLU)")).toBeInTheDocument();
    expect(screen.getByText("核心能力")).toBeInTheDocument();
    expect(screen.getByText("运行指标")).toBeInTheDocument();
    expect(screen.getByText("今日处理")).toBeInTheDocument();
    expect(screen.getByText("平均延迟")).toBeInTheDocument();
    expect(screen.getByText("对话")).toBeInTheDocument();
    expect(screen.getByText("任务分配")).toBeInTheDocument();

    // 遮罩关闭
    fireEvent.click(document.querySelector("div.fixed.inset-0.z-40") as HTMLElement);
    expect(screen.queryByText("任务分配")).not.toBeInTheDocument();
    // 再次点击同一成员可重新打开
    fireEvent.click(memberBtn("语枢·万物"));
    expect(screen.getByText("Thinker · 思想家")).toBeInTheDocument();
    expect(screen.getAllByText("在线").length).toBeGreaterThanOrEqual(1); // 状态文案 (顶栏标签同文本)
  });

  it("时钟与发言轮换 interval 推进不崩溃", () => {
    vi.useFakeTimers();
    render(<AIFamilyPage />);
    act(() => { vi.advanceTimersByTime(1_100); }); // 时钟 tick
    act(() => { vi.advanceTimersByTime(4_000); }); // 发言轮换
    for (const name of MEMBER_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
