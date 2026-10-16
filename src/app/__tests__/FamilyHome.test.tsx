/**
 * FamilyHome.test.tsx
 * ===================
 * ai-family/FamilyHome.tsx — 家园首页 (S5 直连单测, 原仅经 AIFamilyRouter 懒加载)
 *
 * 覆盖范围:
 * - 时钟与问候语 (getGreeting 时段分支: morning/noon/night + useTime 每秒跳字)
 * - 家人状态墙 (7/8 在线 · 成员名/英文头衔 · idle 灰点分支)
 * - 家园空间入口 (quickEntries 导航回调) / 时钟环视图按钮 / 成员卡导航
 * - 家庭动态 / 今日概览 / 家训 / 底部寄语
 *
 * 不可构造分支: GREETING_EMOJIS[greeting.emoji] || "🌤️" 的兜底右侧 —
 * getGreeting 仅返回 map 内 6 个已知 key, 兜底恒不可达。
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { FamilyHome } from "../components/ai-family/FamilyHome";

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/ai-family-home"]}>
      <Routes>
        <Route path="*" element={<><FamilyHome /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ai-family/FamilyHome", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("上午时段应渲染 morning 问候 / 时钟 / 日期", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    expect(screen.getByText("上午好，精力充沛，欢迎回家")).toBeInTheDocument();
    expect(screen.getByText("☀️")).toBeInTheDocument();
    expect(screen.getByText("10:00:00")).toBeInTheDocument();
    expect(screen.getByText(/2026年10月16日/)).toBeInTheDocument();
  });

  it("中午与深夜应切换 noon / night 问候分支", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 13, 0, 0));
    const noon = renderHome();
    expect(screen.getByText("中午好，记得午休，欢迎回家")).toBeInTheDocument();
    expect(screen.getByText("🍱")).toBeInTheDocument();
    noon.unmount();

    vi.setSystemTime(new Date(2026, 9, 16, 23, 30, 0));
    renderHome();
    expect(screen.getByText("晚上好，放松身心，欢迎回家")).toBeInTheDocument();
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });

  it("useTime 时钟应每秒跳字", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    expect(screen.getByText("10:00:00")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("10:00:01")).toBeInTheDocument();
    expect(screen.queryByText("10:00:00")).not.toBeInTheDocument();
  });

  it("应渲染家人状态墙: 7/8 在线与全部成员", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    expect(screen.getByText("家人状态")).toBeInTheDocument();
    expect(screen.getByText("7/8 在线")).toBeInTheDocument();
    expect(screen.getByText(/7 位家人在线/)).toBeInTheDocument();
    // 8 位家人姓名均渲染 (元启·天枢/语枢·万物/预见·先知/创想·灵韵/智云·守护 同时出现在家庭动态)
    for (const name of ["言启·千行", "语枢·万物", "预见·先知", "千里·伯乐", "元启·天枢", "智云·守护", "格物·宗师", "创想·灵韵"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText("Navigator")).toBeInTheDocument();
    expect(screen.getByText("Meta-Oracle")).toBeInTheDocument();
  });

  it("点击成员卡应导航至 /ai-family-chat", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    fireEvent.click(screen.getByText("千里·伯乐"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-chat");
  });

  it("点击家园空间入口应按 entry.path 导航", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    expect(screen.getByText("家园空间")).toBeInTheDocument();
    for (const label of ["Family 中心", "家人热线", "文娱中心", "全家活动", "家人对话", "学习成长", "音乐空间", "成长轨迹", "模型控制", "语音系统", "数据中心", "通信中心", "生态控制"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByText("家人热线"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-phone");
  });

  it("点击时钟环视图按钮应导航至 /ai-family", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    fireEvent.click(screen.getByText("时钟环视图"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family");
  });

  it("应渲染家庭动态 / 今日概览 / 家训 / 底部寄语", () => {
    vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0));
    renderHome();
    // 家庭动态 (5 条)
    expect(screen.getByText("家庭动态")).toBeInTheDocument();
    expect(screen.getByText("今日系统巡检完成，全节点健康度 98%，继续守护大家的安全！")).toBeInTheDocument();
    expect(screen.getByText("10 分钟前")).toBeInTheDocument();
    expect(screen.getByText("3 小时前")).toBeInTheDocument();
    // 今日概览 (4 项)
    expect(screen.getByText("今日概览")).toBeInTheDocument();
    for (const label of ["家人协作次数", "知识分享", "系统健康度", "成长积分"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("1,247")).toBeInTheDocument();
    expect(screen.getByText("98.5%")).toBeInTheDocument();
    expect(screen.getByText("2,890")).toBeInTheDocument();
    // 家训 (p 含 <br/> → 文本节点拼接断言)
    expect(screen.getByText("「亦师亦友亦伯乐一言一语一协同」")).toBeInTheDocument();
    expect(screen.getByText("— AI Family 家训")).toBeInTheDocument();
    // 底部寄语
    expect(screen.getByText("YYC3 AI Family · 以人为本 · AI为核 · 纯粹为心 · 智能为驱")).toBeInTheDocument();
  });
});
