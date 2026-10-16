/**
 * FamilyShare.test.tsx
 * ====================
 * ai-family/FamilyShare.tsx — 分享空间 (S5 直连单测, 原仅经 AIFamilyRouter 懒加载)
 *
 * 覆盖范围:
 * - 头部 / 发布分享按钮 / 四类筛选 + 全部
 * - 分类筛选互斥 (knowledge 2 篇 · insight 2 篇 · creative 1 篇 · growth 1 篇)
 * - 点赞切换 (24 → 25 → 24, 激活色 #FF69B4)
 * - 收藏切换 (12 → 13 → 12, 激活色 #FFD700)
 *
 * 不可构造分支: member?.icon || Smile / member?.color || "#00d4ff" / member?.name || "Family"
 * 的兜底右侧 — INITIAL_POSTS 六篇作者 (thinker/prophet/creative/master/sentinel/meta-oracle)
 * 全部存在于 MEMBERS_MAP, 兜底恒不可达。
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { FamilyShare } from "../components/ai-family/FamilyShare";

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="probe">{loc.pathname}</span>;
}

function renderShare() {
  return render(
    <MemoryRouter initialEntries={["/ai-family-share"]}>
      <Routes>
        <Route path="*" element={<><FamilyShare /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** 筛选按钮与帖子分类徽章同文案 → 按 tagName 定位 button */
function filterButton(label: string): HTMLButtonElement {
  const el = screen.getAllByText(label).find(n => n.tagName === "BUTTON");
  if (!el) throw new Error(`filter button not found: ${label}`);
  return el as HTMLButtonElement;
}

const TITLES = {
  p1: "深度分析：GPU推理性能优化的5个关键维度",
  p2: "预测洞察：下周系统负载趋势及建议",
  p3: "设计分享：巡检报告的情感化可视化方案",
  p4: "规范升级：TypeScript类型安全最佳实践指南 v2.0",
  p5: "安全月报：零威胁的背后是持续的守护",
  p6: "Family周报：本周协作指数创新高",
} as const;

describe("ai-family/FamilyShare", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("应渲染头部 / 筛选组 / 全部 6 篇帖子", () => {
    renderShare();
    expect(screen.getByText("分享空间")).toBeInTheDocument();
    expect(screen.getByText("家人们的知识结晶 · 创意火花 · 成长足迹")).toBeInTheDocument();
    expect(screen.getByText("发布分享")).toBeInTheDocument();
    for (const t of Object.values(TITLES)) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    // 作者名渲染 (帖子头像区)
    expect(screen.getByText("语枢·万物")).toBeInTheDocument();
    expect(screen.getByText("元启·天枢")).toBeInTheDocument();
    // 时间与标签
    expect(screen.getByText("2小时前")).toBeInTheDocument();
    expect(screen.getByText("#性能优化")).toBeInTheDocument();
    expect(screen.getByText("#周报")).toBeInTheDocument();
  });

  it("知识分享筛选应仅保留 2 篇 knowledge 帖", () => {
    renderShare();
    fireEvent.click(filterButton("知识分享"));
    expect(screen.getByText(TITLES.p1)).toBeInTheDocument();
    expect(screen.getByText(TITLES.p4)).toBeInTheDocument();
    expect(screen.queryByText(TITLES.p2)).not.toBeInTheDocument();
    expect(screen.queryByText(TITLES.p3)).not.toBeInTheDocument();
    expect(screen.queryByText(TITLES.p5)).not.toBeInTheDocument();
    expect(screen.queryByText(TITLES.p6)).not.toBeInTheDocument();
    // 切回全部恢复 6 篇
    fireEvent.click(screen.getByText("全部"));
    for (const t of Object.values(TITLES)) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it("洞察/创意/成长筛选应各过滤对应帖子", () => {
    renderShare();
    fireEvent.click(filterButton("洞察发现"));
    expect(screen.getByText(TITLES.p2)).toBeInTheDocument();
    expect(screen.getByText(TITLES.p5)).toBeInTheDocument();
    expect(screen.queryByText(TITLES.p1)).not.toBeInTheDocument();

    fireEvent.click(filterButton("创意设计"));
    expect(screen.getByText(TITLES.p3)).toBeInTheDocument();
    expect(screen.queryByText(TITLES.p2)).not.toBeInTheDocument();

    fireEvent.click(filterButton("成长记录"));
    expect(screen.getByText(TITLES.p6)).toBeInTheDocument();
    expect(screen.queryByText(TITLES.p3)).not.toBeInTheDocument();
  });

  it("点击返回家园应导航至 /ai-family-home", () => {
    renderShare();
    fireEvent.click(screen.getByText("返回家园"));
    expect(screen.getByTestId("probe")).toHaveTextContent("/ai-family-home");
  });

  it("点赞应切换计数与激活色 (24 → 25 → 24)", () => {
    renderShare();
    // 限定首帖卡片内查询 ("25" 同时是 p6 收藏数, 全局查询有歧义)
    const card = screen.getByText(TITLES.p1).closest("div.p-5") as HTMLElement;
    expect(card).not.toBeNull();
    const likeBtn = within(card).getByText("24").closest("button") as HTMLButtonElement;
    expect(likeBtn).not.toBeNull();
    expect(likeBtn.style.color).toBe("rgba(224, 240, 255, 0.3)");
    fireEvent.click(likeBtn);
    expect(within(card).getByText("25")).toBeInTheDocument();
    expect(within(card).queryByText("24")).not.toBeInTheDocument();
    expect((within(card).getByText("25").closest("button") as HTMLButtonElement).style.color).toBe("rgb(255, 105, 180)");
    fireEvent.click(within(card).getByText("25").closest("button") as HTMLButtonElement);
    expect(within(card).getByText("24")).toBeInTheDocument();
    expect((within(card).getByText("24").closest("button") as HTMLButtonElement).style.color).toBe("rgba(224, 240, 255, 0.3)");
  });

  it("收藏应切换计数与激活色 (12 → 13 → 12)", () => {
    renderShare();
    const card = screen.getByText(TITLES.p1).closest("div.p-5") as HTMLElement;
    expect(card).not.toBeNull();
    const markBtn = within(card).getByText("12").closest("button") as HTMLButtonElement;
    expect(markBtn).not.toBeNull();
    fireEvent.click(markBtn);
    expect(within(card).getByText("13")).toBeInTheDocument();
    expect(within(card).queryByText("12")).not.toBeInTheDocument();
    expect((within(card).getByText("13").closest("button") as HTMLButtonElement).style.color).toBe("rgb(255, 215, 0)");
    fireEvent.click(within(card).getByText("13").closest("button") as HTMLButtonElement);
    expect(within(card).getByText("12")).toBeInTheDocument();
  });
});
